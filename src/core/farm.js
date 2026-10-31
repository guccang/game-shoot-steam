import {isRainWeather} from '../world/season-weather.js';
import {storyDeliveryReady} from './story-definition.js';
// 农活事务与走近执行队列；动作命中时才扣种子、开地或发放金币。
import {recordGardeningAction} from '../progression/mainline-gardening.js';
import {FARM_ACTION_TIMING,FARM_COMBAT_RESUME_DELAY} from '../config/farm-tools.js';
export {FARM_ACTION_TIMING} from '../config/farm-tools.js';
import {validateProgress} from '../progression/progress.js';
import {farmGrowth,grantFarmSeeds,wetFarmPlot} from '../progression/farm.js';
import {wildFarmTime} from '../progression/wild-farm-age.js';
import {FARM_CROPS,FARM_MAX_PLOTS,FARM_STOCK_CAP,FARM_WATER,farmCell,farmPosition} from '../config/farm.js';
import {creditResource} from '../progression/resource-wallet.js';
import {RESOURCE_CAP} from '../config/resource-limits.js';
import {recordEconomy} from '../progression/economy-ledger.js';
import {worldDistance,nearest} from '../world/coordinates.js';
import {farmLandReason,farmApproach,farmDigTarget} from '../world/farm-land.js';
import {naturalWaypoint} from '../physics/terrain-navigation.js';
import {blocked} from '../physics/motion.js';
import {attackTargetDistance,attackTargetKnown} from '../combat/perception.js';
import {clearingCombatActive} from './living-safety.js';
import {vehicleWeapon} from '../config/vehicles.js';
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
// 只返回点击的有效田块；无效时不自动改浇邻田，避免误操作。
export function farmWaterTargets(farm,plotId,mapId,now=Date.now()){
 const center=farm.plots.find(p=>p.id===plotId),eligible=p=>p.mapId===mapId&&p.crop!==null&&farmGrowth(p,now)<1;
 if(!center||!eligible(center))return [];
 return [center];
}
// 保存先于反馈，飞行金币只是已到账金额的表现，不承担奖励结算。
export function commitFarm(game,next,event){
 let saved=false;try{saved=(game.livingPersist?.(next)??true)===true;}catch{saved=false;}
 if(!saved)return {ok:false,message:'保存失败，本次没有扣费或结算，请重试。'};
 game.progress=next;game.farmSignals||=[];game.farmSignals.push(event);if(game.farmSignals.length>32)game.farmSignals.shift();game.onEvent?.('farm-change',event);return {ok:true,...event};
}
// 只提交真实发生的一格动作；所有操作再次核验地图、距离与成熟状态。
export function farmAction(game,action,{plot:plotId,point,crop:cropId=0,removal,now=Date.now()}={}){
 // 快递柜结算旧收成不使用农具，允许骑乘；耕种、浇水及收割仍必须步行。
 if(action==='legacy'?(!canEnterFarm(game)||farmInteractionBlocked(game)):!canUseFarm(game))return {ok:false,message:'请结束当前活动并下车，再拿起农具。'};
 if(!Number.isFinite(now)||now<0||!Number.isInteger(cropId)||cropId<0)return {ok:false,message:'农田操作参数无效。'};
 const next=validateProgress(structuredClone(game.progress)),f=next.farm,p=f.plots.find(p=>p.id===plotId),crop=FARM_CROPS[cropId];
 // 空田的湿度属于土壤；播种重置本茬加速状态时，保留这份已获得的水分。
 const plantedInWetSoil=action==='plant'&&p?.watered===true;
 const cell=action==='dig'?(point|| (farmCell(plotId)?{...farmCell(plotId),mapId:game.mapId}:null)):p?farmPosition(p):null;
 if(['dig','plant','harvest','water','remove'].includes(action)&&(!cell||cell.mapId!==game.mapId||worldDistance(game.player,cell)>78))return {ok:false,message:'先走到这块田边再操作。'};
 let message='',coins=0,harvest=null,lesson=false,wateredPlots=[];
 if(action==='dig'){
  const reason=farmLandReason(game,cell);if(reason)return {ok:false,message:reason};
  if(f.plots.length>=FARM_MAX_PLOTS)return {ok:false,message:'已达到可保存的田块数量上限。'};
  const id=f.nextId++;f.plots.push({id,mapId:cell.mapId,x:cell.x,y:cell.y,crop:null,plantedAt:0,readyAt:0,watered:false});plotId=id;f.dug++;message='开出一块新田，点击空田选种';
 }else if(action==='plant'){
  if(!p||p.crop!==null)return {ok:false,message:'请选择开垦好的空田。'};
  if(!crop)return {ok:false,message:'请选择有效的种子。'};
  if(!(f.seeds[cropId]>0))return {ok:false,message:'这包种子已用完，可打怪获取，或前往种子小屋购买已解锁品种。'};
  f.seeds[cropId]--;
  Object.assign(p,{crop:cropId,plantedAt:now,readyAt:now+crop.seconds*1000,watered:false});f.planted++;
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
  harvest=p.crop;const grown=FARM_CROPS[harvest];if(RESOURCE_CAP-next.coins<grown.value)return {ok:false,message:'金币已满，成熟作物继续留在田里。'};
  coins=creditResource(next,'coins',grown.value);f.xp=Math.min(FARM_STOCK_CAP,f.xp+grown.xp);f.harvested=Math.min(FARM_STOCK_CAP,f.harvested+1);
  Object.assign(p,{crop:null,plantedAt:0,readyAt:0,watered:false});recordEconomy(next,'income','farm:harvest',{coins});message=grown.name+'收获，金币 +'+coins;
  if(p.wild)message+=' · 野外也能种田，点击空田即可继续播种';
 }else if(action==='remove'){
  if(!p)return {ok:false,message:'这块田已经不存在了。'};
  if(!farmRemovalAllowed(p,removal))return {ok:false,message:'田里的作物已变化，请重新确认移除。'};
  f.plots=f.plots.filter(plot=>plot.id!==plotId);
  // 已完成浇水的事实保留；尚未照料的任务田移除后可以重新选田播种。
  const gardening=next.mainline.gardening;
  if(gardening.plotId===plotId){gardening.plotId=null;if(!gardening.watered){gardening.planted=0;gardening.harvested=0;}}
  message='地块已移除，可在原地重新开垦';
 }else if(action==='legacy'){
  for(let i=0;i<FARM_CROPS.length;i++){const n=Math.min(f.inventory[i],Math.floor((RESOURCE_CAP-next.coins)/FARM_CROPS[i].value));if(n>0){coins+=creditResource(next,'coins',n*FARM_CROPS[i].value);f.inventory[i]-=n;}}
  if(!coins)return {ok:false,message:'没有可领取的旧收成，或金币已满。'};
  recordEconomy(next,'income','farm:legacy',{coins});message='旧收成已结算，金币 +'+coins;
 }else return {ok:false,message:'未知农田操作。'};
 // 首次照料就给下一次种植的种子；旧档直接收获也能领取，二者共用一次性标记。
 if(['water','harvest'].includes(action)&&!f.lessonRewarded&&f.dug>0&&f.planted>0){f.lessonRewarded=true;grantFarmSeeds(f,1,2);lesson=true;message+=' · 园艺入门完成，胡萝卜种子 +2';}
 recordGardeningAction(next,action,{crop:action==='harvest'?harvest:action==='water'?p?.crop:cropId,plot:plotId});
 if(isRainWeather(game.livingWeather)){
  const rain=wetPlots(next,f.plots.filter(p=>p.mapId===game.mapId&&!p.watered),now);
  if(rain.length)message+=' · 雨水已润湿田地，无需浇水';
 }else if(plantedInWetSoil){
  // 雨停或天气切换后，新作物也继承湿土；只处理本田，不浇湿附近干田。
  wetPlots(next,[p],now);message+=' · 土壤保持湿润，无需浇水';
 }
 if(!game.progress.farm.lessonRewarded&&next.farm.lessonRewarded&&!lesson){lesson=true;message+=' · 园艺入门完成，胡萝卜种子 +2';}
 return commitFarm(game,next,{action,plot:plotId,point:cell,coins,harvest,lesson,wateredPlots,message});
}
// 非空田必须确认同一茬作物，排队期间换种不能沿用旧确认。
function farmRemovalAllowed(plot,removal){return plot.crop===null||removal?.crop===plot.crop&&removal?.plantedAt===plot.plantedAt;}
// 换工具取消待办，不回滚已成功完成的单格动作。
export function setFarmTool(game,tool){game.farmWork=tool&&canUseFarm(game)?{tool,job:null,queue:[],autoCombat:false,combatRecovery:0}:null;}
// 拖过多个地块只安排队列，排队时不提前扣费或发奖。
export function queueFarmWork(game,action,{plot,point,crop=0,tree,view,removal}={}){
 if(!canUseFarm(game))return {ok:false,message:'请下车后操作农具。'};
 const p=game.progress.farm.plots.find(p=>p.id===plot);
 const dig=action==='dig'?farmDigTarget(game,point||farmCell(plot)||game.player,view):null;
 const target=dig?dig.point:action==='saw'?tree:p;
 if(!target||action==='saw'&&!(target.hp>0))return {ok:false,message:'没有可操作的目标。'};
 if(dig?.reason)return {ok:false,message:dig.reason};
 if(action==='remove'&&(p.mapId!==game.mapId||!farmRemovalAllowed(p,removal)))return {ok:false,message:'请重新选择地块并确认移除。'};
 const waterTargets=action==='water'?farmWaterTargets(game.progress.farm,plot,game.mapId):[];
 if(action==='water'&&!waterTargets.length)return {ok:false,message:'请选择尚未成熟的作物。'};
 if(['plant','harvest'].includes(action)&&(p.mapId!==game.mapId||(action==='plant'?p.crop!==null:p.crop===null||farmGrowth(p)<1)))return {ok:false,message:'当前田块不适合这个操作。'};
 if(!game.farmWork)setFarmTool(game,action==='saw'?'saw':action==='water'?'water':'hoe');const work=game.farmWork;
 const key=action+':'+(action==='dig'?target.x+','+target.y:action==='saw'?tree.id:plot);
 if([work.job,...work.queue].some(j=>j?.key===key))return {ok:true,point:target,message:'这块田已经安排好了'};
 if(work.queue.length>=32)return {ok:false,message:'先完成已安排的农活，再继续安排。'};
 work.queue.push({key,action,id:plot,crop,removal:removal?{crop:removal.crop,plantedAt:removal.plantedAt}:undefined,treeId:tree?.id,point:{...farmPosition(target),...target,mapId:game.mapId},waterTargets:waterTargets.map(p=>({id:p.id,...farmPosition(p)})),elapsed:0,farmPoseTime:0,hit:false,travel:0});
 return {ok:true,point:target,message:action==='remove'?'已安排移除，猫猫会走近平整土地':action==='water'?`走近浇灌，最多照顾 ${waterTargets.length} 块田`:action==='dig'?'走近挥锄…':action==='plant'?'已安排播种，猫猫会依次走近撒种':action==='harvest'?'已安排收割，猫猫会依次走近挥镰':'走近树边，准备锯木…'};
}
// 兼容旧的点击开垦入口，实际操作统一进入队列。
export function requestFarmDig(game,id){return queueFarmWork(game,'dig',{plot:id}).ok;}
// 迎敌冻结农活但允许走位，受伤不丢队列；普通农活中主动走位仍取消待办，切图退出模式。
export function updateFarmWork(game,dt,input){
 const work=game.farmWork;if(!work)return input;if(!canUseFarm(game)){game.farmWork=null;return input;}
 const wasCombat=work.autoCombat;work.autoCombat=updateFarmCombat(game,dt);
 if(work.autoCombat)return input;
 // 战斗后可能发生击退或闪避：未命中的动作重新走近挥动，已结算动作只完成收势，不重复扣费发奖。
 if(wasCombat&&work.job&&!work.job.hit){work.job.approach=null;work.job.elapsed=0;work.job.farmPoseTime=0;work.job.travel=0;}
 if(Math.hypot(input.x,input.y)>.05){work.job=null;work.queue=[];game.farmCursor=null;return input;}
 if(game.farmDragging)return {x:0,y:0};
 work.job||=work.queue.shift();const job=work.job;if(!job)return input;
 if(job.point.mapId!==game.mapId){setFarmTool(game,null);return input;}
 const timing=FARM_ACTION_TIMING[job.action],target=nearest(job.point,game.player);
 if(job.elapsed===0){
  job.approach||=farmApproach(game,job.point,job.action);job.travel+=dt;
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
  }else work.result=farmAction(game,job.action,{plot:job.id,point:job.point,crop:job.crop,removal:job.removal});
  if(job.action==='water'&&work.result.ok)job.waterTargets=work.result.wateredPlots;
  if(job.action==='remove'&&work.result.ok)work.queue=work.queue.filter(next=>next.id!==job.id);
  if(!work.result.ok)work.queue=[];
 }
 if(job.elapsed>=timing.end){work.job=null;if(job.action==='dig'&&!work.queue.some(j=>j.action==='dig'))game.farmCursor=null;}return {x:0,y:0};
}

// 降雨和湿土播种共用照料结算，加速、委托事实与入门赠种在同一次保存中提交。
function wetPlots(progress,plots,now){
 for(const plot of plots){wetFarmPlot(progress.farm,plot,now);if(plot.crop!==null)recordGardeningAction(progress,'water',{crop:plot.crop,plot:plot.id});}
 const f=progress.farm;
 if(plots.some(p=>p.crop!==null)&&!f.lessonRewarded&&f.dug>0&&f.planted>0){f.lessonRewarded=true;grantFarmSeeds(f,1,2);}
 return plots;
}
const rainRetries=new WeakMap();
// 不依赖拿起水壶或靠近田地；无变化不写盘，保存失败至多每秒重试一次。
export function updateFarmRain(game,now=Date.now()){
 if(game.state!=='playing'||game.realm||game.workshopTrial||!['forest','jiuzhaigou'].includes(game.mapId)||!isRainWeather(game.livingWeather)||!Number.isFinite(now)||now<(rainRetries.get(game)||0))return false;
 if(!game.progress.farm.plots.some(p=>p.mapId===game.mapId&&!p.watered))return false;
 const next=validateProgress(structuredClone(game.progress)),plots=wetPlots(next,next.farm.plots.filter(p=>p.mapId===game.mapId&&!p.watered),now);
 const lesson=!game.progress.farm.lessonRewarded&&next.farm.lessonRewarded;
 const result=commitFarm(game,next,{action:'rain',plots:plots.map(p=>p.id),lesson,message:'雨水已浸润田地，无需再浇水。'+(lesson?'园艺入门完成，胡萝卜种子 +2':'')});
 if(!result.ok)rainRetries.set(game,now+1000);else rainRetries.delete(game);
 return result.ok;
}
