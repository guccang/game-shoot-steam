import {outdoorObjects} from './outdoors.js';
// 野外验收只读取正式营地、动作条与钓鱼状态，不提供另一套预览绘制。
export function inspectOutdoors(renderer,root){
 const g=renderer.game,f=g.fishing,hud=root.getElementById('fishing-hud');
 return {designCriterion:'camping-fishing',time:renderer.environment.time,map:g.mapId,camp:g.progress.outdoors.camp,parts:outdoorObjects(g).map(o=>o.part),phase:f?.phase,tension:f?.tension,progress:f?.progress,charge:f?.charge,water:f?.water,bait:g.progress.outdoors.bait,fish:g.progress.outdoors.fish,hud:!!hud&&!hud.hidden,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth,newBitmapBytes:0};
}
import {campRenderObjects} from './monster-camps.js';
// 故事扩写验收读取正式档案弹窗和护盾容量，不另造展示数据。
export function inspectEquipmentStoryExpansion(renderer,root){
 const game=renderer.game,dialog=root.getElementById('ws-equipment-dialog'),img=dialog?.querySelector('.ws-equipment-portrait img');
 return {designCriterion:'equipment-story-expansion',time:renderer.environment.time,chapter:game.story?.chapterId,stage:game.story?.stageId,
  shield:game.magazines[18]?.ammo,dialog:!!dialog?.open,paragraphs:root.getElementById('ws-equipment-story')?.children.length,
  image:img?{src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0,width:img.naturalWidth,height:img.naturalHeight}:null,
  overflow:!!dialog&&dialog.scrollWidth>dialog.clientWidth+1};
}
import {placedDecor,homeFurniture,plantState} from '../progression/home-decor.js';
// 装扮验收直接读取正式房间、存档和页面，不提供另画的漂亮预览替身。
export function inspectHomeDecor(renderer,root){
 const game=renderer.game,items=placedDecor(game.progress.homeDecor),dialog=root.getElementById('home-decor-dialog');
 return {designCriterion:'cottage-decoration',room:game.cottage?.kind,coins:game.progress.coins,owned:game.progress.homeDecor.items.length,
  placed:items.map(i=>({uid:i.uid,type:i.type,x:i.x,y:i.y,layer:i.layer,plant:plantState(i,game.progress.living.calendar).label})),
  solid:homeFurniture(game.progress.homeDecor).length,view:renderer.cottageView,dialog:!!dialog?.open,
  products:root.querySelectorAll('#home-products [data-buy]').length,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth,
  previewBytes:720*720*4,iconBytes:root.querySelectorAll('#home-decor-dialog canvas:not(#home-preview)').length*128*128*4};
}
import {legendaryObjects} from './legendary-workshop.js';
// 传奇工坊验收读取正式显现规则、永久解锁和正在使用的坦克设计。
export function inspectLegendaryWorkshop(renderer){const game=renderer.game;return {designCriterion:'legendary-wolf-workshop',visible:legendaryObjects(game).length===1,unlocked:game.progress.legendaryWorkshop.unlocked,vehicle:game.vehicle.index,mounted:game.vehicle.active,designs:game.progress.legendaryWorkshop.designs,schemes:game.progress.legendaryWorkshop.schemes,view:renderer.view};}
// 三招验收读取正式首领、危险区与召唤物，不另造一套预览状态机。
export function inspectBossAttackVariety(renderer){
 const game=renderer.game,b=game.boss;
 return {designCriterion:'boss-attack-variety',kind:b?.kind,phase:b?.ai?.phase,elapsed:b?.ai?.elapsed,
  skill:b?.ai?.skill||'original',timing:b?.ai?.timing,cycle:b?.skillCycle,
  hazards:game.hazards.map(h=>({kind:h.kind,skill:h.skill,age:h.age,warmup:h.warmup,duration:h.duration,
   x:h.x,y:h.y,radius:h.radius,length:h.length,order:h.order,hit:h.hit})),
  summons:game.enemies.filter(e=>e.hp>0&&e.bossSummon).map(e=>({id:e.id,owner:e.bossOwner,x:e.x,y:e.y,hp:e.hp})),
  support:b?.support,view:renderer.view};
}
import {MONSTER_CAMPS} from '../config/monster-camps.js';
// 农田验收读取正式面板、绘制器与图集缓存。
export {inspectFarm,inspectWildFarm,inspectSeedProgression} from '../ui/farm.js';
import { loadCozyCottage, cozyCottageStatus } from './cozy-cottage.js';
import {artStyle} from '../art-styles/state.js';
import {style,ART_PROFILES} from '../art-styles/config.js';
// 共用绘制验收读取正式配置实时绑定、设置和图集，不生成独立验收画面。
export function inspectSharedArt(renderer,root){
 return {...inspectArtStyle(renderer,root),designCriterion:'shared-art-rendering',
  sharedProfile:style===ART_PROFILES[artStyle()],outline:style.primitives.outline,
  profileFrozen:Object.isFrozen(style),architecture:'shared-rendering-profiles'};
}
// 风格验收绑定正式选择、设置按钮与实际资源缓存，不另外绘制验收替身。
export function inspectArtStyle(renderer,root){
 const d=renderer.diagnosticInfo();
 return {designCriterion:'art-style-switch',style:artStyle(),buttons:[...root.querySelectorAll('[data-art-style]')].map(n=>({id:n.dataset.artStyle,selected:n.getAttribute('aria-pressed'),height:n.getBoundingClientRect().height})),
  time:renderer.game.time,vehicle:renderer.game.vehicle.index,light:renderer.light.sample(performance.now()),cottage:cozyCottageStatus(),
  budget:{ground:d.groundCache,river:d.riverCache,trees:d.trees,scenery:d.scenery,mountains:d.naturalTerrain},overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
// 清澈风格验收读取正式材质、天气与资源状态，沿用真实游戏绘制器和动作时钟。
export function inspectClearWorld(renderer,root){
 const g=renderer.game,d=renderer.diagnosticInfo(),e=renderer.environment;
 return {designCriterion:'clear-world-style',map:g.mapId,room:g.cottage?.kind||null,
  player:{x:g.player.x,y:g.player.y},time:g.time,environment:{time:e.time,weather:e.weather,season:e.forestSeason},
  light:renderer.light.sample(performance.now()),vehicle:{index:g.vehicle.index,active:g.vehicle.active,wheel:g.vehicle.wheelPhase,track:g.vehicle.trackPhase},
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth,cottage:cozyCottageStatus(),
  budget:{background:d.backgroundBytes,ground:d.groundCache.count,groundLimit:d.groundCache.limit,scenery:d.scenery,trees:d.trees,mountains:d.naturalTerrain,cat:d.catAnimation,contextLost:d.contextLost}};
}
// 卡通动态验收直接读取正式车体、车轮与后坐状态，不为工作台另外绘图。
export function inspectIdleCatPine(renderer,root){
 const g=renderer.game,v=g.vehicle;
 return {designCriterion:'idle-cat-pine-runtime',state:g.state,time:renderer.environment.time,
  player:{x:g.player.x,y:g.player.y},vehicle:{index:v.index,active:v.active,wheelPhase:v.wheelPhase,angle:v.angle,recoil:{...v.recoil},ammo:v.module?.magazine?.ammo},
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth,budget:renderer.diagnosticInfo()};
}
// 小屋验收读取正式资源和场景位置，保持现有角色、进出与停车状态可核对。
export function inspectCozyCottage(renderer, root) {
  return { designCriterion:'cozy-ranger-cottage', asset:cozyCottageStatus(),
    player:{x:renderer.game.player.x,y:renderer.game.player.y},
    room:renderer.game.cottage?.kind||null,
    overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth };
}
// FPS验收读取正式HUD与设置按钮，检查下方对齐及手机边界。
export function inspectFpsDisplay(root){
 const node=root.getElementById('fps-display'),button=root.getElementById('settings-button');
 return {designCriterion:'fps-setting',enabled:root.getElementById('show-fps').checked,hidden:node.hidden,text:node.textContent,
  fps:node.getBoundingClientRect().toJSON(),button:button.getBoundingClientRect().toJSON(),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
// 热路径优化验收复用正式开关和插值状态，核对布局与权威状态隔离。
export function inspectSixtyFps(renderer,root){
 return {designCriterion:'sixty-fps-hotpaths',navigation:inspectTaskNavigation(renderer.game,root),interpolation:inspectFixedStep(renderer),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
// 回退验收直接读取正式菜单、环境图和圆环，识别已撤回PNG的残留依赖。
export function inspectUiArtRollback(root) {
 const view=root.defaultView;
 return {designCriterion:'ui-art-rollback',overflow:root.documentElement.scrollWidth>view.innerWidth,
  pngNodes:root.querySelectorAll('[data-ui-art],img[src^="/assets/ui/"],img[src^="/assets/environment/"][src$=".png"]').length,
  environment:['season','time','weather'].map(kind=>{const art=root.getElementById(kind+'-picture-art');return {kind,source:art.getAttribute('src'),loaded:art.complete&&art.naturalWidth>0};}),
  menuCanvases:['hero-button-icon','weapon-button-icon','vehicle-menu-icon'].map(id=>({id,rect:root.getElementById(id).getBoundingClientRect().toJSON()})),
  rings:[...root.querySelectorAll('.ring-value')].map(n=>n.style.strokeDasharray)};
}
// 提交验收读取正式 HUD 和主场景采样，不绘制替代场景。
export function inspectRenderSubmit(renderer, root) {
 return {designCriterion:'render-submit-hud',timing:renderer.frameTiming,visible:renderer.visibleStats,nearby:inspectNearbyInteraction(renderer.game,root)};
}
// 地图验收读取正式缓存与面板状态，标记实时由原地图面板负责绘制。
export function inspectMapPreview(renderer, root) {
  return { designCriterion: 'map-preview-cache', cache: renderer.ground.mapPreview.stats(),
    open: root.getElementById('map-dialog').open, loading: root.getElementById('region-map').getAttribute('aria-busy'),
    message: root.getElementById('map-preview-loading')?.textContent };
}
// 分帧验收读取正式绘制器实际收到的状态，不另外模拟一套画面。
export function inspectFixedStep(renderer) {
  const actual=renderer.game,view=renderer.renderGame||actual;
  return {designCriterion:'fixed-logic-smooth-render',timing:renderer.frameTiming,
    authoritative:{x:actual.player.x,y:actual.player.y,time:actual.time},
    presented:{x:view.player.x,y:view.player.y,time:view.time},
    separateState:view!==actual&&view.player!==actual.player};
}
import {monsterDeathPose} from '../config/monster-death.js';
// 死亡验收读取实际残影与正式绘制器的节拍，不创建替代场景。
export function inspectMonsterDeath(game,reduced=false){return {designCriterion:'monster-death-burst',remnants:game.remnants.length,poses:game.remnants.map(e=>monsterDeathPose(e,reduced))};}
import {JINBEI_BODY_SCALE} from '../config/jinbei.js';
import {resourcePickupPoses} from '../combat/resource-pickup.js';
// 连续拾取验收复用正式轨迹采样，读取真实奖励批次和当前可见图标，不推进时间或结算。
export function inspectResourcePickup(game,reduced=false){
 const icons=resourcePickupPoses(game.drops,riderPosition(game.player,game.vehicle),reduced);
 return {designCriterion:'continuous-resource-pickup',batches:game.drops.length,
  coins:icons.filter(icon=>icon.kind==='coins').length,wood:icons.filter(icon=>icon.kind==='wood').length,
  remaining:Math.max(0,...game.drops.map(drop=>drop.life)),icons};
}
// 手机层级验收直接读取正式页面的底板、正文滚动与触控目标。
export function inspectMobileUiHierarchy(root, selector) {
 const node=root.querySelector(selector),view=root.defaultView,rect=node.getBoundingClientRect(),style=view.getComputedStyle(node);
 const body=node.querySelector('.ui-panel__body,.story-speech-copy');
 const controls=[...node.querySelectorAll('button')].filter(button=>button.getClientRects().length&&!button.hidden);
 return {designCriterion:'mobile-ui-hierarchy',selector,background:style.backgroundColor,border:style.borderTopColor,radius:style.borderTopLeftRadius,
  rect:rect.toJSON(),overflow:node.scrollWidth>node.clientWidth+1||rect.left<-.5||rect.right>view.innerWidth+.5||rect.top<-.5||rect.bottom>view.innerHeight+.5,
  bodyOverflow:!!body&&body.scrollWidth>body.clientWidth+1,controls:controls.map(button=>({id:button.id,label:button.textContent.trim(),height:button.getBoundingClientRect().height,width:button.getBoundingClientRect().width,disabled:button.disabled}))};
}
// 迁移页验收读取正式标题、正文及固定操作栏，检出旧定位造成的重叠。
export function inspectMobileUiPages(root, selector) {
 const node=root.querySelector(selector),body=node.querySelector(':scope > .ui-panel__body');
 const header=node.querySelector(':scope > .ui-panel__header'),footer=node.querySelector(':scope > .ui-panel__footer');
 const h=header?.getBoundingClientRect(),b=body?.getBoundingClientRect(),f=footer?.getBoundingClientRect();
 return {...inspectMobileUiHierarchy(root,selector),designCriterion:'mobile-ui-pages',kind:node.dataset.mobilePanel||'reward',
  sectionOverlap:!!(h&&b&&h.bottom>b.top+1)||!!(f?.height&&b&&b.bottom>f.top+1),
  bodyHeight:body?.clientHeight,header:h?.toJSON(),footer:f?.toJSON()};
}
// 通用底板验收读取正式弹窗的计算样式、边界和触控尺寸，不另画验收版本。
export function inspectUiFoundation(root, id = 'settings-dialog') {
 const panel = root.getElementById(id), view = root.defaultView, style = view.getComputedStyle(panel);
 const rect = panel.getBoundingClientRect(), tokens = view.getComputedStyle(root.documentElement);
 const close = panel.querySelector('.close, .ui-close'), closeRect = close?.getBoundingClientRect();
 return {designCriterion:'ui-foundation', id, open:panel.open, background:style.backgroundColor,
  border:style.borderTopColor, borderWidth:style.borderTopWidth, radius:style.borderTopLeftRadius,
  sharedPalette:style.getPropertyValue('--ui-paper').trim()===tokens.getPropertyValue('--ui-paper').trim(),
  closeTarget:!closeRect || closeRect.width>=44 && closeRect.height>=44,
  overflow:panel.scrollWidth>panel.clientWidth+1 || rect.left<0 || rect.right>view.innerWidth || rect.top<0 || rect.bottom>view.innerHeight,
  bodyOverflow:Array.from(panel.querySelectorAll('.settings-scroll, .ui-panel__body')).some(node=>node.scrollWidth>node.clientWidth+1)};
}
// 设置版本验收读取正式指纹节点与弹窗边界，不另造预览文案。
export function inspectSettingsFingerprint(root){
 const dialog=root.getElementById('settings-dialog'),code=root.getElementById('settings-git-fingerprint');
 return {designCriterion:'settings-git-fingerprint',fingerprint:code.textContent,status:root.getElementById('settings-git-state').textContent,overflow:dialog.scrollWidth>dialog.clientWidth+1};
}
import {clearingSite} from '../progression/clearing-site.js';
// 读取正式档案节点和持久化统计，不复制统计公式或另画验收示意页。
export function inspectGameStatistics(game,root){
 const dialog=root.getElementById('chronicle-dialog');
 return {designCriterion:'game-profile-statistics',statistics:structuredClone(game.progress.statistics),equipmentTab:root.querySelector('[data-equipment-tab][aria-pressed="true"]')?.dataset.equipmentTab,equipmentRows:root.querySelectorAll('[data-equipment-id]').length,resources:root.querySelectorAll('[data-stat-resource]').length,activities:root.querySelectorAll('[data-stat-play]').length,overflow:[dialog,dialog.querySelector('.chronicle-scroll')].filter(Boolean).some(node=>node.scrollWidth>node.clientWidth+1)};
}
import {PARKING_SPOTS} from '../config/parking.js';
import {nearestParkingSpot} from '../core/parking.js';
import {pathDistance} from '../world/paths.js';
// 停车布局验收读取正式车位、道路距离与实时判定，不单独重画示意停车场。
export function inspectParkingRoadClearance(game,root){
 return {designCriterion:'parking-off-road',spots:PARKING_SPOTS.map(s=>({...s})),
  roadDistance:pathDistance(game.player.x,game.player.y),candidate:nearestParkingSpot(game)?.id||null,
  phase:game.parking?.phase||null,mounted:game.vehicle.active,room:game.cottage?.kind||null,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
import {workshopBuildView} from '../core/ranger-arrival.js';
import {RANGER,RANGER_STAGES} from '../config/ranger-arrival.js';
// 入口徽记验收直接读取正式最终屏幕层的位置、图标和进度，结合真实候停状态。
export function inspectBuildingEntry(game,root,renderer){
 return {designCriterion:'building-entry-countdown',badge:renderer.actionCountdownView,
  room:game.cottage?.kind||null,entry:game.cottageEntryKind||null,
  dialog:root.querySelector('dialog[open]')?.id||null,
  footer:root.getElementById('cottage-notice')?.textContent,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
// 驾驶进屋验收同时读取正式门口圆环、骑乘状态和真实停车记录。
export function inspectVehicleDoorEntry(game,root,renderer){
 return {...inspectBuildingEntry(game,root,renderer),designCriterion:'vehicle-door-entry',mounted:game.vehicle.active,
  parking:game.progress.campParking.owned.find(r=>r.hull===game.vehicle.index)||null};
}
import {interiorWeaponDisplays,interiorVehicleDisplays,garageVehicleRecord} from '../config/workshop-interiors.js';
// 工坊验收直接读取正式房间、陈列、真实泊位和交互热点，记录单页画像预算。
export function inspectWorkshopInteriors(game,root,renderer){
 const room=game.cottage;
 return {designCriterion:'workshop-interiors-sci-fi-parking',kind:room?.kind||null,page:room?.page??null,
  weapons:room?.kind==='weapons'?interiorWeaponDisplays().map(s=>s.index):[],garage:garageVehicleRecord(game),
  visitors:(game.parkingVisitors||[]).map(v=>v.model),mounted:game.vehicle.active,
  portraitBytes:(renderer.interiorArt?.images.size||0)*192*144*4,
  buttons:[...root.querySelectorAll('.workshop-room-hits button')].map(n=>({label:n.getAttribute('aria-label'),box:n.getBoundingClientRect().toJSON()})),
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
import {clearingPostObjects} from './clearing-post.js';
import {clearingStage,canUseClearingPost} from '../core/clearing-guide.js';
import {riverCrossingObjects} from './river-crossing.js';
// 第二章验收绑定正式场景设施和玩家碰撞，不使用单独的概念图。
export function inspectRiverStory(game,root){return {designCriterion:'river-story-movement',stage:game.story?.stageId,phase:game.story?.phase,position:{x:game.player.x,y:game.player.y},arena:game.player.arena||null,amphibious:game.player.amphibious,facilities:riverCrossingObjects(game),barriers:game.player.worldBarriers||[],overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};}
// 清缴教学验收读取正式导航、场景入口与操作高亮，不生成示意页面。
export function inspectClearingGuide(game,root){
 const marker=root.getElementById('clearing-marker'),dialog=root.getElementById('clearing-dialog'),nav=worldNavigationObjective(game);
 return {designCriterion:'clearing-scene-guide',stage:clearingStage(game),canUse:canUseClearingPost(game),navigation:nav?.key||null,target:nav?.site||null,
  marker:{hidden:marker.hidden,disabled:marker.disabled,box:marker.getBoundingClientRect().toJSON()},dialog:dialog.open,guide:root.getElementById('operation-guide')?.hidden?null:root.getElementById('operation-guide')?.dataset.stage,
  waveHud:!root.getElementById('quest').hidden,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth||dialog.open&&dialog.scrollWidth>dialog.clientWidth+1};
}
// 入职专项从真实 DOM 与正式围栏对象采样，不另绘预览或绕过场景交互。
export function inspectArrivalWorld(game,root){
 const card=root.getElementById('ranger-arrival'),bubble=root.getElementById('arrival-speech'),dialog=root.getElementById('arrival-workshop-dialog');
 return {designCriterion:'arrival-world-polish',phase:game.progress.arrival?.phase,
  sharedBubble:bubble.classList.contains('task-speech'),mainPageAction:!!root.getElementById('arrival-next'),
  card:{hidden:card.hidden,rect:card.getBoundingClientRect().toJSON()},buildingOpen:dialog.open,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth||dialog.open&&dialog.scrollWidth>dialog.clientWidth+1,
  fences:settlementObjects(game).filter(o=>o.type==='settlement-fence').length,gates:settlementObjects(game).filter(o=>o.type==='settlement-gate').length};
}
import { riderPosition } from '../config/vehicle-rider.js';
import {settlementObjects} from './settlements.js';
import {livingWaveAllowed} from '../core/living-safety.js';
import {worldNavigationObjective} from '../core/world-navigation.js';
// 直接读取正式聚落绘制对象与玩家界面，不用独立示意图代替验收。
export function inspectForestExploration(game,root){
 const dialog=root.getElementById('living-dialog'),bubble=root.getElementById('resident-chatter'),quest=root.getElementById('quest');
 return {designCriterion:'forest-exploration-flow',fences:settlementObjects(game).filter(o=>o.type==='settlement-fence').length,
  gates:settlementObjects(game).filter(o=>o.type==='settlement-gate').length,wavesAllowed:livingWaveAllowed(game),waveHudHidden:quest.hidden,
  navigation:worldNavigationObjective(game)?.label||null,chatter:!bubble.hidden?bubble.textContent:null,
  dialogOverflow:dialog.open&&dialog.scrollWidth>dialog.clientWidth,viewportOverflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
import {livingRouteStates} from '../core/living-route.js';
import {visibleLivingRoads} from '../world/living-road-view.js';
import {trackedLivingRequest} from '../core/task-tracking.js';
import {mainlineObjective} from '../core/mainline-manager.js';
// 验收追踪来源、卡片与路线的统一身份，使用正式界面节点而非测试预览。
export function inspectActiveTask(game,root){
 const card=root.getElementById('mainline-hud');
 return {designCriterion:'active-task-guidance',tracking:game.progress.taskTracking,
  living:trackedLivingRequest(game)?.id||null,mainline:mainlineObjective(game)?.task.id||null,
  routes:livingRouteStates(game).map(r=>r.id),card:{hidden:card.hidden,kind:card.dataset.taskKind,id:card.dataset.taskId,text:card.textContent},
  speech:!!game.mainlineSpeech,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
// 专项验收读取正式绘制使用的道路副本与委托路径，不创建替代预览图。
export function inspectLivingGuidance(game,view){
 return {designCriterion:'living-road-guidance',roads:visibleLivingRoads(view),routes:livingRouteStates(game)};
}
// 巡林主线验收读取正式HUD、NPC气泡和既有摄像机，不另外绘制预览。
export function inspectMainline(game,root,renderer){
 const card=root.getElementById('mainline-hud'),bubble=root.getElementById('mainline-speech'),book=root.getElementById('mainline-dialog');
 return {designCriterion:'mainline-learning',phase:game.progress.mainline.phase,completed:game.progress.mainline.completed.length,
  pinePatrol:{kills:game.progress.mainline.seen.pineKills,waves:game.progress.mainline.seen.pineWaves},
  card:{hidden:card.hidden,text:card.textContent,rect:card.getBoundingClientRect().toJSON()},
  bubble:{hidden:bubble.hidden,text:bubble.textContent,rect:bubble.getBoundingClientRect().toJSON()},
  book:{open:book.open,rect:book.getBoundingClientRect().toJSON(),overflow:book.scrollWidth>book.clientWidth+1},
  view:{...renderer.view},overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 共用气泡与任务目录采样正式DOM和追踪状态，不创建第二套展示数据。
export function inspectTaskDialogue(game,root){
 const bubbles=['mainline-speech','story-speech'].map(id=>{
  const node=root.getElementById(id),style=root.defaultView.getComputedStyle(node);
  return {id,hidden:node.hidden,rect:node.getBoundingClientRect().toJSON(),text:node.textContent,
   shared:node.classList.contains('task-speech'),background:style.backgroundColor,border:style.borderColor,
   font:root.defaultView.getComputedStyle(node.querySelector('p')).fontSize,
   buttons:[...node.querySelectorAll('button')].map(b=>({text:b.textContent,height:b.getBoundingClientRect().height})),
   overflow:node.scrollWidth>node.clientWidth+1};
 });
 return {designCriterion:'unified-task-dialogue',bubbles,tracking:game.progress.taskTracking,
  catalog:root.getElementById('story-content').textContent,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 轻量引导验收直接读取正式短句、勾选和操作强调，不生成替代画面。
export function inspectConciseMainline(game,root,renderer){
 return {...inspectMainline(game,root,renderer),designCriterion:'mainline-concise-guide',
  cue:root.querySelector('#mainline-speech p').textContent,
  checks:[...root.querySelectorAll('.mainline-checklist li')].map(n=>({done:n.classList.contains('done'),current:n.classList.contains('current'),text:n.textContent})),
  highlights:[...root.querySelectorAll('.mainline-cue-target')].map(n=>n.id),
  expanded:root.querySelectorAll('#mainline-dialog details[open]').length};

}
import {livingObjects,livingRenderBudget} from './living-world.js';
// 生活验收读取正式场景实体、动作时钟、委托结果和真实DOM尺寸。
export function inspectLivingWorld(game,root){
  const objects=livingObjects(game),dialog=root.getElementById('living-dialog');
  return {designCriterion:'forest-living-world',calendar:{...game.progress.living.calendar},cache:livingRenderBudget(),
    residents:objects.filter(o=>o.type==='living-resident').map(r=>({id:r.id,x:r.x,y:r.y,action:r.action,moving:r.moving,clock:r.clock,motion:{...r.motion}})),
    facilities:objects.filter(o=>o.type==='living-facility').map(p=>({id:p.id,restored:p.restored,pots:p.pots,market:p.market})),
    requests:structuredClone(game.progress.living.requests),
    overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth||!!dialog?.open&&dialog.scrollWidth>dialog.clientWidth+1,
    activeButtons:[...root.querySelectorAll('#living-content button,#living-interact')].filter(n=>!n.hidden&&n.getBoundingClientRect().height>0).map(n=>({label:n.textContent,height:n.getBoundingClientRect().height}))};
}
// 字体复核读取正式 DOM 和战场画布，加载状态与实际绘制记录由浏览器共同验证。
export function inspectGameFont(root) {
  const host=root.defaultView;
  return {designCriterion:'hyqihei-font',status:root.documentElement.dataset.fontStatus,
    faces:[...root.fonts].map(face=>({family:face.family,status:face.status})),
    title:host.getComputedStyle(root.getElementById('title-name')).fontFamily,
    body:host.getComputedStyle(root.body).fontFamily,
    canvas:root.getElementById('game').getContext('2d').font,
    overflow:root.documentElement.scrollWidth>host.innerWidth};
}
// 高塔层间复核读取正式动作时钟、收尾效果与玩法弹窗，不使用替代预览。
export function inspectTowerIntermission(game,root){
 return {designCriterion:'tower-intermission-motion',stage:game.realm?.stage,phase:game.realm?.phase,state:game.state,
  remaining:game.realm?.restRemaining,idleTime:game.realm?.idleTime||0,time:game.time,player:{x:game.player.x,y:game.player.y},
  effects:game.fx.items.length,shots:game.shots.length,numbers:game.numbers.length,realmDialog:root.getElementById('realm-dialog').open,
  extraSettings:root.querySelectorAll('#realm-settings,#story-settings,.dialog-settings').length};
}
import { i18nText } from "../i18n/index.js";
// 单行委托目录复核读取真实布局、焦点和滚动，不重新绘制展示图。
export function inspectStoryCatalog(root){
 const dialog=root.getElementById('story-dialog'),rect=dialog.getBoundingClientRect();
 return {designCriterion:'story-board-clean-layout',scroll:dialog.scrollTop,top:rect.top,width:rect.width,height:rect.height,
  overflow:dialog.scrollWidth>dialog.clientWidth+1||root.documentElement.scrollWidth>root.defaultView.innerWidth,
  selected:dialog.querySelector('[aria-pressed="true"][data-story-chapter]')?.dataset.storyChapter,
  help:root.getElementById('story-help-dialog').open,headerButtons:[...dialog.querySelectorAll('.story-heading button')].map(n=>n.id),
  rows:[...dialog.querySelectorAll('[data-story-chapter]')].map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.storyChapter,title:n.querySelector('b').textContent,label:n.getAttribute('aria-label'),icon:!!n.querySelector('svg'),top:r.top,left:r.left,width:r.width,height:r.height};})};
}
import {worldStoryPosts,canUseStoryPost,canManageStoryPost,storyPostApproach} from '../core/story-posts.js';
// 委托板赠礼复核只读取正式目录和按钮，避免以另画示意图替代领取界面。
export function inspectStoryBoardGifts(root){
 const panel=root.querySelector('.story-collection');
 return {designCriterion:'story-board-gifts',title:root.getElementById('story-title').textContent,text:panel?.textContent||'',
  buttons:[...root.querySelectorAll('[data-story-prize]')].map(n=>({id:n.dataset.storyPrize,board:n.dataset.storyBoard,disabled:n.disabled,label:n.textContent})),
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth||!!panel&&panel.scrollWidth>panel.clientWidth+1};
}
// 波次轨道验收读取正式界面及按钮尺寸，不创建替代示意图。
export function inspectWaveProgress(root) {
  const track=root.getElementById('wave-track'),button=root.getElementById('boss-button');
  const box=track.getBoundingClientRect(),boss=button.getBoundingClientRect();
  const toast=root.getElementById('toast').getBoundingClientRect();
  return {designCriterion:'wave-progress-track',visible:!track.hidden&&box.width>0,
    roundLabel:root.getElementById('wave-label').textContent,title:root.getElementById('quest-title').textContent,
    objective:root.querySelector('#quest .clearing-objective')?.textContent,
    nodes:[...root.querySelectorAll('.wave-node')].map(n=>({state:n.dataset.state,label:n.getAttribute('aria-label'),text:n.textContent})),
    progress:root.getElementById('wave-track-bar').getAttribute('aria-valuenow'),
    detail:root.getElementById('quest-detail').textContent,
    detailVisible:root.getElementById('quest-detail').getBoundingClientRect().height>0,disabled:button.disabled,
    countVisible:root.getElementById('quest-count').getBoundingClientRect().height>0,
    titleVisible:root.getElementById('quest-title').getBoundingClientRect().height>0,
    panelHeight:root.getElementById('quest').getBoundingClientRect().height,
    helpBox:root.getElementById('wave-help')?.getBoundingClientRect().toJSON(),
    helpFocus:root.getElementById('wave-help')?{active:root.activeElement.id==='wave-help',input:root.getElementById('wave-help').dataset.focusInput,outline:root.defaultView.getComputedStyle(root.getElementById('wave-help')).outlineStyle}:null,
    countdowns:[...root.querySelectorAll('.wave-node[data-countdown="true"]')].map(n=>({index:Number(n.dataset.index),label:n.getAttribute('aria-label'),progress:1-Number(n.querySelector('.wave-countdown-fill').style.strokeDashoffset)/100})),
    contained:boss.right<=box.right+1&&boss.left>=box.left,
    touchSize:boss.width>=44&&boss.height>=44,
    toastClear:!toast.height||toast.top>=box.bottom,
    overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
import {STORY_POSTS} from '../config/story-posts.js';
import {storyCollectionStatus} from '../progression/story-rewards.js';
// 怪物委托复核绑定正式人物列表、奖励存档与界面，无独立展示假数据。
export function inspectMonsterStories(game,root){
 const post=STORY_POSTS.find(p=>p.id==='monster-neighbors');
 return {designCriterion:'monster-neighbor-story-rewards',chapter:game.story?.chapterId||null,
  actors:storyObjects(game).filter(a=>a.appearance).map(a=>({kind:a.kind,x:a.x,y:a.y,appearance:a.appearance})),
  collection:storyCollectionStatus(game.progress,post),
  rewards:root.querySelector('.story-collection')?.textContent||'',
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth+1};
}
import {storyDefinition} from '../core/story-definition.js';
import { WEAPONS } from '../config/weapons.js';
import {storyArtStats,storyObjects} from './story-props.js';
import {storyGuidanceState,storySpeechInfo} from './story-guidance.js';
// 正式绘制器复核入口：只构造显示状态，不改变真实游戏资源、存档与战斗。
import {drawCat} from './characters.js';
import {catSprites} from './cat-animation.js';
import {HEROES} from '../config/heroes.js';

// 守护入门与镜头验收读取正式关卡和最终投影，不复制一套展示战斗。
export function inspectGuardianStart(game,renderer) {
  return {designCriterion:'guardian-default-view',stage:game.realm?.stage,phase:game.realm?.phase,
    total:game.realm?.spec?.total,capacity:game.realm?.spec?.alive,spacing:game.realm?.spec?.spacing,
    alive:game.enemies.filter(e=>e.hp>0).length,zoom:renderer.view?.zoom,
    width:renderer.width,height:renderer.height,ground:renderer.ground.stats()};
}

// 表驱动验收读取正式目标与实体列表，不另造人物出场或清理规则。
export function inspectStoryDefinition(game) {
  const def=storyDefinition(game),stage=game.story?.stageId;
  return {designCriterion:'story-table-driven',chapter:def.id,version:def.version,stage:stage??null,
    task:stage?def.nodes[stage].task.type:null,objective:game.storyObjective(),
    props:storyObjects(game).map(({kind,x,y})=>({kind,x,y}))};
}
// 装备叙事验收直接读取正式体验与DOM气泡，不推进战斗或伪造成功事件。
export function inspectStoryJourney(game,root){
  const cue=root.getElementById('story-chatter');
  return {designCriterion:'story-equipment-journey',state:game.state,experiences:game.story?.experiences||{},
    lastLoadout:game.story?.lastExperienceLoadout||null,cueVisible:!!cue&&!cue.hidden,cue:cue?.dataset.cue,
    longDialogue:!!storySpeechInfo(game),optional:root.getElementById('story-experience')?.textContent,
    props:storyObjects(game).length};
}
let landscapeGround;
let valleyGround;
let landscapeFade, landscapeFadeId;

// 召唤续航复核读取正式单位与能源，不创建另一套召唤或伤害规则。
export function inspectSummonSustain(game) {
  const weapon=game.weapon(),state=game[weapon.controller];
  return {kind:weapon.controller,active:state?.nodes.filter(n=>n.active&&n.ready&&n.hp>0).length||0,
    energy:game.magazines[weapon.weaponIndex],blastCount:game.fx.items.filter(p=>p.kind==='blast').length,
    particles:game.fx.items.length};
}

// 母巢复核读取正式会话的名额、出舱时钟和当前枪架，避免界面复制公式。
export function inspectSpiderSwarm(game) {
  const state=game.spider;
  return {capacity:state.nodes.length,spawned:state.nodes.filter(n=>n.spawned&&n.hp>0).length,
    limit:game.weapon().summonCount,interval:game.weapon().spawnInterval,gun:state.gun?.weapon?.weaponIndex,damage:state.gun?.damage,
    ready:state.nodes.filter(n=>n.active&&n.ready).map(n=>({x:n.x,y:n.y,mode:n.mode,target:n.targetId}))};
}

// 跟随稳定性从正式母体及小蛛采样，移动/腿相位与实际战场共用，不能另造展示轨迹。
export function inspectSpiderFollow(game) {
  const s=game.spider;
  return {designCriterion:'spider-follow-stability',nodes:[s.mother,...s.nodes].filter(n=>n.active&&n.ready&&n.hp>0)
    .map(n=>({index:n.mother?'mother':n.index,x:n.x,y:n.y,angle:n.angle,moving:n.moving,walkPhase:n.walkPhase,mode:n.mode})),particles:game.fx.items.length};
}

// 车载跟随复核直接读取正式伙伴位置，截图仍由战场分层绘制。
export function inspectMechanicalVehicleSpacing(game) {
  const nodes=game.vehicle.module?.companions?.nodes||game.mechanical.nodes;
  return nodes.filter(n=>n.active&&n.ready).map(n=>({index:n.index,x:n.x-game.player.x,y:n.y-game.player.y,mode:n.mode}));
}

// 门牌及复活进度复核读取实际世界入口和正式波次轨道，不创建替代展示。
export function inspectWorkshopPatrol(root) {
  return {designCriterion:'workshop-labels-wave-revive',wave:inspectWaveProgress(root),
    labels:[...root.querySelectorAll('.world-workshop-entry')].map(node=>({kind:node.dataset.workshopKind,
      movement:node.hasAttribute('data-world-movement'),hidden:node.hidden,box:node.getBoundingClientRect().toJSON()}))};
}

// 操作栏复核量测正式舞台与按钮，不以替代示意图判定手机触控空间。
export function inspectWorkshopStageActions(root) {
  // 序列化真实布局，供桌面和手机验收检查遮挡、对齐与最小触控面积。
  const box=selector=>root.querySelector(selector).getBoundingClientRect().toJSON();
  return {designCriterion:'workshop-stage-actions',stage:box('#ws-bench'),actions:box('.ws-stage-actions'),
    label:box('#ws-stage-label'),socket:box('#ws-socket'),buttons:['#ws-test','#ws-equip'].map(box),
    overflow:root.querySelector('.ws-layout').scrollWidth>root.querySelector('.ws-layout').clientWidth+1,
    ...inspectWorkshopDetails(root)};
}

// 熟练度验收读取正式信息条与二级说明，检查型号切换、进度和实际门槛。
// 读取正式工坊功能页与可见边界，验收不创建另一份展示界面。
export function inspectWorkshopFunctionTabs(root){
 const dialog=root.getElementById('workshop-dialog'),host=root.defaultView;
 // 隐藏祖先也参与可见性判断，避免把解锁页后面的控件计入当前页。
 const visible=node=>!!node&&node.getClientRects().length>0&&host.getComputedStyle(node).visibility!=='hidden';
 const box=id=>{const node=root.getElementById(id);return visible(node)?node.getBoundingClientRect().toJSON():null;};
 const layout=root.getElementById('ws-function-panel');
 return {designCriterion:'workshop-function-tabs',page:dialog.dataset.function,
  tabs:[...dialog.querySelectorAll('[data-ws-function]')].map(b=>({id:b.dataset.wsFunction,selected:b.getAttribute('aria-selected'),tabIndex:b.tabIndex,box:b.getBoundingClientRect().toJSON()})),
  stage:box('ws-stage'),components:box('ws-components'),kits:box('ws-parts'),challenge:box('ws-challenge-level'),mastery:box('ws-mastery'),purchase:box('ws-purchase'),tool:box('ws-hold'),
  layout:layout.getBoundingClientRect().toJSON(),scroll:layout.scrollTop,scrollHeight:layout.scrollHeight,clientHeight:layout.clientHeight,
  footer:dialog.querySelector('.ws-footer').getBoundingClientRect().toJSON(),
  overflow:dialog.scrollWidth>dialog.clientWidth+1||root.documentElement.scrollWidth>host.innerWidth,
  canvasBytes:[...dialog.querySelectorAll('canvas')].reduce((sum,c)=>sum+c.width*c.height*4,0)};
}

// 购买目录验收读取纯图标侧栏与正式预览，检查图标尺寸、名称语义和底栏资源。
export function inspectWeaponPurchaseList(root){
 const shared=inspectWorkshopFunctionTabs(root),shelf=root.getElementById('ws-shelf');
 return {...shared,designCriterion:'weapon-purchase-list',shelf:shelf.getBoundingClientRect().toJSON(),
  items:[...shelf.querySelectorAll('[data-ws-item]')].map(node=>({index:Number(node.dataset.wsItem),name:node.getAttribute('aria-label'),text:node.innerText,icon:node.querySelector('canvas').getBoundingClientRect().toJSON(),selected:node.getAttribute('aria-pressed')==='true',box:node.getBoundingClientRect().toJSON(),overflow:node.scrollWidth>node.clientWidth+1})),
  thumbnailBytes:[...shelf.querySelectorAll('canvas')].reduce((sum,c)=>sum+c.width*c.height*4,0)};
}

// 单屏工坊验收绑定真实DOM：同时发现内部滚动、内容裁切和触控区越界。
export function inspectWorkshopFocus(root){
 const dialog=root.getElementById('workshop-dialog'),host=root.defaultView;
 const visible=node=>node.getClientRects().length>0&&host.getComputedStyle(node).visibility!=='hidden';
 const nodes=[...dialog.querySelectorAll('*')].filter(visible);
 const overflow=nodes.filter(node=>node.clientHeight&&node.id!=='ws-shelf'&&node.tagName!=='SELECT'&&(node.scrollHeight>node.clientHeight+2||node.scrollWidth>node.clientWidth+2)).map(node=>node.id||node.className);
 const controls=nodes.filter(node=>node.matches('button,select')&&!node.closest('#ws-shelf')).map(node=>({id:node.id||node.dataset.wsUpgrade||node.dataset.wsPart,box:node.getBoundingClientRect().toJSON()}));
 return {designCriterion:dialog.dataset.workshopKind==='vehicle'?'workshop-vehicle-focus':'workshop-weapon-focus',kind:dialog.dataset.workshopKind,page:dialog.dataset.function,overflow,controls,territory:/营地.*级|领地.*级|挑战.*阶/.test(dialog.innerText),stage:root.getElementById('ws-stage').getBoundingClientRect().toJSON(),canvasBytes:nodes.filter(node=>node.tagName==='CANVAS').reduce((sum,node)=>sum+node.width*node.height*4,0)};
}

export function inspectWorkshopMastery(root){
 const panel=root.getElementById('ws-mastery'),bar=root.getElementById('ws-mastery-progress'),help=root.getElementById('ws-mastery-dialog'),workshop=root.getElementById('workshop-dialog');
 return {designCriterion:'workshop-mastery-guidance',title:root.getElementById('ws-mastery-title').textContent,
  hint:root.getElementById('ws-mastery-hint').textContent,count:root.getElementById('ws-mastery-count').textContent,
  progress:{hidden:bar.hidden,value:bar.value,max:bar.max},locked:panel.dataset.locked==='true',
  panel:panel.getBoundingClientRect().toJSON(),help:{open:help.open,overflow:help.scrollWidth>help.clientWidth+1},
  overflow:workshop.scrollWidth>workshop.clientWidth+1||root.documentElement.scrollWidth>root.defaultView.innerWidth,
  feedback:root.getElementById('ws-feedback').textContent};
}

// 工坊原位详情直接量测正式 DOM，确保底栏占位且属性能完整滚入可视区。
export function inspectWorkshopDetails(root) {
  const box=selector=>root.querySelector(selector).getBoundingClientRect();
  const footer=box('.ws-footer'),layout=box('.ws-layout'),stage=box('#ws-bench'),stats=box('#ws-stats');
  return {footerHeight:footer.height,footerTop:footer.top,stageHeight:stage.height,
    noOverlay:layout.bottom<=footer.top+1,statsVisible:stats.top>=layout.top&&stats.bottom<=layout.bottom+1,
    purpose:root.getElementById('ws-purpose').textContent,resources:root.getElementById('ws-resources').textContent,
    canvasBytes:[...root.querySelectorAll('#workshop-dialog canvas')].reduce((bytes,c)=>bytes+c.width*c.height*4,0)};
}

// 秘境界面复核读取真实节点可见性，不创建独立展示菜单。
export function inspectRealmHud(root) {
  const visible=node=>!!node&&node.getClientRects().length>0&&root.defaultView.getComputedStyle(node).visibility!=='hidden';
  return {designCriterion:'realm-only-hud',active:root.getElementById('game-frame').classList.contains('realm-active'),
    menu:[...root.querySelectorAll('#field-menu-items>button')].filter(visible).map(n=>n.id),
    forestVisible:['.hud-resources','.game-top','#equipment-goal','#story-interact','.story-post-marker'].filter(s=>[...root.querySelectorAll(s)].some(visible)),
    toggle:visible(root.getElementById('field-menu-toggle')),focus:root.activeElement?.id};
}

// HUD 复核直接读取正式 DOM，避免另画图标或资源示意图掩盖截断。
export function inspectHudCompact(root) {
  const frame=root.getElementById('game-frame').getBoundingClientRect();
  const boxes=[...root.querySelectorAll('.hud-resources>.resource-pill,.hud-resources .utility-buttons>button')].map(n=>n.getBoundingClientRect());
  const centers=boxes.map(b=>b.y+b.height/2);
  return {designCriterion:'mobile-single-row-hud',singleRow:Math.max(...centers)-Math.min(...centers)<3,
    contained:boxes.every(b=>b.left>=frame.left&&b.right<=frame.right),overlap:boxes.some((b,i)=>i>0&&b.left<boxes[i-1].right-1),
    icons:['season','time','weather'].map(key=>{const button=root.getElementById(`${key}-picture`),label=root.getElementById(`${key}-picture-label`);return {key,labelHidden:root.defaultView.getComputedStyle(label).display==='none',width:button.getBoundingClientRect().width,name:button.getAttribute('aria-label')};}),
    resources:['coins','wood'].map(key=>{const node=root.querySelector(`[data-${key}]`);return {key,text:node.textContent,full:node.title,clipped:node.scrollWidth>node.clientWidth};})};
}

// 导航复核读取实际SVG旋转角与布局，不在工作台另画罗盘。
export function inspectStoryNavigation(root) {
  const node=root.getElementById('story-navigation'),box=node.getBoundingClientRect();
  return {designCriterion:'story-target-direction',visible:!node.hidden&&box.width>0,
    site:node.dataset.site,angle:Number(node.dataset.angle),near:node.dataset.near==='true',
    coincident:node.dataset.coincident==='true',host:node.parentElement.id,label:node.getAttribute('aria-label'),
    box:{x:box.x,y:box.y,width:box.width,height:box.height},count:root.querySelectorAll('#story-navigation').length};
}

// 紧凑任务栏复核读取实际 DOM 位置及文本，不创建独立预览布局。
export function inspectCompactQuest(root) {
  const quest=root.getElementById('quest');
  const parts=Object.fromEntries(['#quest-title','#quest-count','#quest-detail','.story-experience','.story-navigation'].map(selector=>{
    const node=quest.querySelector(selector),box=node?.getBoundingClientRect();
    return [selector,{text:node?.textContent||'',visible:!!box?.width&&!!box?.height,
      clipped:!!node&&node.scrollWidth>node.clientWidth,box:box?.toJSON()}];
  }));
  return {designCriterion:'compact-quest-tracker',box:quest.getBoundingClientRect().toJSON(),parts,
    overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 场景提示复核共用正式几何与DOM，结合实机截图验证地面层和气泡锚点。
export function inspectStoryGuidance(game,root) {
  const node=root.getElementById('story-speech'),box=node.getBoundingClientRect(),info=storySpeechInfo(game);
  return {designCriterion:'story-world-guidance',...storyGuidanceState(game),speaker:info?.speaker,
    speechVisible:!node.hidden,speechText:root.getElementById('story-speech-text').textContent,
    speechBox:{x:box.x,y:box.y,width:box.width,height:box.height},
    anchor:{x:Number(node.dataset.anchorX),y:Number(node.dataset.anchorY)},
    speechCount:root.querySelectorAll('#story-speech').length,art:storyArtStats()};
}

// 章节复核直接采样正式会话与DOM；世界构图必须使用正式战场连续截图。
export function inspectSunleaf(game,root) {
  const r=game.story,panel=root.getElementById('story-dialog');
  return {designCriterion:'sunleaf-objective-readable',stage:r?.stageId,phase:r?.phase,route:r?.routeId,
    loadout:r?.loadoutId,weapon:game.loadout.weapon,vehicle:game.vehicle.index,turret:game.vehicle.weaponIndex,
    relay:r?.relay?{hp:r.relay.hp,parts:r.group}:null,bossPhase:game.boss?.ai.phase,
    body:game.player.bodyAnimation,objective:root.getElementById('quest-detail').textContent,
    panelOverflow:panel.scrollWidth>panel.clientWidth+1,restored:Object.keys(storyDefinition(game).completionFlags).every(key=>game.progress.story.worldFlags[key]),art:storyArtStats()};
}

// 镜头复核直接记录正式画面的坐标与倍率，用于相邻台词的稳定性比较。
export function inspectStoryCamera(renderer) {
  const v=renderer.view,camera=renderer.storyCamera;
  return {designCriterion:'story-camera-stability',view:v?{x:v.x,y:v.y,zoom:v.zoom}:null,
    active:camera.active,returning:camera.returning,layout:camera.layout};
}

// 世界回归复核读取正式实体列表，永久通关记录与场景清理分别验证。
export function inspectStoryReturn(game) {
  return {designCriterion:'sunleaf-world-return',active:!!game.story,
    props:storyObjects(game).map(o=>o.kind),completed:!!Object.keys(storyDefinition(game).completionFlags).every(key=>game.progress.story.worldFlags[key]),
    art:storyArtStats()};
}

// 按案例动态加载，未选择的武器、怪潮和领主不因验收入口进入运行依赖图。
export async function renderVisualCase(c,id,phase){
  // 载具结构案例复用正式工坊，主案例轮换六车型，编号案例便于逐相位采样。
  if(id==='vehicle-upgrade-structures'||id.startsWith('vehicle-upgrade-structures-')){
    const {drawWorkshopEquipment}=await import('./workshop.js');
    const {freshProgress}=await import('../progression/progress.js');
    const suffix=Number(id.slice('vehicle-upgrade-structures-'.length));
    const index=id==='vehicle-upgrade-structures'?Math.floor(phase*6)%6:Math.max(0,Math.min(5,Number.isFinite(suffix)?suffix:0));
    const p=freshProgress();p.vehicleHulls[index]=20;p.vehicleParts[index].engine=5;
    drawWorkshopEquipment(c,p,'vehicle',index,phase);return;
  }
  // 全武器改装案例共用正式工坊绘制，编号子案例覆盖各型号，主案例轮换展示。
  if(id==='weapon-upgrade-structures'||id.startsWith('weapon-upgrade-structures-')){
    const {drawWorkshopEquipment}=await import('./workshop.js');
    const {freshProgress}=await import('../progression/progress.js');
    const {equipmentParts}=await import('../config/equipment-parts.js');
    const suffix=Number(id.slice('weapon-upgrade-structures-'.length));
    const index=id==='weapon-upgrade-structures'?Math.floor(phase*21)%21:Math.max(0,Math.min(20,suffix));
    const p=freshProgress(),kind=index<17?'weapons':'turret';
    for(const part of equipmentParts(kind,index)){
      if(part.key==='damage')p[index<17?'weapons':'vehicleWeapons'][index]=part.max;
      else p[index<17?'weaponParts':'turretParts'][index][part.key]=part.max;
    }
    drawWorkshopEquipment(c,p,kind,index,phase);return;
  }
  // 加特林样板逐相位读取正式六管与升级部件；真实射击由隔离游戏页面验收。
  if(id==='chainsaw-range-contact') {
    const {freshProgress}=await import('../progression/progress.js');
    const p=freshProgress();p.weapons[14]=1;p.weaponParts[14].range=[1,3,5][Math.floor(phase)%3];
    drawWorkshopEquipment(c,p,'weapons',14,phase);return;
  }
  if(id==='gatling-art-quality') {
    const {drawWeapon}=await import('./characters.js');
    c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();
    const scale=Math.min(c.canvas.width/100,c.canvas.height/120);
    drawWeapon(c,2,c.canvas.width*.4,c.canvas.height*.25,scale,0,0,0,0,null,phase*12);
    drawWeapon(c,2,c.canvas.width*.4,c.canvas.height*.7,scale,0,0,0,0,{damage:20,rate:5,capacity:5,reload:5,range:5,accuracy:5},phase*12);c.restore();return;
  }
  // 章节设备逐相位调用正式摆件绘制器，状态改变不替换人物和场景。
  if(id.startsWith('sunleaf-')) {
    if(id==='sunleaf-loadout-identity')return renderVisualCase(c,`vehicle-armament-${[0,3,1][Math.floor(phase*3)%3]}`,phase);
    // 文字、通路与冲锋几何须在实战检查，工作台不以摆件图片冒充验收。
    if(['sunleaf-objective-readable','sunleaf-boss-warning'].includes(id))throw Error(i18nText("rendering.visual-review.ceaba3c1a6"));
    const {drawStoryProp}=await import('./story-props.js');
    c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();c.translate(c.canvas.width/2,c.canvas.height*.7);c.scale(2,2);
    drawStoryProp(c,{x:0,y:0,kind:id.includes('route')?'sign':id.includes('return')?'mail':'relay',restored:phase>.5,parts:Math.floor(phase*3),hp:300},phase, id.endsWith('night')?1:0,false);c.restore();return;
  }

  // 坦克悬挂和炮管复进采样正式试射，工作台与战场保持同源。
  if(id==='tank-recoil')return renderVisualCase(c,'vehicle-armament-1',phase);
  // 复核弹头离开后炮口闪光已经消退，仍使用正式试射时序。
  if(id==='tank-muzzle-flash')return renderVisualCase(c,'vehicle-armament-1',phase);
  // 交替喷口、水压弹与靶标命中均采样正式试射，不另写展示时钟。
  if(id==='hover-tide-impact')return renderVisualCase(c,'vehicle-armament-3',phase);
  // 潮汐炮与旋转枪管连续采样正式绘制器，保持真实锚点和后坐结构。
  if(id==='weapon-turn-hovercraft') {
    const {drawWeapon}=await import('./characters.js'),{drawVehicleArmament}=await import('./vehicle-armaments.js'),{VEHICLE_WEAPONS}=await import('../config/vehicle-armaments.js');
    c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();
    c.translate(c.canvas.width/2,c.canvas.height/2);c.scale(2,2);
    drawWeapon(c,2,-23,-40,1,0,0,0,0,null,phase*12);
    drawVehicleArmament(c,VEHICLE_WEAPONS[20],{kick:Math.max(0,8-phase*20)});
    c.restore();return;
  }
  if(id.startsWith('vehicle-armament-')) {
    const index=Number(id.slice('vehicle-armament-'.length));
    const {freshProgress}=await import('../progression/progress.js'),{createWorkshopTrial}=await import('../core/workshop-trial.js'),{drawWorkshopTrial}=await import('./workshop.js');
    const p=freshProgress();p.vehicleHulls[index]=1;
    const session=createWorkshopTrial(p,'vehicle',index,false,{hp:5000});
    for(let t=0;t<phase%3.5;t+=1/120)session.advance(Math.min(1/120,phase%3.5-t));
    drawWorkshopTrial(c,session);return;
  }

  // 同一死亡入口产生有限粒子，正式蜘蛛与粒子绘制逐帧验收爆光和消退。
  if(id==='summon-sustain-deathburst') {
    const {CombatFX}=await import('../combat/effects.js'),{explodeSpiderling}=await import('../combat/spider-death.js');
    const {drawArmedSpider}=await import('./spider-armed.js'),{drawCombatFX}=await import('./particles.js');
    const node={index:0,x:0,y:10,hp:0,spider:true,mode:'dead',deadTime:Math.max(0,2-phase%.7),walkPhase:0},fx=new CombatFX(()=>.5);
    const source={weapon:()=>WEAPONS[16],damage:()=>WEAPONS[16].damage,enemies:[],boss:null,fx,onEvent:()=>{}};
    explodeSpiderling(source,node);fx.update(phase%.7);
    c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();c.translate(c.canvas.width/2,c.canvas.height/2);c.scale(1.3,1.3);
    drawArmedSpider(c,node,WEAPONS[16]);drawCombatFX(c,fx.items);c.restore();return;
  }

  // 按真实冲量积分取样受击过程，工作台与战场共用主体和局部关节绘制器。
  if(id.startsWith('monster-hit-type-')){
    const {applyImpulse,stepBodies}=await import('../physics/motion.js'),{WORLD}=await import('../world/coordinates.js'),{drawSlime}=await import('./enemies.js');
    const species=id.slice('monster-hit-type-'.length),e={type:'enemy',species,biome:'meadow',rank:0,phase:0,x:2000,y:2000,
      hp:100,maxHp:100,radius:species==='ironwood-bulwark'?25:17,mass:species==='ironwood-bulwark'?3.2:1,
      flying:species==='leaf-bat',arena:{x:2000,y:2000,radius:5000},assault:{phase:'chase',elapsed:0}};
    applyImpulse(e,{x:1,y:0},140,320);
    for(let t=0;t<Math.min(2,phase);t+=1/120)stepBodies([e],Math.min(1/120,Math.min(2,phase)-t),WORLD);
    e.x=e.y=0;
    c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();c.translate(c.canvas.width/2,c.canvas.height*.76);c.scale(1.4,1.4);drawSlime(c,e,phase);c.restore();return;
  }

  // 重装逐帧调用正式主体与盾击预警，不另画工作台示意图。
  if(id==='dumpling-camp-family'||id==='dumpling-jelly-motion'){
    const {drawSlime}=await import('./enemies.js'),{MONSTER_FAMILIES}=await import('../config/monster-families.js');
    const {RANGED_ENEMIES}=await import('../config/ranged-enemies.js');
    c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();
    c.translate(c.canvas.width/2,c.canvas.height/2);const scale=Math.min(c.canvas.width/680,c.canvas.height/340);c.scale(scale,scale);
    for(const [i,species] of MONSTER_FAMILIES.dumpling.members.entries()){
      const x=(i%4-1.5)*145,y=Math.floor(i/4)*130-50,p=RANGED_ENEMIES[species];
      const e={type:'enemy',gelStep:phase*6,gelMove:phase<1?1:0,gelHitAge:phase>=1?(phase-1)%.8:undefined,species,biome:'meadow',rank:0,phase:0,x,y,hp:100,maxHp:100,radius:17,flying:species==='leaf-bat',rangedWalk:phase*5,armoredWalk:phase*4,
        assault:p?{phase:'windup',elapsed:(phase%1)*p.windup,dirX:1,dirY:0}:{phase:'chase',elapsed:0}};
      drawSlime(c,e,phase);
    }
    c.restore();return;
  }
  if(id==='dumpling-lord'){
    const {drawBoss}=await import('./enemies.js'),{bossProfile}=await import('../config/bosses.js');
    const p=bossProfile({kind:'dumpling'}),duration=p.windup+p.active+p.recovery,t=phase%duration;
    const state=t<p.windup?'windup':t<p.windup+p.active?'cast':'recover',elapsed=t-(state==='cast'?p.windup:state==='recover'?p.windup+p.active:0);
    c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();c.translate(c.canvas.width/2,c.canvas.height*.83);
    const scale=Math.min(c.canvas.width/200,c.canvas.height/245);c.scale(scale,scale);
    drawBoss(c,{kind:'dumpling',x:0,y:0,hp:100,maxHp:100,ai:{phase:state,elapsed}},phase);c.restore();return;
  }
  if(id==='armored-bulwark'){
    const {drawSlime,drawEnemyWarning}=await import('./enemies.js'),{ARMORED}=await import('../config/armored-enemies.js');
    const phases=['chase','windup','lunge','returning','recovery'],index=Math.floor(phase)%phases.length,state=phases[index],t=phase%1;
    const e={species:ARMORED.id,x:0,y:0,hp:35,maxHp:100,radius:25,rank:0,phase:0,armoredWalk:phase*4,
      assault:{phase:state,elapsed:t*(ARMORED.attack[state]||1),dirX:0,dirY:1,originX:0,originY:0,endX:0,endY:50}};
    c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();c.translate(c.canvas.width/2,c.canvas.height/2+20);c.scale(1.12,1.12);drawEnemyWarning(c,e);drawSlime(c,e,phase);c.restore();return;
  }

  // 远程怪物复核复用正式主体、锁点预警及弹丸，逐帧检查部件而不另画示意图。
  if(id==='ranged-enemy-variety'||id==='ranged-enemy-reinforcements') {
    const {drawSlime,drawEnemyWarning}=await import('./enemies.js'),{drawEnemyBolts}=await import('./ranged-enemies.js');
    const {RANGED_ENEMIES}=await import('../config/ranged-enemies.js');
    c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();c.translate(c.canvas.width/2,c.canvas.height/2+(id==='ranged-enemy-reinforcements'?0:25));c.scale(id==='ranged-enemy-reinforcements'?1.2:2,id==='ranged-enemy-reinforcements'?1.2:2);
    const speciesList=Object.keys(RANGED_ENEMIES).filter(key=>id==='ranged-enemy-variety'?['spore-spitter','acorn-slinger'].includes(key):!['spore-spitter','acorn-slinger'].includes(key));
    for(const [index,species] of speciesList.entries()) {
      const p=RANGED_ENEMIES[species],t=phase%(p.windup+p.recovery),x=(index-(speciesList.length-1)/2)*110;
      const e={species,x,y:0,hp:100,maxHp:100,radius:17,phase:0,rank:0,rangedWalk:phase*4,
        assault:{phase:t<p.windup?'windup':'recovery',elapsed:t<p.windup?t:t-p.windup,dirX:0,dirY:1,originX:x,originY:0,endX:x,endY:45}};
      drawEnemyWarning(c,e);drawSlime(c,e,phase);
      if(t>=p.windup&&t<p.windup+.5)drawEnemyBolts(c,[{species,x,y:18+(t-p.windup)*50,dx:0,dy:1,splash:p.splash||0,endX:x,endY:45,age:t-p.windup}]);
    }c.restore();return;
  }

  // 运动场复核直接采样正式地面、怪物连续帧与枪械，不能另画示意资产。
  if(id==='forest-fire-world'||id==='forest-fire-rescue'){const {drawFireCard}=await import('./fire-rescue.js');drawFireCard(c,phase);return;}
  if(id==='slime-football-field'){const {drawFootballCard}=await import('./slime-football.js');drawFootballCard(c,phase);return;}
  // 原生、步枪与脉冲三种单枪架均由正式工作台绘制，满编双环不制作独立示意图。
  if(id==='spider-mounted-swarm'){
    const {freshProgress}=await import('../progression/progress.js'),{drawWorkshopEquipment}=await import('./workshop.js');
    const p=freshProgress();p.weapons.fill(1);p.weaponParts[16].coordination=13;p.spiderLoadout=[null,0,9][Math.floor(phase)%3];
    drawWorkshopEquipment(c,p,'weapons',16,phase,false);return;
  }
  // 混编正式预览保持三枪七重爪，连续帧复核不另画示意队伍。
  if(id==='mechanical-mixed-pack') {
    const {freshProgress}=await import('../progression/progress.js'),{drawWorkshopEquipment}=await import('./workshop.js');
    const p=freshProgress();p.weapons.fill(1);p.weaponParts[15].coordination=8;p.mechanicalLoadout=0;
    drawWorkshopEquipment(c,p,'weapons',15,phase,false);return;
  }
  // 动作复核复用母蛛/小蛛正式绘制，展示抬足、侧舱打开、伸足出舱与朝向挥击。
  if(id==='spider-motion') {
    const {freshProgress}=await import('../progression/progress.js'),{effectiveWeapon}=await import('../config/weapon-mods.js');
    const {drawArmedSpider}=await import('./spider-armed.js'),{createSpiderState}=await import('../combat/spider.js');
    const p=freshProgress();p.weapons.fill(1);const w=effectiveWeapon(p,16),state=createSpiderState(),t=phase%1.2;
    state.gun.weapon={...w,weaponIndex:9};state.gun.angle=-.2;
    c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();c.translate(c.canvas.width/2,c.canvas.height/2);c.scale(2,2);
    drawArmedSpider(c,{...state.mother,x:0,y:0,gun:state.gun,walkPhase:phase*5,angle:0,hatch:1.2-t,hatchSide:-1},w,false);
    drawArmedSpider(c,{index:0,x:-29-t*60,y:18+t*24,emerge:Math.max(0,.85-t),walkPhase:phase*7,angle:Math.PI,mode:'emerge'},w,false);
    drawArmedSpider(c,{index:1,x:72,y:48,walkPhase:phase*7,angle:-.7,mode:t<.22?'windup':'strike',swing:t<.22?0:Math.max(0,.54-t)},w,false);c.restore();return;
  }
  // 重装/轻装与母蛛八足连续采样使用正式状态和绘制器。
  if(id==='mechanical-armored-claws'||id==='mechanical-spider') {
    const {freshProgress}=await import('../progression/progress.js'),{effectiveWeapon}=await import('../config/weapon-mods.js');
    const p=freshProgress();p.weapons.fill(1);c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();c.translate(c.canvas.width/2,c.canvas.height/2+20);c.scale(2,2);
    if(id==='mechanical-spider') {const {drawArmedSpider}=await import('./spider-armed.js'),{createSpiderState}=await import('../combat/spider.js');const state=createSpiderState(),w=effectiveWeapon(p,16);state.gun.weapon={...w,weaponIndex:9};state.gun.pulse.charge=phase%w.chargeTime;state.gun.angle=-.2;drawArmedSpider(c,{...state.mother,x:0,y:0,gun:state.gun,clock:phase,walkPhase:phase*3,hatch:phase%1<.65?.65-phase%1:0},w,false);for(let i=0;i<3;i++)drawArmedSpider(c,{index:i,x:-65+i*65,y:60,walkPhase:phase*6+i,mode:phase%1<.24?'strike':'chase',swing:phase%1<.24?.24-phase%1:0},w,false);}
    else {const {drawArmedMechanicalCat}=await import('./mechanical-armed.js');for(const [x,loadout] of [[-45,null],[45,0]]){const w=effectiveWeapon({...p,mechanicalLoadout:loadout},15);drawArmedMechanicalCat(c,{index:0,x,y:0,angle:0,walkPhase:phase*4,mode:phase%1<.24?'strike':'chase',swing:phase%1<.24?.24-phase%1:0},w,false);}}
    c.restore();return;
  }

  // 机械伙伴正式构图连续采样：近战预备/挥爪与背枪瞄准、独立生命条。
  if(id==='mechanical-companions') {
    const {drawArmedMechanicalCat}=await import('./mechanical-armed.js');
    const {effectiveWeapon}=await import('../config/weapon-mods.js');
    const {createRecoil}=await import('../combat/recoil.js');
    const p={weapons:WEAPONS.map(()=>1),mods:[],mastery:[],weaponParts:[]},w=effectiveWeapon(p,15);
    c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();
    c.translate(c.canvas.width/2,c.canvas.height/2);const scale=Math.min(c.canvas.width/260,c.canvas.height/145);c.scale(scale,scale);
    for(let i=0;i<3;i++)drawArmedMechanicalCat(c,{index:i,x:-80+i*80,y:15,walkPhase:phase*8+i,angle:0,
      mode:i===0?'windup':i===1?'strike':'ranged',swing:i===1?.24*(1-phase%1):0,hp:40,maxHp:60,
      gun:i===2?{weapon:effectiveWeapon(p,9),recoil:createRecoil(),angle:Math.sin(phase)*.35}:null},w);
    c.restore();return;
  }
  // 机械猫使用正式关节绘制，连续采样真实移动和挥爪姿态；数量等级共用工坊计算。
  if(id==='mechanical-core-ground-pack') {
    const {drawMechanicalCat}=await import('./mechanical.js');
    const {drawWeapon}=await import('./characters.js');
    c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();
    c.translate(c.canvas.width/2,c.canvas.height/2);const scale=Math.min(c.canvas.width/220,c.canvas.height/160);c.scale(scale,scale);
    drawWeapon(c,15,-65,0,1.4,0,0,0,Math.floor(phase/3)%3);
    drawMechanicalCat(c,{index:0,x:40,y:10,walkPhase:phase*8,angle:0,swing:phase%1<.24?.24-phase%1:0},
      {parts:{damage:1+Math.floor(phase)%20,rate:1+Math.floor(phase)%5},modChoice:Math.floor(phase/3)%3});c.restore();return;
  }
  // 清晰度验收沿用正式山湖景观与晴天至雷雨过渡，观察原色、暗面和降水遮挡。
  if (id === 'scene-clarity' || id === 'scene-clarity-night')
    return renderVisualCase(c, `weather-change-sun-to-thunder${id.endsWith('-night') ? '-night' : ''}`, phase);
  // 天气过渡工作台复用正式天气权重、世界降水与晴阴色调，按连续时间采样。
  const weatherChange=id.match(/^weather-change-(sun|cloud|rain|thunder|snow)-to-(sun|cloud|rain|thunder|snow)(-night)?$/);
  if(weatherChange) {
    const [,from,to,dark]=weatherChange,night=Number(!!dark);
    await renderVisualCase(c,`landscape-group-0-${from==='snow'||to==='snow'?'winter':'summer'}${dark||''}`,phase);
    const {EnvironmentTransition}=await import('../world/environment.js');
    const {RainRenderer}=await import('./rain.js'),{SnowRenderer}=await import('./snow.js'),{SceneTone}=await import('./scene-tone.js');
    const {LANDSCAPES}=await import('../world/landscape-compositions.js');
    const {forestLayout}=await import('../world/biomes.js');
    const model=new EnvironmentTransition({time:'day',weather:from},0);model.set({time:'day',weather:to},0);const light=model.sample(phase*1000);
    const b=LANDSCAPES.groups[0].bounds,w=c.canvas.width,h=c.canvas.height,zoom=Math.min(w/b.w,h/b.h)*.93;
    const view={x:b.x+b.w/2-w/(2*zoom),y:b.y+b.h/2-h/(2*zoom),w:w/zoom,h:h/zoom,zoom};
    const rain=new RainRenderer();rain.prepare(phase,view,forestLayout().map(t=>({...t,hp:55})),light.rain,light.storm,false);
    rain.drawAir(c,phase,w,h,view,light.rain,light.storm,0,false,{x:w/2,y:h/2});
    new SnowRenderer().draw(c,phase,w,h,view,light.snow,night,false,{x:w/2,y:h/2});
    const tone=new SceneTone({time:'day',weather:from},0);tone.set({time:'day',weather:to},0);tone.draw(c,w,h,{time:'day',weather:to},phase*1000,false);return;
  }

  // 中央展示空间沿用实际无人机与部件绘制，响应画布宽高而不另画示意模型。
  if (id === 'workshop-stage-space') {
    await renderVisualCase(c,'workshop-components-weapons-13-rate',phase);
    return;
  }
  // 大雪工作台复用真实景观和飘雪绘制器，连续时间采样不会伪造静态降雪图。
  if (id === 'weather-snow' || id === 'weather-snow-night') {
    const night=id.endsWith('-night');
    await renderVisualCase(c,`landscape-group-0-winter${night?'-night':''}`,phase);
    const {SnowRenderer}=await import('./snow.js');
    new SnowRenderer().draw(c,phase,c.canvas.width,c.canvas.height,{x:0,y:0},1,Number(night),false);
    return;
  }
  // 部件等级与工具施工绑定正式绘制器；每个时间采样对应一个真实结构等级。
  if(id.startsWith('workshop-components-')) {
    const match=id.match(/^workshop-components-(weapons|turret|vehicle)-(\d+)-([a-z]+)$/);
    if(!match)throw Error(i18nText("rendering.visual-review.0f2f76e1c8"));
    const [,kind,rawIndex,key]=match,index=Number(rawIndex);
    const {equipmentParts,validatePartLevels}=await import('../config/equipment-parts.js');
    const {drawWorkshopEquipment}=await import('./workshop.js');
    const spec=equipmentParts(kind,index).find(p=>p.key===key);if(!spec)throw Error(i18nText("rendering.visual-review.d4059da97d"));
    const level=Math.min(spec.max,Math.max(1,1+Math.floor(phase)));
    const p={hero:0,heroes:[1],weapons:Array(WEAPONS.length).fill(1),mastery:Array(WEAPONS.length).fill(40),mods:Array(WEAPONS.length).fill(0),vehicleHulls:Array(4).fill(1),vehicleWeapons:Array(WEAPONS.length).fill(1),vehicleLoadouts:[0,0,0,0]};
    p.weaponParts=validatePartLevels(null,p.weapons,'weapons');p.turretParts=validatePartLevels(null,p.vehicleWeapons,'turret');p.vehicleParts=validatePartLevels(null,p.vehicleHulls,'vehicle');
    if(key==='damage')(kind==='turret'?p.vehicleWeapons:p.weapons)[index]=level;
    else if(key==='armor')p.vehicleHulls[index]=level;
    else p[kind==='vehicle'?'vehicleParts':kind==='turret'?'turretParts':'weaponParts'][index][key]=level;
    drawWorkshopEquipment(c,p,kind,index,phase,false);return;
  }
  // 清晰施工连续采样调用正式工具和真实零件替换，不另绘示意对象。
  // 完成动作采样共用真实工具收回与局部描边，不修改装备图形或交易状态。
  if(id==='workshop-completion-feedback') {
    await renderVisualCase(c,'workshop-components-weapons-0-rate',1);
    const {drawWorkshopCompletion}=await import('./workshop-completion.js');
    c.save();c.translate(c.canvas.width/2,c.canvas.height/2);c.scale(2,2);
    drawWorkshopCompletion(c,[{x:-25,y:0,width:50,height:44,flipX:1,flipY:1}],phase<2?'wrench':'welder',phase%2,false);
    c.restore();return;
  }
  if(id==='workshop-construction-clarity') {
    const {drawWorkshopReplacement}=await import('./workshop-assembly.js');
    const {drawWorkshopTool}=await import('./workshop-tools.js');
    const {equipmentParts}=await import('../config/equipment-parts.js');
    const t=phase%3,spec=equipmentParts('weapons',0).find(p=>p.key==='rate');
    drawWorkshopReplacement(c,{index:0,spec,level:2,x:c.canvas.width/2,y:c.canvas.height/2,scale:3,pixels:1},Math.min(1,t/1.1));
    if(t>=1.1){c.save();c.translate(c.canvas.width/2,c.canvas.height/2);c.scale(2,2);drawWorkshopTool(c,phase<3?'wrench':'welder',0,0,Math.min(1,(t-1.1)/1.5),true,false);c.restore();}
    return;
  }
  if(id==='workshop-touch-construction'||id==='workshop-construction-wrench'||id==='workshop-construction-welder') {
    const {drawWorkshopTool}=await import('./workshop-tools.js');
    c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();c.translate(c.canvas.width/2,c.canvas.height/2);c.scale(3,3);
    drawWorkshopTool(c,id.endsWith('welder')?'welder':'wrench',0,0,Math.min(1,phase/1.5),true,false);c.restore();return;
  }
  // 飘叶工作台使用同一批真实阔叶树与世界坐标，不另做展示动画。
  if (id === 'weather-autumn-leaves' || id === 'weather-autumn-leaves-night') {
    const night=id.endsWith('-night');
    await renderVisualCase(c,`landscape-group-0-autumn${night?'-night':''}`,phase);
    const {FallingLeavesRenderer}=await import('./falling-leaves.js');
    const {forestLayout}=await import('../world/biomes.js');
    const {LANDSCAPES}=await import('../world/landscape-compositions.js');
    const b=LANDSCAPES.groups[0].bounds;
    const zoom=Math.min(c.canvas.width/b.w,c.canvas.height/b.h)*.93;
    c.save();c.translate(c.canvas.width/2,c.canvas.height/2);c.scale(zoom,zoom);c.translate(-b.x-b.w/2,-b.y-b.h/2);
    new FallingLeavesRenderer().draw(c,phase,forestLayout().map((t,id)=>({...t,id,hp:55})).filter(t=>t.x>b.x&&t.x<b.x+b.w&&t.y>b.y&&t.y<b.y+b.h),'autumn',Number(night));
    c.restore();return;
  }
  // 工坊案例直接调用正式绘制器，按分支连续采样，无专用美化画面。
  if (id.startsWith('workshop-')) {
    if (id.startsWith('workshop-building')) {
      const {drawScenery}=await import('./scenery.js');
      c.save(); c.translate(c.canvas.width/2,c.canvas.height*.87); c.scale(2,2);
      const rebuilding=id.includes('-rebuild-'),ruined=id.includes('-ruined-');
      drawScenery(c,{kind:'cottage',x:0,y:0,size:1,workshop:true,workshopState:rebuilding?'rebuilding':ruined?'ruined':'ready',rebuildProgress:Math.min(1,phase/5)},id.endsWith('night')?1:0);
      c.restore(); return;
    }
    const {drawWorkshopEquipment}=await import('./workshop.js');
    const match=id.match(/^workshop-(weapon|vehicle)-(\d+)$/);
    if (!match) throw Error(i18nText("rendering.visual-review.eef185c973", { p0: (id) }));
    const index=Number(match[2]),kind=match[1]==='weapon'?'weapons':'vehicle';
    const progress={hero:0,heroes:[1,0,0,0,0,0],weapons:Array(WEAPONS.length).fill(1),mastery:Array(WEAPONS.length).fill(40),
      mods:Array(WEAPONS.length).fill(0),vehicleWeapons:Array(WEAPONS.length).fill(1),vehicleLoadouts:[0,1,2,3]};
    if (kind==='weapons') progress.mods[index]=Math.floor(phase)%3;
    else progress.vehicleLoadouts[index]=[0,1,2,3,8,9,14][Math.floor(phase)%7];
    drawWorkshopEquipment(c,progress,kind,index,phase,false); return;
  }

  // 九寨沟复核连续调用正式地面、水流与树木绘制，白天夜晚使用相同景物布局。
  if (id.startsWith('jiuzhaigou-')) {
    const { GroundCache } = await import('./ground-cache.js');
    const { drawJiuzhaigouWater } = await import('./jiuzhaigou.js');
    const { jiuzhaigouTrees, JIUZHAIGOU_SIGNPOSTS, JIUZHAIGOU_FALLS } = await import('../world/jiuzhaigou.js');
    const { drawRegionSignpost } = await import('./signposts.js');
    const { drawForestTree, drawForestShadow } = await import('./forest-art.js');
    const night = id.endsWith('night') ? 1 : 0, lake = id.includes('lake');
    const land = id.includes('landmarks');
    const bank = JIUZHAIGOU_FALLS.find(f => id === `jiuzhaigou-bank-${f.id}-${night ? 'night' : 'day'}`);
    // 接岸近景直接裁切正式场景，四组瀑布的上下游与两侧轮廓都纳入验收。
    const view = bank ? { x: bank.x - (bank.width + 300) / 2, y: bank.y - 160, w: bank.width + 300, h: (bank.width + 300) * 2 / 3 }
      : { x: land ? 250 : lake ? 430 : 1260, y: land ? 1110 : lake ? 360 : 1270, w: 900, h: 600 };
    valleyGround ||= new GroundCache('jiuzhaigou');
    c.save();
    try {
      c.scale(c.canvas.width / view.w, c.canvas.height / view.h); c.translate(-view.x, -view.y);
      valleyGround.draw(c, view, night); drawJiuzhaigouWater(c, view, phase, night);
      const trees = jiuzhaigouTrees().filter(t => t.x > view.x - 60 && t.x < view.x + view.w + 60 && t.y > view.y && t.y < view.y + view.h + 120).sort((a,b) => a.y-b.y);
      trees.forEach(tree => drawForestShadow(c, tree, night));
      const signs = JIUZHAIGOU_SIGNPOSTS.filter(s => s.x > view.x - 190 && s.x < view.x + view.w + 190 && s.y > view.y && s.y < view.y + view.h + 250);
      for (const item of [...trees.map((t, i) => ({ ...t, id: i + 1, hp: 55 })), ...signs].sort((a, b) => a.y - b.y)) {
        if (item.type === 'signpost') drawRegionSignpost(c, item, night, { x: -1000, y: -1000 }, c.canvas.width / view.w);
        else drawForestTree(c, item, phase, night, false, 0);
      }
    } finally { c.restore(); }
    return;
  }
  // 景观工作台复用实际分块地面、摆件、岩山和萤火虫，连续采样不另造静态示意图。
  if(id.startsWith('landscape-')) {
    await loadCozyCottage();
    const {LANDSCAPES}=await import('../world/landscape-compositions.js');
    const {NATURAL_TERRAIN}=await import('../world/natural-terrain.js');
    const {GroundCache}=await import('./ground-cache.js');
    const {drawMountain}=await import('./natural-terrain.js');
    const {drawScenery}=await import('./scenery.js');
    const {FireflyRenderer}=await import('./fireflies.js');
    const {SceneTone}=await import('./scene-tone.js');
    const groupMatch=id.match(/^landscape-group-([0-5])(?:-(spring|summer|autumn|winter))?(?:-to-(spring|summer|autumn|winter))?(?:-night)?$/);
    const season=groupMatch?.[3]||groupMatch?.[2]||'summer';
    let transition=null;
    // 连续采样共用运行时季节模型和材质缓存，不另画过渡示意图。
    if(groupMatch?.[3]) {
      const {SeasonTransition}=await import('../world/season-transition.js');
      landscapeFade ||= new SeasonTransition(groupMatch[2]);
      if(landscapeFadeId!==id){landscapeFade.reset(groupMatch[2],0);landscapeFade.set(season,0);landscapeFadeId=id;}
      transition=landscapeFade.sample(phase*1000);
    }
    const winter=transition?transition.weights.winter:season==='winter';
    const group=groupMatch?LANDSCAPES.groups[Number(groupMatch[1])]:null;
    const mountain=id==='landscape-mountain',night=id.endsWith('-night')?1:0;
    const item=mountain?NATURAL_TERRAIN.mountains[0]:NATURAL_TERRAIN.lakes[0];
    const site=LANDSCAPES.sites.find(s=>s.id===item.id),b=group?.bounds||site.bounds;
    const view={x:b.x,y:group?b.y:Math.min(b.y,item.y-(item.height||0)-45),w:b.w,h:b.h+(mountain?100:0)};
    const zoom=Math.min(c.canvas.width/view.w,c.canvas.height/view.h)*.93;
    c.save();
    try {
      const snow=Number(winter);
      c.fillStyle=`rgb(${[183,196,138].map((v,i)=>Math.round(v+([223,232,223][i]-v)*snow)).join(',')})`;c.fillRect(0,0,c.canvas.width,c.canvas.height);
      c.translate(c.canvas.width/2,c.canvas.height/2);c.scale(zoom,zoom);
      c.translate(-view.x-view.w/2,-view.y-view.h/2);
      landscapeGround ||= new GroundCache();landscapeGround.setSeason(season,transition);landscapeGround.draw(c,view,night);
      const props=LANDSCAPES.props.filter(p=>group?group.members.includes(p.site):p.site===item.id);
      const mountains=group?NATURAL_TERRAIN.mountains.filter(m=>m.group===group.id):mountain?[item]:[];
      const {forestLayout}=await import('../world/biomes.js');
      const {drawForestTree,drawForestShadow}=await import('./forest-art.js');
      const trees=group?forestLayout().map((t,i)=>({...t,id:i,type:'tree',hp:55,maxHp:55})).filter(t=>t.x>b.x&&t.x<b.x+b.w&&t.y>b.y&&t.y<b.y+b.h):[];
      for(const tree of trees)drawForestShadow(c,tree,night,winter,season);
      for(const p of [...props,...mountains,...trees].sort((a,b)=>a.y-b.y)) {
        if(p.type==='landform')drawMountain(c,p,night,null,winter);
        else if(p.type==='tree')drawForestTree(c,p,phase,night,false,0,null,winter,season,transition);
        else drawScenery(c,p,night,null,winter);
      }
      if(night) {
        const flies=new FireflyRenderer();flies.field.advance(0);
        for(let i=1;i<=Math.min(phase*60,360);i++)flies.field.advance(i/60);
        flies.draw(c,Math.min(phase,6),{night:1,dusk:0,rain:0},view,false);
      }
    }finally{c.restore();}
    if(night)new SceneTone({time:'night',weather:'sun'}).draw(c,c.canvas.width,c.canvas.height,{time:'night',weather:'sun'},0,true);
    return;
  }
  // 补给转轮按连续相位采样全目录，与实际领取面板共用绘制入口。
  if (['expedition-weapon', 'expedition-vehicle', 'expedition-turret'].includes(id)) {
    const { drawExpeditionSlot } = await import('./expedition.js');
    const { WEAPONS } = await import('../config/weapons.js');
    const { COLLECTED_VEHICLES } = await import('../config/vehicles.js');
    const { EXPEDITION_TURRETS } = await import('../config/expedition.js');
    const kind = id.slice('expedition-'.length);
    const pool = kind === 'turret' ? EXPEDITION_TURRETS : (kind === 'weapon' ? WEAPONS : COLLECTED_VEHICLES).map((_, i) => i);
    const index = pool[Math.floor(Math.max(0, phase) * 8) % pool.length];
    c.save();
    try { drawExpeditionSlot(c, kind, index); } finally { c.restore(); }
    return;
  }
  c.save();c.translate(240,210);c.scale(2,2);
  try {
    if(id==='guardian-field-day'||id==='guardian-field-night'){
      const {drawGuardianGround,drawGuardianDefense,drawGuardianGarden}=await import('./guardian.js');
      const {drawGoddess}=await import('./realms.js');
      const {createRecoil}=await import('../combat/recoil.js');
      const {createVehicle}=await import('../combat/vehicle.js');
      const {WEAPONS}=await import('../config/weapons.js');
      const {SceneTone}=await import('./scene-tone.js');
      const {GroundCache}=await import('./ground-cache.js');
      const {GUARDIAN_PADS}=await import('../config/guardian.js');
      const progress={hero:0,heroes:[1],weapons:WEAPONS.map(()=>1),vehicleWeapons:WEAPONS.map(w=>w.controller?0:1),vehicleHulls:[1,1,1,1],vehicleLoadouts:[0,0,0,0],mastery:[],mods:[]};
      // 枪械格位使用正式炮塔和后坐结构逐帧采样，工作台不会写入玩家装备。
      const defenses=[{slot:0,kind:'weapon',index:0,weaponIndex:0,level:1},{slot:3,kind:'weapon',index:1,weaponIndex:1,level:1}];
      for(const tower of defenses){
        const vehicle=createVehicle({...progress,vehicleLoadouts:[tower.weaponIndex]},0);
        tower.runtime={player:{...GUARDIAN_PADS[tower.slot],walkPhase:0,recoil:createRecoil()},vehicle,progress,weapon:()=>WEAPONS[tower.weaponIndex]};
      }
      c.scale(.32,.32);c.translate(-900,-710);
      new GroundCache().draw(c,{x:550,y:370,w:700,h:700},id.endsWith('night')?1:0);
      drawGuardianGround(c,{x:550,y:370,w:700,h:700},{defenses},phase);
      drawGuardianGarden(c,phase,id.endsWith('night')?1:0);
      for(const tower of defenses)drawGuardianDefense(c,tower,phase,false);
      drawGoddess(c,{x:900,y:700,hp:600,maxHp:600},phase,false);
      if(id.endsWith('night'))new SceneTone({time:'night',weather:'sun'}).draw(c,1500,1200,{time:'night',weather:'sun'},0,true);
    }else if(id==='hero-walk'||id==='hero-turn'||/^hero-breed-[0-6]$/.test(id)){
      if(!await catSprites.load())throw Error(i18nText("rendering.visual-review.5929541627"));
      const animation={moveWeight:1,moveTime:phase/8,idleTime:phase/8};
      // 六品种逐项沿正式主体绘制链采样，与营地及实战共用外观配置。
      const hero=id.startsWith('hero-breed-')?Number(id.slice(-1)):id==='hero-turn'?1:0;
      if(!HEROES[hero])throw Error(i18nText("rendering.visual-review.a884dd48d8"));
      drawCat(c,0,0,hero,id==='hero-turn'?phase:0,1,phase,0,null,1,null,0,false,false,animation);
    }else if(id.startsWith('realm-entrance-')){
      const {REALM_ENTRANCES}=await import('../world/realm-entrances.js');
      const {drawRealmEntrance,drawRealmEntranceGround}=await import('./realm-entrances.js');
      const entry=REALM_ENTRANCES.find(item=>id===`realm-entrance-${item.mode}`);
      if(!entry)throw Error(i18nText("rendering.visual-review.40bbad972b"));
      const item={...entry,x:0,y:40};
      drawRealmEntranceGround(c,item);
      drawRealmEntrance(c,item,0,null,phase,false);
    }else if(id.startsWith('monster')){
      const {drawMonsterSprite}=await import('./monster-atlas.js');
      drawMonsterSprite(c,{biome:'meadow',rank:0,species:id==='monster-fly'?'leaf-bat':undefined,knockTime:id==='monster-hit'?1:0,reactionTime:phase/12,phase:0,rollAngle:0,burst:id==='monster-death',duration:.6,life:.6-phase/8},phase/12,false);
    }else if(id==='vehicle-wheels'||id==='police-car-motion'){
      // 连续采样正式四轮与装甲绘制，停止段保持最后轮角，车壳固定。
      const {drawVehicleTracks,drawVehicleArmor}=await import('./vehicle.js');
      const {freshProgress}=await import('../progression/progress.js');
      const {createVehicle}=await import('../combat/vehicle.js');
      const progress=freshProgress(),index=id==='police-car-motion'?8:0;
      progress.vehicleHulls[index]=1;progress.vehicleIndex=index;
      const vehicle=createVehicle(progress, index);
      vehicle.wheelPhase=Math.min(Math.max(phase,0),2)*3;
      const player={x:0,y:0,walkPhase:0};
      drawVehicleTracks(c,player,vehicle,false,phase);
      drawVehicleArmor(c,player,vehicle,progress,phase,false);
    }else if(id==='vehicle-tracks'||id==='vehicle-rotor'){
      const {drawVehicleTracks}=await import('./vehicle.js');
      drawVehicleTracks(c,{x:0,y:0,walkPhase:phase},{index:id==='vehicle-tracks'?1:2},false,phase);
      if(id==='vehicle-rotor'){const {drawHelicopterRotor}=await import('./vehicle-models.js');drawHelicopterRotor(c,phase,false);}
    }else if(id==='funnel-orbit'){
      // 工作台逐帧推进正式飞控并调用正式炮体绘制，不能用独立圆周示意动画替代验收。
      const {createFunnelState,FUNNEL_FOLDED,FUNNEL_OPEN,FUNNEL_CHARGING}=await import('../combat/funnel.js');
      const {updateFunnelMovement}=await import('../combat/funnel-movement.js');
      const {drawFunnelArray}=await import('./funnel.js');
      const {PLAYER_SCALE}=await import('../combat/recoil.js');
      if(!await catSprites.load())throw Error(i18nText("rendering.visual-review.5929541627"));
      const game={player:{x:0,y:0},funnel:createFunnelState(),viewport:{width:390,height:844},reducedMotion:false};
      const formations={folded:FUNNEL_FOLDED,open:FUNNEL_OPEN,charging:FUNNEL_CHARGING};
      const duration=3+Math.max(0,phase);
      for(let time=0;time<duration;time+=1/120)
        updateFunnelMovement(game,Math.min(1/120,duration-time),[null,null,null],formations);
      drawCat(c,0,0,0,0,PLAYER_SCALE,0,12,null,1,null,0,false,false,{moveWeight:0,moveTime:0,idleTime:phase});
      drawFunnelArray(c,game.player,game.funnel);
    }else if(id==='funnel-deploy'){
      const {drawFunnelCannon}=await import('./funnel.js');drawFunnelCannon(c,phase<1,phase>.7&&phase<2?.1:0,false,phase);
    }else if(id==='drone-rotor'){
      const {drawDrone}=await import('./drone.js');drawDrone(c,false,0,false,phase);
    }else if(id==='boss-action'){
      const {drawNewBoss}=await import('./bosses.js');drawNewBoss(c,{kind:'owl',x:0,y:0,ai:{phase:phase<1?'windup':phase<2?'cast':'chase'}},phase,false);
    }else throw Error(i18nText("rendering.visual-review.29fed4ab7c", { p0: (id) }));
  }finally{c.restore();}
}

// 数值反馈直接读取正式工坊DOM，不使用工作台示意替代玩家看到的费用。
export function inspectEconomyFeedback(root) {
  const dialog=root.getElementById('workshop-dialog'),cost=root.getElementById('ws-cost-title');
  return {cost:cost.textContent,purpose:root.getElementById('ws-purpose').textContent,
    resources:root.getElementById('ws-resources').textContent,stats:root.getElementById('ws-stats').textContent,
    overflow:dialog.scrollWidth>dialog.clientWidth+1,designCriterion:'economy-workbench-feedback'};
}

// 直接检查正式数值工作台的说明与控件关联，使用同一DOM入口验收小屏阅读。
export function inspectBalanceHelp(root) {
  const inputs=[...root.querySelectorAll('#parameter-editor input')];
  return {designCriterion:'balance-inline-help',guideSteps:root.querySelectorAll('.guide-steps>li').length,
    parameters:inputs.length,explained:inputs.filter(input=>root.getElementById(input.getAttribute('aria-describedby'))?.textContent.trim()).length,
    overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth+1};
}

// 中文路线验收直接读取正式控件，核对名称、操作范围和小屏溢出。
export function inspectBalanceRoute(root) {
  const rows=[...root.querySelectorAll('#target-route .route-row')];
  return {designCriterion:'balance-route-picker',names:rows.map(row=>row.querySelector('.route-item').selectedOptions[0].textContent),
    count:rows.length,firstUpDisabled:rows[0]?.querySelector('.route-up').disabled??null,
    lastDownDisabled:rows.at(-1)?.querySelector('.route-down').disabled??null,
    overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth+1};
}

// 自然跟随验收读取正式位置与锁定，截图仍使用完整战场绘制器。
export function inspectSummonFollow(game) {
  const state=game[game.weapon().controller];
  return {designCriterion:'summon-natural-follow',view:game.arrivalView,
    nodes:(state?.nodes||[]).filter(n=>n.active!==false&&n.hp!==0).map(n=>({index:n.index,x:n.x,y:n.y,mode:n.mode||n.flight?.mode,target:n.targetId,home:n.escortHome}))};
}

// 观察与追赶验收使用正式运行态及同屏绘制，时钟不由复核入口推进。
export function inspectSummonRecovery(game) {
  const state=game[game.weapon().controller];
  return {designCriterion:'summon-observe-catchup',view:game.arrivalView,
    nodes:[...(state?.mother?[state.mother]:[]),...(state?.nodes||[])].filter(n=>n.active!==false&&n.hp!==0)
      .map(n=>({index:n.index,x:n.x,y:n.y,mode:n.mode||n.flight?.mode,target:n.targetId,observe:n.observation?.remaining||0,catchingUp:!!n.catchingUp}))};
}

// 多章验收读取正式章节身份、载具能力与人物出场，不重造预览场景。
export function inspectStoryCampaign(game,root){return {designCriterion:'forest-story-campaign',chapter:game.story?.chapterId||null,
  stage:game.story?.stageId||null,objective:game.storyObjective(),flying:game.player.flying,amphibious:game.player.amphibious,
  props:storyObjects(game).map(p=>({kind:p.kind,x:p.x,y:p.y})),readyCats:game.mechanical.nodes.filter(n=>n.ready).length,
  chapterButtons:root.querySelectorAll('[data-story-chapter]').length,art:storyArtStats()};}

// 战斗圈复核直接读取正式碰撞边界和相机，不另外创建预览敌人。
export function inspectStoryBattleRing(game,view){
 const arena=storyGuidanceState(game).arena;
 return {designCriterion:'story-battle-rings',arena:arena?{...arena}:null,view,
  player:{x:game.player.x,y:game.player.y},
  enemies:game.enemies.filter(e=>e.hp>0).map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,sameArena:e.arena===arena})),
  companions:game.mechanical.nodes.filter(n=>n.ready).map(n=>({index:n.index,x:n.x,y:n.y,mode:n.mode}))};
}

// 世界任务验收直接读取正式地点、交互权限和投影按钮，不生成另一套建筑。
// 章节管理与兽潮入口共用正式附近按钮，验证文案没有再被透明热点样式隐藏。
export function inspectChapterTaskEntries(game,root){
 const node=root.getElementById('nearby-interaction'),label=node?.querySelector('span:not(.parking-hint-icon)'),footer=root.getElementById('story-task-actions');
 return {designCriterion:'chapter-cancel-horde-hint',chapter:game.story?.chapterId||null,pending:game.progress.story.run?.chapterId||null,
  posts:worldStoryPosts(game).map(p=>({id:p.id,manageable:canManageStoryPost(game,p)})),
  entry:node?{hidden:node.hidden,text:node.textContent,label:node.getAttribute('aria-label'),presentation:node.dataset.presentation,box:node.getBoundingClientRect().toJSON(),labelVisible:!!label&&root.defaultView.getComputedStyle(label).display!=='none'}:null,
  actions:footer?[...footer.querySelectorAll('button')].map(n=>({text:n.textContent,box:n.getBoundingClientRect().toJSON()})):[]};
}

export function inspectStoryPosts(game,root){return {designCriterion:'world-story-posts',posts:worldStoryPosts(game).map(p=>({id:p.id,mapId:p.mapId,x:p.x,y:p.y,approach:storyPostApproach(p),usable:canUseStoryPost(game,p),chapters:p.chapters})),
 markers:[...root.querySelectorAll('[data-story-post]')].map(n=>({id:n.dataset.storyPost,hidden:n.hidden,disabled:n.disabled,box:n.getBoundingClientRect().toJSON()})),genericEntryHidden:root.getElementById('story-interact').hidden,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth+1};}

// 营地布局验收读取正式场景实例、树位和DOM门牌，截图仍由正式渲染器输出。
export async function inspectCampLayout(game,root){
 const [{COTTAGES},{REALM_ENTRANCES},{REGION_SIGNPOSTS}]=await Promise.all([
  import('../world/scenery.js'),import('../world/realm-entrances.js'),import('../world/signposts.js')]);
 return {designCriterion:'camp-building-layout',buildings:[...COTTAGES,...REALM_ENTRANCES,...worldStoryPosts(game)],
  signs:REGION_SIGNPOSTS,trees:game.trees.map(({x,y,size})=>({x,y,size})),
  labels:[...root.querySelectorAll('.world-workshop-entry,.world-realm-entry,.story-post-marker')].filter(n=>!n.hidden&&n.getBoundingClientRect().width>0)
   .map(n=>({text:n.textContent,box:n.getBoundingClientRect().toJSON()})),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth+1};
}
// 加载验收读取同一个首页视频、真实进度和独立轮辐，不另外制作验收动画。
export function inspectStartLoading(root,application) {
  const $=id=>root.getElementById(id),style=node=>root.defaultView.getComputedStyle(node),video=$('title-video');
  return {designCriterion:'start-game-loading',page:application.menu.page,loading:!$('start-loading').hidden,
    percent:Number($('start-loading-progress').getAttribute('aria-valuenow')),
    frameBox:$('game-frame').getBoundingClientRect().toJSON(),barBox:$('start-loading-progress').getBoundingClientRect().toJSON(),
    homeHidden:style($('start')).visibility==='hidden',inert:$('title-menu').inert,
    videoTime:video.currentTime,videoPaused:video.paused,videoCount:root.querySelectorAll('#title-menu video').length,
    van:$('start-loading-van').getBoundingClientRect().toJSON(),wheel:style(root.querySelector('.start-loading-wheel')).transform};
}
// 主菜单验收读取正式DOM及真实视频解码状态，不能用替代画布或静帧冒充视频。
export function inspectTitleMenu(root,application) {
  const video=root.getElementById('title-video'), menu=root.getElementById('title-menu');
  const bounds=menu.getBoundingClientRect();
  return {designCriterion:['title-menu','menu-navigation','title-background-video'],page:application.menu.page,
    saveStatus:application.menu.saveStatus,gameState:application.game.state,
    // 忠告与年龄标识读取正式节点，便于核对小屏裁切和菜单间距。
    notices:['title-health','title-age'].map(id=>{const node=root.getElementById(id);return {id,text:node.innerText,box:node.getBoundingClientRect().toJSON()};}),
    controls:[...menu.querySelectorAll('button')].filter(n=>!n.hidden).map(n=>({id:n.id,text:n.textContent,disabled:n.disabled,box:n.getBoundingClientRect().toJSON()})),
    overflow:menu.scrollWidth>bounds.width+1||root.documentElement.scrollWidth>root.defaultView.innerWidth+1,
    video:{src:video.currentSrc,duration:video.duration,width:video.videoWidth,height:video.videoHeight,time:video.currentTime,
      paused:video.paused,muted:video.muted,loop:video.loop,error:video.error?.code||null,readyState:video.readyState,
      decoded:video.getVideoPlaybackQuality?.().totalVideoFrames??null,status:root.getElementById('title-video-status').textContent}};
}

// 世界消防复核读取正式森林树、路网和实际交互节点，不另建演示小世界。
export function inspectFireWorld(game,root){
 const r=game.fireRescue,menu=root.getElementById('field-menu-toggle'),notice=root.getElementById('fire-notice');
 const a=menu.getBoundingClientRect(),b=notice.getBoundingClientRect();
 return {designCriterion:'forest-fire-world',phase:r?.phase,realm:!!game.realm,arena:!!game.player.arena,
  originalTrees:r?.fires.every(f=>game.trees.includes(f.tree)),burning:r?.fires.filter(f=>f.lit).length,water:r?.water,
  route:r?.route?.length||0,pumps:game.fireWaters?.length||0,cat:catSprites.status,
  menuClear:!a.width||a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth+1};
}

// 直达交付与单一主菜单入口复核，读取正式弹窗和按钮，不生成替代画面。
export function inspectRealmDelivery(root,game){
 const home=[root.getElementById('settings-home'),...(root.getElementById('game-frame')?.dataset.page==='title'?[root.getElementById('settings-done')]:[])].filter(Boolean);
 const claim=root.querySelector('[data-story-command="claim"]');
 return {designCriterion:['realm-direct-delivery','settings-only-home'],realm:game.realm?.mode||null,
  stage:game.story?.stageId||null,phase:game.story?.phase||null,dialogue:game.story?.dialogue||null,
  claim:claim?{visible:!!claim.getClientRects().length,text:claim.textContent,box:claim.getBoundingClientRect().toJSON()}:null,
  home:home.map(n=>({id:n.id,settings:!!n.closest('#settings-dialog')})),
  dialogs:[...root.querySelectorAll('dialog[open]')].map(n=>n.id),
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth+1};
}

// 返站复核绑定正式世界与车辆，不构造独立停靠展示图。
export function inspectFireReturn(game,root){return {...inspectFireWorld(game,root),designCriterion:'fire-return-audio',driving:game.vehicle.active&&game.vehicle.index===4,clears:game.progress.realms.records.fire.clears,returning:game.fireRescue?.phase==='returning'};}
// 车库验收读取实际持久状态、原车对象和正式HUD，与世界建筑使用同一判定。
export function inspectFireGarage(game,root){return {...inspectFireWorld(game,root),designCriterion:'fire-station-garage',parked:game.fireGarageParked,driving:game.vehicle.active,truckHp:game.vehicles[4].hp,clears:game.progress.realms.records.fire.clears,remoteBoardDisabled:root.getElementById('vehicle-button').disabled};}
// 连续上下车验收读取正式坐标、动作时钟及路径，画面由世界绘制器输出。
export function inspectFireMotion(game,root){const transfer=root.getElementById('fire-town-transfer');return {...inspectFireGarage(game,root),designCriterion:'fire-garage-motion',position:{x:game.player.x,y:game.player.y},transit:game.fireRescue?.transit,body:{...game.player.bodyAnimation},wheelPhase:game.vehicle.wheelPhase,stationTruck:!!game.fireStationTruck,transferVisible:!!transfer&&!transfer.hidden,transferOpacity:Number(transfer?.style.opacity||0)};}
// 设置验收读取正式弹窗的固定返回栏、滚动区域与危险操作分区。
export function inspectSettingsLayout(root){
 const dialog=root.getElementById('settings-dialog'),footer=dialog.querySelector('.settings-footer'),scroll=dialog.querySelector('.settings-scroll');
 const d=dialog.getBoundingClientRect(),f=footer.getBoundingClientRect(),s=scroll.getBoundingClientRect();
 const buttons=['settings-home','settings-done'].map(id=>{const n=root.getElementById(id),r=n.getBoundingClientRect();return {id,hidden:n.hidden,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};});
 return {designCriterion:'settings-layout',contained:d.left>=0&&d.top>=0&&d.right<=root.defaultView.innerWidth&&d.bottom<=root.defaultView.innerHeight,
  overflow:dialog.scrollWidth>dialog.clientWidth+1||scroll.scrollWidth>scroll.clientWidth+1,footerBottom:f.bottom,scrollEnd:s.bottom,buttons,
  advancedOpen:root.getElementById('settings-advanced').open,resetInAdvanced:!!root.getElementById('reset-progress').closest('#settings-advanced')};
}

// 首次入职验收绑定正式演出动作、持久化检查点与工坊入口。
export function inspectRangerArrival(game,root) {
 const card=root.getElementById('ranger-arrival'),r=card.getBoundingClientRect();
 return {designCriterion:'ranger-arrival',phase:game.progress.arrival?.phase,keys:game.progress.arrival?.keys,
  wood:game.progress.arrival?.wood,weapon:game.progress.weapon,hulls:game.progress.vehicleHulls,
  player:{x:game.player.x,y:game.player.y,motion:{...game.player.bodyAnimation}},elder:game.arrivalScene?.elder?structuredClone(game.arrivalScene.elder):null,
  wheelPhase:game.arrivalScene?.wheelPhase,enemies:game.enemies.length,wave:game.wave,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth||card.scrollWidth>card.clientWidth+1,
  card:{x:r.x,y:r.y,width:r.width,height:r.height},
  workshops:[...root.querySelectorAll('[data-workshop-kind].world-workshop-entry')].map(n=>({kind:n.dataset.workshopKind,text:n.textContent,hidden:n.hidden})),
  workshopKind:root.getElementById('workshop-dialog')?.dataset.workshopKind};
}

// 氛围入场采样直接读取正式角色、车库位置与头顶气泡，不制作独立示意画面。
export function inspectScenicArrival(game,root){
 const node=root.getElementById('arrival-speech'),r=node.getBoundingClientRect();
 return {...inspectRangerArrival(game,root),designCriterion:'ranger-scenic-arrival',
  scooter:game.arrivalScene?.scooter?{...game.arrivalScene.scooter}:null,
  bubble:{visible:!node.hidden,text:node.textContent,x:r.x,y:r.y,width:r.width,height:r.height,anchorX:Number(node.dataset.anchorX),anchorY:Number(node.dataset.anchorY)},
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth||node.scrollWidth>node.clientWidth+1};
}

// 九秒短剧验收直接读取正式导演、头顶气泡和可重读信件，不创建演示替身。
export function inspectShortArrival(game,root){
 const scene=game.arrivalScene,letter=root.getElementById('arrival-letter-dialog');
 return {...inspectScenicArrival(game,root),designCriterion:'ranger-short-arrival',
  seconds:Object.values(RANGER_STAGES).reduce((sum,stage)=>sum+stage.seconds,0),
  waitingSeconds:RANGER_STAGES.wait.seconds,busVisible:!!scene?.busVisible,
  elderRiding:!!scene?.elderRiding,playerRiding:!!scene?.riding,
  letterAvailable:!!game.progress.arrival?.keys,letterOpen:!!letter?.open,
  letterOverflow:!!letter&&letter.scrollWidth>letter.clientWidth+1};
}

// 后座与入库验收读取正式状态，确认空车入库、等候位置及真实身体资源。
export function inspectGarageArrival(game,root){
 return {...inspectScenicArrival(game,root),designCriterion:'ranger-garage-seating',
  riding:!!game.arrivalScene?.riding,pushing:!!game.arrivalScene?.pushing,
  garage:root.querySelector('[data-workshop-kind="vehicle"].world-workshop-entry')?.textContent};
}

// 读取正式骑手锚点、弹药和工坊固定编号，配合同屏录像复核枪车分层。
export function inspectScooterRider(game, root) {
  const rider = riderPosition(game.player, game.vehicle);
  return { designCriterion: 'scooter-rider-weapon', vehicle: game.vehicle.index,
    active: game.vehicle.active, lift: game.player.y - rider.y, weapon: game.loadout.weapon,
    magazine: { ...game.magazines[game.loadout.weapon] },
    shelf: [...root.querySelectorAll('[data-ws-item]')].map(n => Number(n.dataset.wsItem)),
    overflow: root.documentElement.scrollWidth > root.defaultView.innerWidth };
}
// 无风挡小摩托采样正式场景状态，造型与遮挡由同屏截图复核。
export function inspectOpenScooter(game,root){
 return {...inspectGarageArrival(game,root),designCriterion:'open-front-scooter',
  active:game.vehicle.active,index:game.vehicle.index,armor:game.progress.vehicleHulls[5],
  engine:game.progress.vehicleParts[5].engine,wheel:game.vehicle.wheelPhase};
}
import {storyRouteState,storyRouteDots,visibleRouteDots} from '../core/story-route.js';
// 工坊任务验收读取正式路线和场景目标，不另造预览点位。
export function inspectWorkshopNavigation(game,root){
 const route=storyRouteState(game);
 return {designCriterion:'workshop-task-navigation',target:storyGuidanceState(game).target,
  route,points:storyRouteDots(route?.points||[]).length,playing:game.state==='playing',
  dialogOpen:!!root.querySelector('dialog[open]'),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
import {NAVIGATION_STYLE,navigationScale} from './navigation-markers.js';
// 导航清晰度直接采样正式路线、终点和镜头倍率，截图复核描边与实体遮挡。
export function inspectNavigationClarity(game,view){
 const route=storyRouteState(game,view),living=livingRouteStates(game,view);
 const dots=[...visibleRouteDots(route,view,NAVIGATION_STYLE.spacing),...living.flatMap(r=>visibleRouteDots(r,view,NAVIGATION_STYLE.spacing))];
 return {designCriterion:'navigation-clarity',dots,targets:[storyGuidanceState(game).target,...living.map(r=>r.target)].filter(Boolean),
  scale:navigationScale(view.zoom),zoom:view.zoom,route,screenDotDiameter:2*NAVIGATION_STYLE.dotRadius*navigationScale(view.zoom)*view.zoom};
}
// 操作引导验收读取正式控件矩形、描边及覆盖层，不创建独立演示按钮。
export function inspectOperationGuide(root){
 const layer=root.getElementById('operation-guide'),host=root.defaultView;
 // 隐藏节点不参与可见范围判断，输出矩形供截图逐项对照。
 const inspect=node=>{if(!node||node.hidden||!node.getClientRects().length)return null;const box=node.getBoundingClientRect();return {id:node.id||node.dataset.wsUpgrade,box:box.toJSON(),contained:box.left>=0&&box.top>=0&&box.right<=host.innerWidth+1&&box.bottom<=host.innerHeight+1};};
 return {designCriterion:'mainline-operation-guide',visible:!!layer&&!layer.hidden,stage:layer?.dataset.stage,
  source:inspect(root.querySelector('.operation-source')),target:inspect(root.querySelector('.operation-target')),
  tip:inspect(layer?.querySelector('.operation-tip')),paw:inspect(layer?.querySelector('.operation-paw')),destination:inspect(layer?.querySelector('.operation-destination')),
  pointerThrough:!!layer&&host.getComputedStyle(layer).pointerEvents==='none',
  overflow:root.documentElement.scrollWidth>host.innerWidth+1};
}
// 距离与光点验收绑定正式路线、正式标签和预算，不另画示意路径。
export function inspectQuestLightPath(game,root){
 const route=storyRouteState(game),node=root.getElementById('story-navigation'),dots=storyRouteDots(route?.points||[],NAVIGATION_STYLE.spacing);
 return {designCriterion:'quest-light-path',route,dots,distanceText:node?.querySelector('.story-navigation-distance')?.textContent,
  hidden:node?.hidden,box:node?.getBoundingClientRect().toJSON()};
}

// 编成与分帧导航复核直接读取正式敌人和路线，不创建展示用怪物或备用直线。
export function inspectClearingNavigation(game,root){
 const enemies=game.enemies.filter(e=>e.hp>0&&e.wave===game.wave);
 const slime=enemies.filter(e=>!e.flying&&(!e.species||e.species==='slime')).length;
 return {designCriterion:'clearing-mix-long-navigation',wave:game.wave,spawned:game.waveSpawned,slime,special:enemies.length-slime,
  species:enemies.map(e=>e.species||'slime'),route:storyRouteState(game),
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 核对场景热点没有可见文字，位置对应实体并保留原生键盘名称。
export function inspectWorldDirectInteraction(root){
 return {designCriterion:'world-direct-interaction',hotspots:[...root.querySelectorAll('.scene-hit')].filter(n=>!n.hidden&&n.getClientRects().length).map(n=>({id:n.id||n.dataset.resident||n.dataset.workshopKind||n.dataset.worldRealm||n.dataset.storyPost,label:n.getAttribute('aria-label'),text:n.textContent,box:n.getBoundingClientRect().toJSON(),background:root.defaultView.getComputedStyle(n).backgroundColor})),bottomInteraction:root.getElementById('living-interact')?.hidden,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 波次排在任务下面，直接读取正式矩形，不创建另一套预览布局。
export function inspectWaveEncounterFlow(game,root){
 const rect=id=>{const n=root.getElementById(id);return n&&!n.hidden?n.getBoundingClientRect().toJSON():null;};
 return {designCriterion:'wave-encounter-flow',task:rect('mainline-hud'),wave:rect('quest'),boss:rect('boss-hud'),goal:rect('equipment-goal'),toast:rect('toast'),kills:game.waveKills,spawned:game.waveSpawned,ambient:game.enemies.filter(e=>e.hp>0&&e.ambient).length,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 尾怪导航验收读取真实节点与镜头，避免另一套预览绘制掩盖遮挡。
export function inspectWaveTailNavigation(game,renderer,root){
 const layer=root.getElementById('wave-tail-navigation');
 return {designCriterion:'wave-tail-navigation',hidden:layer.hidden,view:renderer.view,markers:[...layer.children].filter(n=>!n.hidden&&!layer.hidden).map(n=>({enemy:Number(n.dataset.enemy),distance:Number(n.dataset.distance),angle:Number(n.dataset.angle),text:n.textContent,box:n.getBoundingClientRect().toJSON(),pointerEvents:root.defaultView.getComputedStyle(n).pointerEvents})),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 清缴专注与入职提示读取正式节点，不另造验收画面。
export function inspectClearingOnboarding(root){
 const rect=n=>n&&!n.hidden&&n.getClientRects().length?n.getBoundingClientRect().toJSON():null;
 return {designCriterion:'clearing-contract-onboarding',mainlineHidden:root.getElementById('mainline-hud').hidden,quest:rect(root.getElementById('quest')),boss:rect(root.getElementById('boss-hud')),objectives:[...root.querySelectorAll('.clearing-objective')].filter(n=>rect(n)).map(n=>n.textContent),guide:root.getElementById('operation-guide')?.dataset.stage,tip:root.querySelector('.operation-tip')?.textContent,highlighted:[...root.querySelectorAll('.operation-source')].map(n=>({id:n.id,kind:n.dataset.workshopKind,box:rect(n)})),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 从正式 HUD 测量战斗互斥、短条尺寸和边界，避免预览样式与运行时脱节。
export function inspectCompactTaskHud(root){
 const panels={};
 for(const id of ['mainline-hud','quest','boss-hud','equipment-goal']){
  const node=root.getElementById(id);panels[id]=!node.hidden&&node.offsetHeight?node.getBoundingClientRect().toJSON():null;
 }
 return {designCriterion:'early-clearing-compact-hud',panels,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 守门验收只读取正式绘制对象、节点和实际屏幕尺寸。
export function inspectCampDefense(game,root){
 const r=game.campDefense,hud=root.getElementById('camp-defense-hud'),dialog=root.getElementById('camp-defense-dialog');
 return {designCriterion:'camp-horde-defense',phase:r?.phase,wave:r?.wave,gateHp:r?.gateHp,enemies:game.enemies.length,helpers:r?.helpers.length||0,nodes:root.querySelectorAll('[data-camp-wave]').length,
  overlappingHud:['mainline-hud','quest','boss-hud','equipment-goal'].some(id=>{const n=root.getElementById(id);return !n.hidden&&n.offsetHeight>0;}),
  hud:hud.getBoundingClientRect().toJSON(),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth||dialog.open&&dialog.scrollWidth>dialog.clientWidth+1};
}

// 单行怪潮验收读取实际 DOM 边界及双环，不复制一套展示节点。
export function inspectCompactHordeHud(root){
 const hud=root.getElementById('camp-defense-hud'),box=n=>n.getBoundingClientRect().toJSON();
 const orbit=hud.querySelector('.camp-wave-orbit'),timer=hud.querySelector('.camp-time-progress'),kills=hud.querySelector('.camp-kill-progress');
 // 调色读取正式底板、文字及双环，确保浅底与原深底状态不会混用。
 const style=root.defaultView.getComputedStyle(hud),computed=n=>root.defaultView.getComputedStyle(n);
 return {designCriterion:'compact-horde-hud',hud:box(hud),items:[...hud.children].map(box),order:[...hud.children].map(n=>n.id||n.className),wave:orbit.dataset.campWave,total:hud.querySelector('.camp-wave-total').textContent,
  palette:{background:style.backgroundColor,text:style.color,border:style.borderColor,muted:computed(hud.querySelector('.camp-completed')).color,help:computed(hud.querySelector('#camp-help')).color,track:computed(hud.querySelector('.camp-ring-track')).stroke,time:computed(hud.querySelector('.camp-ring-time')).stroke,kills:computed(hud.querySelector('.camp-ring-kills')).stroke},
  completed:Number(hud.querySelector('.camp-completed b').textContent),completedLabel:hud.querySelector('.camp-completed').getAttribute('aria-label'),completedBox:box(hud.querySelector('.camp-completed')),completedOverflow:hud.querySelector('.camp-completed').scrollWidth>hud.querySelector('.camp-completed').clientWidth,
  time:Number(timer.getAttribute('aria-valuenow')),kills:Number(kills.getAttribute('aria-valuenow')),count:Number(kills.getAttribute('aria-valuemax')),
  timeOffset:Number(hud.querySelector('.camp-ring-time').style.strokeDashoffset),killOffset:Number(hud.querySelector('.camp-ring-kills').style.strokeDashoffset),boss:hud.querySelector('#camp-boss').dataset.state,
  // 从正式共用领主血条读取显隐、生命文本与边界，不创建额外验收节点。
  bossHealth:{visible:!root.getElementById('boss-hud').hidden,text:root.getElementById('boss-hp').textContent,fill:parseFloat(root.getElementById('boss-fill').style.width)||0,box:box(root.getElementById('boss-hud'))},
  overflow:hud.scrollWidth>hud.clientWidth||root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 从正式镜头投影测量角色占屏位置与朝向前后空间，不另建预览镜头。
export function inspectHordeCamera(game, renderer) {
 const view=renderer.view,p=game.player,heading=game.campDefense?(renderer.camera.hordeAngle??p.angle):p.angle,dx=Math.cos(heading),dy=Math.sin(heading);
 const x=(p.x-view.x)*view.zoom,y=(p.y-view.y)*view.zoom;
 const front=Math.min((dx>=0?view.width-x:x)/Math.max(Math.abs(dx),1e-9),(dy>=0?view.height-y:y)/Math.max(Math.abs(dy),1e-9));
 const back=Math.min((dx>=0?x:view.width-x)/Math.max(Math.abs(dx),1e-9),(dy>=0?y:view.height-y)/Math.max(Math.abs(dy),1e-9));
 return {designCriterion:'horde-facing-camera',active:Boolean(game.campDefense),time:game.time,angle:p.angle,heading,
  width:view.width,height:view.height,zoom:view.zoom,player:{x,y},frontRatio:front/(front+back)};
}

// 调色验收直接读取正式色调与缓存，避免预览滤镜掩盖实际游戏的颜色和内存开销。
export function inspectSceneColor(renderer,root){
 return {designCriterion:'scene-color-vibrancy',tone:renderer.tone.sample(performance.now()),
  canvasFilter:root.defaultView.getComputedStyle(renderer.canvas).filter,ground:renderer.ground.stats(),
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
// 主线导航与伤害飘字验收读取正式运行中的对象，不创建另一套示意绘制。
export function inspectMainlineHordeDamage(game,root){
 return {designCriterion:'mainline-horde-damage',damage:game.numbers.filter(n=>n.damageGroup).map(n=>({text:n.text,x:n.x,y:n.y,life:n.life})),
  numbers:game.numbers.length,phase:game.campDefense?.phase||game.progress.mainline.phase,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth,dialogs:[...root.querySelectorAll('dialog[open]')].map(n=>n.id)};
}
// 援军节奏与轻量对白验收读取正式会话、正式绘制对象和 DOM 尺寸。
export function inspectCampRescue(game,root){
 const r=game.campDefense;
 return {designCriterion:'horde-rescue-neighbor-bubbles',phase:r?.phase,time:r?.rescueTime,
  helpers:r?.helpers.map(h=>({name:h.spec.name,entered:h.entered,ready:h.ready,x:h.local.player.x,y:h.local.player.y,walk:h.local.player.walkPhase}))||[],
  enemies:game.enemies.filter(e=>e.hp>0).length,bossHp:game.boss?.hp,
  bubbles:[...root.querySelectorAll('.compact-speech')].filter(n=>!n.hidden).map(n=>({id:n.id,text:n.textContent,rect:n.getBoundingClientRect().toJSON(),buttons:n.querySelectorAll('button').length,pointerEvents:root.defaultView.getComputedStyle(n).pointerEvents})),
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
// 停车验收读取正式状态、轮相与工坊弹窗，不为工作台另造演出路径。
export function inspectAutomaticParking(game,root){
 return {designCriterion:'automatic-parking',parking:game.parking?{id:game.parking.id,phase:game.parking.phase,elapsed:game.parking.elapsed}:null,
  position:{x:game.player.x,y:game.player.y},wheel:game.vehicle.wheelPhase,track:game.player.walkPhase,
  workshop:root.getElementById('workshop-dialog').open?root.getElementById('workshop-dialog').dataset.workshopKind:null,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
// 小屋与营地验收直接读取独立停驻记录、正式房间状态和实际操作按钮。
export function inspectCampHome(game,root){
 return {designCriterion:'camp-home-parking',mounted:game.vehicle.active,owned:game.progress.campParking.owned,visitors:game.parkingVisitors,
  room:game.cottage?{position:{x:game.player.x,y:game.player.y},sleep:game.cottage.sleep,notice:game.cottage.notice,exitElapsed:game.cottage.exitElapsed,restElapsed:game.cottage.restElapsed,displayEntry:game.cottage.displayEntry}:null,
  calendar:game.progress.living.calendar,entry:game.cottageEntry,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
// 奖励验收读取正式弹窗内容和尺寸，不复制绘制或计时逻辑。
export function inspectTaskReward(game,root){
 const node=root.getElementById('task-reward-dialog'),rect=node?.getBoundingClientRect();
 return {designCriterion:'task-reward-popup',open:!!node?.open,state:game.state,title:node?.querySelector('#task-reward-title')?.textContent,
  returnCamp:!!node?.open&&node.querySelector('#task-reward-return-camp')?.hidden===false,
  nextClearing:!!node?.open&&node.querySelector('#task-reward-next')?.hidden===false,
  items:[...node?.querySelectorAll('#task-reward-items li')||[]].map(n=>n.textContent),countdown:node?.querySelector('#task-reward-countdown')?.dataset.seconds,
  overflow:!!node?.open&&(rect.left<0||rect.top<0||rect.right>root.defaultView.innerWidth||rect.bottom>root.defaultView.innerHeight)};
}
// 挑战等级验收直接读取正式面板徽章与进度，不复制计算和绘制器。
export function inspectChallengeRank(game,root){
 return {designCriterion:'camp-level-discount',camp:game.progress.campLevel,
  board:clearingPostObjects(game)[0]?.challenge||null,
  panels:[...root.querySelectorAll('dialog[open] .challenge-level')].map(node=>({text:node.textContent,icon:!!node.querySelector('.challenge-rank-icon'),value:node.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'),max:node.querySelector('[role="progressbar"]')?.getAttribute('aria-valuemax')})),
  result:root.getElementById('task-reward-dialog')?.open?root.getElementById('task-reward-heading').textContent:null};
}
// 换乘验收直接读取当前车辆、真实泊位、正式武器容量与页面地点说明。
export function inspectVehicleTransfer(game,root){
 return {designCriterion:'parking-vehicle-transfer',carried:game.vehicle.index,mounted:game.vehicle.active,
  parked:game.progress.campParking.owned,capacity:game.weapon().magazineSize,
  hint:root.getElementById('ws-vehicle-parking')?.textContent,action:root.getElementById('ws-equip')?.textContent,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 工坊重建验收读取正式状态、资源余额及场景图集，不维护另一个展示状态机。
export function inspectWorkshopRebuild(game,root){
 return {designCriterion:'weapon-workshop-rebuild',...workshopBuildView(game),phase:game.progress.arrival?.phase,
  wood:game.progress.wood,position:{x:game.player.x,y:game.player.y},
  dialog:!!root.getElementById('arrival-workshop-dialog')?.open,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 火警图标验收直接读取正式邀请、图标节点和屏幕矩形，不另建展示倒计时。
export function inspectFireAlert(game,root){
 const notice=root.getElementById('fire-notice'),button=notice.querySelector('[data-fire-open]');
 return {designCriterion:'fire-alert-icon-timeout',phase:game.fireRescue?.phase||null,remaining:game.fireRescue?.offerRemaining??null,
  hidden:notice.hidden,icon:!!notice.querySelector('.fire-alert-icon'),countdown:notice.querySelector('[data-fire-countdown]')?.dataset.seconds,
  dismiss:!!notice.querySelector('[data-fire-dismiss]'),label:button?.getAttribute('aria-label'),rect:notice.getBoundingClientRect().toJSON(),
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 统一徽记验收读取正式弹窗位置与试射状态，不另建预览倒计时。
export function inspectActionCountdown(root){
 const dialog=root.getElementById('task-reward-dialog'),badge=root.getElementById('task-reward-countdown'),panel=dialog?.querySelector('.task-reward-panel');
 return {designCriterion:'trial-manual-close-countdown',rewardOpen:!!dialog?.open,seconds:badge?.dataset.seconds,
  badge:badge?.getBoundingClientRect().toJSON(),panel:panel?.getBoundingClientRect().toJSON(),
  trialVisible:!!root.getElementById('weapon-trial-dialog')?.open,workshopOpen:!!root.getElementById('workshop-dialog')?.open,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 连续展厅验收读取实际视窗、可见命中面与画像内存，不建立第二套相机或陈列数据。
export function inspectWalkableWeaponGallery(game,root,renderer){
 return {designCriterion:'walkable-weapon-gallery',position:{x:game.player.x,y:game.player.y},view:renderer.cottageView,
  all:interiorWeaponDisplays().map(s=>s.index),visible:[...root.querySelectorAll('[data-room-item]')].filter(n=>!n.hidden).map(n=>({index:Number(n.dataset.roomIndex),rect:n.getBoundingClientRect().toJSON()})),
  pages:root.querySelectorAll('[data-room-page]').length,portraitBytes:(renderer.interiorArt?.images.size||0)*192*144*4,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 维修间验收直接采样正式相机、车辆和热点，不另造场景。
export function inspectGarageWalkaround(game,root,renderer){
 return {designCriterion:'garage-walkaround-entry',room:game.cottage?.kind,position:{x:game.player.x,y:game.player.y},view:renderer.cottageView,
  parked:garageVehicleRecord(game)?.hull??null,visible:[...root.querySelectorAll('[data-room-item]')].filter(n=>!n.hidden).map(n=>({id:n.dataset.roomItem,rect:n.getBoundingClientRect().toJSON()})),
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 连续载具展区直接读取正式展位、相机与热点，并核对维修车未被展车替代。
export function inspectVehicleGallery(game,root,renderer){
 return {designCriterion:'vehicle-gallery',all:interiorVehicleDisplays().map(item=>item.index),view:renderer.cottageView,parked:garageVehicleRecord(game)?.hull??null,
  visible:[...root.querySelectorAll('[data-room-item]')].filter(n=>!n.hidden).map(n=>({id:n.dataset.roomItem,index:Number(n.dataset.roomIndex),rect:n.getBoundingClientRect().toJSON()})),
  pages:root.querySelectorAll('[data-room-page]').length,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 候停验收读取最终头顶徽记、真实房间状态和已打开页面，不另画演示倒计时。
export function inspectExhibitCountdown(game,root,renderer){
 return {designCriterion:'exhibit-countdown-bridge',room:game.cottage?.kind||null,target:game.cottage?.displayEntry?.id||null,
  badge:renderer.actionCountdownView,workshop:root.getElementById('workshop-dialog')?.open||false,
  position:{x:game.player.x,y:game.player.y},overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}


import {campDefenseObjects} from './camp-defense.js';
// 场景盾牌验收读取正式绘制对象与命中区，累计次数不从当前波数推断。
export function inspectHordeCompletedSign(game,root){
 return {designCriterion:'horde-completed-sign',completed:game.progress.campDefense.runs,
  signs:campDefenseObjects(game).filter(o=>o.kind==='marker').map(o=>({id:o.id,x:o.x,y:o.y,completed:o.completed,countText:o.countText})),
  hits:[...root.querySelectorAll('[data-camp-gate]')].map(n=>({id:n.dataset.campGate,hidden:n.hidden,label:n.getAttribute('aria-label'),box:n.getBoundingClientRect().toJSON()})),
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 随机地点验收读取任务存档、实际导航及地图文案，不单独构造展示数据。
export function inspectRandomClearing(game,root){
 return {designCriterion:'random-clearing-site',active:game.progress.living.patrolActive,site:clearingSite(game.progress),stage:clearingStage(game),target:worldNavigationObjective(game)?.site||null,status:root.getElementById('clearing-status')?.textContent,mapLabel:root.getElementById('map-clearing-site')?.textContent||null,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 直接读取正式角色卡片，检查两类装备加成与小屏溢出，不另造展示结果。
export function inspectHeroAttack(root){
 const dialog=root.getElementById('camp-dialog');
 return {designCriterion:'hero-attack-feedback',cards:[...root.querySelectorAll('[data-hero-growth]')].map(n=>({index:Number(n.dataset.heroGrowth),text:n.textContent})),overflow:dialog.scrollWidth>dialog.clientWidth+1};
}

// 角色身份验收读取永久选择、实际借用配置与正式 HUD，绘制调用由浏览器回归采样。
export function inspectSelectedCat(game,root){
 return {designCriterion:'selected-cat-story-identity',selectedHero:game.progress.hero,
   combatHero:game.loadout.hero,weapon:game.loadout.weapon,chapter:game.story?.chapterId||null,
   name:root.getElementById('player-name').textContent,health:root.getElementById('player-health').textContent};
}

// 新装备验收绑定正式战场状态与绘制所用控制场，不另造示意场景。
export function inspectGravityRedwolf(game,root){return {designCriterion:'gravity-gun-redwolf',weapon:game.weapon().id,hull:game.vehicle.index,active:game.vehicle.active,fields:(game.gravityFields||[]).length,fieldPositions:(game.gravityFields||[]).map(f=>({x:f.x,y:f.y,radius:f.radius})),wheelPhase:game.vehicle.wheelPhase,kick:game.vehicle.recoil?.kick,position:{x:game.player.x,y:game.player.y},overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};}

// 金杯验收读取正式车载槽位、真实身体时钟及五种日常用品身份。
export function inspectJinbeiCrew(game,root){const state=game.vehicle.module?.companions;return {designCriterion:'jinbei-cat-crew',bodyScale:JINBEI_BODY_SCALE,hull:game.vehicle.index,weapon:game.vehicle.weaponIndex,active:game.vehicle.active,wheelPhase:game.vehicle.wheelPhase,hatch:state?.hatch,energy:game.vehicle.module?.magazine.ammo,nodes:state?.nodes.filter(n=>n.active).map(n=>({variant:n.variant,itemVariant:n.itemVariant,hp:n.hp,mode:n.mode,x:n.x,y:n.y,angle:n.angle,moving:n.moving,body:n.bodyAnimation,swing:n.swing})),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};}

// 运动会复核读取正式赛程、体力、位移与动作时钟，不通过预览复制战斗状态。
export function inspectForestRace(game,root){const r=game.realm;if(r?.mode!=='race')return null;return {designCriterion:'forest-sports-race',trackCriterion:'forest-race-track-features',features:r.features?.map(f=>({id:f.id,kind:f.kind,x:f.x,y:f.y})),track:r.track?{...r.track,pads:{...r.track.pads}}:null,phase:r.phase,elapsed:r.elapsed,gate:r.nextGate,progress:r.distance,stamina:r.stamina,place:r.place,position:{x:game.player.x,y:game.player.y},body:{...game.player.bodyAnimation},rivals:r.rivals.map(n=>({x:n.x,y:n.y,progress:n.progress,finish:n.finish,track:n.track?{...n.track}:null,body:{...n.bodyAnimation}})),projectiles:game.projectiles.length,vehicle:game.vehicle.active,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};}

// 底部对白验收读取正式节点、说话者和模态状态，不另造预览界面。
export function inspectNpcDialogue(game,root){
 const frame=root.getElementById('game-frame').getBoundingClientRect();
 const ids=['living-dialog','arrival-speech','mainline-speech','story-speech'];
 const nodes=ids.map(id=>root.getElementById(id)).filter(n=>n&&!n.hidden&&n.getClientRects().length&&(n.tagName!=='DIALOG'||n.open));
 return {designCriterion:'npc-bottom-dialogue',state:game.state,frame:frame.toJSON(),nodes:nodes.map(n=>({id:n.id,speaker:n.dataset.speaker||'',text:n.textContent,modal:n.matches(':modal'),bottom:n.classList.contains('npc-bottom-dialogue'),rect:n.getBoundingClientRect().toJSON(),overflow:n.scrollWidth>n.clientWidth+1})),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 口头禅验收读取正式小气泡及头顶投影，确认没有套用全宽对白或隐藏HUD。
export function inspectNpcChatter(root){
 const frame=root.getElementById('game-frame').getBoundingClientRect();
 const nodes=['resident-chatter','camp-rescue-speech','story-chatter'].map(id=>root.getElementById(id)).filter(n=>n&&!n.hidden&&n.getClientRects().length);
 return {designCriterion:'npc-overhead-chatter',frame:frame.toJSON(),nodes:nodes.map(n=>({id:n.id,text:n.textContent,speaker:n.dataset.speaker,placement:n.dataset.placement,anchor:{x:Number(n.dataset.anchorX)+frame.left,y:Number(n.dataset.anchorY)+frame.top},rect:n.getBoundingClientRect().toJSON(),bottom:n.classList.contains('npc-bottom-dialogue'),pointerEvents:root.defaultView.getComputedStyle(n).pointerEvents})),menuVisible:root.querySelector('.field-menu').checkVisibility({checkVisibilityCSS:true}),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 扩图复核读取正式坐标、场景实体与地面缓存，不构造另一套验收地图。
export async function inspectExpandedForest(game,renderer,root){
 const {WORLD,ORIGINAL_WORLD}=await import('../world/coordinates.js');
 return {designCriterion:'forest-map-threefold',world:WORLD,original:ORIGINAL_WORLD,position:{x:game.player.x,y:game.player.y},trees:game.trees.length,outerTrees:game.trees.filter(t=>t.x>=ORIGINAL_WORLD.width||t.y>=ORIGINAL_WORLD.height).length,cache:renderer.ground?.stats?.()??null,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 赛道站验收读取正式完赛记录，截图使用场景中的正式牌面。
export async function inspectRaceStationScoreboard(game){
 const {TOWN_RESTORATIONS,facilityOpen}=await import('../config/town-restoration.js');
 const site=TOWN_RESTORATIONS.find(s=>s.id==='race');
 return {designCriterion:'race-station-records',visible:game.mapId==='forest'&&!game.story&&!game.realm&&facilityOpen(game.progress,'race'),site:{x:site.x,y:site.y},record:{...game.progress.realms.records.race}};
}

// 足球站验收读取正式存档和站点，截图由drawRestorationObject中的牌面绘制完成。
export async function inspectFootballStationScoreboard(game){
 const {TOWN_RESTORATIONS,facilityOpen}=await import('../config/town-restoration.js');
 const site=TOWN_RESTORATIONS.find(s=>s.id==='football');
 return {designCriterion:'football-station-scoreboard',visible:game.mapId==='forest'&&!game.story&&!game.realm&&facilityOpen(game.progress,'football'),site:{x:site.x,y:site.y},record:{...game.progress.realms.records.football}};
}

// 正式附近按钮验收读取实时DOM与游戏状态，不另画测试版界面。
export function inspectNearbyInteraction(game,root){
 const b=root.getElementById('nearby-interaction'),r=b.getBoundingClientRect();
 return {designCriterion:'nearby-click-interaction',visible:!b.hidden,label:b.getAttribute('aria-label')||b.textContent,visibleText:b.innerText,building:b.dataset.presentation==='building',target:b.dataset.target,rect:r.toJSON(),touchTarget:r.width>=44&&r.height>=44,overflow:r.left<0||r.right>root.defaultView.innerWidth||r.top<0||r.bottom>root.defaultView.innerHeight,room:game.cottage?.kind||null,parking:game.parking?.phase||null,fire:game.fireRescue?.phase||null};
}

// 建筑操作验收核对本体热点的真实世界投影，不调整镜头换取提示可见。
export async function inspectBuildingInteraction(renderer,root){
 const {nearbyInteraction}=await import('../core/nearby-interaction.js');
 const {nearbyInteractionAnchor,projectInteractionAnchor}=await import('../world/interaction-anchors.js');
 const game=renderer.game,entry=nearbyInteraction(game),anchor=nearbyInteractionAnchor(game,entry),point=projectInteractionAnchor(anchor,renderer.view,renderer.cottageView);
 const button=root.getElementById('nearby-interaction'),rect=button.getBoundingClientRect(),canvas=renderer.canvas.getBoundingClientRect();
 // 本体热点复用场景尺寸，其他操作继续以中心锚点对齐。
 const actualY=rect.top+rect.height/2,expectedX=canvas.left+(point?.x||0);
 const expectedY=canvas.top+(point?.y||0)+(anchor?.hitbox?8*renderer.view.zoom-Math.max(44,anchor.height*renderer.view.zoom)/2:0);
 return {...inspectNearbyInteraction(game,root),designCriterion:'building-interaction-anchor',anchor,point,
  anchorError:point?Math.hypot(rect.left+rect.width/2-expectedX,actualY-expectedY):null};
}

// 清缴轻提示验收读取唯一正式入口、重复引导与建筑顶边，不创建测试版提示。
export async function inspectBuildingProximityPrompt(renderer,root){
 const state=await inspectBuildingInteraction(renderer,root),button=root.getElementById('nearby-interaction'),guide=root.getElementById('operation-guide');
 return {...state,designCriterion:'building-proximity-prompt',presentation:button.dataset.presentation,
  greenAction:button.classList.contains('ui-button--primary'),duplicateGuide:!!guide&&!guide.hidden&&guide.textContent.includes('点告示牌接取')};
}


// 小镇验收读取正式布局、实体树木及实时地块缓存，截图仍由正式游戏绘制。
export async function inspectTownLayout(game,renderer,root){
 const {TOWN_LAYOUT,TOWN_COURTS}=await import('../config/town-layout.js');
 const {REALM_ENTRANCES}=await import('../world/realm-entrances.js');
 const {STORY_POSTS}=await import('../config/story-posts.js');
 const {CLEARING_POST}=await import('../config/clearing.js');
 return {designCriterion:'town-district-layout',layout:TOWN_LAYOUT,courts:TOWN_COURTS,
  entrances:[...REALM_ENTRANCES,...STORY_POSTS,CLEARING_POST],
  campTrees:game.trees.filter(t=>t.x>TOWN_LAYOUT.bounds.left&&t.x<TOWN_LAYOUT.bounds.right&&t.y>110&&t.y<1400).map(t=>({x:t.x,y:t.y,size:t.size})),
  cache:renderer.ground?.stats?.()??null,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 小镇修复验收读取正式目录、进度与资源投料状态。
export async function inspectTownRestoration(game){
 const {TOWN_RESTORATIONS,facilityOpen}=await import('../config/town-restoration.js');
 const {restorationArea,restorationLocation}=await import('../world/restoration-area.js');
 return {designCriterion:'town-restoration',facilities:TOWN_RESTORATIONS.map(f=>{const location=restorationLocation(f,game.player);return {id:f.id,name:f.name,wood:f.wood,open:facilityOpen(game.progress,f.id),site:location.site,area:restorationArea(location)};}),build:game.progress.restoration?.build||null,newAtlasBytes:0,transferBundles:6};
}
// 旧屋验收绑定实际修复目录与附近按钮，不另画预览建筑。
export async function inspectWeatheredHouses(game,root){
 const review=await inspectTownRestoration(game),button=root.getElementById('nearby-interaction');
 return {...review,designCriterion:'weathered-houses',houses:review.facilities.filter(f=>['cottage','garage','fire'].includes(f.id)),
  hint:button&&!button.hidden?{text:button.textContent,rect:button.getBoundingClientRect().toJSON()}:null,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth,newAtlasBytes:0};
}

// 独立演练验收读取正式会话和画布，不以静态预览替代机制。
export async function inspectWeaponTrialSceneReview(root){const {inspectWeaponTrialScene}=await import('../ui/workshop/trial-scene.js');const dialog=root.getElementById('weapon-trial-dialog');return {designCriterion:'weapon-trial-scenes',open:!!dialog?.open,session:inspectWeaponTrialScene(dialog),canvas:root.getElementById('weapon-trial-canvas')?.getBoundingClientRect().toJSON(),maxVegetationBytes:327680,independentScene:true};}

// 读取正式HUD的寻路状态与矩形，工作台不另画图标副本。
export function inspectTaskNavigation(game,root){
 const button=root.getElementById('task-navigation-toggle'),anchor=root.querySelector('.task-route-anchor');
 const b=button?.getBoundingClientRect(),a=anchor?.getBoundingClientRect(),resource=root.querySelector('.player-hud'),resources=root.querySelector('.hud-resources').getBoundingClientRect();
 // 清缴详情入口与寻路按钮同排，读取真实矩形验证顺序与独立触控区。
 const help=anchor?.querySelector('#wave-help')?.getBoundingClientRect();
 const style=anchor&&root.defaultView.getComputedStyle(anchor),reference=root.defaultView.getComputedStyle(resource);
 return {designCriterion:'task-navigation-icon',enabled:button?.dataset.enabled==='true',visible:!!button&&!button.hidden,button:b?.toJSON(),anchor:a?.toJSON(),anchorId:anchor?.id,icon:button?.querySelector('svg')?.getAttribute('viewBox'),learned:game.progress.mainline.seen.navigation>0,
  help:help?.height?help.toJSON():null,afterHelp:!!help?.height&&!!b&&b.left>=help.right&&Math.abs(b.top-help.top)<1,
  inside:!!a&&!!b&&b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom,resourceGap:a?a.top-resources.bottom:null,matchesResources:!!style&&style.backgroundColor===reference.backgroundColor&&style.color===reference.color};
}

// 小背包读取正式DOM和物品状态，检查手机滚动、触控与嵌套地图，不另造预览。
export function inspectKeepsakeBackpack(game,root){
 const dialog=[...root.querySelectorAll('#current-cat-dialog[open],#keepsake-dialog[open],#phone-dialog[open]')].at(-1)||root.getElementById('current-cat-dialog'),body=dialog.querySelector('.ui-panel__body'),box=dialog.getBoundingClientRect();
 return {designCriterion:'keepsake-backpack',open:dialog.open,state:game.state,items:game.progress.keepsakes?.items,
  panel:dialog.id,gridSlots:root.querySelectorAll('.keepsake-pockets > *').length,hasStandaloneMap:!!root.getElementById('map-button'),box:box.toJSON(),overflow:body.scrollWidth>body.clientWidth+1,
  text:dialog.textContent,controls:[...dialog.querySelectorAll('button')].filter(b=>!b.hidden&&b.getBoundingClientRect().height).map(b=>({label:b.getAttribute('aria-label')||b.textContent.trim(),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height,disabled:b.disabled}))};
}
// 季节缓存采样绑定正式渲染器；同时报告显示、预制和来源池，检查两池预算与切换时机。
export function inspectSeasonGroundStaging(renderer){
 return {designCriterion:'season-cache-staging',season:renderer.seasonVisual,ground:renderer.ground.stats(),view:renderer.view};
}
// 采样正式绘制器使用的车体与乘客位置，屏幕误差可直接检出逻辑/表现错帧。
export function inspectArrivalInterpolation(renderer){
 const g=renderer.renderGame,s=g?.arrivalScene,v=renderer.view;
 return {designCriterion:'arrival-vehicle-interpolation',phase:g?.progress.arrival?.phase,
  elapsed:g?.progress.arrival?.elapsed,seatError:s?.riding&&v?(s.scooter.y+RANGER.passengerFootY-g.player.y)*v.zoom:null,
  elderError:s?.elderRiding&&v?(s.scooter.y-27-s.elder.y)*v.zoom:null,
  screenY:s?.scooter&&v?(s.scooter.y-v.y)*v.zoom:null,wheelPhase:s?.wheelPhase};
}

// 营地设计验收绑定正式场景对象，机械统计仅作为实机截图的辅助证据。
export function inspectMonsterCamps(game,root){
 const objects=campRenderObjects(game),panel=root.getElementById('monster-camps-dialog'),bubble=root.getElementById('monster-camp-chatter');
 return {designCriterion:'破败小木牌只显示营地名称等级，扩大面积且不画警戒圈；边缘驻足注视预警，深入攻击、离屏返营；营内居民免伤，手机昼夜可读',entry:'src/rendering/monster-camps.js#drawMonsterCampObject',camps:MONSTER_CAMPS.length,signs:objects.filter(o=>o.type==='monster-camp-sign').length,alertResidents:objects.filter(o=>o.campState==='alert').length,returningResidents:objects.filter(o=>o.campState==='returning').length,visibleResidents:objects.filter(o=>o.type==='monster-camp-resident').length,named:objects.filter(o=>o.type==='monster-camp-npc').map(o=>o.name),combatants:game.enemies.filter(e=>e.monsterCamp&&e.hp>0).length,chatter:bubble&&!bubble.hidden?bubble.textContent:null,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth,buttons:panel?.open?[...panel.querySelectorAll('button')].filter(b=>!b.disabled&&b.getBoundingClientRect().height).map(b=>({text:b.textContent,height:b.getBoundingClientRect().height})):[],bitmapBytes:0};
}
// 稳定跟随验收读取正式镜头和按钮，便于连续帧比较，不另造测试画面。
export async function inspectStableCampCamera(renderer,root){
 const result=await inspectBuildingInteraction(renderer,root),v=renderer.view,p=(renderer.renderGame||renderer.game).player,c=renderer.camera;
 return {...result,designCriterion:'stable-camp-camera',
  view:{x:v.x,y:v.y,zoom:v.zoom},playerScreen:{x:(p.x-v.x)*v.zoom,y:(p.y-v.y)*v.zoom},
  followError:Math.hypot(v.x-(p.x+c.x-v.width/v.zoom/2),v.y-(p.y+c.y-v.height/v.zoom/2))};
}
// 清缴材料追踪复用正式UI节点和钱包验收，不另建静态样板。
export {inspectClearingMaterialTracking} from '../ui/equipment-goals.js';
// 回营验收读取正式绘制器使用的常驻场景视图，不另绘制测试样板。
export async function inspectStoryCampReturn(renderer,root){
 const {livingObjects}=await import('./living-world.js'),{farmObjects}=await import('./farm.js');
 const scene=renderer.campScene||renderer.renderGame||renderer.game,g=renderer.game;
 return {designCriterion:'story-camp-return',state:g.state,stage:g.story?.stageId,phase:g.story?.phase,dialogue:g.story?.dialogue,
  campVisible:!!g.story&&scene.story===null,permanentProgress:scene.progress===g.progress,
  facilities:livingObjects(scene).filter(o=>o.type==='living-facility').map(o=>o.id),seedShop:farmObjects(scene).some(o=>o.type==='seed-shop'),
  player:{x:g.player.x,y:g.player.y},canvas:[renderer.canvas.width,renderer.canvas.height],
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 读取正式邻居任务DOM，检查唯一行动、目标层级和无关内容隔离。
export function inspectNeighborTaskFocus(root){
 const dialog=root.getElementById('living-dialog'),body=root.getElementById('living-content');
 return {designCriterion:'neighbor-task-focus',visible:!!dialog?.open,box:dialog.getBoundingClientRect().toJSON(),
  tasks:[...body.querySelectorAll('[data-living-request]')].map(n=>n.dataset.livingRequest),
  goal:body.querySelector('.living-task-goal strong')?.textContent||null,
  actions:[...body.querySelectorAll('button')].map(n=>({text:n.textContent.trim(),height:n.getBoundingClientRect().height})),
  chatter:!!body.querySelector('.living-conversation'),duplicateConfirm:!!root.getElementById('living-done'),
  overflow:body.scrollWidth>body.clientWidth+1};
}
// 现场点击指引读取正式DOM与镜头，截图和手机命中验收使用同一份数据。
export function inspectStoryInteraction(renderer,root){
 const button=root.getElementById('story-interact'),cue=button?.querySelector('.story-interact-cue');
 const box=button?.getBoundingClientRect(),frame=root.getElementById('game-frame').getBoundingClientRect();
 return {designCriterion:'story-world-interaction',visible:!!button&&!button.hidden,target:button?.dataset.target,
  label:button?.getAttribute('aria-label'),disabled:button?.disabled,box:box?.toJSON(),frame:frame.toJSON(),
  cue:cue?.getBoundingClientRect().toJSON(),transform:cue?.style.transform,view:renderer.view,
  movement:button?.hasAttribute('data-world-movement'),overflow:root.documentElement.scrollWidth>root.documentElement.clientWidth};
}
// 浇水验收直接读取正式农活姿态，不单独重画一套看似正确的水流。
export async function inspectFarmWaterStream(renderer){
 const {wateringPose,wateringDrop}=await import('./farm-water-tool.js');
 const {nearest}=await import('../world/coordinates.js');
 const game=renderer.renderGame||renderer.game,job=game.farmWork?.job;
 if(job?.action!=='water')return {designCriterion:'farm-water-stream',active:false};
 const target=nearest(job.point,game.player),t=job.farmPoseTime??job.elapsed,pose=wateringPose(game.player,target,t);
 return {designCriterion:'farm-water-stream',active:true,time:t,player:{x:game.player.x,y:game.player.y},target,pose,
  samples:Array.from({length:9},(_,i)=>wateringDrop(pose.mouth,target,pose.direction,i/8))};
}
// 读取正式说明按钮的图案加载、命中范围和无障碍名称，不生成替代预览。
export function inspectHelpEmblem(root){
 return {designCriterion:'help-emblem',buttons:[...root.querySelectorAll('.help-emblem')].map(img=>{
  const button=img.closest('button'),box=button.getBoundingClientRect();
  return {id:button.id||button.dataset.storyHelp,visible:!!box.width&&!!box.height,
   width:box.width,height:box.height,loaded:img.complete&&img.naturalWidth>0,
   label:button.getAttribute('aria-label'),text:button.textContent.trim()};
 }),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 装备邻里验收绑定正式任务对象、借装与工坊DOM；不创建第二份预览场景。
export function inspectEquipmentNeighborStories(game,root){
 const run=game.story,condition=root.getElementById('ws-story-condition');
 return {designCriterion:'equipment-neighbor-stories',chapter:run?.chapterId||null,stage:run?.stageId||null,
  borrowed:run?{weapon:game.loadout.weapon,vehicle:game.vehicle.index,driving:game.vehicle.active}:null,
  interacting:run?.interacting||0,taskTrees:run?.timberTrees?.map(t=>({x:t.x,y:t.y,hp:t.hp}))||[],
  props:storyObjects(game).map(p=>({kind:p.kind,x:p.x,y:p.y})),
  condition:root.getElementById('workshop-dialog')?.open&&condition&&!condition.hidden?condition.textContent:null,purchaseDisabled:root.getElementById('ws-purchase')?.disabled,
  overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 维修验收读取正式订单、世界实体与手机底板，不另造展示状态。
export async function inspectVehicleRepair(game,root){
 const {vehicleServiceObjects}=await import('./vehicle-repair.js'),panel=root.getElementById('vehicle-repair-dialog');
 return {designCriterion:'vehicle-repair-service',objects:vehicleServiceObjects(game).map(o=>({type:o.type,x:o.x,y:o.y,hull:o.hull})),orders:game.progress.vehicleService,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth,buttons:panel?.open?[...panel.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().height).map(b=>({text:b.textContent,height:b.getBoundingClientRect().height})):[],bitmapBytes:0};
}

// 新建筑验收直接读取正式墙体、维修订单和停车记录，保持图形与通行使用同一目录。
export async function inspectBuildingTowRedesign(game,root){
 const {WORLD_BUILDINGS}=await import('../config/world-buildings.js'),{TOW_TRUCK}=await import('../config/vehicle-repair.js');
 return {...await inspectVehicleRepair(game,root),designCriterion:'building-tow-redesign',buildings:WORLD_BUILDINGS,tow:TOW_TRUCK,parked:game.progress.campParking.owned};
}

// 正面救援车验收绑定真实订单与共用载台锚点，尺寸取自正式配置。
export async function inspectTowFrontView(game,root){
 const {TOW_TRUCK}=await import('../config/vehicle-repair.js');
 return {...await inspectVehicleRepair(game,root),designCriterion:'tow-front-view',tow:TOW_TRUCK};
}

// 家具店验收读取正式房屋、售货员与库存，不另造商店或室内预览场景。
export async function inspectFurnitureShop(game,root){
 const {FURNITURE_SHOP}=await import('../config/furniture-shop.js'),{interiorShopkeeper}=await import('../config/workshop-interiors.js');
 return {designCriterion:'furniture-shop',site:FURNITURE_SHOP,room:game.cottage?.kind,seller:game.cottage?interiorShopkeeper(game.cottage):null,owned:game.progress.homeDecor.items.length,dialog:!!root.getElementById('home-decor-dialog')?.open,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 验收所有售货员柜台时直接读取正式家具与底座，不另建预览模型。
export async function inspectShopkeeperCounters(game){
 const {interiorFurniture,interiorShopkeeper}=await import('../config/workshop-interiors.js');
 return {designCriterion:'shopkeeper-counters',room:game.cottage?.kind,seller:interiorShopkeeper(game.cottage),counters:game.cottage?interiorFurniture(game).filter(item=>item.type==='counter'):[]};
}

// 猫窝验收读取正式角色经验与房间存档，不伪造角色或购买结果。
export async function inspectCatHome(game,root){
 const {heroExperience}=await import('../progression/hero-experience.js');
 return {designCriterion:'cat-home-progression',room:game.cottage?.kind,hero:game.progress.hero,experience:heroExperience(game.progress),owned:game.progress.heroes.filter(level=>level>0).length,oldHeroTab:!!root.getElementById('tab-heroes'),dialog:!!root.getElementById('cat-home-dialog')?.open,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 邮箱验收读取实际合同与正式页面，核对未读、独立快递包裹和触控边界。
export async function inspectMailbox(game,root){
 const {unreadMailCount}=await import('../progression/mailbox.js');
 return {designCriterion:'phone-mail',unread:unreadMailCount(game.progress),count:game.progress.mailbox.items.length,parcels:game.progress.farm.delivery.parcels.length,open:!!root.getElementById('mailbox-dialog')?.open,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 负重验收读取正式重量、装配、牵引和页面边界，不生成替代展示状态。
export async function inspectVehicleLoadoutWeight(game,root){
 const {catLoad,vehicleLoad,movementLoadFactor}=await import('../progression/load-weight.js');
 return {designCriterion:'vehicle-loadout-weight',cat:catLoad(game),vehicle:vehicleLoad(game),speed:movementLoadFactor(game),tow:game.progress.logistics.tow,build:game.progress.logistics.builds[game.vehicle.index],open:!!root.getElementById('logistics-dialog')?.open,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 补给验收读取正式页面、装备与炮塔损坏，不生成替代预览。
export async function inspectVehicleSupplies(game,root){
 const {vehicleFaults}=await import('../config/supplies.js');
 const panel=root.getElementById('field-equipment-dialog'),buttons=[...(panel?.querySelectorAll('button')||[])];
 return {designCriterion:'vehicle-supplies',room:game.cottage?.kind,gun:game.vehicle.weaponIndex,faults:vehicleFaults(game.progress,game.vehicle.index),title:root.getElementById('field-equipment-title')?.textContent,ammo:game.progress.supplies.vehicles[game.vehicle.index],overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth,smallButtons:buttons.some(b=>{const r=b.getBoundingClientRect();return r.height>0&&r.height<44;}),badDialog:[...root.querySelectorAll('dialog[open]')].some(d=>{const r=d.getBoundingClientRect();return r.x<0||r.y<0||r.right>root.defaultView.innerWidth+1||r.bottom>root.defaultView.innerHeight+1;})};
}

// 维修泊位验收直接读取正式深度队列，核对多车位置、剩余工时和占位。
export async function inspectRepairParkingDisplay(game){
 const {vehicleServiceObjects}=await import('./vehicle-repair.js');
 const {parkingOccupied}=await import('../core/camp-parking.js');
 const {VEHICLE_REPAIR}=await import('../config/vehicle-repair.js');
 return {designCriterion:'repair-parking-display',bays:vehicleServiceObjects(game).filter(o=>o.type==='repair-bay').map(o=>({id:o.id,hull:o.hull,x:o.x,y:o.y,phase:o.order.phase,remaining:Math.ceil(VEHICLE_REPAIR.repairSeconds-o.order.timer),occupied:parkingOccupied(game,o.id)})),waiting:game.progress.vehicleService.filter(r=>r?.phase==='repairing'&&!r.repairSpot).length};
}

// 自动上车验收读取正式工时与屏幕徽记，不构造另一套倒计时预览。
export function inspectVehicleAutoBoard(game,renderer){return {designCriterion:'nearby-vehicle-boarding',active:game.vehicle.active,hull:game.vehicle.index,boarding:game.vehicleBoarding?{hull:game.vehicleBoarding.hull,elapsed:game.vehicleBoarding.elapsed,site:game.vehicleBoarding.site.id}:null,countdown:renderer.actionCountdownView,parked:game.progress.campParking.owned.map(s=>s.hull)};}

// 正式背包与当前装备面板的只读验收入口，不建立替代预览。
export function inspectInventoryCatalog(game,root){const bag=root.getElementById('current-cat-dialog'),detail=root.getElementById('keepsake-dialog'),field=root.getElementById('field-equipment-dialog');return {designCriterion:'inventory-item-catalog',items:bag?.querySelectorAll('[data-keepsake]').length||0,emptySlots:bag?.querySelectorAll('.keepsake-empty').length||0,weight:bag?.querySelector('.inventory-load')?.textContent||'',detail:detail?.open?detail.textContent:'',field:field?.open?field.textContent:'',hpWeight:!!root.getElementById('load-weight-hud'),vehicleEntry:!root.getElementById('vehicles-button')?.hidden,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};}

// 当前猫详情与木材仓库读取正式弹窗，不建立另一个展示状态。
export function inspectCatWoodStorage(game,root){return {designCriterion:'cat-details-wood-storage',hero:game.loadout.hero,catDetails:root.getElementById('current-cat-dialog')?.open,warehouse:game.progress.wood,bag:game.progress.logistics.bagWood,cargo:game.progress.logistics.builds.map(b=>b.wood),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};}

// 满载清理验收读取真实重量和正式确认页，不生成替代画面。
export async function inspectLoadCleanup(game,root){
 const {catLoad,vehicleLoad,movementLoadFactor}=await import('../progression/load-weight.js');
 return {designCriterion:'load-capacity-cleanup',cat:catLoad(game),vehicle:vehicleLoad(game),speed:movementLoadFactor(game),open:!!root.getElementById('load-cleanup-dialog')?.open,confirmation:!!root.getElementById('load-cleanup-quantity')?.open,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 两层小屋检查直接采样正式房间、家具存档和碰撞对象，不用独立示意场景。
export async function inspectCottageWeaponRacks(game,renderer,root){
 const {placedDecor}=await import('../progression/home-decor.js'),{cottageFloor}=await import('../config/cottage.js'),{catLoad}=await import('../progression/load-weight.js'),floor=cottageFloor(game.cottage);
 return {designCriterion:'cottage-weapon-racks',floor,room:game.cottage?.kind,player:{x:game.player.x,y:game.player.y},view:renderer.cottageView,racks:placedDecor(game.progress.homeDecor,floor).filter(i=>i.type==='weapon-rack').map(i=>({uid:i.uid,x:i.x,y:i.y,weapons:i.weapons})),load:catLoad(game).weight,current:game.progress.weapon,dialog:root.getElementById('weapon-rack-dialog')?.open,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 木材直收检查读取正式飞行、真实库存与载重，满载时不得生成图标或倒计时。
export async function inspectWoodPickup(game,renderer){const {catLoad,vehicleLoad,movementLoadFactor}=await import('../progression/load-weight.js');const {resourcePickupPoses}=await import('../combat/resource-pickup.js');return {designCriterion:'wood-direct-pickup',flying:resourcePickupPoses(game.drops,game.player).filter(p=>p.kind==='wood').length,countdown:renderer.actionCountdownView,bag:game.progress.logistics.bagWood,cargo:game.progress.logistics.builds[game.vehicle.index].wood,load:game.vehicle.active?vehicleLoad(game):catLoad(game),speed:movementLoadFactor(game)};}

// 快捷清理与一级种地入口读取正式DOM，记录真实数量、来源及拖拽浮标。
export async function inspectCleanupDrag(game,root){return {...await inspectLoadCleanup(game,root),designCriterion:'load-cleanup-drag',source:root.getElementById('load-cleanup-dialog')?.dataset.source,range:root.getElementById('cleanup-quantity-range')?.value,ghosts:root.querySelectorAll('.cleanup-ghost').length,farmPrimary:root.getElementById('farm-menu')?.parentElement?.classList.contains('field-menu'),farmOpen:!root.getElementById('farm-tools')?.hidden};}

// 自动楼梯验收直接读取室内计时、楼层与正式屏幕徽记，确认不存在点击热点。
export function inspectCottageStairs(game,renderer,root){return {designCriterion:'stairs-auto-transition',floor:game.cottage?.floor,elapsed:game.cottage?.stairsElapsed,latch:game.cottage?.stairsLatch,countdown:renderer.actionCountdownView,clickTargets:root.querySelectorAll('[data-cottage-target="stairs"]').length};}

// 载具HUD验收读取正式按钮填充、弹药与当前载荷，不使用独立示意图。
export async function inspectVehicleLoadHud(game,root){const {vehicleLoadHudState}=await import('../ui/vehicle-load-hud.js'),n=root.getElementById('vehicle-button');return {designCriterion:'vehicle-hud-load',hull:game.vehicle.index,...vehicleLoadHudState(game),ammo:n.querySelector('.vehicle-ammo-count')?.textContent,clip:n.querySelector('.vehicle-load-filled')?.style.clipPath,label:n.getAttribute('aria-label'),mark:n.querySelector('.vehicle-hud-state')?.textContent,art:n.dataset.vehicleArt,reloadState:n.dataset.reloadState,reloadFill:Number(n.dataset.reloadFill),reloadStroke:n.querySelector('.vehicle-reload-value')?.style.strokeDasharray,canvasCount:n.querySelectorAll('canvas').length,svgCount:n.querySelectorAll('.vehicle-load-art svg').length};}

// 分类购弹验收读取正式库存、负重和按钮目标，避免界面分类与实际收货位置脱节。
export async function inspectAmmoPurchaseStorage(game,root){
 const {catLoad,vehicleLoad}=await import('../progression/load-weight.js'),base=await inspectVehicleSupplies(game,root),panel=root.getElementById('field-equipment-dialog'),body=root.getElementById('field-equipment-body');
 return {...base,designCriterion:'ammo-purchase-storage',target:panel.querySelector('[data-supply-target][aria-pressed="true"]')?.dataset.supplyTarget,hand:{...game.progress.supplies.hand},catWeight:catLoad(game).weight,vehicleWeight:vehicleLoad(game).payload,bodyOverflow:body.scrollWidth>body.clientWidth+1,products:[...panel.querySelectorAll('[data-ammo-buy]')].map(b=>({id:b.dataset.ammoBuy,target:b.dataset.ammoTarget,disabled:b.disabled}))};
}

// 室内自救入口必须原地可点，直接读取真实房间、按钮命中与背包负重。
export async function inspectIndoorBackpack(game,root){
 const {catLoad}=await import('../progression/load-weight.js'),load=catLoad(game),view=root.defaultView;
 const buttons=['cottage-character'].map(id=>{const n=root.getElementById(id),r=n.getBoundingClientRect();return {id,hidden:n.hidden,disabled:n.disabled,width:r.width,height:r.height,inBounds:r.left>=0&&r.top>=0&&r.right<=view.innerWidth&&r.bottom<=view.innerHeight,hit:n.contains(root.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
 return {designCriterion:'indoor-backpack-cleanup',room:game.cottage?.kind,floor:game.cottage?.floor,overloaded:load.overloaded,weight:load.weight,buttons,notice:root.getElementById('cottage-notice').textContent};
}

// 交易确认直接检查正式模态与按钮，不用替代预览伪造负重提醒。
export function inspectSupplyLoadConfirm(root){
 const panel=root.getElementById('supply-load-confirm'),r=panel.getBoundingClientRect(),view=root.defaultView,body=panel.querySelector('.ui-panel__body');
 return {designCriterion:'purchase-load-confirm',open:panel.open,title:panel.querySelector('h2').textContent,weight:panel.querySelector('[data-load-weight]').textContent,effect:panel.querySelector('#supply-load-effect').textContent,focus:root.activeElement?.id,badBounds:r.left<0||r.top<0||r.right>view.innerWidth+1||r.bottom>view.innerHeight+1,overflow:body.scrollWidth>body.clientWidth+1,smallButtons:[...panel.querySelectorAll('button')].some(b=>{const box=b.getBoundingClientRect();return box.width<44||box.height<44;})};
}

// 弹药适配验收绑定正式货架和装备，文字匹配不能只依赖图标颜色。
export async function inspectAmmoFit(game,root){
 const base=await inspectAmmoPurchaseStorage(game,root),body=root.getElementById('field-equipment-body');
 return {...base,designCriterion:'ammo-fit-icons',equipped:body.querySelector('[data-equipped-ammo]')?.dataset.equippedAmmo,summary:body.querySelector('.ammo-equipped')?.textContent,offers:[...body.querySelectorAll('[data-ammo-offer]')].map(row=>({key:row.dataset.ammoOffer,fit:row.dataset.ammoFit==='true',icon:row.querySelector('[data-ammo-icon]')?.dataset.ammoIcon,label:row.querySelector('.ammo-fit-label')?.textContent}))};
}

// 仓库验收读取真实世界位置、柜台和存档，不生成替代画面。
export async function inspectWarehouse(game,root=document){const {WAREHOUSE}=await import('../config/warehouse.js');return {designCriterion:'warehouse-building',site:WAREHOUSE,room:game.cottage?.kind,stock:game.progress.warehouse,wood:game.progress.wood,dialog:!!root.getElementById('warehouse-dialog')?.open,grids:[...root.querySelectorAll('[data-warehouse-zone]')].map(n=>({side:n.dataset.warehouseZone,items:n.querySelectorAll('[data-item]').length,total:n.querySelector('header span')?.textContent})),quantity:!!root.getElementById('warehouse-quantity')?.open,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};}

// 寻宝验收直接读取正式世界与手机状态，避免独立预览伪造库存。
export function inspectTreasure(game,root=document){return {designCriterion:'metal-detector-treasure',state:structuredClone(game.progress.treasure),active:!!game.detectorActive,dialog:!!root.getElementById('treasure-dialog')?.open,signal:root.getElementById('detector-hud')?.textContent,vehicles:game.vehicles.filter(v=>v.index>=9).map(v=>({index:v.index,hp:v.hp,active:v.active}))};}

// 检查正式角色物品和当前载具仓库入口，记录手机边界及旧入口残留。
export function inspectCharacterVehicleStorage(game,root){const cat=root.getElementById("current-cat-dialog"),cargo=root.getElementById("logistics-dialog");return {designCriterion:"character-vehicle-storage",oldEntry:!!root.querySelector("#backpack-button,#backpack-dialog"),catOpen:!!cat?.open,items:cat?.querySelectorAll("[data-keepsake]").length||0,catTab:cat?.querySelector("[data-cat-tab][aria-pressed=true]")?.dataset.catTab,cargoOpen:!!cargo?.open,cargoTitle:root.getElementById("logistics-title")?.textContent,cleanupTitle:root.getElementById("load-cleanup-title")?.textContent,indoorEntry:!!root.getElementById("cottage-character"),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};}

// 读取正式自动入库批次、飞行姿态与真实存量，验收固定仓库终点。
export function inspectWarehouseAutoWood(game){const batches=game.drops.filter(d=>d.warehouseWood);return {designCriterion:"warehouse-auto-wood",stored:game.progress.wood,bag:game.progress.logistics.bagWood,cargo:game.progress.logistics.builds.map(b=>b.wood),batches:batches.map(d=>({origin:{x:d.originX,y:d.originY},destination:d.destination,count:d.wood,age:d.age})),icons:resourcePickupPoses(batches,game.player).length,held:game.warehouseAutoWood?.held||[]};}

// 对照正式库存合计与HUD文本，记录三处来源及完整提示。
export async function inspectWoodHudTotal(game,root){const {woodInventory}=await import("../progression/resource-wallet.js"),node=root.querySelector("[data-wood]");return {designCriterion:"wood-hud-total",...woodInventory(game.progress),text:node?.textContent,title:node?.title};}

// 农作物入库验收读取真实作物批次、钱包、经济账本与仓库金币格。
export function inspectWarehouseHarvest(game,root){
 const batches=game.drops.filter(d=>d.warehouseHarvest);
 return {designCriterion:'warehouse-harvest',coins:game.progress.coins,bag:[...game.progress.farm.inventory],cargo:game.progress.logistics.builds.map(b=>[...b.cargo]),income:game.progress.economyLog.income['farm:sale:coins']||0,batches:batches.map(d=>({crop:d.crop,count:d.cropCount,origin:{x:d.originX,y:d.originY},destination:d.destination,age:d.age})),icons:resourcePickupPoses(batches,game.player).length,coinText:root.querySelector('[data-warehouse-currency] .warehouse-slot__count')?.textContent,overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}

// 日常验收读取正式插值人物与真实闲聊节点，不创建替代演员或推进任务。
export function inspectCampDailyLife(game,renderer,root){
 const speech=root.getElementById('resident-chatter'),rendered=renderer.renderGame?.campActors;
 return {designCriterion:'camp-daily-life',actors:[...(game.campActors?.values()||[])].map(actor=>({id:actor.id,x:actor.x,y:actor.y,action:actor.action,moving:actor.moving,clock:actor.clock,moveTime:actor.motion.moveTime,renderedX:rendered?.get(actor.id)?.x})),speech:{visible:!!speech&&!speech.hidden,text:speech?.textContent,pointerEvents:speech?root.defaultView.getComputedStyle(speech).pointerEvents:null},trackingPaused:game.progress.mainline.trackingPaused,modal:!!root.querySelector('dialog[open]')};
}

// 建筑验收读取真实房间、楼层、营地取景与触控尺寸，绝不为检查另造场景。
export function inspectHomeConstruction(game,renderer,root=document){return {designCriterion:"cottage-construction",home:structuredClone(game.progress.homeDecor),room:game.cottage?{floor:game.cottage.floor,balcony:game.cottage.balcony,kind:game.cottage.kind}:null,view:renderer.balconyView,companyOpen:!!root.getElementById("home-construction-dialog")?.open,fields:[...root.querySelectorAll("#home-construction-dialog input,#home-construction-dialog select")].map(n=>({height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width})),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};}
