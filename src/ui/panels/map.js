import {displayMeters} from '../../world/distance-units.js';
import {MONSTER_CAMPS,campVisitorSite} from '../../config/monster-camps.js';
import {FARM_CROPS} from '../../config/farm.js';
import {monsterCampsAvailable,monsterCampLevel} from '../../core/monster-camps.js';
import {requestWorldNavigation} from '../../core/world-navigation.js';
import {FOREST_LEVEL_BANDS} from '../../world/forest-levels.js';
import {forestRuleLines} from '../../config/forest-rules.js';
import {facilityOpen} from '../../config/town-restoration.js';
import {clearingSite} from '../../progression/clearing-site.js';
import {CLEARING_POST} from '../../config/clearing.js';
import { canvasFont } from '../../rendering/text-style.js';
import { i18nHtml, i18nText } from "../../i18n/index.js";
import {worldStoryPosts} from '../../core/story-posts.js';
import {mainlineObjective,markMainline} from '../../core/mainline-manager.js';
import {LIVING_PLACES,LIVING_ROADS} from '../../config/living-world.js';
import {livingForest} from '../../world/living-spaces.js';
import {livingRequestTarget} from '../../core/living-world.js';
import {trackedLivingRequest} from '../../core/task-tracking.js';
// 区域地图面板：共享场景背景与分区配置，不复制地图逻辑。
import { BIOMES } from '../../world/biomes.js';
import { WORLD, ORIGINAL_WORLD, canonical, worldDistance } from '../../world/coordinates.js';
import { createEventScope } from '../../platform/events.js';
import { MAPS } from '../../world/maps.js';
import {storyDefinition} from '../../core/story-definition.js';
import { JIUZHAIGOU_ZONES, JIUZHAIGOU_SIGNPOSTS } from '../../world/jiuzhaigou.js';
// 打开时生成当前视图，关闭及暂停恢复由公共弹窗控制器处理。
export function createMapPanel({ game, renderer, root, dialogs, onChange = () => {} }) {
  const $ = (id) => root.getElementById(id),
    scope = createEventScope();
  const loading = root.createElement('p'); loading.id = 'map-preview-loading';
  loading.textContent = '正在准备地图…'; loading.setAttribute('role', 'status'); loading.hidden = true;
  $('region-map').before(loading);
  // 总览只取目标季节，不更改战场缓存的来源层、过渡权重与预热队列。
  function previewOptions() { return { mapId: game.mapId, season: renderer.environment.forestSeason }; }
  // 绘制等级区域和玩家当前位置。
  function showRegionMap(retry = false) {
    const STORY_WORLD=storyDefinition(game).world,STORY_SITES=STORY_WORLD.sites;
    const map = MAPS.find(m => m.id === game.mapId) || MAPS[0];
    const zones = game.mapId === 'jiuzhaigou' ? JIUZHAIGOU_ZONES : BIOMES;
    $('map-title').textContent = map.name;
    $('map-description').textContent = map.description;
    if(!root.getElementById('map-forest-rules')){const rules=root.createElement('details');rules.id='map-forest-rules';rules.className='ui-section';const summary=root.createElement('summary');summary.textContent='野外刷怪规则';rules.append(summary);for(const text of forestRuleLines()){const p=root.createElement('p');p.textContent=text;rules.append(p);}$('map-description').after(rules);}
    $('region-map').setAttribute('aria-label', i18nText("ui.panels.map.dd58315291", { p0: (map.name) }));
    $('map-travel-status').textContent = game.mapTravelReason || i18nText("ui.panels.map.7556c79cec");
    $('map-destinations').innerHTML = MAPS.map(m => `<button type="button" data-map="${m.id}" aria-pressed="${game.mapId === m.id}" ${game.mapTravelReason || game.mapId === m.id ? 'disabled' : ''}><b>${m.name}</b><small>${m.subtitle}</small><span>${game.mapId === m.id ? i18nText("ui.panels.map.a620bb0106") : i18nText("ui.panels.map.aa20a10687")}</span></button>`).join('');
    // 湖谷保留原尺寸，森林总览展示扩展后的完整世界。
    const extent=game.mapId==='jiuzhaigou'?ORIGINAL_WORLD:WORLD;
    const c = $('region-map').getContext('2d'),
      scaleX = c.canvas.width / extent.width,
      scaleY = c.canvas.height / extent.height;
    c.clearRect(0, 0, 720, 560);
    const ready = renderer.ground.drawMap(c, 720, 560, { ...previewOptions(), retry });
    const failed = !!renderer.ground.mapPreview.failure;
    loading.textContent = failed ? '地图加载失败，请关闭后重试。' : '正在准备地图…';
    loading.hidden = ready; c.canvas.hidden = !ready; c.canvas.setAttribute('aria-busy', String(!ready && !failed));
    // 生活路、地点编号和当前委托共用正式坐标，地图不再只显示战斗等级带。
    if(livingForest(game)){
      c.strokeStyle='#f4e6b4';c.lineWidth=5;
      for(const road of LIVING_ROADS){c.beginPath();road.forEach((p,i)=>{if(i)c.lineTo(p.x*scaleX,p.y*scaleY);else c.moveTo(p.x*scaleX,p.y*scaleY);});c.stroke();}
      Object.values(LIVING_PLACES).forEach((p,i)=>{c.beginPath();c.arc(p.x*scaleX,p.y*scaleY,8,0,Math.PI*2);c.fillStyle='#f4e6b4';c.fill();c.fillStyle='#31513c';c.font=canvasFont(10);c.textAlign='center';c.fillText(String(i+1),p.x*scaleX,p.y*scaleY+3);});
      const tracked=trackedLivingRequest(game),t=tracked&&livingRequestTarget(game,tracked);
      if(t){const point=canonical(t);c.beginPath();c.arc(point.x*scaleX,point.y*scaleY,12,0,Math.PI*2);c.strokeStyle='#ad603d';c.lineWidth=2;c.stroke();}
    }
    for (const z of game.mapId === 'jiuzhaigou' ? [] : zones) {
      c.fillStyle = '#fff9e5ee';
      c.fillRect(z.x * scaleX - 51, z.y * scaleY - 18, 102, 36);
      c.fillStyle = '#36553e';
      c.font = canvasFont(12);
      c.textAlign = 'center';
      c.fillText(z.name, z.x * scaleX, z.y * scaleY - 3);
      c.font = canvasFont(11, 'normal');
      c.fillText(i18nText("common.level", { p0: z.range }), z.x * scaleX, z.y * scaleY + 12);
    }
    // 景点编号对应实景路牌与下方文字目录，窄屏不把十五个长地名挤在小地图上。
    if (game.mapId === 'jiuzhaigou') JIUZHAIGOU_SIGNPOSTS.forEach((sign, i) => {
      const x = sign.x * scaleX, y = sign.y * scaleY;
      c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fillStyle = '#fff2cb'; c.fill();
      c.strokeStyle = '#47674e'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#344f3d'; c.font = canvasFont(11); c.textAlign = 'center'; c.fillText(String(i + 1), x, y + 4);
    });
    // 章节线路来自正式地标，主路实线、近道虚线并用数字对照文字目录。
    if(game.story){
      for(const path of STORY_WORLD.paths){
        const keys=path.sites;c.beginPath();c.setLineDash(path.dash);c.strokeStyle=path.color;c.lineWidth=3;
        keys.forEach((key,i)=>{const p=STORY_SITES[key];if(i)c.lineTo(p.x*scaleX,p.y*scaleY);else c.moveTo(p.x*scaleX,p.y*scaleY);});c.stroke();
      }c.setLineDash([]);
      Object.values(STORY_SITES).forEach((p,i)=>{c.beginPath();c.arc(p.x*scaleX,p.y*scaleY,7,0,Math.PI*2);c.fillStyle='#fff4cf';c.fill();c.fillStyle='#31513c';c.font = canvasFont(10);c.fillText(String(i+1),p.x*scaleX,p.y*scaleY+3);});
      $('map-description').textContent=STORY_WORLD.mapText+game.storyObjective().label;
    }
    // 世界任务地点与实景共用坐标，信封符号对照下方地点目录。
    const posts=worldStoryPosts(game);
    for(const post of posts){const x=post.x*scaleX,y=post.y*scaleY;c.fillStyle='#fff0bd';c.strokeStyle='#365a45';c.lineWidth=2;c.fillRect(x-9,y-6,18,12);c.strokeRect(x-9,y-6,18,12);c.beginPath();c.moveTo(x-9,y-6);c.lineTo(x,y+1);c.lineTo(x+9,y-6);c.stroke();}
    // 地图盾牌与营地实体共用坐标，区别于故事信封。
    if(livingForest(game)){const x=CLEARING_POST.x*scaleX,y=CLEARING_POST.y*scaleY;c.beginPath();c.moveTo(x-8,y-7);c.lineTo(x+8,y-7);c.lineTo(x+8,y+3);c.lineTo(x,y+10);c.lineTo(x-8,y+3);c.closePath();c.fillStyle='#f1d678';c.fill();c.strokeStyle='#315747';c.lineWidth=2;c.stroke();}
    const goal=mainlineObjective(game);
    if(goal&&goal.site.mapId===game.mapId){c.beginPath();c.arc(goal.site.x*scaleX,goal.site.y*scaleY,10,0,Math.PI*2);c.fillStyle='#f1d678';c.fill();c.strokeStyle='#315747';c.lineWidth=2;c.stroke();$('map-description').textContent+=' 主线：'+goal.label+' · '+goal.site.name;}
    // 已接取的随机清缴独立标记，不依赖主线当前是否正在教学。
    const clearing=livingForest(game)&&game.progress.living.patrolActive?clearingSite(game.progress):null;
    if(clearing){const p=canonical(clearing),x=p.x*scaleX,y=p.y*scaleY;c.beginPath();c.arc(x,y,13,0,Math.PI*2);c.fillStyle='#f1d678';c.fill();c.strokeStyle='#315747';c.lineWidth=2;c.stroke();c.fillStyle='#315747';c.textAlign='center';c.font=canvasFont(13);c.fillText('剿',x,y+4);}
    // 火字标记与营地目录共用正式坐标，不烘焙进地图预览。
    if(monsterCampsAvailable(game))for(const camp of MONSTER_CAMPS.filter(c=>c.mapId===game.mapId)){const p=canonical(camp);c.fillStyle='#f3d49a';c.strokeStyle='#365b43';c.lineWidth=2;c.beginPath();c.arc(p.x*scaleX,p.y*scaleY,10,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#365b43';c.font=canvasFont(12);c.textAlign='center';c.fillText('火',p.x*scaleX,p.y*scaleY+4);}
    const p = canonical(game.player);
    c.beginPath();
    c.arc(p.x * scaleX, p.y * scaleY, 7, 0, Math.PI * 2);
    c.fillStyle = '#fdf5c4';
    c.fill();
    c.strokeStyle = '#b76542';
    c.lineWidth = 3;
    c.stroke();
    $('region-legend').innerHTML = zones.map(
      (z) =>
        `<div style="--zone-color:${z.monster}"><b>${i18nHtml("common.namedLevel", { p0: z.name, p1: z.range })}</b><small>${i18nHtml("ui.panels.map.3700687250", { p0: (z.species), p1: (z.tree === 'pine' ? i18nText("ui.panels.map.b1a9b33767") : i18nText("ui.panels.map.8916f82881")) })}</small></div>`,
    ).join('');
    for(const post of posts){const row=root.createElement('div'),title=root.createElement('b'),note=root.createElement('small');title.textContent='✉ '+post.name;note.textContent=i18nText("ui.panels.map.561f17dade");row.append(title,note);$('region-legend').append(row);}
    if(livingForest(game)){
      const tracked=trackedLivingRequest(game),target=tracked&&livingRequestTarget(game,tracked);
      $('map-description').textContent='营地周边怪物为1–3级，距离营地越远等级越高，最高20级。浅色道路连接安宁的生活圈。'+(target?'当前任务：'+tracked.title+' · '+target.text+'。棕圈为当前目标。':goal?'当前任务：'+goal.task.title+' · '+goal.label+'。':'');
      for(const band of FOREST_LEVEL_BANDS){const row=root.createElement('div');row.textContent=`${band.name} · Lv.${band.range} · 距营地 ${displayMeters(band.from)}–${displayMeters(band.to)} 米`;$('region-legend').append(row);}
      if(clearing){const row=root.createElement('div');row.id='map-clearing-site';row.textContent=`剿 · 本次清缴地点 · 距离 ${displayMeters(worldDistance(game.player,clearing))} 米`;$('region-legend').append(row);$('map-description').textContent+=' 剿字标记为本次清缴地点。';}
      Object.values(LIVING_PLACES).forEach((p,i)=>{const row=root.createElement('div');row.textContent=`${i+1}. ${p.name}`;$('region-legend').append(row);});
    }
    if(monsterCampsAvailable(game))for(const camp of MONSTER_CAMPS.filter(c=>c.mapId===game.mapId)){const row=root.createElement('div'),title=root.createElement('b'),note=root.createElement('small'),button=root.createElement('button');title.textContent='火 · '+camp.name+' · '+monsterCampLevel(camp)+'级';note.textContent='已清空 '+game.progress.monsterCamps.camps[camp.id].clears+' 次 · 种子：'+camp.seeds.map(i=>FARM_CROPS[i].name).join('、');button.className='ui-button';button.dataset.monsterCamp=camp.id;button.textContent='前往圈外';row.append(title,note,button);$('region-legend').append(row);}
    if(game.story)$('region-legend').innerHTML=`<div style="grid-column:1 / -1"><b>${i18nHtml("ui.panels.map.7562f827d6")}</b><small>${STORY_WORLD.legend}</small></div>`;
    if (game.mapId === 'jiuzhaigou') $('region-legend').innerHTML += JIUZHAIGOU_SIGNPOSTS.map((sign, i) =>
      `<div style="--zone-color:${sign.zone.accent}"><b>${i + 1}. ${sign.zone.name}</b><small>${i18nHtml("ui.panels.map.27d417b328", { p0: (sign.subtitle) })}</small></div>`).join('');
  }
  // 只有真正进入地图页面才记录教学进度，手机首页不算看过地图。
  dialogs.register('map-dialog', { onOpen: () => {showRegionMap(true);markMainline(game,'map');} });
  // 事件委托只绑定一次，旅行后刷新当前面板，关闭时仍由公共弹窗恢复暂停。
  scope.on($('map-destinations'), 'click', event => {
    const button = event.target.closest('[data-map]');
    if(button&&button.dataset.map!=='forest'&&!facilityOpen(game.progress,'travel')){game.requestFacility?.('travel');return;}
    if (!button || !game.switchMap(button.dataset.map)) return;
    showRegionMap(); onChange(); renderer.draw();
    $('map-done').focus({ preventScroll: true });
  });
  // 选中营地只设置圈外导航，关闭地图后由玩家实际行走。
  scope.on($('region-legend'),'click',event=>{const b=event.target.closest('[data-monster-camp]'),c=MONSTER_CAMPS.find(c=>c.id===b?.dataset.monsterCamp);if(c&&c.mapId===game.mapId){requestWorldNavigation(game,campVisitorSite(c),'前往'+c.name+'圈外',{direct:true});for(const id of ['map-dialog','phone-dialog','keepsake-dialog','backpack-dialog'])if($(id)?.open)dialogs.close(id);onChange();}});
  for (const id of ['close-map', 'map-done'])
    scope.on($(id), 'click', () => dialogs.close('map-dialog'));
  // 异步预取当前地图，完成后刷新打开的面板；不会逐帧绘制底图。
  function advance() {
    const preview = renderer.ground.mapPreview, open = $('map-dialog').open;
    preview.request(720, 560, previewOptions());
    if (preview.advance() && open) showRegionMap();
  }
  // 应用重挂载时删除本实例的状态节点，缓存由正式地形生命周期统一释放。
  function dispose() { scope.dispose(); loading.remove(); }
  return { advance, dispose };
}
