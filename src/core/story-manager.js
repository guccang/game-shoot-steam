import {updateEquipmentCare,finishEquipmentInteraction,updateEquipmentTimber} from './equipment-story-actions.js';
import {canEnterEquipmentQuest} from './equipment-quest-entry.js';
import {facilityOpen} from '../config/town-restoration.js';
import {clearWorldNavigation} from './world-navigation.js';
import {storyInteractionNear} from './story-interaction.js';
import {awardCampXp} from '../progression/camp-level.js';
import { creditResource } from '../progression/resource-wallet.js';
import {recordActivity} from '../progression/game-statistics.js';
import {rewardReceipt} from '../progression/reward-receipt.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { i18nText } from "../i18n/index.js";
import {storyPostForChapter,canUseStoryPost} from './story-posts.js';
// 章节会话与任务状态机：冻结森林、逐阶段检查点、借用装备及一次性原子结算。
import { storyDefinition, storyUnlocked, storyNode, storyCondition, storyText, storyPosition, storyTarget, clearStoryState, storyDeliveryReady } from './story-definition.js';
import {recordStoryEvent,updateStoryCues,storyDialogueLines} from './story-journey.js';
import {enterRealm} from './realm-manager.js';
import {readyStoryExcursion} from './story-excursion.js';
import { validateStoryDefinition } from './story-schema.js';
import { storyTrees, validateStorySites } from '../world/story-sites.js';
import { validateStory, storySupply } from '../progression/story-progress.js';
import {validateProgress} from '../progression/progress.js';
import { capturePatrol, restorePatrol } from './patrol-session.js';
import { captureRealmVehicles, restoreRealmVehicles } from './realm-vehicles.js';
import { equipStory, storyEquipment } from './story-loadout.js';
import { beginStoryWave, updateStoryWave, spawnStoryBoss, updateStoryBoss } from './story-encounters.js';
import { blocked } from '../physics/motion.js';
import { worldDistance } from '../world/coordinates.js';
import { moveBody } from '../physics/motion.js';
import {syncStoryWorld} from './story-world.js';
const SHARED=new Set(['livingActors','livingBattle','livingPersist','livingWeather','livingPhase','livingPreview','progress','random','onEvent','profiler','viewport','story','storyForest','storyPersist']);

// 运行时快照与可序列化进度分离，装备和冻结对象不会进入JSON。
export function syncStory(game) {
  if(!game.story)return;
  game.progress.story.run=validateStory({run:game.story}).run;
}
// 重要阶段变化由应用保存并复位输入，暂停状态不会偷偷恢复。
function changed(game) {syncStory(game);game.onEvent('story-change');}
// 当前供给用于下一阶段检查点，不保存正在飞行的弹丸或未结算敌人。
function supply(game) {return storySupply({...game.player,vehicle:captureRealmVehicles(game),magazines:game.magazines},storyDefinition(game));}
// 清理当前战斗残留，保留世界植被和已提交的阶段身份。
function clearCombat(game) {
  clearStoryState(game,storyDefinition(game).cleanup.combat);
}
// 同时保存阶段与其起点，保证刷新不会跳过尚未完成的遭遇。
function stage(game,id,phase='active') {
  clearCombat(game);const r=game.story;r.stageId=id;r.phase=phase;r.checkpoint=supply(game);r.group=0;r.waypoint=0;r.error='';
  applyAutomaticRoute(game);
  game.state=phase==='active'?'playing':'story';changed(game);
}
// 固定道路写回会话以保留旅程记录；旧档已经选定的道路继续沿用，不清空已有进度。
function applyAutomaticRoute(game){const r=game.story,node=storyNode(game);if(node.task.type==='route'&&!r.routeId)r.routeId=node.task.route||null;}
// 对话只在安全时暂停，跳过与逐句阅读走同一状态迁移。
function dialogue(game,key) {game.story.dialogue=key;storyDialogueLines(game.story,key,true);game.story.line=0;game.story.phase='dialogue';game.state='story';changed(game);}
// 保护对象按表创建，展示文本不写入战斗实体。
function createTarget(game,id){const {site,failure,...stats}=storyDefinition(game).targets[id];game.story[id]={...storyPosition({site},game),...stats};}
// 有限动作注册表只处理通用意图；章节编号、对白和跳转目标全部来自配置。
const ACTIONS={
  // 阶段动作保存供给并执行声明的清理规则。
  stage:(g,a)=>stage(g,a.id,a.phase),
  // 阶段内准备状态不重新创建检查点。
  phase:(g,a)=>{g.story.phase=a.value;g.state=a.value==='active'||storyDeliveryReady(g)?'playing':'story';},
  // 旗标用于任务条件与道具外观。
  flag:(g,a)=>{g.story.flags[a.key]=a.value??true;},
  // 所有任务移动读取同一站点表。
  move:(g,a)=>Object.assign(g.player,storyPosition(a,g)),
  // 对话与人物解耦，按对白标识查表。
  dialogue:(g,a)=>dialogue(g,a.id),
  // 守护目标只在配置指定的启动时机恢复。
  target:(g,a)=>createTarget(g,a.id),
  // 遭遇启动保留原出生时序。
  wave:(g,a)=>{beginStoryWave(g,a.site,a.wave.total,a.wave.cap,a.wave.heavy);changed(g);},
  // 领主类型与数值由命名模板提供。
  boss:(g,a)=>{spawnStoryBoss(g,a.id);changed(g);},
};
// 配置顺序即动作顺序，不推断下一阶段，也不允许任意脚本执行。
export function runStoryActions(game,actions=[]){for(const action of actions){
  const run=Object.hasOwn(ACTIONS,action.type)?ACTIONS[action.type]:null;if(!run)throw Error(i18nText("core.story-manager.8a6011f731", { p0: (action.type) }));run(game,action);
}}
// 通用任务处理器保留原战斗、计时与失败优先级；只通过配置决定事件去向。
const TASK_RUNNERS={
  // 纯准备或交互阶段由公开意图推进。
  idle:()=>{},
  // 开路只使用红狼的正式车壳扫掠；任务树不进入永久森林快照。
  timber:(g,t)=>{if(updateEquipmentTimber(g,t))runStoryActions(g,t.after);},
  // 靠近站点启动一场遭遇，清场条件交给交互目标读取。
  wave:(g,t,dt)=>{const r=g.story;
    if(!r.combat&&worldDistance(g.player,storyPosition(t,g))<t.reach)beginStoryWave(g,t.site,t.wave.total,t.wave.cap,t.wave.heavy);
    if(r.combat)updateStoryWave(g,dt);
  },
  // 路线逐站消耗出生配额，可在指定站次提供一次性补给。
  route:(g,t,dt)=>{const r=g.story,route=storyDefinition(g).routes[r.routeId||t.route];if(!route)return;
    if(r.group<route.sites.length){
      const site=route.sites[r.group];
      if(route.counts[r.group]===0){if(worldDistance(g.player,storyPosition({site},g))<t.reach)r.group++;return;}
      if(!r.combat&&worldDistance(g.player,storyPosition({site},g))<t.reach)beginStoryWave(g,site,route.counts[r.group],route.cap,route.heavy);
      if(r.combat&&updateStoryWave(g,dt)){r.group++;r.combat=null;const s=route.supply;
        if(s&&r.group===s.after&&!r.flags[s.flag]){r.flags[s.flag]=true;
          g.player.hp=Math.min(storyDefinition(g).hp,g.player.hp+s.hp);g.vehicle.hp=Math.min(g.vehicle.maxHp,g.vehicle.hp+s.hull);
          g.onEvent('story-hint',{text:s.hint});recordStoryEvent(g,'supply');}}
    }else if(worldDistance(g.player,storyPosition({site:t.destination},g))<t.arrivalRadius)runStoryActions(g,t.after);
  },
  // 每波清场后读完修复计时才进入下一波，最后一波执行后续动作。
  defense:(g,t,dt)=>{const r=g.story;
    if(r.repair>0){r.repair=Math.max(0,r.repair-dt);if(!r.repair){r.group++;
      if(r.group>=t.waves.length){delete g.player.arena;runStoryActions(g,t.after);}
      else{const spec=t.waves[r.group];beginStoryWave(g,t.site,spec.total,spec.cap,spec.heavy);g.onEvent('story-hint',{text:storyText(t.hint,{group:r.group})});}}}
    else if(updateStoryWave(g,dt)){r.repair=t.repairSeconds;recordStoryEvent(g,'wave-clear',{group:r.group});}
  },
  // 路点必须按顺序实际抵达；飞行要求来自真实载具状态。
  travel:(g,t)=>{const r=g.story,id=t.points[r.waypoint||0];
    if(t.driving&&!g.vehicle.active)return;
    if(id&&(!t.requires||g.player[t.requires])&&worldDistance(g.player,storyPosition({site:id},g))<=t.radius){
      r.waypoint=(r.waypoint||0)+1;if(r.waypoint>=t.points.length)runStoryActions(g,t.after);}},
  // 正式下机才完成落地，不把飞过目标当作降落。
  landing:(g,t)=>{if(!g.vehicle.active&&!g.player.flying&&worldDistance(g.player,storyPosition(t,g))<=t.radius)runStoryActions(g,t.after);},
  // 领主及支援全部清空后迁移，预警只播报一次。
  boss:(g,t,dt)=>{const r=g.story;
    if(g.boss?.ai?.phase===t.warning?.phase&&!r.warned){r.warned=true;g.onEvent('story-hint',{text:t.warning.hint});}
    if(updateStoryBoss(g,dt))runStoryActions(g,t.after);
  },
};
// 进入章节必须靠近关联的世界驿牌且没有其他局内会话；恢复入口由构造器单独调用。
export function enterStory(game,saved=null,chapterId=null,postId=null) {
 if(!saved&&!facilityOpen(game.progress,'story'))return false;
  if(game.campDefense||game.story||game.realm||game.fireActive||game.boss||game.state==='dead')return false;
  const resume=saved||game.progress.story.run;
  if(chapterId&&resume&&chapterId!==resume.chapterId)return false;
  const def=storyDefinition(resume?.chapterId||chapterId);validateStoryDefinition(def);
  if(!saved&&!storyUnlocked(game.progress,def.id))return false;
  if(!saved&&!canUseStoryPost(game,storyPostForChapter(game,def.id,postId))&&!canEnterEquipmentQuest(game,def.id,postId))return false;
  const patrol=capturePatrol(game),forestReturn=resume?.forestReturn||{patrol,mapId:game.mapId,...game.player,
    vehicle:captureRealmVehicles(game),magazines:structuredClone(game.magazines)};
  if(saved){game.mapId=forestReturn.mapId;restorePatrol(game,forestReturn.patrol);Object.assign(game.player,{x:forestReturn.x,y:forestReturn.y,hp:forestReturn.hp});
    restoreRealmVehicles(game,forestReturn.vehicle);forestReturn.magazines?.forEach((m,i)=>{if(game.magazines[i])Object.assign(game.magazines[i],m);});}
  game.storyForest=Object.fromEntries(Object.entries(game).filter(([key])=>!SHARED.has(key)));
  game.story=resume?structuredClone(resume):{chapterId:def.id,definitionVersion:def.version,routeVersion:def.world.routeVersion||0,runId:`${Date.now()}-${Math.floor(game.random()*1e6)}`,
    replay:game.progress.story.chapters[def.id].completed,stageId:def.entry.stage,phase:'prepare',loadoutId:null,routeId:null,
    flags:{},choices:{},readLines:[],dialogue:null,forestReturn,metrics:{seconds:0,deaths:0,synergy:0,frost:0}};
  game.story.equipment=storyEquipment(game.story.loadoutId,game);game.mapId=def.mapId;game.reset();
  syncStoryWorld(game);
  const before=game.trees;game.trees=storyTrees(before,def);game.story.clearedTrees=before.length-game.trees.length;
  const issues=validateStorySites(game.trees,blocked,def);
  if(issues.length){leaveStory(game);throw Error(i18nText("core.story-manager.c0c3c40e5e", { p0: (issues.join('、')) }));}
  if(resume){restoreStoryStage(game);}
  else{recordActivity(game.progress,def.catalogType==='commission'?'commission':'story');Object.assign(game.player,storyPosition(def.entry,def.id));game.story.checkpoint=supply(game);dialogue(game,def.entry.dialogue);}
  return true;
}
// 恢复只从阶段起点重建，自动保持暂停等待玩家操作。
function restoreStoryStage(game) {
  const r=game.story,node=storyNode(game),checkpoint=r.checkpoint;
  applyAutomaticRoute(game);
  equipStory(game);clearCombat(game);
  if(checkpoint){game.player.hp=checkpoint.hp;Object.assign(game.player,{x:checkpoint.x,y:checkpoint.y});
    restoreRealmVehicles(game,checkpoint.vehicle);checkpoint.magazines.forEach((m,i)=>{if(game.magazines[i])Object.assign(game.magazines[i],m);});}
  r.group=0;r.waypoint=0;for(const id of storyDefinition(game).restoreTargets)createTarget(game,id);
  const excursion=Object.values(storyDefinition(game).nodes).find(n=>n.excursion)?.excursion;
  // 旧档停在回程对白时也直接交付，未实际进入的委托仍保留准备流程。
  if(excursion&&r.flags[excursion.flag]){r.dialogue=null;runStoryActions(game,excursion.after);}
  else if(r.dialogue){r.phase='dialogue';r.line=0;game.state='story';}
  else if(storyCondition(r,node.prepareWhen??false)){r.phase='prepare';game.state=storyDeliveryReady(game)?'playing':'story';}
  else {r.phase='active';game.state='paused';}
  changed(game);
}
// 暂离保留阶段检查点，当前页精确恢复森林，刷新时由可序列化快照恢复。
export function leaveStory(game,completed=false) {
  if(!game.story)return false;
  const rule=storyDefinition(game).cleanup.exit;
  if(!completed&&rule.saveOnLeave)syncStory(game);
  const forest=game.storyForest;for(const key of rule.clear)game[key]=null;
  if(forest&&rule.restoreForest)Object.assign(game,forest);
  // 完成交付先恢复巡林，让奖励弹窗接管临时暂停；主动暂离仍沿用章节退出规则。
  syncStoryWorld(game);game.state=completed?'playing':rule.state;game.onEvent('story-change');return true;
}
// 取消只撤销本次未交付章节；先保存候选档，失败时保留现场、检查点和原钱包。
export function cancelStory(game){
  const run=game.story||game.progress.story.run;
  if(!run||game.realm||game.campDefense||game.fireActive)return {ok:false,message:'请先退出当前活动，再取消章节任务。'};
  const next=validateProgress(structuredClone(game.progress));next.story.run=null;
  if(game.story){next.patrol=run.forestReturn.patrol;next.mapId=run.forestReturn.mapId;next.living.position={x:run.forestReturn.x,y:run.forestReturn.y};}
  let saved=false;try{saved=(game.storyPersist?.(next)??true)===true;}catch{saved=false;}
  if(!saved)return {ok:false,message:'取消未保存，请重试；当前任务进度已保留。'};
  game.progress=next;
  if(game.story)leaveStory(game,true);
  syncStoryWorld(game);clearWorldNavigation(game);game.onEvent('story-change');
  return {ok:true,message:'已取消章节任务，可返回驿牌重新接取。'};
}
// 安全准备阶段才允许改选整套，所有永久工坊事务仍被阻止。
export function chooseStoryLoadout(game,id) {
  const r=game.story;if(!r||r.phase!=='prepare'||!storyNode(game).loadout||!storyDefinition(game).loadouts.some(l=>l.id===id))return false;
  r.loadoutId=id;changed(game);return true;
}
// 路线提交后固定；刷新和失败重试沿用同一条路线。
export function chooseStoryRoute(game,id) {
  const r=game.story;if(!r||r.phase!=='prepare'||!storyNode(game).routeChoice||r.routeId||!Object.hasOwn(storyDefinition(game).routes,id))return false;
  const route=storyDefinition(game).routes[id];if(route.loadouts&&!route.loadouts.includes(r.loadoutId))return false;
  if(storyNode(game).loadout)equipStory(game);
  r.routeId=id;r.phase='active';game.state='playing';r.checkpoint=supply(game);changed(game);return true;
}
// 统一提交准备；换装与补给只发生在新阶段开始或失败重试时。
export function startStoryStage(game) {
  const r=game.story;if(!r||r.phase!=='prepare'||!r.loadoutId)return false;
  const actions=storyNode(game).start;if(!actions)return false;
  equipStory(game);runStoryActions(game,actions);
  return true;
}
// 跳过整段仍记录剧情和触发同一后续目标，不依据动画回调发奖。
export function advanceStoryDialogue(game,skip=false) {
  const r=game.story;if(!r?.dialogue)return false;
  const key=r.dialogue;
  if(!skip&&++r.line<storyDialogueLines(r,key).length)return true;
  if(!r.readLines.includes(key))r.readLines.push(key);r.dialogue=null;r.line=0;
  runStoryActions(game,storyDefinition(game).dialogues[key].after);
  changed(game);return true;
}
// 交互目标共用于距离判定、世界方向与UI按钮，防止远程提交任务。
export function storyObjective(game) {
  const r=game.story,def=storyDefinition(game);
  if(!r)return {site:def.entry.site,label:game.progress.story?.chapters[def.id].completed?def.entry.completedLabel:def.entry.label,action:'enter'};
  if(r.trial)return {site:def.trial.site,label:def.trial.objective,action:null};
  const node=storyNode(game),o=node.objective,route=def.routes[r.routeId||node.task.route];
  const routeSite=node.task.type==='route'?route?.sites[r.group]:node.task.type==='travel'?node.task.points[r.waypoint||0]:null;
  return {site:routeSite||o.site,label:storyText(routeSite?(o.routeLabel||o.label):o.label,{group:r.group||0})+(node.task.type==='timber'?`（${r.timberTrees?.filter(t=>t.hp<=0).length||0}/3）`:''),
    action:o.action&&storyCondition(r,o.actionWhen)?o.action:null};
}
// 一次点击启动调查，离开范围或受伤会取消，不要求持续按住按钮。
export function interactStory(game) {
  const r=game.story,o=storyObjective(game);
  if(!r||game.state!=='playing'||!o.action||!storyInteractionNear(game))return false;
  if(r.interacting>0)return false;r.interacting=storyDefinition(game).interaction.seconds;r.interactHp=game.player.hp;r.interactHull=game.vehicle.hp;return true;
}
// 玩家或站点死亡统一失败，下一次重试只回到本阶段。
export function failStory(game,reason=i18nText("core.story-manager.c2eb82937c")) {
  const r=game.story;if(!r||r.phase==='failed')return;
  r.phase='failed';r.error=reason;r.metrics.deaths++;game.state='story';changed(game);
}
// 站点不借用角色无敌帧，每次正式敌人攻击仅扣一次生命。
export function hurtStoryTarget(game,amount) {
  const r=game.story,target=storyTarget(game);if(!target||r.phase!=='active'||game.state!=='playing')return;
  target.hp=Math.max(0,target.hp-amount);game.float(target.x,target.y-45,`−${Math.round(amount)}`,'#ffb6ae');
  if(!target.hp)failStory(game,storyDefinition(game).targets[storyNode(game).target].failure);
}
// 击杀只留下正式死亡表现，不触发森林奖励、材料保底、熟练度和领主轮换。
export function storyKill(game,target) {
  if(target.type==='tree'){game.leaveStump(target);return;}
  if(target.type==='boss')clearStoryState(game,storyDefinition(game).cleanup.bossDeath);
  game.remnants.push({...target,flash:0,life:.6,duration:.6,burst:true,burstDelay:0,reactionTime:0});
  if(game.remnants.length>20)game.remnants.shift();
}
// 重试恢复已提交的装备和位置；阶段准备仍可自由换整套。
export function retryStory(game) {if(!game.story||game.story.phase!=='failed')return false;restoreStoryStage(game);return true;}
// 可选试射使用正式场景和弹道；靶标不伤人且不产生章节或永久奖励。
export function startStoryTrial(game,scene='line') {
  const r=game.story,trial=storyDefinition(game).trial,spec=trial.scenes[scene];
  if(!r||!storyNode(game).trial||r.phase!=='prepare'||!r.loadoutId||!spec)return false;
  equipStory(game);clearCombat(game);Object.assign(game.player,storyPosition(storyDefinition(game).trial,game));
  r.trial={scene,remaining:trial.duration,targets:[],hits:0};r.phase='active';
  for(let i=0;i<trial.total;i++){
    const e=game.spawnEnemy(0,0,{x:game.player.x+GAMEPLAY_VALUES.story.trialSpawnOffsetX+(i%spec.columns)*spec.spacing,y:game.player.y+(Math.floor(i/spec.columns)-.5)*spec.y},{bossOwner:'story'});
    Object.assign(e,{story:true,workshopTarget:true,football:true,flying:false,species:'slime',hp:trial.hp,maxHp:trial.hp,radius:trial.radius,mass:1,damage:0});
    r.trial.targets.push(e);
  }
  changed(game);return true;
}
// 离开训练恢复准备状态，不把试射弹药和目标写入正式阶段起点。
export function stopStoryTrial(game) {
  const r=game.story;if(!r?.trial)return false;
  delete r.trial;clearCombat(game);equipStory(game);Object.assign(game.player,storyPosition(storyDefinition(game).trial,game));r.phase='prepare';game.state='story';changed(game);return true;
}
// 只在最后交付创建候选存档，写失败时钱包、旗标和森林现场全部保持原样。
export function claimStory(game) {
  const r=game.story,def=storyDefinition(game),node=storyNode(game);
  if(!r||r.phase!=='prepare'||!node.claimWhen||!storyCondition(r,node.claimWhen))return false;
  // 恢复载具选择访问器，交付后切换新获得的车体仍会读取正确主炮和等级。
  const before=game.progress,next=validateProgress(structuredClone(game.progress)),record=next.story.chapters[def.id],reward=def.reward,first=!record.rewardClaimed;
  if(!record.rewardClaimed){awardCampXp(next,'story',def.id);for(const [key,amount] of Object.entries(reward)){
    creditResource(next,key,amount);
  }record.rewardClaimed=true;}
  record.completed=true;record.choices=structuredClone(r.choices||{});record.followupLoadout=r.lastExperienceLoadout||r.loadoutId;record.followupDismissed=false;
  if(r.routeId&&!record.completedRoutes.includes(r.routeId))record.completedRoutes.push(r.routeId);
  Object.assign(next.story.worldFlags,def.completionFlags);next.story.run=null;next.patrol=r.forestReturn.patrol;
  let saved=false;try{saved=(game.storyPersist?.(next)??true)===true;}catch{saved=false;}
  if(!saved){r.error=i18nText("core.story-manager.eb79cd6465");return false;}
  game.progress=next;leaveStory(game,true);game.onEvent('story-complete');if(first)game.onEvent('task-reward',rewardReceipt(before,next,def.title));return true;
}
// 章节更新在敌人伤害结算之后执行，站点死亡优先于最后一只敌人的清场事件。
export function updateStory(game,dt) {
  const r=game.story;if(!r||game.state!=='playing'||r.phase!=='active')return;
  updateStoryCues(game,dt);
  if(r.trial){
    r.trial.remaining-=dt;
    for(const e of r.trial.targets){if(e.hp<=0){e.hp=e.maxHp;game.enemies.push(e);}if(storyDefinition(game).trial.scenes[r.trial.scene].approach){
      const dx=game.player.x-e.x,dy=game.player.y-e.y,d=Math.hypot(dx,dy);
      const trial=storyDefinition(game).trial;
      if(d>trial.distance)moveBody(e,dx/d*trial.speed*dt*(e.chill?e.chillFactor:1),dy/d*trial.speed*dt*(e.chill?e.chillFactor:1),null,trial.radius,game.trees);
    }}
    if(r.trial.remaining<=0)stopStoryTrial(game);return;
  }
  r.metrics.seconds+=dt;
  if(r.interacting>0){const o=storyObjective(game);
    if(!storyInteractionNear(game)||game.player.hp<r.interactHp||game.vehicle.hp<r.interactHull)r.interacting=0;
    else if(updateEquipmentCare(game,dt)){r.interacting=Math.max(0,r.interacting-dt);if(!r.interacting){finishEquipmentInteraction(game);dialogue(game,o.action);}}
    return;
  }
  const node=storyNode(game);
  // 交付节点沿用表中对白与交互距离，到点自动交谈，读完才打开既有领奖页。
  if(node.panel?.type==='claim'&&game.mapId===storyDefinition(game).mapId&&!game.boss&&!game.enemies.some(e=>e.hp>0)&&interactStory(game))return;
  const task=node.task;TASK_RUNNERS[task.type](game,task,dt);
}

// 命名等叙事选择只接受配置选项，保存后执行同一个声明式后续流程。
export function chooseStoryOption(game,id){const r=game.story,n=storyNode(game);if(!r||r.phase!=='prepare'||!n.choice)return false;
  if(!storyDefinition(game).choices[n.choice]?.some(o=>o.id===id))return false;
  r.choices??={};r.choices[n.choice]=id;runStoryActions(game,n.after);changed(game);return true;}
// 暂存章节后进入正式秘境；成功进入即记体验，进入失败则恢复原委托。
export function startStoryExcursion(game){const r=game.story,n=storyNode(game);if(!r||r.phase!=='prepare'||!n.excursion)return false;
  const saved=structuredClone(r),mode=n.excursion.mode;leaveStory(game);
  if(enterRealm(game,mode))return true;enterStory(game,saved);return false;}

// 秘境已归还森林现场后恢复委托，跳过目录和对白，但不代替玩家领取奖励。
export function returnStoryExcursion(game,mode){
  if(game.realm||game.story||!readyStoryExcursion(game,mode))return false;
  return enterStory(game,structuredClone(game.progress.story.run));
}
