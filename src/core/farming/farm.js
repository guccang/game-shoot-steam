import {farmToolReady} from '../../config/farm-tools.js';
import {oxFoot,oxSiteFromFoot} from '../../config/pasture.js';
import {movementLoadFactor} from '../../progression/inventory/load-weight.js';
import {driveReaper,releaseReaper,farmRowFrom,queueReaperRow} from './row-reaper.js';
import {farmAutoStep} from './farm-auto-route.js';
import {recordCodexCrop} from '../../progression/player/codex-statistics.js';
import {harvestDestination,harvestLoadPreview} from './farm-harvest-load.js';
import {isRainWeather} from '../../world/season-weather.js';
import {sellCrops} from '../inventory/cargo.js';
import {storyDeliveryReady} from '../story/story-definition.js';
// 农活事务与走近执行队列；动作命中时才扣种子、开地或收获作物。
import {recordGardeningAction} from '../../progression/story/mainline-gardening.js';
import {FARM_ACTION_TIMING,FARM_COMBAT_RESUME_DELAY} from '../../config/farm-tools.js';
export {FARM_ACTION_TIMING} from '../../config/farm-tools.js';
import {validateProgress} from '../../progression/progress.js';
import {grantSeedReward} from '../../progression/economy/seed-reward.js';
import {farmGrowth,wetFarmPlot} from '../../progression/farming/farm.js';
import {wildFarmTime} from '../../progression/farming/wild-farm-age.js';
import {FARM_CROPS,FARM_MAX_PLOTS,FARM_STOCK_CAP,FARM_WATER,OX_PLOW,farmPosition} from '../../config/farm.js';
import {worldDistance,nearest,canonical,WORLD} from '../../world/coordinates.js';
import {farmLandReason,farmApproach,farmDigTarget,snapFarmPoint} from '../../world/farm-land.js';
import {mineEntranceFarmBlocked} from '../../world/mine-entrances.js';
import {naturalWaypoint} from '../../physics/terrain-navigation.js';
import {blocked} from '../../physics/motion.js';
import {attackTargetDistance,attackTargetKnown} from '../../combat/perception.js';
import {clearingCombatActive} from '../camp/living-safety.js';
import {vehicleWeapon} from '../../config/vehicles.js';
// 故事自由行动与回营待交付可处理永久田地；对白、试用和调查演出仍锁定农活。
export function storyFarmAllowed(game){return !game.story||!game.story.trial&&!game.story.interacting&&(game.story.phase==='active'||game.story.phase==='prepare'&&storyDeliveryReady(game));}
// 正常步行探索可随处种田，副本、驾驶、演出和对话期间不能处理永久田地。
function farmContext(game,allowMounted=false){return ['forest','jiuzhaigou'].includes(game.mapId)&&(allowMounted||!game.vehicle?.active)&&storyFarmAllowed(game)&&!game.realm&&!game.arrivalCinematic&&!game.cottage&&!game.workshopTrial&&!game.campDefense&&!game.fireActive&&!game.mainlineSpeech&&!!game.player;}
// 驾驶中保留种田入口，点击后先安全下车；暂停许可仅供既有返车会话的校验与退出。
export function canEnterFarm(game,allowPaused=false){return (game.state==='playing'||allowPaused&&game.state==='paused')&&farmContext(game,true);}
// 只有游玩态可提交农活，暂停时保留当前动作而不结算。
export function canUseFarm(game){return game.state==='playing'&&farmContext(game);}
// 种田模式保留工具与工作队列，自动迎敌期间仍属于同一次种田操作。
export function farmMode(game){return !!game.farmWork?.tool&&['playing','paused'].includes(game.state)&&farmContext(game);}
// 迎敌时恢复原武器与独立控制器，农具动作暂停，世界继续运行。
export function farmWorking(game){return farmMode(game)&&!game.farmWork.autoCombat;}
// 仅攻击武器使用射程与发现规则迎敌；纯防具不因附近怪物打断农活。
export function farmThreat(game){
 const weapon=game.weapon?.();if(!weapon||weapon.attackKind==='defense')return false;
 return [...(game.enemies||[]),...(game.boss?[game.boss]:[])].some(e=>e.hp>0&&e.type!=='tree'&&attackTargetDistance(game,e,weapon.range+(e.radius||0))<weapon.range+(e.radius||0)&&attackTargetKnown(game,e));
}
// 新农活入口先避让战斗；驾驶威胁按当前车炮射程判断，不能把远处发现记忆当作交战。
// 既有农活的暂停与恢复仍由自动迎敌状态机负责，不在入口检查中清空队列。
export function farmInteractionBlocked(game){
 const mountedWeapon=game.vehicle?.active&&vehicleWeapon(game.loadout||game.progress,game.vehicle.weaponIndex);
 return !!game.farmWork?.autoCombat||!!game.livingBattle||!!game.campDefense||!!game.fireActive||clearingCombatActive(game)||farmThreat(game)||
  !!mountedWeapon&&[...(game.enemies||[]),...(game.boss?[game.boss]:[])].some(e=>e.hp>0&&e.type!=='tree'&&worldDistance(e,game.player)<=mountedWeapon.range&&attackTargetKnown(game,e));
}
// 记住本次交战实体；进入按真实射程，退出使用更远边界与持续时间，避免击退造成工具来回切换。
function updateFarmCombat(game,dt){
 const work=game.farmWork,weapon=game.weapon?.();if(!weapon)return false;
 // 切换到纯防具立即解除迎敌与警戒记忆，保留农活队列并继续原有恢复流程。
 if(weapon.attackKind==='defense'){work.combatTargets?.clear();work.combatRecovery=0;return false;}
 const targets=work.combatTargets??=new Map(),live=new Set([...(game.enemies||[]),...(game.boss?[game.boss]:[])]);
 for(const [target,record] of targets)if(!live.has(target)||target.hp<=0||target.id!==record.id)targets.delete(target);
 for(const target of live){
  if(!(target.hp>0)||target.type==='tree')continue;
  const range=weapon.range+(target.radius||0),distance=worldDistance(target,game.player);
  if(distance<range&&attackTargetKnown(game,target)){targets.set(target,{id:target.id,away:0});continue;}
  const record=targets.get(target);if(!record)continue;
  // 只有已参战怪物使用脱战缓冲；击退运动不算逃离，普通射程外的新怪不会延长农活暂停。
  if(distance<=range+Math.max(240,weapon.range*.5)||target.knockTime>0)record.away=0;
  else record.away+=Math.max(0,dt);
  if(record.away>=3)targets.delete(target);
 }
 // 目标清空后先完成警戒；新威胁立刻清零，期间农活与动作计时继续冻结。
 if(targets.size){work.combatRecovery=0;return true;}
 if(work.autoCombat){
  work.combatRecovery=(work.combatRecovery||0)+Math.max(0,dt);
  if(work.combatRecovery<FARM_COMBAT_RESUME_DELAY)return true;
 }
 work.combatRecovery=0;return false;
}
// 双格壶只扩展到正右侧紧邻的一格；首格无效时整次操作取消。
export function farmWaterTargets(farm,plotId,mapId,now=Date.now()){
 const center=farm.plots.find(p=>p.id===plotId),eligible=p=>p.mapId===mapId&&p.crop!==null&&farmGrowth(p,now)<1;
 if(!center||!eligible(center))return [];
 if(!farm.doubleCan)return [center];
 const right=farm.plots.find(plot=>{
  if(!eligible(plot))return false;
  const point=nearest(plot,center);
  return Math.abs(point.x-center.x-56)<.01&&Math.abs(point.y-center.y)<.01;
 });
 return right?[center,right]:[center];
}
// 保存先于反馈，飞行金币只是已到账金额的表现，不承担奖励结算。
export function commitFarm(game,next,event){
 let saved=false;try{saved=(game.livingPersist?.(next)??true)===true;}catch{saved=false;}
 if(!saved)return {ok:false,message:'保存失败，本次没有扣费或结算，请重试。'};
 game.progress=next;game.farmSignals||=[];game.farmSignals.push(event);if(game.farmSignals.length>32)game.farmSignals.shift();game.onEvent?.('farm-change',event);return {ok:true,...event};
}
// 只提交真实发生的一格动作；所有操作再次核验地图、距离与成熟状态。
export function farmAction(game,action,{plot:plotId,point,crop:cropId=0,removal,loadConfirmation,now=Date.now()}={}){
 if(action==='sell')return sellCrops(game);
 // 田块事务只在安全下车后执行，驾驶点击走与步行相同的农活队列。
 if(!canUseFarm(game))return {ok:false,message:'请结束当前活动并下车，再拿起农具。'};
 if(!Number.isFinite(now)||now<0||!Number.isInteger(cropId)||cropId<0)return {ok:false,message:'农田操作参数无效。'};
 const next=validateProgress(structuredClone(game.progress)),f=next.farm,p=f.plots.find(p=>p.id===plotId),crop=FARM_CROPS[cropId];
 // 空田的湿度属于土壤；播种重置本茬加速状态时，保留这份已获得的水分。
 const plantedInWetSoil=action==='plant'&&p?.watered===true;
 // 空田保留设备供水来源，播种后仍可用于本茬的设备照料收获判定。
 const plantedInSprinklerSoil=plantedInWetSoil&&p.sprinklerWatered===true;
 const cell=action==='dig'?point:p?farmPosition(p):null;
 // 旧档已有的入口田可以收获或移除，但不能继续播种；提交时再次校验排队期间新增洞口。
 if(['dig','plant'].includes(action)&&mineEntranceFarmBlocked(game.progress.mining,cell))return {ok:false,message:'矿洞和入口坡道不能种植，请选择旁边的草地。'};
 if(['dig','plant','harvest','water','remove'].includes(action)&&(!cell||cell.mapId!==game.mapId||worldDistance(game.player,cell)>78))return {ok:false,message:'先走到这块田边再操作。'};
 let message='',coins=0,harvest=null,lesson=null,wateredPlots=[],destination=null;
 if(action==='dig'){
  const reason=farmLandReason(game,cell);if(reason)return {ok:false,message:reason};
  if(f.plots.length>=FARM_MAX_PLOTS)return {ok:false,message:'已达到可保存的田块数量上限。'};
  const id=f.nextId++;f.plots.push({id,mapId:cell.mapId,x:cell.x,y:cell.y,crop:null,plantedAt:0,readyAt:0,watered:false});plotId=id;f.dug++;message='开出一块新田，点击空田选种';
 }else if(action==='plant'){
  if(!p||p.crop!==null)return {ok:false,message:'请选择开垦好的空田。'};
  if(!crop)return {ok:false,message:'请选择有效的种子。'};
  if(!(f.seeds[cropId]>0))return {ok:false,message:'这包种子已用完，可打怪获取，或前往种子小屋购买已解锁品种。'};
  f.seeds[cropId]--;
  Object.assign(p,{crop:cropId,plantedAt:now,readyAt:now+crop.seconds*1000,watered:false,sprinklerWatered:false});f.planted++;recordCodexCrop(next,cropId,'planted');
  // 只有成功播种才延长野外田地寿命，收获、浇水和失败事务不续期。
  if(p.wild)p.wildSownAt=wildFarmTime(next.living.calendar);
  message='已播种'+crop.name+' · 消耗库存种子 1 粒';
 }else if(action==='water'){
  const targets=farmWaterTargets(f,plotId,game.mapId,now);
  if(!targets.length)return {ok:false,message:'请选择尚未成熟的作物。'};
  // 湿田允许重复倒水；只有本茬第一次浇水缩短时间，读档后仍保持加速上限。
  for(const target of targets){const savedSeconds=wetFarmPlot(f,target,now);wateredPlots.push({id:target.id,...farmPosition(target),savedSeconds});}
  message=wateredPlots.some(p=>p.savedSeconds>0)?`已浇灌 ${targets.length} 块田 · 本茬最多提前 ${FARM_WATER.reduction*100}%成熟`:'已再次浇水，土壤保持湿润 · 本茬加速已生效';
 }else if(action==='harvest'){
  if(!p||p.crop===null||farmGrowth(p,now)<1)return {ok:false,message:'这块田还没有成熟。'};
  if(p.sprinklerWatered&&!p.wild)next.production.wateredHarvest=true;
  harvest=p.crop;recordCodexCrop(next,harvest,'harvested');destination=harvestDestination(game);const stock=destination.hull===null?f.inventory:next.logistics.builds[destination.hull].cargo;const grown=FARM_CROPS[harvest];if(stock[harvest]>=FARM_STOCK_CAP)return {ok:false,message:'作物库存已满，请先装车或出售。'};
  stock[harvest]++;f.xp=Math.min(FARM_STOCK_CAP,f.xp+grown.xp);f.harvested=Math.min(FARM_STOCK_CAP,f.harvested+1);
  Object.assign(p,{crop:null,plantedAt:0,readyAt:0,watered:false,sprinklerWatered:false});message=grown.name+'收获，'+destination.name+'作物 +1；靠近仓库出售未保留的收成，也可到种子小屋或快递站出售。';
  if(p.wild)message+=' · 野外也能种田，点击空田即可继续播种';
 }else if(action==='remove'){
  if(!p)return {ok:false,message:'这块田已经不存在了。'};
  if(!farmRemovalAllowed(p,removal))return {ok:false,message:'田里的作物已变化，请重新确认移除。'};
  f.plots=f.plots.filter(plot=>plot.id!==plotId);
  // 已完成浇水的事实保留；尚未照料的任务田移除后可以重新选田播种。
  const gardening=next.mainline.gardening;
  if(gardening.plotId===plotId){gardening.plotId=null;if(!gardening.watered){gardening.planted=0;gardening.harvested=0;}}
  message='地块已移除，可在原地重新开垦';
 }else return {ok:false,message:'未知农田操作。'};
 // 首次照料就给下一次种植的种子；旧档直接收获也能领取，二者共用一次性标记。
 if(['water','harvest'].includes(action))lesson=gardeningSeedReward(game,next);
 recordGardeningAction(next,action,{crop:action==='harvest'?harvest:action==='water'?p?.crop:cropId,plot:plotId});
 if(isRainWeather(game.livingWeather)){
  const rain=wetPlots(next,f.plots.filter(p=>p.mapId===game.mapId&&!p.watered),now);
  if(rain.some(p=>p.crop!==null))lesson??=gardeningSeedReward(game,next);
  if(rain.length)message+=' · 雨水已润湿田地，无需浇水';
 }else if(plantedInWetSoil){
  // 雨停或天气切换后，新作物也继承湿土；只处理本田，不浇湿附近干田。
  wetPlots(next,[p],now);lesson??=gardeningSeedReward(game,next);message+=' · 土壤保持湿润，无需浇水';
 }
 if(plantedInSprinklerSoil)p.sprinklerWatered=true;
 if(lesson)message+=' · '+(lesson.count?'园艺入门完成，':'')+lesson.message;
 // 收获、经验与奖励种子同一候选进度预演，拒绝时不修改田块或任何库存。
 if(action==='harvest'){
  const load=harvestLoadPreview(game,next,destination),original=game.progress.farm.plots.find(p=>p.id===plotId);
  const confirmation=JSON.stringify({plot:plotId,mapId:game.mapId,crop:harvest,plantedAt:original.plantedAt,...load});
  if(load.overloaded&&loadConfirmation!==confirmation)return {ok:false,needsLoadConfirmation:true,confirmation,load,crop:harvest,message:'收获后载荷将满，请确认是否继续收获。'};
 }
 return commitFarm(game,next,{action,plot:plotId,point:cell,coins,harvest,destination,lesson:!!lesson?.count,wateredPlots,message});
}
// 非空田必须确认同一茬作物，排队期间换种不能沿用旧确认。
function farmRemovalAllowed(plot,removal){return plot.crop===null||removal?.crop===plot.crop&&removal?.plantedAt===plot.plantedAt;}
// 换工具取消待办，不回滚已成功完成的单格动作。
export function setFarmTool(game,tool){
 if(tool&&!farmToolReady(game.progress,tool))return false;
 // 再次使用耕牛立即重新计算闲置时间，接近和临时迎敌也不算弃用。
 if(tool==='ox'){game.progress.farm.oxIdleSeconds=0;game.oxIdleRetry=0;}
 releaseReaper(game);
 game.farmWork=tool&&canUseFarm(game)?{tool,job:null,queue:[],autoCombat:false,combatRecovery:0}:null;
 if(game.farmWork&&tool==='reaper')game.farmWork.reaper={facing:1,axis:game.progress.farm.axis,held:false,line:[],travel:0};
}
// 拖过多个地块只安排队列，排队时不提前扣费或发奖。
export function queueFarmWork(game,action,{plot,point,crop=0,tree,view,removal,seedFacing}={}){
 if(!canUseFarm(game))return {ok:false,message:'请下车后操作农具。'};
 const p=game.progress.farm.plots.find(p=>p.id===plot);
 const dig=action==='dig'?farmDigTarget(game,point||game.player,view):null;
 const target=dig?dig.point:action==='saw'?tree:p;
 if(['dig','plant'].includes(action)&&mineEntranceFarmBlocked(game.progress.mining,target))return {ok:false,message:'矿洞和入口坡道不能种植，请选择旁边的草地。'};
 if(!target||action==='saw'&&!(target.hp>0))return {ok:false,message:'没有可操作的目标。'};
 if(dig?.reason)return {ok:false,message:dig.reason};
 if(action==='remove'&&(p.mapId!==game.mapId||!farmRemovalAllowed(p,removal)))return {ok:false,message:'请重新选择地块并确认移除。'};
 const waterTargets=action==='water'?farmWaterTargets(game.progress.farm,plot,game.mapId):[];
 if(action==='water'&&!waterTargets.length)return {ok:false,message:'请选择尚未成熟的作物。'};
 if(['plant','harvest'].includes(action)&&(p.mapId!==game.mapId||(action==='plant'?p.crop!==null:p.crop===null||farmGrowth(p)<1)))return {ok:false,message:'当前田块不适合这个操作。'};
 if(!game.farmWork)setFarmTool(game,action==='saw'?'saw':action==='water'?'water':'hoe');const work=game.farmWork;
 const key=action+':'+(action==='dig'?target.x+','+target.y:action==='saw'?tree.id:plot);
 if([work.job,...work.queue].some(j=>j?.key===key))return {ok:true,point:target,message:'这块田已经安排好了'};
 if(work.queue.length>=(work.tool==='seeder'?FARM_MAX_PLOTS:32))return {ok:false,message:'先完成已安排的农活，再继续安排。'};
 work.queue.push({key,action,id:plot,crop,seedFacing,removal:removal?{crop:removal.crop,plantedAt:removal.plantedAt}:undefined,treeId:tree?.id,point:{...farmPosition(target),...target,mapId:game.mapId},waterTargets:waterTargets.map(p=>({id:p.id,...farmPosition(p)})),elapsed:0,farmPoseTime:0,hit:false,travel:0});
 return {ok:true,point:target,message:action==='remove'?'已安排移除，猫猫会走近平整土地':action==='water'?`走近浇灌，最多照顾 ${waterTargets.length} 块田`:action==='dig'?'走近挥锄…':action==='plant'?'已安排播种，猫猫会依次走近撒种':action==='harvest'?'已安排收割，猫猫会依次走近挥镰':'走近树边，准备锯木…'};
}
// 从较近的田头开始条播，跳过已有作物和已安排的格子，每格落种时才真正扣料。
export function queueSeedRow(game,plotId,crop){
 const work=game.farmWork,farm=game.progress.farm;
 if(!farmToolReady(game.progress,'seeder')||!canUseFarm(game)||work?.tool!=='seeder'||farmInteractionBlocked(game))return {ok:false,message:'请在安全的田边拿起条播机。'};
 const plots=farm.plots.filter(p=>p.mapId===game.mapId),anchor=plots.find(p=>p.id===plotId);
 if(!anchor)return {ok:false,message:'请点选要播种的田行。'};
 const left=farmRowFrom(plots,anchor,-1,farm.axis).reverse(),right=farmRowFrom(plots,anchor,1,farm.axis);
 const row=left.concat(right.slice(1));
 const facing=worldDistance(game.player,row.at(-1))<worldDistance(game.player,row[0])?-1:1;
 if(facing<0)row.reverse();
 const pending=[work.job,...work.queue].filter(j=>j?.action==='plant'&&!j.hit);
 const reserved=new Set(pending.map(j=>j.id));
 const empty=row.filter(p=>p.crop===null&&!reserved.has(p.id)&&!mineEntranceFarmBlocked(game.progress.mining,p));
 if(!empty.length)return {ok:false,message:'所选方向没有待播的空田。'};
 const stock=(farm.seeds[crop]||0)-pending.filter(j=>j.crop===crop).length;
 if(stock<=0)return {ok:false,message:'这个品种没有可用种子，请换一种。'};
 const targets=empty.slice(0,stock);
 for(const p of targets)queueFarmWork(game,'plant',{plot:p.id,crop,seedFacing:facing});
 return {ok:true,message:`已安排条播 ${targets.length} 格`+(targets.length<empty.length?'，余下空田需要更多种子。':'。')};
}
// 确认只绑定仍在等待的这一份作物；取消停止队列，不改变农田和仓库。
export function resolveHarvestLoad(game,job,accepted){
 const work=game.farmWork;if(!work||work.job!==job||!job.loadRequest)return {ok:false,message:'收获目标已变化，请重新选择。'};
 if(!accepted){work.job=null;work.queue=[];work.result={ok:false,message:'已停止收割，作物仍留在田里。'};return work.result;}
 job.loadConfirmation=job.loadRequest.confirmation;job.loadRequest=null;return {ok:true,message:'已确认本次收获。'};
}
// 迎敌冻结农活但允许走位，受伤不丢队列；普通农活中主动走位仍取消待办，切图退出模式。
// 作业预览与正式落点共用田垄起点和间距。
export function oxTarget(game,index=1){
 const ox=game.farmWork?.ox;
 let origin=ox?.row;
 if(!origin){
  let best=null,distance=300;
  for(const plot of game.progress.farm.plots){
   if(plot.mapId!==game.mapId)continue;
   const d=worldDistance(game.player,plot);if(d<distance){best=plot;distance=d;}
  }
  origin=snapFarmPoint(game.player,game.mapId,best);
 }
 return {...canonical({x:origin.x+(game.progress.farm.axis==='column'?0:(ox?.facing||1)*OX_PLOW.spacing*index),y:origin.y+(game.progress.farm.axis==='column'?(ox?.facing||1)*OX_PLOW.columnSpacing*index:0)}),mapId:game.mapId};
}
// 松手或中断立即抬犁，重新按住时从当前脚底起垄。
export function liftOxPlow(game){
 const ox=game.farmWork?.ox;if(ox){ox.held=false;ox.row=null;ox.auto=null;}
}
// 点格启动高级农具：推镰收完整田行，耕牛从所选格沿朝向开到连续可耕地边界。
export function queueAdvancedFarm(game,{plot,point,view}={}){
 const work=game.farmWork;
 if(!canUseFarm(game)||farmInteractionBlocked(game)||!work||!farmToolReady(game.progress,work.tool))return {ok:false,message:'请先在安全的田边拿起农具。'};
 if(work.tool==='reaper')return queueReaperRow(game,plot);
 if(work.tool!=='ox')return {ok:false,message:'请先选择耕牛或收割器。'};
 const ox=work.ox;if(!ox||ox.turn)return {ok:false,message:'请等耕牛完成掉头。'};
 const anchor=game.progress.farm.plots.find(p=>p.id===plot&&p.mapId===game.mapId);
 const target=anchor?{point:anchor}:farmDigTarget(game,point,view);
 if(target.reason||!target.point)return {ok:false,message:target.reason||'请点选要开垦的格子。'};
 const column=game.progress.farm.axis==='column',spacing=column?OX_PLOW.columnSpacing:OX_PLOW.spacing,line=[];
 const limit=Math.min(FARM_MAX_PLOTS,Math.floor((column?WORLD.height:WORLD.width)/spacing));
 let available=FARM_MAX_PLOTS-game.progress.farm.plots.length,newPlots=0;
 for(let i=0;i<limit;i++){
  const cell={...canonical({x:target.point.x+(column?0:i*spacing*ox.facing),y:target.point.y+(column?i*spacing*ox.facing:0)}),mapId:game.mapId};
  const existing=game.progress.farm.plots.find(p=>p.mapId===game.mapId&&worldDistance(p,cell)<1);
  if(farmLandReason(game,cell,existing?.id)||!oxRigClear(game,cell,ox.yaw))break;
  if(!existing){if(available<=0)break;available--;newPlots++;}
  line.push(cell);
 }
 if(!newPlots)return {ok:false,message:'这个方向没有可开垦的空地，请换一格或掉头。'};
 liftOxPlow(game);ox.auto={line,mapId:game.mapId,route:null};
 return {ok:true,message:'已安排自动犁地，沿当前'+(column?'列':'行')+'前进，到边界停下。'};
}
// 自动开田保持真实牵行；到格后再次验证土地，禁止预扣、覆写已有作物或失败后空跑。
function driveAutoOx(game,work,dt){
 const ox=work.ox,auto=ox.auto,target=auto.line[0];
 if(auto.mapId!==game.mapId||!target){liftOxPlow(game);return {x:0,y:0};}
 const step=farmAutoStep(game,auto,target,dt,OX_PLOW.speed,28);
 ox.held=worldDistance(game.player,target)<32;
 if(step.failed){liftOxPlow(game);work.result={ok:false,message:'牛犁前方受阻，已停止作业。'};return step.input;}
 if(!step.arrived)return step.input;
 const existing=game.progress.farm.plots.find(p=>p.mapId===game.mapId&&worldDistance(p,target)<1);
 if(!existing){work.result=farmAction(game,'dig',{point:target});if(!work.result.ok){liftOxPlow(game);return step.input;}}
 auto.line.shift();if(!auto.line.length)liftOxPlow(game);
 return step.input;
}
// 作业中的世界锚点在牛蹄，两侧牛身及后方犁铧均须能够通行。
export function oxRigClear(game,foot,yaw){
 const body={...game.player,mapId:game.mapId,livingCollision:game.mapId==='forest'},trees=game.trees||[];
 return !blocked(foot.x,foot.y,28,trees,body)&&!blocked(foot.x-18*Math.cos(yaw),foot.y-15,10,trees,body);
}
// 猫与牛共用一格脚底，掉头只改变挽具朝向。
export function turnOx(game,direction){
 const work=game.farmWork,ox=work?.ox;if(!ox||ox.approach||ox.turn)return;
 const start=ox.yaw??(ox.facing===1?0:Math.PI),end=(game.progress.farm.axis==='column'?Math.PI/2:0)+(direction===1?0:Math.PI);
 const shortest=Math.atan2(Math.sin(end-start),Math.cos(end-start));
 if(Math.abs(shortest)<.001)return;
 const first=Math.abs(Math.abs(shortest)-Math.PI)<.001?Math.PI:shortest;
 for(const sweep of [first,first-Math.sign(first)*2*Math.PI]){
  const sign=Math.sign(sweep);
  let clear=true;
  for(let i=1;i<=32;i++){
   const angle=start+sweep*i/32;
   if(!oxRigClear(game,game.player,angle)){clear=false;break;}
  }
  if(clear){liftOxPlow(game);ox.turn={start,sign,sweep,elapsed:0,direction};return;}
 }
 if(work.result?.message!=='附近空间不足，请牵到开阔处掉头。')work.result={ok:false,message:'附近空间不足，请牵到开阔处掉头。'};
}
// 移动受同一组牛蹄与犁铧碰撞点约束。
function driveOxPlow(game,work,input,dt){
 if(!game.progress.farm.oxPlow){setFarmTool(game,null);return input;}
 const ox=work.ox??={phase:0,facing:game.progress.farm.oxSite?.facing||1,row:null,held:false};
 if(ox.auto&&Math.hypot(input.x,input.y)>.05)liftOxPlow(game);
 const player=game.player;
 if(ox.approach){
  const site=nearest(ox.approach,player),dist=worldDistance(player,site);
  if(dist>5){
   if(Math.hypot(input.x,input.y)>.1){setFarmTool(game,null);return input;}
   const guide=naturalWaypoint(player,site),angle=Math.atan2(guide.y-player.y,guide.x-player.x);
   return {x:Math.cos(angle)*Math.min(.8,dist/18),y:Math.sin(angle)*Math.min(.8,dist/18)};
  }
  ox.approach=null;
 }
 ox.yaw??=(game.progress.farm.axis==='column'?Math.PI/2:0)+(ox.facing===1?0:Math.PI);
 const along=game.progress.farm.axis==='column'?'y':'x';
 if(!ox.held&&Math.abs(input[along])>.1)turnOx(game,Math.sign(input[along]));
 if(ox.turn){
  const t=ox.turn;
  t.elapsed=Math.min(1,t.elapsed+dt*movementLoadFactor(game)*Math.PI/(OX_PLOW.turnSeconds*Math.abs(t.sweep)));
  const angle=t.start+t.sweep*t.elapsed,foot=player;
  if(oxRigClear(game,foot,angle)){
   Object.assign(player,foot);ox.yaw=angle;
   if(t.elapsed>=1){ox.facing=t.direction;ox.turn=null;}
  }else{
     ox.facing=(along==='y'?Math.sin(ox.yaw):Math.cos(ox.yaw))<0?-1:1;ox.turn=null;
   work.result={ok:false,message:'掉头路径被挡住了，已停牛。'};
  }
  player.vx=player.vy=0;
  return {x:0,y:0};
 }

 if(ox.auto)return driveAutoOx(game,work,dt);
 if(!ox.held)return {x:input.x*OX_PLOW.speed,y:input.y*OX_PLOW.speed};
 ox.row??=oxTarget(game,0);
 const target=oxTarget(game);
 if((nearest(player,ox.row)[along]-ox.row[along])*ox.facing>=(along==='y'?OX_PLOW.columnSpacing:OX_PLOW.spacing)){
  // 通行与开垦分开：跳过路面、已有田和禁种区，保持牵行及原田垄对齐。
  // 实际障碍仍由牛身碰撞处理；田块上限和事务失败也不能锁住方向移动。
  if(!farmLandReason(game,target)&&game.progress.farm.plots.length<FARM_MAX_PLOTS){
   work.result=farmAction(game,'dig',{point:target});
  }
  ox.row=target;
 }
 return {x:along==='x'?ox.facing*OX_PLOW.speed:0,y:along==='y'?ox.facing*OX_PLOW.speed:0};
}
// 实际位移和碰撞结算后才更新蹄步与停车坐标，松手立刻停车也能在同地再牵。
export function syncOxFoot(game,previous){
 const work=game.farmWork,ox=work?.ox;
 if(!ox||ox.approach||work.autoCombat)return;
 const distance=worldDistance(game.player,previous);
 ox.moving=distance>.03;ox.phase+=distance*.16;
 game.progress.farm.oxSite={...canonical(oxSiteFromFoot(game.player,ox.yaw)),mapId:game.mapId,facing:ox.facing,yaw:ox.yaw};
}
// 原有自动走近、战斗暂停和输入取消共用农活更新入口。
export function updateFarmWork(game,dt,input){
 const work=game.farmWork;if(!work)return input;if(!canUseFarm(game)){game.farmWork=null;return input;}
 if(work.tool==='seeder'){
  if(work.lastFoot)work.travel=(work.travel||0)+worldDistance(game.player,work.lastFoot);
  work.lastFoot={x:game.player.x,y:game.player.y};
 }
 const wasCombat=work.autoCombat;work.autoCombat=updateFarmCombat(game,dt);
 if(work.autoCombat){
  // 自动计划在迎敌期间冻结，路线重新验证；手动牵行仍抬犁、收刀。
  if(work.reaper?.auto)work.reaper.route=null;else releaseReaper(game);
  if(work.ox){if(work.ox.auto){work.ox.auto.route=null;work.ox.held=false;}else liftOxPlow(game);work.ox.turn=null;work.ox.moving=false;}
  return input;
 }
 if(work.tool==='reaper')return driveReaper(game,input,farmAction,dt);
 if(work.tool==='ox'){
  if(wasCombat&&work.ox&&game.progress.farm.oxSite)work.ox.approach=oxFoot(game.progress.farm.oxSite);
  return driveOxPlow(game,work,input,dt);
 }
 // 战斗后可能发生击退或闪避：未命中的动作重新走近挥动，已结算动作只完成收势，不重复扣费发奖。
 if(wasCombat&&work.job&&!work.job.hit){work.job.approach=null;work.job.elapsed=0;work.job.farmPoseTime=0;work.job.travel=0;}
 if(Math.hypot(input.x,input.y)>.05){work.job=null;work.queue=[];game.farmCursor=null;return input;}
 if(work.job?.loadRequest)return {x:0,y:0};
 if(game.farmDragging)return {x:0,y:0};
 work.job||=work.queue.shift();const job=work.job;if(!job)return input;
 if(job.point.mapId!==game.mapId){setFarmTool(game,null);return input;}
 const timing=FARM_ACTION_TIMING[job.action],target=nearest(job.point,game.player);
 if(job.elapsed===0){
  job.approach||=farmApproach(game,job.point,job.action,job.seedFacing);job.travel+=dt;
  if(!job.approach||job.travel>12){work.result={ok:false,message:'暂时走不到那里，请靠近或清理障碍后再试。'};work.job=null;work.queue=[];game.farmCursor=null;return input;}
  const goal=nearest(job.approach,game.player),d=worldDistance(game.player,goal);
  if(d>4){
   const waypoint=naturalWaypoint(game.player,goal),angle=Math.atan2(waypoint.y-game.player.y,waypoint.x-game.player.x);
   for(const turn of [0,.45,-.45,.9,-.9,1.35,-1.35]){const x=Math.cos(angle+turn),y=Math.sin(angle+turn);if(!blocked(game.player.x+x*22,game.player.y+y*22,12,game.trees||[],game.player))return {x:x*Math.min(1,d/14),y:y*Math.min(1,d/14)};}
   return {x:0,y:0};
  }
 }
 game.player.angle=Math.atan2(target.y-game.player.y,target.x-game.player.x);job.elapsed+=dt;job.farmPoseTime=job.elapsed;
 if(job.elapsed>=timing.hit&&!job.hit){
  job.hit=true;
  if(job.action==='saw'){
   const tree=game.trees.find(t=>t.id===job.treeId&&t.hp>0);if(tree&&worldDistance(tree,game.player)<=85){game.hit(tree,tree.hp+1,false,{statisticsSource:'farm-saw'});work.result={ok:true,message:'树木已清理，可以用锄头开垦附近空地'};}else work.result={ok:false,message:'树木已被清理，换一棵吧。'};
  }else work.result=farmAction(game,job.action,{plot:job.id,point:job.point,crop:job.crop,removal:job.removal,loadConfirmation:job.loadConfirmation});
  if(work.result.needsLoadConfirmation){job.hit=false;job.loadRequest=work.result;return {x:0,y:0};}
  if(job.action==='water'&&work.result.ok)job.waterTargets=work.result.wateredPlots;
  if(job.action==='remove'&&work.result.ok)work.queue=work.queue.filter(next=>next.id!==job.id);
  if(!work.result.ok)work.queue=[];
 }
 if(job.elapsed>=timing.end){work.job=null;if(job.action==='dig'&&!work.queue.some(j=>j.action==='dig'))game.farmCursor=null;}return {x:0,y:0};
}

// 降雨和湿土播种共用照料结算，加速、委托事实与入门赠种在同一次保存中提交。
function wetPlots(progress,plots,now){
 for(const plot of plots){wetFarmPlot(progress.farm,plot,now);if(plot.crop!==null)recordGardeningAction(progress,'water',{crop:plot.crop,plot:plot.id});}
 return plots;
}
// 首次照料的奖励在同一候选存档结算；未收到任何种子时保留领取机会。
function gardeningSeedReward(game,progress){
 const f=progress.farm;
 if(f.lessonRewarded||!f.dug||!f.planted)return null;
 const reward=grantSeedReward(game,progress,1,2);
 f.lessonRewarded=reward.count>0;
 return reward;
}
const rainRetries=new WeakMap();
// 不依赖拿起水壶或靠近田地；无变化不写盘，保存失败至多每秒重试一次。
export function updateFarmRain(game,now=Date.now()){
 if(game.state!=='playing'||game.realm||game.workshopTrial||!['forest','jiuzhaigou'].includes(game.mapId)||!isRainWeather(game.livingWeather)||!Number.isFinite(now)||now<(rainRetries.get(game)||0))return false;
 if(!game.progress.farm.plots.some(p=>p.mapId===game.mapId&&!p.watered))return false;
 const next=validateProgress(structuredClone(game.progress)),plots=wetPlots(next,next.farm.plots.filter(p=>p.mapId===game.mapId&&!p.watered),now);
 const lesson=plots.some(p=>p.crop!==null)?gardeningSeedReward(game,next):null;
 const result=commitFarm(game,next,{action:'rain',plots:plots.map(p=>p.id),lesson:!!lesson?.count,message:'雨水已浸润田地，无需再浇水。'+(lesson?(lesson.count?'园艺入门完成，':'')+lesson.message:'')});
 if(!result.ok)rainRetries.set(game,now+1000);else rainRetries.delete(game);
 return result.ok;
}
