import {taskTreasureRumor} from './treasure.js';
import {facilityOpen,facilityReason} from '../config/town-restoration.js';
import {CLEARING_CONTINUE_ROUND} from '../config/clearing.js';
import {chooseClearingSite} from './clearing-site.js';
import {rememberPreparedNavigation} from './prepared-navigation.js';
import {awardCampXp} from '../progression/camp-level.js';
import { creditResource } from '../progression/resource-wallet.js';
import {recordActivity} from '../progression/game-statistics.js';
import {rewardReceipt} from '../progression/reward-receipt.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 常驻生活规则：人物、委托和时间独立于章节临时场景，界面只提交交互意图。
import {LIVING_PLACES,LIVING_ROADS,LIVING_REQUESTS,LIVING_BATTLE_ENEMY_HP,RESIDENTS,SEASON_WORK} from '../config/living-world.js';
import {calendarView,advanceLivingCalendar} from '../world/living-calendar.js';
import {livingForest,livingSafePoint} from '../world/living-spaces.js';
import {worldDistance,nearest,WORLD} from '../world/coordinates.js';
import {moveBody,drySpawn,blocked} from '../physics/motion.js';
import {planQuestRoute,questLineClear} from '../physics/quest-route.js';
import {createCatMotion,updateCatMotion} from './cat-motion.js';
import {validateProgress} from '../progression/progress.js';
import {STORY_CAMPAIGN} from '../config/story-campaign.js';
import {nearbyStoryPost} from './story-posts.js';
import {trackedLivingRequest} from './task-tracking.js';
import {clearingSite,clearingNavigationTarget} from '../progression/clearing-site.js';

// 运行时人物按稳定身份重用，装备事务替换进度对象后无需重建人物或动作时钟。
export function livingResidents(game){
  if(!game.livingActors)game.livingActors=new Map();
  for(const [index,spec] of RESIDENTS.entries())if(!game.livingActors.has(spec.id)){
    const home=LIVING_PLACES[spec.home],saved=game.progress.living.residents[spec.id];
    const position=saved&&!blocked(saved.x,saved.y,12,game.trees,{mapId:'forest'})?saved:{x:home.x+(index%3-1)*32,y:home.y+45+Math.floor(index/3)*20};
    game.livingActors.set(spec.id,{...spec,...position,mapId:'forest',type:'living-resident',radius:12,motion:createCatMotion(),clock:0,action:'rest',moving:false,path:[],goal:null});
  }
  return [...game.livingActors.values()].filter(r=>r.hero!==game.progress.hero);
}
// 同名角色由玩家承担，交付或交谈改由其已有关系中的另一人承接。
export function residentFor(game,id){
  const spec=RESIDENTS.find(r=>r.id===id),replacement=id==='mint'?'snow':'mint';
  return livingResidents(game).find(r=>r.id===(spec?.hero===game.progress.hero?replacement:id));
}
// 作息既看时段又看故事结果，夜班和季末集市由同一日期决定。
export function residentSchedule(game,resident){
  const state=game.progress.living,view=calendarView(state.calendar),q=state.requests;
  let [place,action]=resident[view.id];
  if(resident.id==='snow'&&view.id==='dusk'&&!q['neighbors-lunch'].completed)action='sort';
  if(view.id==='day'&&view.season==='autumn'&&resident.id==='boar'){place='camp';action='sort';}
  if(view.id==='day'&&view.season==='winter'&&resident.id==='snow')action='repair';
  if(view.market&&view.id!=='night'&&q['neighbors-market'].completed){place='market';action='market';}
  else if(resident.id==='boar'&&q['neighbors-lunch'].completed&&state.calendar.day>q['neighbors-lunch'].completedDay&&view.id==='day'&&state.calendar.elapsed>=GAMEPLAY_VALUES.living.lunchStartMs){place='kitchen';action='wash';}
  else if(resident.id==='cook'&&q['neighbors-lunch'].completed&&state.calendar.day>q['neighbors-lunch'].completedDay&&view.id==='day'&&state.calendar.elapsed>=GAMEPLAY_VALUES.living.lunchStartMs){place='kitchen';action='eat';}
  else if(q['neighbors-night'].completed&&view.id==='night'){
    const firstShift=(state.calendar.day-(q['neighbors-night'].completedDay||0))%2===0;
    if(resident.id==='bat'){place=firstShift?'flowers':'relay';action=firstShift?'flowers':'watch';}
    if(resident.id==='owl'){place=firstShift?'relay':'roost';action=firstShift?'watch':'rest';}
  }
  if(['rain','thunder','snow'].includes(game.livingWeather)&&action!=='watch'){place=['cook','boar'].includes(resident.id)?'kitchen':resident.id==='bat'?'roost':'relay';action='shelter';}
  const p=LIVING_PLACES[place],index=RESIDENTS.indexOf(RESIDENTS.find(r=>r.id===resident.id));
  return {place,action,x:p.x+(index%3-1)*34,y:p.y+(action==='shelter'?22:42)+Math.floor(index/3)*(action==='shelter'?18:23)};
}
// 道路图只含少量固定节点，长距离往来走已有生活通路；近距离直达工作面。
function residentRoadPath(from,to){
  if(worldDistance(from,to)<GAMEPLAY_VALUES.living.directRouteDistance)return [to];
  const nodes=[],edges=[];
  // 合并道路交点，保证营地与邻里使用相同的交通关系。
  function add(p){let i=nodes.findIndex(n=>n.x===p.x&&n.y===p.y);if(i<0){i=nodes.length;nodes.push(p);edges.push([]);}return i;}
  for(const road of LIVING_ROADS)for(let i=1;i<road.length;i++){const a=add(road[i-1]),b=add(road[i]);edges[a].push(b);edges[b].push(a);}
  const nearestIndex=p=>nodes.reduce((best,n,i)=>worldDistance(p,n)<worldDistance(p,nodes[best])?i:best,0);
  const start=nearestIndex(from),end=nearestIndex(to),queue=[start],previous=new Map([[start,null]]);
  while(queue.length){const n=queue.shift();if(n===end)break;for(const next of edges[n])if(!previous.has(next)){previous.set(next,n);queue.push(next);}}
  const path=[];for(let n=end;n!==null&&n!==undefined;n=previous.get(n))path.unshift(nodes[n]);return [...path,to];
}
// 沿既有生活道路分段避开实体建筑；作息切换时规划，行走帧不重复搜索。
function residentPath(from,to,trees){
 const points=[],body={...from,navigationRadius:16};let start=from;
 for(const goal of residentRoadPath(from,to)){
  if(questLineClear(start,goal,body,trees))points.push(goal);
  else{const route=planQuestRoute({...body,...start},goal,trees);if(!route.reachable)return points;points.push(...route.points.slice(1));}
  start=goal;
 }
 return points;
}
// 每个居民持续更新；不按摄像机可见性创建或销毁，六人规模无需全世界模拟。
export function updateLivingWorld(game,dt){
  if(!livingForest(game)||game.state!=='playing')return;
  for(const resident of livingResidents(game)){
    const target=residentSchedule(game,resident),key=`${target.place}:${target.action}`;
    if(resident.goal!==key){resident.goal=key;resident.path=residentPath(resident,target,game.trees);}
    resident.action=target.action;resident.place=target.place;resident.clock+=dt;
    const before={x:resident.x,y:resident.y};let remaining=GAMEPLAY_VALUES.living.walkSpeed*dt;
    // 一帧可走完多个短路点，绕墙新增折点不会吞掉整帧行走时间。
    while(remaining>0&&resident.path.length){
      const waypoint=resident.path[0],n=nearest(waypoint,resident),distance=Math.hypot(n.x-resident.x,n.y-resident.y);
      if(distance<GAMEPLAY_VALUES.living.waypointReach){resident.path.shift();continue;}
      const step=Math.min(distance,remaining),x=resident.x,y=resident.y;
      moveBody(resident,(n.x-x)/distance*step,(n.y-y)/distance*step,WORLD,12,game.trees);remaining-=step;
      if(Math.hypot(resident.x-x,resident.y-y)<step*.5)break;
    }
    const speed=dt>0?worldDistance(before,resident)/dt:0;resident.moving=speed>3;updateCatMotion(resident.motion,dt,speed,resident.moving);
    // 小夜沿连续高度落上栖架；换班起飞时也缓慢下降，脚底世界坐标不跳变。
    const height=resident.id==='bat'&&target.place==='roost'&&!resident.path.length?Math.max(0,target.y-LIVING_PLACES.roost.y+20):0;
    resident.elevation=(resident.elevation||0)+Math.max(-45*dt,Math.min(45*dt,height-(resident.elevation||0)));
    game.progress.living.residents[resident.id]={x:resident.x,y:resident.y};
  }
  // 中断或死亡后任务仍停在护路阶段；再次靠近点击会重建剩余护路敌人。
  const battle=game.livingBattle;
  if(battle&&!game.enemies.some(e=>e.livingRequest===battle&&e.hp>0))game.livingBattle=null;
}
// 临近对白依赖劳动、天气、季节和回访结果，同一时间只选一位居民。
export function residentLine(game,resident){
  if(resident.action==='shelter')return '先在檐下躲一会儿。等雨小了，咱们把剩下的事做完。';
  if(resident.action==='wash')return '这回一个也没摔。阿团，你先吃，水还是热的。';
  if(resident.action==='flowers')return '花真的开了。等枭爵下班，我再带他来看。';
  if(resident.action==='market')return '这张桌子是邻居一起搬来的。看看有没有你用得上的东西。';
  return resident.line+' '+SEASON_WORK[calendarView(game.progress.living.calendar).seasonIndex];
}
// 存档事务失败保留原钱包与任务位置，重复点击不会重复领取。
function commitLiving(game,change,onCommit=null){
  const next=validateProgress(structuredClone(game.progress));change(next);
  let saved=false;try{saved=(game.livingPersist?.(next)??true)===true;}catch{saved=false;}
  if(!saved)return {ok:false,message:'没有保存成功，请稍后重试；这次进度和报酬尚未提交。'};
  game.progress=next;onCommit?.();if(trackedLivingRequest(game))game.mainlineSpeech=null;
  game.onEvent('living-change');return {ok:true};
}
// 面板主动选择当前任务，持久化失败时保留原追踪，不要求重新接取请求。
export function trackLivingRequest(game,id=null){
  const spec=LIVING_REQUESTS.find(q=>q.id===id),record=spec&&game.progress.living.requests[id];
  if(!livingForest(game)||game.livingBattle&&game.livingBattle!==id||id&&(!record||record.completed||record.stage<0||record.stage>=spec.steps.length))return {ok:false,message:'这项任务现在不能切换追踪。'};
  return commitLiving(game,p=>{p.taskTracking=id?{kind:'living',id}:{kind:'mainline'};if(!id)p.mainline.trackingPaused=false;});
}
// 屋内邻里服务沿用房门外的实际地点，其他房间不获得远程交付权限。
export function livingInteractionPosition(game){return ['relay','kitchen'].includes(game.cottage?.kind)?game.cottage.outside:game.player;}
// 请求从当地委托板或委托人身边接取，两条路径共享同一状态。
export function acceptLivingRequest(game,id){
 if(!facilityOpen(game.progress,'neighbors'))return {ok:false,message:facilityReason(game.progress,'neighbors')};
  const spec=LIVING_REQUESTS.find(q=>q.id===id),state=game.progress.living;
  if(game.livingPreview||!livingForest(game)||game.state==='dead'||!spec||game.boss||state.requests[id].stage>=0||!spec.requires.every(k=>state.requests[k].completed))return {ok:false,message:'这份请求现在还不能接取。'};
  const host=residentFor(game,spec.host),post=nearbyStoryPost(game);
  if(!(host&&worldDistance(livingInteractionPosition(game),host)<GAMEPLAY_VALUES.living.interactDistance)&&!post)return {ok:false,message:'走近委托板，或当面问问委托人。'};
  return commitLiving(game,p=>{recordActivity(p,'living');p.living.requests[id].stage=0;p.taskTracking={kind:'living',id};p.living.journal.push(spec.lead);p.living.journal=p.living.journal.slice(-GAMEPLAY_VALUES.living.journalLimit);});
}
// 任务目标读取常驻居民的当前位置，不指向已经走开的固定空地。
export function livingRequestTarget(game,spec){
  const record=game.progress.living.requests[spec.id],step=spec.steps[record.stage];if(!step)return null;
  const target=step.resident?residentFor(game,step.resident):{...LIVING_PLACES[step.place],y:LIVING_PLACES[step.place].y+40};
  return {...target,step,id:spec.id,text:step.text};
}
// 护路只生成剩余敌人，普通波次与日常报酬分别记账。
function startLivingBattle(game,id){
  if(game.livingBattle||game.state==='dead')return {ok:false,message:'先完成眼前的护路。'};
  const record=game.progress.living.requests[id],count=GAMEPLAY_VALUES.living.battleKills-(record.battleKills||0),center=LIVING_PLACES.danger;
  game.livingBattle=id;
  for(let i=0;i<count;i++){const angle=i*Math.PI*2/Math.max(1,count),p=drySpawn({x:center.x+Math.cos(angle)*GAMEPLAY_VALUES.living.battleSpawnRadius,y:center.y+Math.sin(angle)*GAMEPLAY_VALUES.living.battleSpawnRadius,mapId:'forest'});
    const enemy=game.spawnEnemy(0,0,p,{ambient:true});// 仅收敛本次委托敌人的生命，伤害、移动、计数与周边常驻怪保持原规则。
    enemy.hp=enemy.maxHp=Math.min(enemy.maxHp,LIVING_BATTLE_ENEMY_HP);enemy.livingRequest=id;enemy.reward=0;}
  return {ok:true,battle:true,message:'赶开路口的野团，让枭爵能安心换班。'};
}
// 实际击败的任务怪才累计；离开、回收或刷新都不能冒充清场。
export function recordLivingKill(game,enemy){
  if(!enemy.livingRequest)return;
  const record=game.progress.living.requests[enemy.livingRequest];if(record&&!record.completed)record.battleKills=Math.min(GAMEPLAY_VALUES.living.battleKills,(record.battleKills||0)+1);
}
// 每一步检查地点与阶段；完成旗标、奖励和可回访结果在一次持久化里提交。
export function interactLivingRequest(game,id){
  const spec=LIVING_REQUESTS.find(q=>q.id===id),target=spec&&livingRequestTarget(game,spec);
  if(game.livingPreview||!livingForest(game)||game.boss||game.state==='dead'||!target||worldDistance(livingInteractionPosition(game),target)>GAMEPLAY_VALUES.living.interactDistance)return {ok:false,message:'请走近这次要帮助的人或物。'};
  const record=game.progress.living.requests[id];
  if(target.step.battle&&(record.battleKills||0)<GAMEPLAY_VALUES.living.battleKills){
    const tracked=trackLivingRequest(game,id);return tracked.ok?startLivingBattle(game,id):tracked;
  }
  let line=id==='neighbors-night'&&record.stage===1&&game.progress.hero===4?'你把假条改成大字。薄荷：枭爵看错了，拿去问问他，别急着换班。':target.step.line;
  const before=game.progress;
  const result=commitLiving(game,p=>{
    const q=p.living.requests[id];line+=taskTreasureRumor(p,id,q.stage);q.stage++;p.taskTracking={kind:'living',id};p.living.journal.push(line);
    if(q.stage===spec.steps.length){
      // 完成后保留玩家原先的自由探索选择，其他已接请求等待手动追踪。
      q.completed=true;q.completedDay=p.living.calendar.day;p.taskTracking={kind:p.mainline.trackingPaused?'none':'mainline'};
      const chapter=p.story.chapters[id];
      if(!chapter.rewardClaimed)awardCampXp(p,'living',null,spec.title);
      if(!chapter.rewardClaimed)for(const [key,amount] of Object.entries(STORY_CAMPAIGN[id].reward))creditResource(p,key,amount);
      chapter.completed=true;chapter.rewardClaimed=true;Object.assign(p.story.worldFlags,STORY_CAMPAIGN[id].completionFlags);p.living.journal.push(spec.reply);
    }p.living.journal=p.living.journal.slice(-GAMEPLAY_VALUES.living.journalLimit);
  });
  if(result.ok&&!before.living.requests[id].completed&&game.progress.living.requests[id].completed)game.onEvent('task-reward',rewardReceipt(before,game.progress,spec.title));
  return {...result,message:result.ok?line:result.message};
}
// 安全休息只改变日期；已有请求保留，没有饥饿、过期或离线损失。
export function restLivingWorld(game){
 if(!facilityOpen(game.progress,'cottage'))return {ok:false,message:facilityReason(game.progress,'cottage')};
  if(game.livingPreview||!livingForest(game)||game.state==='dead'||game.boss||game.progress.living.patrolActive||!livingSafePoint(game.player)||game.livingBattle)return {ok:false,message:'先结束巡护，再到有木栏保护的聚落休息。'};
  return commitLiving(game,p=>advanceLivingCalendar(p.living.calendar,calendarView(p.living.calendar).remaining));
}
// 连续怪潮由当地入口显式开启；回到安全地带可结束，已有波次资格保留。
export function setLivingPatrol(game,active){
 if(active&&!facilityOpen(game.progress,'clearing'))return {ok:false,message:facilityReason(game.progress,'clearing')};
  if(game.livingPreview||!livingForest(game)||game.state==='dead'||game.boss||game.livingBattle||!livingSafePoint(game.player))return {ok:false,message:'请回到有木栏保护的聚落接取或结束清缴。'};
  if(active&&game.progress.living.patrolActive)return {ok:true};
  if(active)return beginClearingPatrol(game);
  const result=commitLiving(game,p=>{p.living.patrolActive=false;});
  if(result.ok){for(const e of game.enemies)if(e.wave===game.wave&&e.hp>0)game.waveSpawned=Math.max(game.waveKills,game.waveSpawned-1);game.enemies=game.enemies.filter(e=>e.wave!==game.wave);}
  return {...result,message:result.ok?'本次清缴已暂停，波次进度保留。':result.message};
}
// 告示牌与结算续接共享选点、存档事务，成功后消费当前结算资格。
function beginClearingPatrol(game,site=null){
  let prepared=null;
  if(!site)site=chooseClearingSite(game,(route,index)=>{prepared={route,index};});
  if(!site)return {ok:false,message:'暂时没有找到可达的清缴地点，请稍后重试。'};
  const result=commitLiving(game,p=>{recordActivity(p,'clearing');p.living.patrolActive=true;p.living.clearingSite=site;p.taskTracking={kind:p.mainline.trackingPaused?'none':'mainline'};},()=>{
   // 存档成功且界面刷新前移交路线，保存失败不能污染当前导航。
   game.pendingClearingRound=0;
   if(prepared)rememberPreparedNavigation(game,clearingNavigationTarget(site),prepared.route,prepared.index,{...game.player,mapId:game.mapId,livingCollision:true});
  });
  return {...result,message:result.ok?'已接取清缴任务。前往本次清缴地点，清完五波后领主自动登场。':result.message};
}
// 首轮起只接受当前胜利收据，不能借旧收据重复领奖。
export function canAcceptNextClearing(game,round){
 return Number.isInteger(round)&&round>=CLEARING_CONTINUE_ROUND&&round===game.pendingClearingRound&&round===game.progress.bosses&&facilityOpen(game.progress,'clearing')&&!game.progress.living.patrolActive&&!game.livingPreview&&livingForest(game)&&['playing','paused'].includes(game.state)&&!game.boss&&!game.livingBattle&&!game.mainlineSpeech;
}
// 续战沿用刚完成的场地；保存失败保留资格，回营接单仍抽取新地点。
export function acceptNextClearing(game,round){
 if(!canAcceptNextClearing(game,round))return {ok:false,message:'本次结算现在不能继续接取清缴。'};
 const site=clearingSite(game.progress);
 // 追击领主可能离开场地；续接资格只取决于当前收据，到场刷怪仍由生活安全规则控制。
 const atSite=worldDistance(game.player,site)<=site.radius&&!livingSafePoint(game.player);
 const result=beginClearingPatrol(game,site);
 return {...result,message:result.ok?(atSite?'原地继续下一轮，短暂休整后怪群将再次入场。':'已接续下一轮，请沿路点返回本次清缴地点。'):result.message};
}
// 最多展示一个就近交互，任务目标优先于闲聊，委托板仍使用原有正式入口。
export function nearbyLivingInteraction(game){
  if(game.livingPreview||!livingForest(game)||game.state==='dead')return null;
  const tracked=trackedLivingRequest(game);
  const targets=(tracked?[livingRequestTarget(game,tracked)]:[]).filter(Boolean).filter(t=>worldDistance(game.player,t)<GAMEPLAY_VALUES.living.interactDistance);
  if(targets.length)return targets.sort((a,b)=>worldDistance(game.player,a)-worldDistance(game.player,b))[0];
  const resident=livingResidents(game).filter(r=>worldDistance(game.player,r)<GAMEPLAY_VALUES.living.greetingDistance).sort((a,b)=>worldDistance(game.player,a)-worldDistance(game.player,b))[0];
  return resident?{...resident,resident:resident.id,text:`和${resident.name}聊聊`}:null;
}

// 直接点到哪位邻居就按稳定身份匹配；不使用“最近的人”替代点击对象。
export function residentInteraction(game,id){
 if(game.livingPreview||!livingForest(game)||game.state==='dead')return null;
 const resident=livingResidents(game).find(r=>r.id===id);if(!resident||worldDistance(game.player,resident)>=GAMEPLAY_VALUES.living.interactDistance)return null;
 const spec=trackedLivingRequest(game),target=spec&&livingRequestTarget(game,spec);
 if(target?.step.resident&&residentFor(game,target.step.resident)?.id===id)return target;
 return {...resident,resident:id,text:'和'+resident.name+'聊聊'};
}
