import {taskNavigationEnabled} from '../core/task-navigation.js';
import {storyInteractionReady} from '../core/story-interaction.js';
import {farmMode} from '../core/farm.js';
import { i18nText } from "../i18n/index.js";
// 第一章地面提示与发言锚点直接读取正式任务、人物和碰撞数据。
import {storyDefinition,storySceneActive} from '../core/story-definition.js';
import {storyDialogueEntries} from '../core/story-journey.js';
import { nearest, visibleBodies } from '../world/coordinates.js';
import { storyCast } from './story-props.js';
import {storyRouteState,visibleRouteDots} from '../core/story-route.js';
import {worldNavigationObjective} from '../core/world-navigation.js';
import {livingRouteStates} from '../core/living-route.js';
import {CLEARING_POST} from '../config/clearing.js';
import {drawRestorationArea} from './town-restoration.js';
import {NAVIGATION_STYLE,drawNavigationDot,drawNavigationRing,drawNavigationPin,navigationPinBelow,navigationPinLift} from './navigation-markers.js';

// 碰撞半径不参与装饰缩放；任务点与导航箭头共用storyObjective。
export function storyGuidanceState(game) {
  if(!storySceneActive(game)){const o=worldNavigationObjective(game);return {arena:null,target:o&&o.site.mapId===game.mapId&&!game.mainlineSpeech?o.site:null};}
  const r=game.story,o=game.storyObjective();
  return {arena:game.player.arena||null,
    target:taskNavigationEnabled(game)&&r.phase==='active'&&!r.trial?{...storyDefinition(game).world.sites[o.site],site:o.site}:null};
}

// 大范围边界保持世界圆形，与实际碰撞一致；小目标圈按地面俯视比例压扁。
export function drawStoryGuidance(c,game,view,reduced=false) {
  // 种地时只收起任务路线与落点圆圈，保留原任务和导航偏好，退出后自然恢复。
  if(farmMode(game))return;
  const {arena,target}=storyGuidanceState(game);
  c.save();c.setLineDash([]);
  // 路线位于人物与攻击预警下方，小范围光晕沿固定世界光点依次明亮。
  const route=storyRouteState(game,view),living=livingRouteStates(game,view);
  const dots=[...visibleRouteDots(route,view,NAVIGATION_STYLE.spacing),...living.flatMap(r=>visibleRouteDots(r,view,NAVIGATION_STYLE.spacing))];
  for(const p of dots)drawNavigationDot(c,p,game.time,view.zoom,reduced);
  c.globalAlpha=1;
  if(arena)for(const p of visibleBodies([arena],view,arena.radius+10)){
    c.beginPath();c.arc(p.x,p.y,p.radius,0,Math.PI*2);
    c.strokeStyle='#315747';c.lineWidth=8;c.stroke();
    c.strokeStyle='#ecd58d';c.lineWidth=4;c.stroke();
    c.strokeStyle='#f9f0c0';c.lineWidth=1.5;c.stroke();
    for(let i=0;i<24;i++){
      const angle=i*Math.PI/12,dx=Math.cos(angle),dy=Math.sin(angle);
      c.beginPath();c.moveTo(p.x+dx*(p.radius-10),p.y+dy*(p.radius-10));
      c.lineTo(p.x+dx*(p.radius-2),p.y+dy*(p.radius-2));c.lineWidth=2;c.stroke();
    }
  }
  // 每个已接邻里委托都标出当前目标；抵达后保留目标圈以便现场交互。
  for(const p of visibleBodies([...(target?[target]:[]),...living.map(r=>r.target)],view,180)){
    if(p.repairArea)drawRestorationArea(c,p,game.player);else drawNavigationRing(c,p,game.time,reduced);
  }
  c.restore();
}

// 悬浮终点和地面提示使用相同任务状态，结束/对白时不残留独立标记。
export function drawStoryDestination(c,game,view,reduced=false){
 // 悬浮标记和地面路线同步收起，选种、播种及自动迎敌期间不遮挡田块。
 if(farmMode(game))return;
 const {target}=storyGuidanceState(game),living=livingRouteStates(game,view);
 // 抵达后由物品上方的点击箭头接替路点标记，避免两个箭头指向不同位置。
 for(const p of visibleBodies([...(target&&!storyInteractionReady(game)?[target]:[]),...living.map(r=>r.target)],view,130))
  // 告示牌上方承载实时等级，导航留在接取落点下侧，仍以引线指向原地点。
  if(!p.repairArea)drawNavigationPin(c,p,game.time,view.zoom,reduced,p.id===CLEARING_POST.id||navigationPinBelow(p,view),navigationPinLift(p,view));
}

// 同段对白所有人物共用真实身体锚点，让镜头预留交谈空间而不逐句居中。
function speechAnchor(game,speaker,cast) {
  const spec=storyDefinition(game).actors[speaker];
  if(!spec)throw Error(i18nText("rendering.story-guidance.d370e83261", { p0: (speaker) }));
  const actor=spec.source==='actor'?cast.find(p=>p.kind===spec.kind):null;
  const anchor=actor||(spec.source==='site'?storyDefinition(game).world.sites[spec.site]:game.player);
  return {anchor:nearest(anchor,game.player),head:spec.source==='player'&&game.vehicle.active?spec.vehicleHead:spec.head,...(spec.halfWidth?{halfWidth:spec.halfWidth}:{})};
}
// 发言人与气泡沿用正式坐标；整段键不随当前行变化。
export function storySpeechInfo(game) {
  const r=game.story,entries=r?.dialogue?storyDialogueEntries(r,r.dialogue):[],line=entries[r?.line||0];
  if(!line||r.phase!=='dialogue'||!storySceneActive(game))return null;
  const [speakerId,text]=line,cast=storyCast(game),actors=storyDefinition(game).actors;
  const lines=entries.map(([id,text])=>[actors[id].name,text]);
  return {key:`${r.runId}:${r.dialogue}:${r.line||0}`,conversationKey:`${r.runId}:${r.dialogue}`,speakerId,speaker:actors[speakerId].name,text,lines,
    ...speechAnchor(game,speakerId,cast),speakers:[...new Set(entries.map(l=>l[0]))].map(id=>speechAnchor(game,id,cast))};
}

// 短气泡使用同一人物锚点，但不返回给剧情镜头，也不暂停战场。
export function storyCueInfo(game){
  const cue=game.story?.activeCue;if(!cue||!storySceneActive(game))return null;
  const spec=storyDefinition(game).actors[cue.speaker];if(!spec)return null;
  const cast=storyCast(game),present=spec.source!=='actor'||cast.some(p=>p.kind===spec.kind);
  return {...cue,speakerId:cue.speaker,speaker:spec.name,present,...speechAnchor(game,cue.speaker,cast)};
}
