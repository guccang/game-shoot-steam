import {availableWood} from './wood-storage.js';
import {CAMP_WAREHOUSE} from '../config/wood-storage.js';
import {vehicleBoardingPoint} from './vehicle-boarding.js';
import {creditResource} from '../progression/resource-wallet.js';
import {normalizeKeepsakes} from '../progression/keepsakes.js';
import {RESTORATION_FLIGHT} from '../config/town-restoration.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 入职导演只推进正式场景中的角色和任务检查点，不替代采集与战斗规则。
import {RANGER,RANGER_STAGES,arrivalPending,arrivalCinematic} from '../config/ranger-arrival.js';
import {createCatMotion,updateCatMotion} from './cat-motion.js';
import {createVehicle} from '../combat/vehicle.js';
import {createMagazines} from '../combat/magazine.js';
import {validateProgress} from '../progression/progress.js';
import {WORKSHOP} from '../world/workshop.js';
import {worldDistance} from '../world/coordinates.js';
import {restorationArea,inRestorationArea} from '../world/restoration-area.js';
import {bindEconomy,economyFor} from '../config/economy.js';
import {recordEconomy} from '../progression/economy-ledger.js';
import {parkedOwned} from './camp-parking.js';

// 折线路径按实际路程采样；同一路线恢复时不会瞬移到另一处停车点。
export function sampleArrivalRoute(points,t){
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
  const total=lengths.reduce((a,b)=>a+b,0),distance=total*Math.max(0,Math.min(1,t));let left=distance;
  for(let i=0;i<lengths.length;i++){
    if(left<=lengths[i]||i===lengths.length-1){const f=lengths[i]?Math.min(1,left/lengths[i]):1;return {x:points[i].x+(points[i+1].x-points[i].x)*f,y:points[i].y+(points[i+1].y-points[i].y)*f,distance};}
    left-=lengths[i];
  }
  return {...points[0],distance:0};
}
// 保留通用接送路径查询供规则测试和正式采样使用。
export function arrivalRoute(t){return sampleArrivalRoute(RANGER.route,t);}
// 入营任务只在自由营地显示，提前体验建筑和战斗时让出任务卡及操作高亮。
export function arrivalGuidanceVisible(game){return arrivalPending(game.progress)&&game.mapId==='forest'&&!game.cottage&&!game.realm&&!game.story&&!game.campDefense&&!game.fireActive&&!game.workshopTrial&&!game.livingBattle&&!game.progress.living?.patrolActive;}
// 重新创建独立老猫动作时钟，姿态直接重建当前阶段而不是倒回开场。
export function restoreArrival(game){
  const a=game.progress.arrival;game.arrivalScene=null;game.arrivalError=false;
  if(!arrivalPending(game.progress)||game.realm||game.story||game.campDefense||game.fireActive||game.cottage||game.mapId!=='forest')return;
  game.arrivalScene={elder:{...RANGER.elderDoorstep,bodyAnimation:createCatMotion()},wheelPhase:0};
  // 恢复动作时钟和步行权重，刷新不让告别步态跳回无关的待机首帧。
  let spent=a.elapsed;for(const [key,stage] of Object.entries(RANGER_STAGES)){if(key===a.phase)break;spent+=stage.seconds;}
  Object.assign(game.arrivalScene.elder.bodyAnimation,{idleTime:spent,moveTime:spent*.75,moveWeight:0});
  Object.assign(game.player.bodyAnimation,{idleTime:spent,moveTime:spent*.75,moveWeight:['alight','board','dismount'].includes(a.phase)?1:0});
  Object.assign(game.player,{x:a.x,y:a.y});poseArrival(game,0);
}
// 保存成功才切换阶段或发放物品，失败保留现场并由玩家重试。
function commitArrival(game, change) {
  const next=validateProgress(bindEconomy(JSON.parse(JSON.stringify(game.progress)),economyFor(game.progress)));
  change(next);
  // 信、钥匙与手机随交接一起落盘，保存失败时不会提前进入小背包。
  next.keepsakes=normalizeKeepsakes(next.keepsakes,next.arrival);
  try {if(game.arrivalPersist && game.arrivalPersist(next)!==true){game.arrivalError=true;return false;}}
  catch {game.arrivalError=true;return false;}
  game.progress=next;game.arrivalError=false;game.onEvent('arrival-change');return true;
}
// 阶段边界一次提交，防止刷新重新扣料或赠送。
function phaseArrival(game,phase,change=()=>{}) {
  game.arrivalSpeechPaused=false;
  return commitArrival(game,p=>{p.arrival.phase=phase;p.arrival.elapsed=0;change(p);});
}
// 前后座共用车身中心线，纵向脚底区分座位；完整人物通过前后层级自然遮挡。
export function arrivalRiders(point){return {player:{x:point.x,y:point.y+RANGER.passengerFootY},elder:{x:point.x,y:point.y-27}};}
// 阶段间累计实际轮程，停靠与恢复仍保持同一轮胎纹理相位。
function wheelDistance(phase,elapsed){
  let distance=0;
  for(const [key,stage] of Object.entries(RANGER_STAGES)){
    if(stage.route)distance+=(key==='parking'?-1:1)*sampleArrivalRoute(stage.route,key===phase?elapsed/(stage.travel||1):1).distance;
    if(key===phase)break;
  }
  return distance;
}
// 正式短剧的公交、前后座、下车脚步与老人独立骑行共用同一时钟。
function poseArrival(game,dt){
  const a=game.progress.arrival,s=game.arrivalScene;if(!a||!s)return;
  const p=game.player,stage=RANGER_STAGES[a.phase],before={x:p.x,y:p.y};
  s.riding=a.phase==='ride';s.elderRiding=['pickup','board','ride','dismount','handover','leave'].includes(a.phase);
  s.pushing=false;s.driving=!!stage?.travel&&a.elapsed<stage.travel;s.elderVisible=s.elderRiding;
  s.playerOnBus=a.phase==='bus';s.busVisible=['bus','alight','wait','pickup','board'].includes(a.phase);
  // 公交沿原路进站，玩家落地后才开走；车门在下车阶段独立打开。
  const busDeparture={wait:0,pickup:1,board:1.8}[a.phase];
  // 车身位置对象保持身份，表现插值才能与角色和镜头读取同一段运动历史。
  Object.assign(s.bus||={},RANGER.bus,{y:RANGER.bus.y+(a.phase==='bus'?-160*(1-Math.min(1,a.elapsed/stage.seconds))**2:busDeparture!==undefined?Math.max(0,busDeparture+a.elapsed-.15)*420:0)});
  Object.assign(s.scooter||={},stage?.route?sampleArrivalRoute(stage.route,a.elapsed/stage.travel):
    ['bus','alight','wait','board'].includes(a.phase)?{...RANGER.bus}:
    ['dismount','handover'].includes(a.phase)?{...RANGER.stop}:
    a.phase==='watch'?{...RANGER.leaveRoute.at(-1)}:{...RANGER.parking});
  // 停驻阶段去掉上一段路程字段，保持现场状态与读档重建的检查点一致。
  if(!stage?.route)delete s.scooter.distance;
  s.wheelPhase=-wheelDistance(a.phase,a.elapsed)/12;
  const riders=arrivalRiders(s.scooter);
  if(s.elderRiding||a.phase==='watch')Object.assign(s.elder,riders.elder);
  if(s.riding)Object.assign(p,riders.player);
  if(a.phase==='bus')Object.assign(p,{x:s.bus.x-12,y:s.bus.y-20});
  if(a.phase==='alight')Object.assign(p,sampleArrivalRoute([{x:RANGER.bus.x-24,y:RANGER.bus.y-12},RANGER.waiting],a.elapsed/stage.seconds));
  if(['wait','pickup'].includes(a.phase))Object.assign(p,RANGER.waiting);
  if(a.phase==='board')Object.assign(p,sampleArrivalRoute([RANGER.waiting,arrivalRiders(RANGER.bus).player],a.elapsed/stage.seconds));
  if(a.phase==='dismount')Object.assign(p,sampleArrivalRoute([arrivalRiders(RANGER.stop).player,RANGER.doorstep],a.elapsed/stage.seconds));
  if(['handover','leave','watch'].includes(a.phase)){
    Object.assign(p,RANGER.doorstep);p.angle=Math.atan2(s.elder.y-p.y,s.elder.x-p.x);
  }
  // 老人始终坐车；上下车沿真实步态，风中停留沿用同源待机，不旋转或拉伸身体。
  updateCatMotion(s.elder.bodyAnimation,dt,0,false);
  if(arrivalCinematic(game.progress)){
    updateCatMotion(p.bodyAnimation,dt,dt?Math.hypot(p.x-before.x,p.y-before.y)/dt:0,['alight','board','dismount'].includes(a.phase));
    p.vx=0;p.vy=0;a.x=p.x;a.y=p.y;
  }
}
// 只在动作间隙显示一句头顶短气泡；远处驶来与离开时避免气泡漂在画面边缘。
export function arrivalSpeech(game){
  const a=game.progress.arrival,s=game.arrivalScene,stage=RANGER_STAGES[a?.phase];
  if(!s||!stage?.lines.length)return null;
  if(a.phase==='pickup'&&a.elapsed<.4||a.phase==='leave'&&a.elapsed>.7)return null;
  const player=['wait','watch'].includes(a.phase),i=Math.min(stage.lines.length-1,Math.floor(a.elapsed/stage.seconds*stage.lines.length));
  return {key:a.phase+':'+i,speaker:player?'我':'松伯',text:stage.lines[i],
    anchor:player?game.player:s.elder,head:player?53:64,phase:a.phase,remaining:1-a.elapsed/stage.seconds};
}
// 气泡的下一句跳至对应演出时刻，不直接提交任何道具或奖励。
export function nextArrivalSpeech(game){
  const a=game.progress.arrival,stage=RANGER_STAGES[a?.phase];
  if(game.state!=='playing'||!stage?.lines.length)return false;
  const line=Math.floor(a.elapsed/stage.seconds*stage.lines.length);
  a.elapsed=Math.min(stage.seconds-.001,(line+1)*stage.seconds/stage.lines.length+.001);
  game.arrivalSpeechPaused=false;return true;
}
// 真实伐木登记来源；修复资格按仓库存量判断，随身木材要先入库。
export function recordArrivalWood(game,wood,impact) {
  const a=game.progress.arrival;if(!a||!['gather','repair','craft'].includes(a.phase)||impact?.weaponIndex!==RANGER.saw)return;
  a.wood+=wood;
  if(a.phase==='gather'&&game.progress.wood>=RANGER.repairWood)a.phase='repair';
}
// 修复和购买均允许骑乘靠近工坊，不要求额外下车。
export function arrivalWorkReady(game) {return ['gather','repair'].includes(game.progress.arrival?.phase)?inRestorationArea(game.player,restorationArea(WORKSHOP)):worldDistance(game.player,{x:WORKSHOP.x,y:WORKSHOP.y+25})<=115;}
// 自动靠近与玩家按钮共用施工入口，不能越过材料、距离或钥匙检查。
export function advanceArrival(game) {
  const a=game.progress.arrival;if(!arrivalPending(game.progress)||!['playing','paused'].includes(game.state))return false;
  if(game.arrivalError){game.arrivalError=false;return true;}
  if(!arrivalWorkReady(game)||!a.keys)return false;
  if(['gather','repair'].includes(a.phase)&&game.progress.wood>=RANGER.repairWood)
    return phaseArrival(game,'repairing',p=>{p.arrival.workWood=RANGER.repairWood;p.wood-=RANGER.repairWood;recordEconomy(p,'expense','arrival:repair',{wood:RANGER.repairWood});});
  // 新购枪只由正式工坊交易提交；保留crafting读档分支以完成历史制作。
  if(a.phase==='craft')return false;
  return false;
}
// 阅读后先学习驾驶赠车；余额分流在实际骑上电动车后判断。
export function completeArrivalLetter(game){
 const a=game.progress.arrival;
 if(a?.phase!=='letter'||!a.keys||!['playing','paused'].includes(game.state))return false;
 return phaseArrival(game,'ride-guide');
}
// 跳过乘车与告别仅交付原定钥匙和工具；阅读来信、采木、修复及制枪仍由玩家完成。
export function skipArrivalJourney(game){
 const a=game.progress.arrival;
 if(game.state!=='playing'||!RANGER_STAGES[a?.phase])return false;
 if(!phaseArrival(game,'letter',p=>{
  Object.assign(p.arrival,{keys:true,parked:true,x:RANGER.doorstep.x,y:RANGER.doorstep.y});
  p.weapons[RANGER.saw]=Math.max(1,p.weapons[RANGER.saw]);p.weapon=RANGER.saw;
  p.vehicleHulls[RANGER.scooter]=Math.max(1,p.vehicleHulls[RANGER.scooter]);p.vehicleIndex=RANGER.scooter;p.vehicleLoadouts[RANGER.scooter]=null;
 }))return false;
 game.vehicles[RANGER.scooter]=createVehicle(game.progress,game.maxHp(),RANGER.scooter);
 game.vehicle=game.vehicles[RANGER.scooter];game.magazines=createMagazines(game.progress);
 Object.assign(game.player,RANGER.doorstep);restoreArrival(game);return true;
}
// 入职未完成时冻结威胁时钟，任务采集仍走正式更新；暂停和后台不补时间。
export function updateArrival(game,dt) {
  if(!arrivalPending(game.progress))return false;
  // 自由探索可提前使用已修复设施，活动中冻结入营指导，不能重建场景或改写坐标。
  if(game.cottage||game.story||game.realm||game.campDefense||game.fireActive||game.workshopTrial||game.mapId!=='forest')return false;
  const a=game.progress.arrival;
  if(game.state!=='playing')return true;
  if(!game.arrivalScene)restoreArrival(game);
  // 完工存档失败只暂停施工提交，不锁住已经能自由走动的玩家。
  if(game.arrivalError)return a.phase!=='repairing';
  if(game.arrivalSpeechPaused&&RANGER_STAGES[a.phase])return true;
  // 上车必须由真实操作完成；已有材料跳过采集。
  if(a.phase==='ride-guide'&&game.vehicle.active&&game.vehicle.index===RANGER.scooter)
    return !phaseArrival(game,game.progress.wood>=RANGER.repairWood?'repair':'gather');
  // 旧存档的下车阶段直接续到购枪，保留当前骑乘状态及保存失败重试。
  if(a.phase==='dismount-guide')return !phaseArrival(game,'craft');
  // 已有材料直接转向工坊；花掉材料后只补差额，不要求重新采满任务配额。
  if(['gather','repair'].includes(a.phase))a.phase=game.progress.wood>=RANGER.repairWood?'repair':'gather';
  // 首次工坊属于入职任务，材料齐备且靠近时自动投料；保存失败仍由原界面重试。
  if(a.phase==='repair'&&a.keys&&arrivalWorkReady(game)&&!game.boss&&!game.livingBattle&&!game.progress.living?.patrolActive){
    return !advanceArrival(game);
  }
  const current=game.progress.arrival;if(current!==a)return false;
  a.elapsed+=dt;poseArrival(game,dt);
  const stage=RANGER_STAGES[a.phase];
  if(stage&&a.elapsed+1e-9>=stage.seconds){
    const phases=Object.keys(RANGER_STAGES),next=phases[phases.indexOf(a.phase)+1]||'letter';
    if(a.phase==='handover'){
      if(phaseArrival(game,next,p=>{p.arrival.keys=true;p.arrival.parked=true;p.weapons[RANGER.saw]=Math.max(1,p.weapons[RANGER.saw]);p.weapon=RANGER.saw;p.vehicleHulls[RANGER.scooter]=Math.max(1,p.vehicleHulls[RANGER.scooter]);p.vehicleIndex=RANGER.scooter;p.vehicleLoadouts[RANGER.scooter]=null;})){
        game.vehicles[RANGER.scooter]=createVehicle(game.progress,game.maxHp(),RANGER.scooter);game.vehicle=game.vehicles[RANGER.scooter];game.magazines=createMagazines(game.progress);
      }
    }else phaseArrival(game,next);
    if(!game.arrivalError)poseArrival(game,0);
  }
  else if(a.phase==='repairing'&&a.elapsed+1e-9>=RANGER.rebuildSeconds+RESTORATION_FLIGHT){
    // 开工时已扣除木料，完工只开放功能，不再次收费。
    // 重建谢礼覆盖首枪所需木材，仍需在正式工坊确认购买。
    phaseArrival(game,'craft',p=>{const wood=creditResource(p,'wood',RANGER.pistolWood);recordEconomy(p,'income','arrival:workshop',{wood});});
  } else if(a.phase==='crafting'&&a.elapsed>=RANGER.workSeconds){
    if(phaseArrival(game,'complete',p=>{p.wood-=RANGER.pistolWood;p.weapons[0]=1;p.weapon=0;recordEconomy(p,'expense','arrival:pistol',{wood:RANGER.pistolWood});})){
      game.magazines=createMagazines(game.progress);game.attackTimer=GAMEPLAY_VALUES.player.firstAttackDelay;game.waveWarning=GAMEPLAY_VALUES.wave.warningSeconds;game.arrivalScene=null;game.onEvent('arrival-complete');
    }
  }
  return arrivalCinematic(game.progress)||game.arrivalError&&game.progress.arrival.phase!=='repairing';
}
// 上车、采集、修复和制枪共用正式导航；缺料先到活树旁，收齐再前往工坊。
export function arrivalWorkshopObjective(game) {
  const a=game.progress?.arrival;
  if(!a||!arrivalGuidanceVisible(game)||!['ride-guide','gather','repair','craft'].includes(a.phase))return null;
  if(a.phase==='ride-guide')return {task:{id:'arrival-scooter',title:'坐上电动车'},key:'arrival-ride-guide',phase:'travel',site:{...arrivalTarget(game),mapId:'forest'},label:'前往北广场，靠近电动车停留1秒自动上车'};
  const needed=a.phase==='craft'?RANGER.pistolWood:RANGER.repairWood;
  if(game.progress.wood<needed&&game.progress.wood+availableWood(game)>=needed)return {task:{id:'arrival-wood-store',title:'木材存入仓库'},key:'arrival-wood-store',phase:'travel',site:CAMP_WAREHOUSE,label:'返回营地，打开背包的货舱与仓库，存入木材'};
  // 保留树的碰撞信息，正式寻路会把终点放在树旁；砍倒后自动选择下一棵。
  if(a.phase==='gather'||game.progress.wood<(a.phase==='repair'?RANGER.repairWood:RANGER.pistolWood)){
    const tree=arrivalTarget(game);if(!tree)return null;
    return {task:{id:'arrival-wood',title:'采集木料'},key:'arrival-wood',phase:'travel',site:{...tree,type:'tree',mapId:'forest'},label:'前往树木旁，自动采集木料'};
  }
  return {task:{id:'arrival-workshop',title:'武器工坊'},key:'arrival-'+a.phase,phase:'travel',
    site:{...arrivalTarget(game),mapId:'forest',...(a.phase==='repair'?{repairArea:restorationArea(WORKSHOP)}:{})},label:a.phase==='repair'?'前往武器工坊，靠近自动修复':'前往武器工坊购买手枪'};
}
// 采集箭头继续寻找存活树木，工坊门口与实际施工距离保持一致。
export function arrivalTarget(game) {
  const a=game.progress.arrival;if(!arrivalPending(game.progress))return null;
  if(a.phase==='ride-guide'){
    const parked=parkedOwned(game).find(s=>s.record.hull===RANGER.scooter);
    // 导航落在车位前的通道，不把终点放进车体碰撞内；已取出的随行车原地可上。
    return parked?vehicleBoardingPoint(parked):a.parked?{x:RANGER.parking.x,y:RANGER.parking.y+60}:{x:game.player.x,y:game.player.y};
  }
  if(['gather','repair','craft'].includes(a.phase)&&game.progress.wood<(a.phase==='craft'?RANGER.pistolWood:RANGER.repairWood)&&game.progress.wood+availableWood(game)>=(a.phase==='craft'?RANGER.pistolWood:RANGER.repairWood))return CAMP_WAREHOUSE;
  if(a.phase==='gather'||(['repair','craft'].includes(a.phase)&&game.progress.wood<(a.phase==='repair'?RANGER.repairWood:RANGER.pistolWood)))
    {let target=null,distance=Infinity;for(const tree of game.trees){if(tree.hp<=0)continue;const d=worldDistance(tree,game.player);if(d<distance){target=tree;distance=d;}}return target;}
  if(['repair','repairing','craft','crafting'].includes(a.phase))return {x:WORKSHOP.x,y:WORKSHOP.y+25};
  return null;
}

// 正式场景和验收共用建筑状态；保存成功进入制枪阶段后才切换完整工坊。
export function workshopBuildView(game){
 const a=game.progress.arrival,ready=!a||['dismount-guide','craft','crafting','complete'].includes(a.phase),building=a?.phase==='repairing';
 return {state:ready?'ready':building?'rebuilding':'ruined',
  progress:building?Math.max(0,Math.min(1,(a.elapsed-RESTORATION_FLIGHT)/RANGER.rebuildSeconds)):ready?1:0,
  seconds:building?Math.max(0,Math.ceil(RANGER.rebuildSeconds+RESTORATION_FLIGHT-a.elapsed)):0,
  success:['dismount-guide','craft'].includes(a?.phase)&&a.elapsed<RANGER.rebuildRevealSeconds,
  failed:building&&!!game.arrivalError};
}
