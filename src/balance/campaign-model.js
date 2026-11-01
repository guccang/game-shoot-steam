import {nearbyFarmLand} from '../world/farm-land.js';
import {awardCampXp,countCampActivity} from '../progression/camp-level.js';
import { RESOURCE_CAP } from '../config/resource-limits.js';
import {encounterDifficulty} from '../config/encounter-difficulty.js';
// 当前主线经济模拟：按顺序执行真实任务条件、固定五波清缴及正式交易；耗时是显式活动模型。
import {currentMainlineTask,MAINLINE_TASKS} from '../config/mainline.js';
import {mainlineCondition} from '../core/mainline-manager.js';
import {awardMainline} from '../progression/mainline-reward.js';
import {STORY_CAMPAIGN} from '../config/story-campaign.js';
import {GAMEPLAY_VALUES} from '../config/gameplay-values.js';
import {FOOTBALL,footballReward} from '../config/slime-football.js';
import {CAMP_DEFENSE} from '../config/camp-defense.js';
import {STORY_POSTS} from '../config/story-posts.js';
import {freshRangerProgress,validateProgress} from '../progression/progress.js';
import {RANGER,RANGER_STAGES} from '../config/ranger-arrival.js';
import {bindEconomy,economyUpgradeCost,forestReward,weaponGrowth,heroGrowth} from '../config/economy.js';
import {waveDifficulty,clearingKillReward} from '../config/waves.js';
import {realmReward,realmStageSpec} from '../config/realms.js';
import {BOSSES} from '../config/bosses.js';
import {enemyIdentity} from '../world/biomes.js';
import {awardMaterials} from '../progression/material-loot.js';
import {transactProgress} from '../progression/transactions.js';
import {transactVehicle} from '../progression/vehicles.js';
import {quoteWorkshop,workshopUpgrade} from '../progression/workshop.js';
import {equipmentParts} from '../config/equipment-parts.js';
import {equipmentRecipe,equipmentRequirements,ownsEquipment} from '../progression/equipment-goals.js';
import {nativeVehicleWeapon,grantVehicleArmament,VEHICLE_WEAPONS} from '../config/vehicle-armaments.js';
import {awardMastery,changeWeaponMod} from '../progression/mastery.js';
import {recordEconomy,advanceLedger,freshLedger} from '../progression/economy-ledger.js';
import {wallet,growthCadence,seededRandom} from './model-metrics.js';
import {CAMPAIGN_TIMING as T} from './campaign-timing.js';
import {buyFarmSeeds,awardFarmSeedDrop} from '../core/farm-seeds.js';
import {farmAction,FARM_ACTION_TIMING} from '../core/farm.js';
import {FARM_CROPS,FARM_MAX_PLOTS,FARM_SEED_DOOR,farmCell,farmPosition,FARM_GARDEN} from '../config/farm.js';
import {farmGrowth} from '../progression/farm.js';
const fields={weapons:'weapons',heroes:'heroes',vehicle:'vehicleHulls',turret:'vehicleWeapons'};
// 入职后的真实最低钱包：入职必需采集单独标记，零伐木路线指其后不额外采集。
export function campaignStart(config){const p=bindEconomy(freshRangerProgress(),config),tree=forestReward('tree',0,p),trees=Math.ceil((RANGER.repairWood+RANGER.pistolWood)/Math.max(1,tree.wood));
 if(tree.wood<=0)throw Error('入职木材奖励不能为零');
 countCampActivity(p,'trees',trees);
 p.coins=trees*tree.coins;p.wood=trees*tree.wood-RANGER.repairWood-RANGER.pistolWood;
 Object.assign(p.arrival,{phase:'complete',keys:true,wood:trees*tree.wood});p.weapons[0]=p.weapons[RANGER.saw]=1;p.weapon=0;p.vehicleHulls[RANGER.scooter]=1;return p;}
// 将完整路线消耗在同一时钟上；已领取奖励不会因回访、死亡或任务切换而重复发放。
export function simulateCampaign(seed,config,s){
 const random=seededRandom(seed);let p=s.initial?validateProgress(bindEconomy(structuredClone(s.initial),config)):campaignStart(config);
 bindEconomy(p,config);p.economyLog=freshLedger();
 const initial=wallet(p),timeline=[],taskTimeline=[],curve=[{minute:0,...initial}],outings=[],sources={},failures={},activityTimes={forest:0,rogue:0,tower:0,guardian:0,logging:0,task:0,travel:0,workshop:0};
 let lastVisit=-9999,lastFarmVisit=-9999;
 const farmEpoch=Math.max(0,...p.farm.plots.map(plot=>plot.plantedAt));
 let seconds=0,lastUpgrade=-9999,upgradeSpent=0,incomeCoins=0,cursor=0,completeAt=null,completionLevels=null,upgrades=0,bought=0;
 let wave=p.patrol?.wave||p.bosses*5+1,waveKills=p.patrol?.waveKills||0,bossReady=p.patrol?.bossReady||false,outing=null,outingRequired=0,outingStart=0,stage=1,firstUpgrade=null;
 // 全部活动含失败、返程与施工；超时尾段不发尚未取得的奖励。
 function spend(n,activity){const used=Math.min(n,s.minutes*60-seconds);seconds+=used;activityTimes[activity]=(activityTimes[activity]||0)+used;advanceLedger(p,used,activity);return used+1e-7>=n;}
 // 通过实际钱包差额记录来源，主线共用事务已记账时不再重复入账。
 function income(source,reward,already=false){const received={};sources[source]||={};
  for(const [k,n] of Object.entries(reward)){const owner=['coins','wood'].includes(k)?p:p.materials;received[k]=already?n:Math.min(n,Math.max(0,(owner===p?RESOURCE_CAP:9999999)-owner[k]));if(!already)owner[k]+=received[k];sources[source][k]=(sources[source][k]||0)+received[k];}
  incomeCoins+=received.coins||0;if(!already)recordEconomy(p,'income',source,received);
 }
 // 每分钟最多回访一次农田，收割、挥锄及复种均走正式事务；秘境中不远程经营。
 function tendFarm(){
  if(outing||seconds-lastFarmVisit<60)return;
  const due=p.farm.plots.some(plot=>plot.mapId==='forest'&&(plot.crop===null||farmGrowth(plot,farmEpoch+seconds*1000)>=1||!plot.watered));
  if(!due&&p.farm.plots.length>=12&&!p.farm.inventory.some(Boolean))return;
  if(!spend(12,'farm'))return;
  lastFarmVisit=seconds;const now=farmEpoch+seconds*1000;
  const scene={state:'playing',mapId:'forest',player:{...FARM_GARDEN},progress:p,livingPersist:()=>true,onEvent:()=>{}};
  // 每次事务都取更新后的进度，避免从旧副本重复收获同一块田。
  const apply=(action,options={})=>{if(!spend(action==='sell'?1:FARM_ACTION_TIMING[action].end+.6,'farm'))return {ok:false};const plot=p.farm.plots.find(p=>p.id===options.plot);if(plot)scene.player={...farmPosition(plot)};const result=farmAction(scene,action,{...options,now:farmEpoch+seconds*1000});p=bindEconomy(scene.progress,config);return result;};
  for(const plot of [...p.farm.plots])if(plot.crop!==null&&farmGrowth(plot,now)>=1){const r=apply('harvest',{plot:plot.id});if(r.ok)income('farm',{coins:r.coins},true);}
  if(p.farm.inventory.some(Boolean)){const r=apply('sell');if(r.ok)income('farm',{coins:r.coins},true);}
  for(let id=0;id<Math.min(12,FARM_MAX_PLOTS);id++)if(!p.farm.plots.some(plot=>plot.id===id)){const point=nearbyFarmLand(scene,{...farmCell(id),mapId:'forest'});if(!point)break;scene.player=point;if(!apply('dig',{point}).ok)break;}
  const crops=FARM_CROPS.map((c,i)=>({...c,index:i})).filter(c=>p.farm.unlocked[c.index]||p.farm.seeds[c.index]>0).sort((a,b)=>(b.value-b.cost)/b.seconds-(a.value-a.cost)/a.seconds);
  for(const plot of [...p.farm.plots])if(plot.crop===null){const crop=crops.find(c=>p.farm.seeds[c.index]>0||c.cost<=p.coins);if(!crop)continue;
   // 购买与播种分别结算，含柜台往返耗时，不再免费补种。
   if(!p.farm.seeds[crop.index]){if(!spend(25,'farm'))break;scene.player={...FARM_SEED_DOOR};if(!buyFarmSeeds(scene,crop.index).ok)continue;p=bindEconomy(scene.progress,config);}
   apply('plant',{plot:plot.id,crop:crop.index});}
  for(const plot of [...p.farm.plots])if(plot.mapId==='forest'&&plot.crop!==null&&!plot.watered&&farmGrowth(plot,farmEpoch+seconds*1000)<1)apply('water',{plot:plot.id});
 }
 // 成长事件只来自实际购买、升级与改装，不把领取奖励或过任务计为成长。
 function event(type,kind,index,level,name){timeline.push({minute:seconds/60,type,kind,index,level,name:name||(kind==='turret'?VEHICLE_WEAPONS[index]?.name:equipmentRecipe(kind,index,p)?.name)||'角色'});if(type==='buy')bought++;else{upgrades++;firstUpgrade??=seconds/60;}lastUpgrade=seconds;}
 // 交易先在副本中验证，施工耗时完整结束后才提交，失败与超时不免费扣费或升级。
 function transaction(kind,index,action,part=null){
  // 共用正式缺口和报价做无副作用预检，余额不足时避免反复克隆600条历史日志。
  if(action==='buy'&&equipmentRequirements(p,kind,index).some(r=>r.missing))return false;
  if(action==='upgrade'&&!part){const level=p[fields[kind]][index];if(!level||level>=GAMEPLAY_VALUES.progress.maxEquipmentLevel)return false;
   const cost=economyUpgradeCost(p,kind,index,level);if(p.coins<cost.coins||p.wood<cost.wood)return false;}
  const before=p.coins;let next=bindEconomy(structuredClone(p),config),ok;
  if(part){const q=quoteWorkshop(p,workshopUpgrade(p,kind,index,part,p.vehicleIndex));ok=q.ok;next=q.next;}
  else if(action==='modify'){ok=changeWeaponMod(next,index,1);}
  else ok=(['weapons','heroes'].includes(kind)?transactProgress:transactVehicle)(next,kind,index,action);
  if(!ok)return false;
  if(seconds-lastVisit>60&&!spend(T.roundTripSeconds/s.efficiency,'travel'))return false;
  if(!spend(T.workSeconds,'workshop'))return false;lastVisit=seconds;
  // 报价副本使用提交时的日志时钟，不能把施工时间从账本中抹去。
  next.economyLog.seconds=p.economyLog.seconds;next.economyLog.activities=structuredClone(p.economyLog.activities);p=next;
  if(action!=='buy')upgradeSpent+=before-p.coins;
  if(action==='buy'){if(kind==='vehicle')p.vehicleIndex=index;else if(kind==='weapons')p.weapon=index;}
  event(action==='buy'?'buy':part?'part':action==='modify'?'modify':'upgrade',kind,index,p[fields[kind]][index],part?equipmentParts(kind,index).find(s=>s.key===part)?.name:null);return true;
 }
 // 当前有效配置，使用对应车体主炮；没有车炮时不假装已达到炮塔等级。
 function levels(){return {weapon:p.weapons[p.weapon]||0,hero:p.heroes[p.hero]||0,vehicle:p.vehicleHulls[p.vehicleIndex]||0,turret:p.vehicleWeapons[p.vehicleLoadouts[p.vehicleIndex]]||0};}
 // 已完成任务与拥有目标均参与完成判定，避免只攒齐钱却跳过剧情或资格。
 function completion(){while(cursor<s.route.length&&ownsEquipment(p,...s.route[cursor]))cursor++;
  const l=levels();if(completeAt===null&&cursor===s.route.length&&p.mainline.completed.length===MAINLINE_TASKS.length&&l.weapon>=15&&l.hero>=12&&l.vehicle>=10&&l.turret>=12){completeAt=seconds/60;completionLevels=l;}}
 // 决策依据是当前任务，不复制目标数值；任一条件优先使用已拥有或当前主力。
 function unresolved(goal){if(mainlineCondition({progress:p},goal))return null;if(goal.all)return goal.all.map(unresolved).find(Boolean);
  if(goal.any){
   const selected=goal.any.find(c=>c.nativeLevel===p.vehicleIndex||c.path===`progress.weapons.${p.weapon}`||c.path===`progress.vehicleHulls.${p.vehicleIndex}`);
   if(selected)return unresolved(selected);
   // 装备选择检查该候选的所有权，不能把当前武器编号大于零当作拥有所有选项。
   const own=goal.any.find(c=>c.controllerLevel&&[12,15,16].some(i=>p.weapons[i])||
    c.nativeLevel!==undefined&&p.vehicleHulls[c.nativeLevel]||
    c.path&&(c.path==='progress.weapon'?p.weapons[c.equals]>0:Number(c.path.split('.').reduce((o,k)=>o?.[k],{progress:p}))>0));
   return unresolved(own||goal.any[0]);
  }return goal;}
 // 消费目标只调用正式购买/升级，不写目标等级；熟练度也必须由实际模拟击杀积累。
 function consume(c){if(!c)return false;
  if(c.controllerLevel){const i=[12,15,16].find(i=>p.weapons[i])??12;return transaction('weapons',i,p.weapons[i]?'upgrade':'buy');}
  if(c.nativeLevel!==undefined){const i=nativeVehicleWeapon(c.nativeLevel).weaponIndex;return transaction('turret',i,'upgrade');}
  const [,field,index,part]=c.path?.split('.')||[],kind=Object.keys(fields).find(k=>fields[k]===field);
  if(kind){const i=Number(index);return transaction(kind,i,p[field][i]?'upgrade':'buy');}
  if(field==='weaponParts'||field==='vehicleParts')return transaction(field==='weaponParts'?'weapons':'vehicle',Number(index),'upgrade',part);
  if(field==='mods')return transaction('weapons',Number(index),'modify');return false;
 }
 // 主力不断强化到20级；每次回营只做一次常规成长，任务必需的升级可以连续施工。
 function shop(){if(outing)return false;
  const task=currentMainlineTask(p.mainline),c=task&&unresolved(task.goal);
  if(consume(c))return true;
  while(cursor<s.route.length&&ownsEquipment(p,...s.route[cursor]))cursor++;
  if(cursor<s.route.length&&transaction(...s.route[cursor],'buy')){cursor++;return true;}
  if(seconds-lastUpgrade<Math.min(s.workshopMinutes,seconds<1800?2:60)*60)return false;
  const planned=(cursor===s.route.length?1:s.strategy==='save'?.25:s.upgradeShare)*incomeCoins+initial.coins-upgradeSpent;
  // 平衡策略在成长停顿四分钟后优先支付一次可负担升级，不让教学必需消费形成长期预算欠债。
  const budget=s.strategy==='balanced'&&seconds-lastUpgrade>=240?Math.max(planned,p.coins):planned;
  const entries=[['weapons',p.weapon],['heroes',p.hero],['vehicle',p.vehicleIndex],['turret',p.vehicleLoadouts[p.vehicleIndex]]]
   .filter(([k,i])=>Number.isInteger(i)&&p[fields[k]][i]>0&&!(k==='vehicle'&&i===RANGER.scooter));
  entries.sort((a,b)=>p[fields[a[0]]][a[1]]-p[fields[b[0]]][b[1]]||s.priority.indexOf(a[0])-s.priority.indexOf(b[0]));
  for(const [k,i] of entries)if(p[fields[k]][i]<20&&economyUpgradeCost(p,k,i,p[fields[k]][i]).coins<=budget&&transaction(k,i,'upgrade'))return true;
  for(const [k,i] of entries.filter(([k])=>k!=='heroes'))for(const spec of equipmentParts(k,i)){
   if(['damage','armor'].includes(spec.key))continue;const plan=workshopUpgrade(p,k,i,spec.key,p.vehicleIndex);
   if(plan.original<spec.max&&economyUpgradeCost(p,k,i,plan.original,spec.key).coins<=budget&&transaction(k,i,'upgrade',spec.key))return true;
  }return false;
 }
 // 林地正式配额逐怪结算，死亡保留已结算序号；五波之后才打领主，不再每12次击杀生成领主。
 function forest(){const spec=waveDifficulty(wave),power=weaponGrowth(p.weapons[p.weapon],p)*heroGrowth(p.heroes[p.hero],p);
  // 轮式战车5级主炮的当前正式样本均值约快4%；其他车体暂按同一保守增益，报告列为外推假设。
  const mountedBonus=1+.04*Math.min(1,(p.vehicleWeapons[p.vehicleLoadouts[p.vehicleIndex]]||0)/5);
  const throughput=s.efficiency*mountedBonus*Math.sqrt(power)/Math.sqrt(Math.max(1,spec.health));
  if(bossReady){const duration=s.bossSeconds*Math.sqrt(encounterDifficulty(p.bosses).health)/(s.efficiency*Math.sqrt(power)) /(1-s.movementShare);
   if(!spend(duration,'forest'))return;
   if(random()<s.failureRate){failures.forest=(failures.forest||0)+1;spend(T.deathRecoverySeconds,'forest');return;}
   awardFarmSeedDrop({progress:p,mapId:'forest',random},{type:'boss',hp:0});
   const mat=awardMaterials(p,{type:'boss',kind:BOSSES[p.bosses%BOSSES.length].id},random);for(const k of Object.keys(mat))p.materials[k]-=mat[k];
   income('forest',{...forestReward('boss',0,p),...mat});awardMastery(p,p.weapon,'boss');p.bosses++;awardCampXp(p,'clearing');bossReady=false;wave++;waveKills=0;return;
  }
  // 吞吐暂沿历史样本上限；新版成组刷怪的真实效率以horde-feel-sample为准，不将此近似作为新通关承诺。
  const rate=Math.min(s.forestKills*throughput,wave>5?s.forestKills*T.forestSpawnCeiling*s.efficiency:Infinity)*(.9+random()*.2),n=Math.min(spec.total-waveKills,Math.max(1,Math.floor(rate/60*45)));
  const duration=n/rate*60/(1-s.movementShare)+(waveKills===0?6:0);
  if(!spend(duration,'forest'))return;
  const failed=random()<Math.min(.6,s.failureRate*duration/180*(1+Math.max(0,5-p.heroes[p.hero])*.15));
  const count=failed?Math.floor(n*(.2+random()*.5)):n;
  for(let j=0;j<count;j++){awardFarmSeedDrop({progress:p,mapId:'forest',random},{type:'enemy',hp:0});const r=clearingKillReward(wave,waveKills,p),identity=enemyIdentity(1600,400,Math.min(spec.rankCap,random()+spec.rankBonus)),mat=awardMaterials(p,{...identity,type:'enemy'},random,r.attempts);
   for(const k of Object.keys(mat))p.materials[k]-=mat[k];income('forest',{coins:r.coins,wood:r.wood,...mat});awardMastery(p,p.weapon,'enemy');waveKills++;}
  if(failed){failures.forest=(failures.forest||0)+1;spend(T.deathRecoverySeconds,'forest');}
  if(waveKills===spec.total){p.mainline.seen.wave=1;if(wave%5===0)bossReady=true;else{wave++;waveKills=0;}}
 }
 // 秘境逐关发奖，退出后从第一关重来；指定主线目标允许冲到目标层后再返程。
 function realm(mode,required=0){if(!outing){outing=mode;outingRequired=required;outingStart=seconds;stage=1;}
  const spec=realmStageSpec(mode,stage),power=mode==='rogue'?1+(stage-1)*.22:weaponGrowth(p.weapons[p.weapon],p)*heroGrowth(p.heroes[p.hero],p);
  const difficulty=Math.max(.65,Math.sqrt(spec.hp/(32*power))),throughput=s.efficiency*(1-s.movementShare);
  const duration=spec.total/(s.realmKills*(mode==='guardian'?3:1)*throughput)*60*difficulty+(mode==='guardian'?20:mode==='tower'?5:12)+(spec.boss?s.bossSeconds/s.efficiency:0)+15;
  if(stage>1&&stage>required&&seconds-outingStart+duration>s.expeditionMinutes*60){leaveRealm('回营整备');return;}
  if(!spend(duration,mode))return;
  if(random()<Math.min(.75,s.failureRate+Math.max(0,difficulty-1.4)*.18)){failures[mode]=(failures[mode]||0)+1;leaveRealm('挑战失败');return;}
  const record=p.realms.records[mode];income(mode,realmReward(mode,stage,record.best,p));record.best=Math.max(record.best,stage);record.clears++;awardCampXp(p,'realm');if(spec.boss)record.bosses++;
  if(mode==='rogue')p.mainline.seen.blessing=1;if(mode==='guardian')p.mainline.seen.defense=1;stage++;
  if(required&&stage>required||stage>40)leaveRealm('完成本次目标');
 }
 // 永久交易只在返程以后进行，休整局内币不混入永久钱包。
 function leaveRealm(reason){spend(T.roundTripSeconds/s.efficiency,'travel');lastVisit=seconds;outings.push({mode:outing,start:outingStart/60,end:seconds/60,cleared:stage-1,reason});outing=null;}
 // 故事和生活委托一次性发放正式内容奖励，不把临时借装视为永久获得。
 function story(id,living=false){const minutes=living?T.livingMinutes:T.storyMinutes[id]??4;
  if(!spend(minutes*60/s.efficiency,'task'))return;
  if(random()<s.failureRate){failures.task=(failures.task||0)+1;return;}
  const record=p.story.chapters[id];if(!record.rewardClaimed){income('task',STORY_CAMPAIGN[id].reward);awardCampXp(p,living?'living':'story',id);}
  record.completed=record.rewardClaimed=true;
  if(living)Object.assign(p.living.requests[id],{completed:true,stage:99});
 }
 // 非消费目标按对应活动花费时间后记录，挑战等级和拥有等级绝不直接写成达标值。
 function action(c){if(!c)return false;const path=c.path||'';
  if(path.includes('story.chapters')){story(path.split('.')[3]);return true;}
  if(path.includes('living.requests')){story(path.split('.')[3],true);return true;}
  if(path.includes('realms.records')){const mode=path.split('.')[3];
   if(['rogue','tower','guardian'].includes(mode)){realm(mode,c.min||1);return true;}
   if(!spend((mode==='fire'?T.fireSeconds/s.efficiency:FOOTBALL.duration),'task'))return true;
   if(mode==='fire'&&random()<s.failureRate){failures.task=(failures.task||0)+1;return true;}
   awardCampXp(p,mode);p.realms.records[mode].clears++;p.realms.records[mode].best=1;
   income('task',mode==='fire'?{coins:GAMEPLAY_VALUES.fire.rewardBase+4*GAMEPLAY_VALUES.fire.rewardPerTree}:footballReward(Math.max(1,Math.round(3*s.efficiency))));
   if(mode==='fire'){p.vehicleHulls[4]||=1;grantVehicleArmament(p,4);}return true;
  }
  // 复习沿用正式清缴耗时和兽潮胜利要求，不按普通界面操作的三十秒跳过。
  const op=currentMainlineTask(p.mainline)?.guide.steps.find(s=>s.operation?.record&&path==='progress.mainline.seen.'+s.operation.record)?.operation;
  if(op?.type==='camp-defense'){if(spend(T.campSeconds/s.efficiency,'task')){const failed=random()<s.failureRate;if(!failed)awardCampXp(p,'horde');income('task',CAMP_DEFENSE.grades[failed?'B':'A']);if(!op.win||!failed)p.mainline.seen[op.record]=1;}return true;}
  if(op?.type==='clearing'){if(op.indices&&!op.indices.includes(p.weapon)){const owned=op.indices.find(i=>p.weapons[i]);if(owned===undefined)return false;p.weapon=owned;}const before=p.bosses;forest();if(p.bosses>before)p.mainline.seen[op.record]=1;return true;}
  if(path==='progress.bosses'){forest();return true;}
  if(c.controllerReady){const i=[12,15,16].find(i=>p.weapons[i]);if(i===undefined)return false;if(spend(30,'task')){p.weapon=i;p.mainline.seen.config=1;}return true;}
  if(path==='progress.weapon'){if(p.weapons[c.equals]){p.weapon=c.equals;spend(5,'task');return true;}return false;}
  if(path.startsWith('progress.mainline.')){if(path.endsWith('wave')){forest();return true;}
   if(!spend((path.endsWith('valley')?90:path.endsWith('map')?10:path.endsWith('distance')?20:30)/s.efficiency,'task'))return true;
   const keys=path.split('.').slice(1),last=keys.pop(),owner=keys.reduce((o,k)=>o[k],p);owner[last]=c.min??c.equals;return true;}
  return false;
 }
 // 生活整板可选路线明确付出额外任务耗时，不能把二选一都领取或将借装当赠品。
 function collection(){if(s.collection!=='hovercraft'||!p.mainline.completed.includes('neighbors')||p.vehicleHulls[3])return false;
  const post=STORY_POSTS.find(p=>p.id==='monster-neighbors');if(p.story.boardRewards?.[post.id])return false;
  const id=post.chapters.find(id=>!p.story.chapters[id].completed);if(id){story(id,true);return true;}
  p.vehicleHulls[3]=1;grantVehicleArmament(p,3);p.story.boardRewards[post.id]='hovercraft';event('buy','vehicle',3,1,'邻里谢礼：气垫船');return true;
 }
 // 玩法偏好只分配自由活动时间，主线指定玩法仍需亲自完成。
 function activity(){
  // 自由时间仅依据玩法偏好，不再因旧购买资格强制挑战。
  const used=Object.keys(s.weights).reduce((n,k)=>n+(activityTimes[k]||0),0);
  return Object.keys(s.weights).filter(k=>s.weights[k]>0).sort((a,b)=>(activityTimes[a]||0)-s.weights[a]*(used+60)-((activityTimes[b]||0)-s.weights[b]*(used+60)))[0];}
 // 入职演出与固定施工用正式时长；寻找树木和返回工坊按情景效率计时。
 if(!s.initial){
  spend(Object.values(RANGER_STAGES).reduce((n,stage)=>n+stage.seconds,0)+RANGER.rebuildSeconds+RANGER.workSeconds,'task');
  spend(Math.ceil((RANGER.repairWood+RANGER.pistolWood)/config.tree.wood)/(s.treeRate*s.efficiency*(1-s.movementShare))*60,'task');
  spend(T.roundTripSeconds/s.efficiency,'travel');
 }completion();
 while(completeAt===null&&seconds<s.minutes*60-1e-6){const before=seconds;
  if(outing){realm(outing,outingRequired);continue;}
  tendFarm();if(seconds>=s.minutes*60-1e-6)break;
  if(collection()){shop();continue;}
  const t=currentMainlineTask(p.mainline);
  if(t&&mainlineCondition({progress:p},t.goal)){
   if(!spend(T.dialogueSeconds+T.roundTripSeconds/s.efficiency,'task'))break;
   const reward=awardMainline(p,t.id);income('task',reward,true);taskTimeline.push({minute:seconds/60,id:t.id,title:t.title,reward});
  }else{
   if(shop()){completion();if(completeAt!==null)break;continue;}
   const c=t&&unresolved(t.goal);
   if(!action(c||{})){const a=activity();if(a==='forest')forest();else if(a==='logging'){if(spend(60,'logging')){const n=Math.floor(s.treeRate*s.efficiency*(1-s.movementShare)),r=forestReward('tree',0,p);income('logging',{coins:r.coins*n,wood:r.wood*n});countCampActivity(p,'trees',n);}}else realm(a);}
  }
  // 回访频率消耗真实返程时间，不是免费瞬移；森林波次序号继续保留。
  if(!outing&&seconds-lastUpgrade>=Math.min(s.workshopMinutes,seconds<1800?2:60)*60){shop();}
  completion();if(completeAt!==null)break;if(seconds/60-curve.at(-1).minute>=2)curve.push({minute:seconds/60,...wallet(p)});
  if(seconds===before)throw Error('模拟没有消耗时间');
 }
 curve.push({minute:seconds/60,...wallet(p)});const end=completeAt??seconds/60;
 const cadence=growthCadence(timeline,end),goal=cursor<s.route.length?s.route[cursor]:null,deficits=goal?equipmentRequirements(p,...goal).filter(r=>r.missing):[];
 const totals={income:{},expense:{}};for(const group of Object.keys(totals))for(const [key,n] of Object.entries(p.economyLog[group])){const k=key.split(':').at(-1);totals[group][k]=(totals[group][k]||0)+n;}
 return {seed,completed:completeAt!==null,completionMinute:completeAt,completionLevels,levels:levels(),timeline,taskTimeline,purchases:timeline.filter(e=>e.type==='buy'),curve,outings,initial,remaining:wallet(p),totals,activityTimes,sources,failures,bought,upgrades,
  longestGap:Math.max(0,...[...timeline.filter(e=>e.minute<=end).map(e=>e.minute),end].map((time,i,all)=>time-(i?all[i-1]:0))),cadence,deficits,waiting:[],firstUpgrade,mainlineCompleted:p.mainline.completed.length,
  milestones:{camp:{...p.campLevel},bosses:p.bosses,wave,waveKills,records:p.realms.records},ledger:p.economyLog};
}
