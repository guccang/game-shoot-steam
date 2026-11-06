import {bossCombatActive} from './boss-engagement.js';
import {campResidentsVisible,campResidents,campTalkSite} from './camp-routines.js';
import {taskResourcePath,taskResourceStock,taskCropStock} from '../progression/task-resources.js';
import {woodTaskStatus} from './wood-task-status.js';
import {cleanupEntries} from './load-cleanup.js';
import {vehicleLocations} from './vehicle-location.js';
import {cottageRestGuideActive,cottageRestObjective} from './cottage-guide.js';
import {beginGardeningLesson} from '../progression/mainline-gardening.js';
import {harvestBudget,harvestGuidePlot,harvestGuideHint,harvestDeliveryTarget} from './harvest-guide.js';
import {restoredTaskToStart,startRestoredTask} from '../progression/restoration-task.js';
import {mainlineResourceHint,cachedMainlineConditionCost} from '../progression/mainline-cost.js';
import {pendingRestoration} from '../config/town-restoration.js';
import {restorationObjective,restorationStatus} from './town-restoration.js';
import {rewardReceipt} from '../progression/reward-receipt.js';
import {awardMainline} from '../progression/mainline-reward.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 主线解释器只理解条件、地点和阶段，不按任务ID分支，不创建或赠送装备。
import {clearingObjective} from './clearing-guide.js';
import {currentMainlineTask,MAINLINE_SITES,MAINLINE_NPCS} from '../config/mainline.js';
import {recordMainlineExperience} from '../progression/mainline-experience.js';
import {MAINLINE_SEEN} from '../progression/mainline-progress.js';
import {arrivalPending} from '../config/ranger-arrival.js';
import {nativeVehicleWeapon} from '../config/vehicle-armaments.js';
import {bindEconomy,economyFor} from '../config/economy.js';
import {validateProgress} from '../progression/progress.js';
import {capturePatrol} from './patrol-session.js';
import {vehicleParkingSite,parkedOwned} from './camp-parking.js';
import {worldDistance} from '../world/coordinates.js';
import {trackedLivingRequest} from './task-tracking.js';
const positions=new WeakMap();
// 新建战场释放对白与位置采样，清档或跨场景不能继承上一次交付。
export function resetMainlineScene(game){positions.delete(game);game.mainlineSpeech=null;game.mainlineTalkDelay=0;game.mainlineError='';}

// 缺少主线数据的独立测试/预览场景不自动生成任务。
export function mainlineTask(game){return currentMainlineTask(game.progress?.mainline);}
// 白名单点路径只读自身属性，配置不执行字符串代码。
function read(source,path){return path.split('.').reduce((v,k)=>v&&Object.hasOwn(v,k)?v[k]:undefined,source);}
// 所有条件只观察永久进度或真实操作标记，剧情借用武器不能满足拥有条件。
export function mainlineCondition(game,condition){
 if(condition.harvestFor)return harvestBudget(game.progress,mainlineTask(game)).ready;
 if(condition.all)return condition.all.every(c=>mainlineCondition(game,c));
 if(condition.any)return condition.any.some(c=>mainlineCondition(game,c));
 if(condition.path){const value=taskResourcePath(game.progress,condition.path)?.total??read(game,condition.path);return 'equals' in condition?value===condition.equals:Number(value)>=condition.min;}
 if('nativeLevel' in condition)return (game.progress.vehicleWeapons[nativeVehicleWeapon(condition.nativeLevel)?.weaponIndex]||0)>=condition.min;
 if(condition.controllerReady)return [12,15,16].includes(game.progress.weapon)&&game.progress.weapons[game.progress.weapon]>0&&game.progress.mainline.seen.config>0;
 if(condition.controllerLevel)return [12,15,16].some(i=>game.progress.weapons[i]>=condition.controllerLevel);
 throw Error('未知主线条件：'+JSON.stringify(condition));
}
// 短清单直接读取原条件，勾选反馈不另建进度或改变完成门槛。
export function mainlineSteps(game){
 if(cottageRestGuideActive(game))return [{label:'进入小屋休息',hint:'在门前停留1秒进入；驾驶时载具留在门口。到床前停留1秒自动入睡，恢复猫猫全部生命。',done:false}];
 const task=mainlineTask(game);if(!task)return [];
 const f=pendingRestoration(game.progress);if(f){
  const s=restorationStatus(game,f.id),repair={label:'修复'+f.name,hint:f.benefit,done:false,operation:{type:'restoration',id:f.id}};
  // 修复直接使用背包与仓库合计，材料齐备即可前往建筑。
  if(s.enough)return [repair];
  const wood=s.wood,resourceHint=wood.hint+' · '+wood.breakdown;
  return [{label:'采集木头',hint:resourceHint,resourceHint,done:wood.collected,progress:wood.gatherProgress},repair];
 }
 const conditions=task.goal.all||[task.goal];
 const steps=task.guide.steps.map((step,index)=>{
  const condition=conditions[index],done=mainlineCondition(game,condition),value=condition.path?Number(taskResourcePath(game.progress,condition.path)?.total??read(game,condition.path)):NaN;
  const progress=(condition.min>1||taskResourcePath(game.progress,condition.path))&&Number.isFinite(value)?`${Math.min(condition.min,Math.max(0,Math.floor(value)))}/${condition.min}`:'';
  const resourceHint=!done?(condition.harvestFor?harvestGuideHint(game,task):mainlineResourceHint(game.progress,condition)):'';
  // 先处理已收集的实物，再继续购买升级；运回步骤不直接扣库存或发放金币。
  const cost=condition.harvestFor?{coins:harvestBudget(game.progress,task).cost}:cachedMainlineConditionCost(game.progress,condition);
  const delivery=!done&&cost.wood>game.progress.wood&&taskResourceStock(game.progress,'wood').total>=cost.wood?'wood':!done&&cost.coins>game.progress.coins&&taskCropStock(game.progress).total?'crops':null;
  if(delivery)return {...step,label:delivery==='wood'?'木材已采齐，运回仓库':'运回收成结算金币',done:false,progress,resourceHint,hint:resourceHint,resourceDelivery:delivery,requiredWood:cost.wood,navigation:'warehouseEntry',action:{type:'warehouse',label:'查看小屋仓库'},operation:{type:'warehouse'}};
  // 极端旧档没有作物时沿用开田、选种教学，补种成熟后仍通过同一收割事务完成。
  if(condition.harvestFor&&!done&&!harvestGuidePlot(game))return {...step,done,progress,resourceHint,hint:resourceHint,operation:{type:'farm',id:game.progress.farm.plots.some(p=>p.mapId===game.mapId&&p.crop===null)?'plant':'dig'}};
  const stock=taskResourcePath(game.progress,condition.path);
  return {...step,done,progress,resourceHint,hint:resourceHint||(stock?`已持有 ${stock.total} · 背包 ${stock.bag} · 载具 ${stock.vehicles} · 仓库 ${stock.warehouse}`:step.hint)};
 });
 // 收集条件已满足但交付种子仍在仓库时，明确新增取货动作，不要求重复找种或购买。
 if(task.seedDelivery&&steps.every(s=>s.done)&&!seedDeliveryCarried(game,task))steps.push({label:'从小屋仓库取出交付种子',hint:'种子已收集齐，请取回背包后交给青芽',done:false,navigation:'warehouseEntry',action:{type:'warehouse',label:'取出交付种子'},operation:{type:'warehouse'}});
 return steps;
}
// 资源完成度合计全部容器，实际交付仍只扣背包里带到 NPC 身边的种子。
function seedDeliveryCarried(game,task){return !task.seedDelivery||game.progress.farm.seeds[task.seedDelivery.crop]>=task.seedDelivery.count;}

// 只推荐尚未完成的动作；拥有多个目标时逐个呈现，不让玩家重复已完成项。
export function mainlineStep(game){const steps=mainlineSteps(game);return steps.find(s=>!s.done)||null;}
// 选择组允许沿用玩家正在看的合法装备；需要拥有时只选择永久库中的控制器。
export function mainlineOperation(game){
 const spec=mainlineStep(game)?.operation;if(!spec)return null;
 if(!spec.indices)return {...spec};
 const field=spec.kind==='vehicle'?'vehicleHulls':spec.kind==='heroes'?'heroes':'weapons';
 const owns=spec.indices.filter(i=>game.progress[field][i]>0),choices=['buy','track','trial'].includes(spec.type)?spec.indices:owns;
 const index=choices.includes(game.progress[spec.kind==='vehicle'?'vehicleIndex':spec.kind==='heroes'?'hero':'weapon'])?game.progress[spec.kind==='vehicle'?'vehicleIndex':spec.kind==='heroes'?'hero':'weapon']:choices[0]??spec.indices[0];
 return {...spec,index,indices:choices.length?choices:[index]};
}
// 步骤可以覆盖入口，或明确要求回到世界操作；已接巡护时不再反复引导接取。
export function mainlineAction(game){
 if(cottageRestGuideActive(game))return null;
 const task=mainlineTask(game),step=mainlineStep(game);
 const f=pendingRestoration(game.progress);if(f)return {type:'restoration',id:f.id,label:'查看修复任务'};
 if(!task||!step||['clearing','patrol-boss'].includes(step.operation?.type)&&task.targetWhen&&mainlineCondition(game,task.targetWhen))return null;
 const operation=mainlineOperation(game);
 // 清理对象为空时先去仓库取一份木头，避免空清单把教学锁死。
 const cleanup=cleanupLessonTarget(game);
 if(cleanup?.empty)return {type:'warehouse',label:'打开仓库准备一份木头'};
 if(operation?.type==='drive')return game.progress.vehicleIndex===operation.index&&!parkedOwned(game).some(s=>s.record.hull===operation.index)?null:{type:'workshop',kind:'vehicle',index:operation.index,label:'查看车辆停放位置'};
 if(operation?.type==='camp-defense')return {type:'camp-defense',gate:operation.gate,label:step.label};
 if(['clearing','patrol-boss'].includes(operation?.type))return {type:'clearing',label:'前往清缴告示牌'};
 if(operation?.kind&&['upgrade','buy','equip','trial','modify','track','controller','drive'].includes(operation.type))return {type:'workshop',kind:operation.kind,index:operation.index,label:step.label};
 return Object.hasOwn(step,'action')?step.action||null:task.action||null;
}
// 故事、秘境、消防和入职优先；切换到这些活动时不出场NPC、不开始对白。
export function mainlineVisible(game){return !!mainlineTask(game)&&!game.campDefense&&!game.workshopTrial&&!arrivalPending(game.progress)&&!game.story&&!game.realm&&!game.fireActive;}
// 只在两个清理教学中检查真实库存；车辆目标跟随永久车队位置，不绑定旧停车位。
function cleanupLessonTarget(game){
 const task=mainlineTask(game);
 if(game.progress.mainline?.phase!=='doing'||!['bag-cleanup','cargo-cleanup'].includes(task?.id))return null;
 const hull=task.id==='cargo-cleanup'?game.vehicle.index:null;
 // 暂停面板中操作成功后，交付阶段可能要等下一帧；此时不再生成清理目标。
 if(game.progress.mainline.seen[hull===null?'bagCleaned':'cargoCleaned'])return null;
 const build=hull===null?null:game.progress.logistics.builds[hull];
 const empty=hull===null?cleanupEntries(game).length===0:!(build.wood||build.cargo.some(Boolean)||Object.values(game.progress.supplies.vehicles[hull]).some(Boolean)||game.vehicles[hull].module?.magazine.ammo);
 return {empty,hull,site:hull===null?null:vehicleLocations(game).find(v=>v.hull===hull)};
}
// 一份目标同时驱动任务卡、地面导航和地图标记，不创建第二份坐标。
export function mainlineObjective(game,{ignoreTracking=false}={}){
 if(!ignoreTracking&&(game.progress?.mainline?.trackingPaused||['none','restoration'].includes(game.progress?.taskTracking?.kind)))return null;
 if(game.cottage&&cottageRestGuideActive(game))return null;
 const rest=cottageRestObjective(game,mainlineTask(game));if(rest)return rest;
 if(!ignoreTracking&&!pendingRestoration(game.progress)&&trackedLivingRequest(game))return null;
 const task=mainlineTask(game);if(!task||!mainlineVisible(game))return null;
 const restore=restorationObjective(game,task);if(restore)return restore;
 const phase=game.progress.mainline.phase,step=mainlineStep(game);
 const cleanup=cleanupLessonTarget(game);
 if(cleanup?.empty)return {task,phase,key:'warehouseEntry',site:MAINLINE_SITES.warehouseEntry,navigation:true,label:'到仓库取一份木头用于清理',hint:cleanup.hull===null?'选择猫猫背包，取一份木头':'把当前车开到仓库旁，选择该车取一份木头'};
 if(cleanup?.site)return {task,phase,key:cleanup.site.id,site:{...cleanup.site,y:cleanup.site.y+55},navigation:true,label:step.label,hint:step.hint};
 // 收获赚金币直接导航现有田块，采空后重新选择，不要求返回 NPC 交付。
 if(phase==='doing'&&step?.resourceDelivery){
  const d=step.resourceDelivery==='crops'?harvestDeliveryTarget(game):woodTaskStatus(game,step.requiredWood).destination;
  if(d)return {task,phase,key:'resource-'+d.kind,site:d.site,navigation:true,label:d.label,hint:step.resourceHint};
 }
 if(phase==='doing'&&task.goal.harvestFor){
  const plot=harvestGuidePlot(game);
  return {task,phase,key:plot?'harvest-plot-'+plot.id:'harvest-plant',site:plot?{...plot,name:plot.wild?'营地外成熟野田':'先前种下的田'}:{...game.player,mapId:game.mapId,name:'就近种田'},navigation:!!plot,label:step?.label||task.text,hint:harvestGuideHint(game,task,plot)};
 }
 // 照顾与收获指向本次真实播种的田，跨地图、读档和镜头移动后仍能找到。
 if(phase==='doing'&&task.gardening?.kind==='grow'&&['water','harvest'].includes(step?.operation?.id)){
  const plot=game.progress.farm.plots.find(p=>p.id===game.progress.mainline.gardening?.plotId);
  if(plot)return {task,phase,key:'gardening-plot',site:{...plot,name:'委托胡萝卜田'},navigation:true,label:step.label};
 }
 // 首次购车的驾驶目标先引向实际泊位；取车后再自由行驶，不继续拉回工坊。
 if(phase==='doing'&&step?.operation?.type==='drive'&&parkedOwned(game).some(s=>s.record.hull===step.operation.index)){
  const site=vehicleParkingSite(game,step.operation.index);return {task,phase,key:'northParking',site:{...site,y:site.approachY??site.y},navigation:true,label:'到北停车场换乘松果战车'};
 }
 // 清缴前置只影响清缴步骤，不能遮住新增升级步骤的工坊和角色入口。
 const canTarget=!['clearing','patrol-boss'].includes(step?.operation?.type)||!task.targetWhen||mainlineCondition(game,task.targetWhen);
 const key=phase==='doing'&&canTarget?(step?.navigation||task.target||task.site):task.site,site=phase==='doing'?MAINLINE_SITES[key]:campTalkSite(game,task);
 if(phase==='doing'&&['clearing','patrol-boss'].includes(step?.operation?.type))return {task,phase,...clearingObjective(game)};
 return {task,phase,key,site,navigation:phase!=='doing'||step?.navigation!==false,label:phase==='meet'?'去找'+MAINLINE_NPCS[task.npc].name:phase==='report'?(task.seedDelivery?'交付种子 · ':'领取奖励 · ')+MAINLINE_NPCS[task.npc].name:!canTarget?'接取 Boss 清缴任务':step?.label||task.text};
}
// UI和正式游戏事件只记录有限操作事实，重复打开不会无限增加奖励。
export function markMainline(game,key,amount=1){
 const run=game.progress?.mainline;
 if(key==='config'&&(game.story||game.realm||game.fireActive||![12,15,16].includes(game.progress.weapon)||!game.progress.weapons[game.progress.weapon]))return;
 if(run&&MAINLINE_SEEN.includes(key)&&!arrivalPending(game.progress))run.seen[key]=Math.min(1e7,Math.max(run.seen[key],amount));
}
// 只接收演练场真实击破后的装备身份；临时试装不写入永久装备与钱包。
export function recordMainlineTrial(game,{kind,index}){
 markMainline(game,'trial');
 if(kind==='vehicle'&&index===3)markMainline(game,'hoverTrial');
 if(kind==='vehicle'&&index===2)markMainline(game,'aircraftTrial');
 if(kind==='weapons'&&[12,15,16].includes(index))markMainline(game,'controllerTrial');
}
// 已成功发生的事件由应用适配器传入，失败购买/失败布防没有对应标记。
export function recordMainlineEvent(game,type){
 recordMainlineExperience(game,type);
 if(type==='equipment-goal'&&game.progress.equipmentGoal)markMainline(game,'track');
 if(type==='map-change'&&game.mapId==='jiuzhaigou')markMainline(game,'valley');
 if(type==='realm-defense')markMainline(game,'defense');
 if(type==='realm-change'&&Object.values(game.realm?.blessingCounts||{}).some(n=>n>0))markMainline(game,'blessing');
 if(!game.story&&!game.realm&&['wave-clear','boss-ready'].includes(type))markMainline(game,'wave');
 if(['funnel-config','mechanical-config','spider-config'].includes(type))markMainline(game,'config');
}
// 营地伙伴常驻并沿用真实待机帧；关闭任务、修复前置和通关都不会让人物消失。
export function mainlineActors(game){
 if(!campResidentsVisible(game))return [];
 return game.campActors?campResidents(game):Object.entries(MAINLINE_NPCS).map(([id,npc])=>{
  const task=mainlineTask(game),site=MAINLINE_SITES[task?.npc===id?task.site:npc.home];
  return {...site,type:'story-prop',kind:'mainline-npc',sceneNpcId:'mainline:'+id,actorHero:npc.hero,campResident:true};
 });
}
// 在安全的指定地点触发，远程点击任务卡不能隔空完成剧情或领资源。
export function canTalkMainline(game){
 const o=mainlineObjective(game);return !!o&&!o.restoration&&!o.cottageRest&&game.mapId===MAINLINE_SITES[o.task.site].mapId&&game.state==='playing'&&
  worldDistance(game.player,campTalkSite(game,o.task))<=GAMEPLAY_VALUES.mainline.interactionRadius&&!bossCombatActive(game)&&!game.player.arena&&!game.enemies.some(e=>e.hp>0&&worldDistance(game.player,e)<GAMEPLAY_VALUES.mainline.safeEnemyDistance);
}
// 资源和完成记录写入同一候选存档，失败保持钱包与任务原样，可在原地重试。
export function completeMainline(game){
 const task=mainlineTask(game),run=game.progress.mainline;
 const localHarvest=task?.goal.harvestFor&&game.state==='playing'&&mainlineVisible(game)&&!game.cottage&&mainlineCondition(game,task.goal);
 if(!task||run.phase!=='report'||(task.goal.harvestFor?!localHarvest:!canTalkMainline(game)))return false;
 // 种子必须仍在背包中，交付与奖励在同一候选存档提交，失败不吞种子。
 const delivery=task.seedDelivery;
 if(delivery&&(!mainlineCondition(game,task.goal)||!seedDeliveryCarried(game,task))){game.mainlineError=taskResourceStock(game.progress,'seed:'+delivery.crop).total>=delivery.count?'种子已收集，请从小屋仓库取回背包后交付。':'交付的种子不足，请到种子小屋补齐后再来。';run.phase='doing';return false;}
 const before=game.progress,next=validateProgress(bindEconomy(structuredClone(game.progress),economyFor(game.progress)));
 if(delivery)next.farm.seeds[delivery.crop]-=delivery.count;
 // 巡游快照会更新生活位置，必须写入候选进度，保存失败时不污染正式对象。
 const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 const reward=awardMainline(next,task.id,snapshot);if(!reward)return false;
 let saved=false;try{saved=(game.mainlinePersist?.(next)??true)===true;}catch{}
 if(!saved){game.mainlineError='进度未保存，请在原地重试交付。';return false;}
 game.progress=next;game.mainlineError='';game.mainlineSpeech=null;game.onEvent('mainline-complete',rewardReceipt(before,next,task.title));return true;
}
// 手动收起对白不跳过目标；重听由同一段台词开始，镜头始终由原游戏控制。
export function dismissMainlineSpeech(game){game.mainlineSpeech=null;game.mainlineTalkDelay=GAMEPLAY_VALUES.mainline.speechGap;}
// 主动读完或跳过共用安全距离和一次性事务，文字计时不接取或交付任务。
export function advanceMainlineSpeech(game){
 const task=mainlineTask(game),run=game.progress?.mainline,speech=game.mainlineSpeech;
 if(!task||!speech||speech.id!==task.id||speech.phase!==run.phase||!canTalkMainline(game))return false;
 if(speech.phase==='report')return completeMainline(game);
 if(speech.phase!=='meet')return false;
 game.mainlineSpeech=null;run.phase='doing';beginGardeningLesson(game.progress);game.onEvent('mainline-change');return true;
}
// 到点显示对白，玩家确认后开始操作或提交；菜单暂停时对白不推进。
export function updateMainline(game,dt){
 const task=mainlineTask(game),run=game.progress?.mainline;
 if(!task||game.workshopTrial||arrivalPending(game.progress))return false;
 // 自由探索期间不自动接取、交付或弹出对白，存档中的当前任务仍可主动恢复。
 if(run.trackingPaused){game.mainlineSpeech=null;positions.delete(game);return false;}
 if(!run.currentId)run.currentId=task.id;
 if(pendingRestoration(game.progress)||cottageRestGuideActive(game)){game.mainlineSpeech=null;return false;}
 // 收获任务就地接续并沿用正式存档事务，失败可重试，不能只凭旧收获次数跳过。
 if(task.goal.harvestFor){
  if(run.phase==='meet')run.phase='doing';beginGardeningLesson(game.progress);
  if(run.phase==='report'&&!mainlineCondition(game,task.goal))run.phase='doing';
  if(mainlineCondition(game,task.goal)){
   run.phase='report';game.mainlineSpeech=null;
   if(game.state==='playing'&&mainlineVisible(game)&&!game.cottage)completeMainline(game);
   return false;
  }
 }
 // 兼容提前修复及旧档：当前任务已有对应设施时就地接取，保存失败原地重试。
 if(game.state==='playing'&&mainlineVisible(game)&&!game.cottage&&restoredTaskToStart(game.progress)){
  game.mainlineSpeech=null;game.mainlineTalkDelay=Math.max(0,(game.mainlineTalkDelay||0)-dt);
  if(game.mainlineTalkDelay)return false;
  const next=validateProgress(bindEconomy(structuredClone(game.progress),economyFor(game.progress)));
  startRestoredTask(next);const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
  let saved=false;try{saved=(game.mainlinePersist?.(next)??true)===true;}catch{}
  if(saved){game.progress=next;game.mainlineError='';}
  else {game.mainlineError='任务进度未保存，正在原地重试。';game.mainlineTalkDelay=1;}
  return false;
 }
 if(!game.story&&!game.realm&&!game.fireActive&&game.state==='playing'){
  const previous=positions.get(game),p=game.player;
  if(previous?.mapId===game.mapId){const distance=worldDistance(previous,p);if(distance<GAMEPLAY_VALUES.mainline.movementMaxStep){run.distance=Math.min(1e7,run.distance+distance);if(game.vehicle.active&&game.vehicle.index===0)run.seen.drive=Math.min(1e7,run.seen.drive+distance);}}
  if(previous?.mounted&&!game.vehicle.active)markMainline(game,'dismount');
  positions.set(game,{x:p.x,y:p.y,mapId:game.mapId,mounted:game.vehicle.active});
  const controller=game.weapon().controller;
  if(controller==='funnel'&&game.funnel?.primed&&game.funnel.deploy<=0||
   controller==='mechanical'&&game.mechanical.nodes.some(n=>n.active&&n.ready&&n.hp>0)||
   controller==='spider'&&game.spider.nodes.some(n=>n.active&&n.ready&&n.hp>0))markMainline(game,'companions');
 }else positions.delete(game);
 // 待交付期间种子被播种消耗时恢复寻找目标，不能空手领报酬。
 if(run.phase==='report'&&task.seedDelivery&&(!mainlineCondition(game,task.goal)||!seedDeliveryCarried(game,task)))run.phase='doing';
 if(run.phase==='doing'&&mainlineCondition(game,task.goal)&&seedDeliveryCarried(game,task))run.phase='report';
 if(!mainlineVisible(game)){game.mainlineSpeech=null;return false;}
 if(game.state!=='playing')return false;
 game.mainlineTalkDelay=Math.max(0,(game.mainlineTalkDelay||0)-dt);
 if(!game.mainlineSpeech&&run.phase!=='doing'&&!game.mainlineTalkDelay&&canTalkMainline(game))game.mainlineSpeech={id:task.id,phase:run.phase,line:0,elapsed:0};
 const speech=game.mainlineSpeech;if(!speech)return false;
 if(speech.id!==task.id||speech.phase!==run.phase||!canTalkMainline(game)){game.mainlineSpeech=null;return false;}
 // 对话停留等待玩家操作，只保留场景时钟，不再按时长自动结束。
 game.time+=dt;
 return true;
}
