import { nativeVehicleWeapon } from '../../config/vehicle-armaments.js';
import {facilityOpen} from '../../config/town-restoration.js';
import { i18nHtml, i18nText } from "../../i18n/index.js";
import {fireCard,paintFirePanel} from '../fire-rescue.js';
import {STORY_CAMPAIGN} from '../../config/story-campaign.js';
// 时空秘境入口、必选祝福和结算面板；战斗规则只通过 Game 的公共方法操作。
import { createExpeditionSlots } from '../expedition-slots.js';
import { WEAPONS } from '../../config/weapons.js';
import { COLLECTED_VEHICLES } from '../../config/vehicles.js';
import { REALMS, BLESSINGS, ENCOUNTERS } from '../../config/realms.js';
import { blessingSummary } from '../../config/blessing-summary.js';
import { createEventScope } from '../../platform/events.js';
import {layoutMobileActions} from '../mobile-panels.js';
import { resourceIcon } from '../../rendering/resource-icons.js';
import { blessingIcon } from '../../rendering/blessing-icons.js';
import {raceCard,raceMarkup,paintRacePanel,createRaceControls} from '../race-panel.js';
import { footballCard, footballMarkup, paintFootballPanel } from '../football-panel.js';
// 插画地址相对正式模块解析，部署前缀与页面位置变化时仍读取同一套原图。
const REALM_ART=Object.freeze(Object.fromEntries(['rogue','tower','guardian'].map(mode=>[mode,new URL(`../../../assets/realms/${mode}.webp`,import.meta.url).href])));
// 奖励只展示固定白名单数值，避免将外部存档字符串注入页面。
function rewards(values) {
  const names = { coins: i18nText("balance.app.bbece6f829"), wood: i18nText("balance.app.30a9333b4f"), parts: i18nText("balance.help.b6be82f97f"), crystal: i18nText("balance.help.c16229837e"), core: i18nText("balance.app.a8a88ddbea") };
  return Object.entries(names).filter(([key]) => values[key] > 0)
    .map(([key, name]) => `<span aria-label="${name} +${values[key]}" title="${name}">${resourceIcon(key)} <b>+${values[key]}</b></span>`).join('') || `<span>${i18nHtml("ui.panels.realms.c2045bde62")}</span>`;
}
// 绑定原生弹窗与战场摘要，强制选择阶段阻止 Esc 跳过关卡事务。
export function createRealmPanel({ game, root, dialogs, audio, onChange, onFire }) {
  const $ = id => root.getElementById(id), scope = createEventScope();
  const raceControls=createRaceControls({game,root});
  let lastMarkup = '', lastLocked = '', opening = false, catalogMode = null;
  // 失败重试更换请求标识，避开浏览器保留的失败响应；不重绘卡片或切换成占位图。
  function retryArtwork(image){
    const url=new URL(REALM_ART[image.dataset.realmArt]);
    const request=Number(image.dataset.artRequest||0)+1;image.dataset.artRequest=String(request);
    url.searchParams.set('retry',String(request));image.src=url.href;
  }
  // 每次打开最多自动重试一次，持续缺失时保留原图说明，避免逐帧发起请求。
  scope.on($('realm-content'),'error',event=>{
    const image=event.target;
    if(!image.matches?.('img[data-realm-art]')||image.dataset.artRetried)return;
    image.dataset.artRetried='true';retryArtwork(image);
  },true);
  // 查看单项玩法只展示原目录卡片，不创建挑战；玩家点击卡片进入后才开始。
  function open(mode=null){
    catalogMode=REALMS[mode]?mode:null;render();dialogs.open('realm-dialog');
    for(const image of $('realm-content').querySelectorAll('img[data-realm-art]'))if(image.complete&&!image.naturalWidth){delete image.dataset.artRetried;retryArtwork(image);}
    return true;
  }
  // 建筑和现有卡片共用进入事务，保留必选祝福、存档及暂停归属规则。
  function enter(mode) {
    if(!facilityOpen(game.progress,mode)){game.requestFacility?.(mode);return false;}
    if(mode==='fire')return onFire?.();
    if (!game.enterRealm(mode)) return false;
    dialogs.cancelResume();
    if (game.realm.phase === 'combat' || game.realm.mode === 'guardian') dialogs.close('realm-dialog');
    onChange();
    return true;
  }
  const slots = createExpeditionSlots({ game, root, audio, onChange });
  // 展示当前关卡与女神血量，自动弹出祝福或结算，只在状态改变时重建按钮。
  function render() {
    const r = game.realm, dialog = $('realm-dialog');
    // 自动返回交付时关闭旧秘境弹窗，释放故事面板的自动打开条件。
    if(!r&&game.story&&dialog.open){dialogs.cancelResume();dialogs.close('realm-dialog');}
    $('realm-button').classList.toggle('active', !!r);
    $('game-frame').classList.toggle('realm-active',!!r);
    $('game-frame').classList.toggle('tower-active',r?.mode==='tower');
    $('game-frame').classList.toggle('rogue-active',r?.mode==='rogue');
    $('game-frame').classList.toggle('football-active',r?.mode==='football');
    for (const id of ['story-button','phone-button', 'heroes-button'])
      if($(id))$(id).hidden = !!r;
    // 武器入口沿用工坊开放条件；已有载具随时可查看，包含初始赠送电动车。
    $('weapons-button').hidden = !!r || !facilityOpen(game.progress,'weapons');
    $('vehicles-button').hidden = !!r || (!facilityOpen(game.progress,'garage')&&!game.progress.vehicleHulls.some(level=>level>0));
    $('unlock-weapons').disabled = !!r;
    $('boss-button').hidden = !!r;
    $('quest').classList.toggle('football-score',r?.mode==='football');
    // 秘境使用自己的关卡进度，不继承森林安全区和清缴接取状态的隐藏规则。
    if(r)$('quest').hidden=false;
    if (r && !['football','fire','race'].includes(r.mode)) {
      if (game.state === 'paused') {
        $('overlay-title').textContent = i18nText("ui.panels.realms.962b663e88");
        $('overlay-text').textContent = i18nText("ui.panels.realms.57ff4be3a9");
        $('resume').textContent = i18nText("ui.panels.realms.318d784104");
      }
      const spec = REALMS[r.mode];
      $('quest-title').textContent = i18nText("ui.panels.realms.5a837b33e0", { p0: (spec.name), p1: (r.stage), p2: (spec.unit) });
      $('quest-detail').textContent = r.phase === 'build' ? i18nText("ui.panels.realms.62e1b0323f") : r.phase === 'loadout' ? i18nText("ui.panels.realms.e5443c0f34") : r.phase === 'choice' && !r.cleared ? i18nText("ui.panels.realms.53082971bd") : r.phase !== 'combat' ? i18nText("ui.panels.realms.9f95070aa8") : r.warning > 0 ? r.spec.boss ? i18nText("ui.panels.realms.7e1f34be30") : i18nText("ui.panels.realms.c215110376") :
        r.spec.boss ? i18nText("ui.panels.realms.92c911c676") : r.mode === 'guardian' ? i18nText("ui.panels.realms.6cdf794bd0") : r.mode === 'rogue' ? ENCOUNTERS[r.encounter].hint : r.spec.elite ? i18nText("ui.panels.realms.e6e2fb4031") : i18nText("ui.panels.realms.e14231bfc2");
      $('quest-count').textContent = r.phase === 'combat' ? r.warning > 0 ? i18nText("ui.hud.67d54f9c74", { p0: (Math.ceil(r.warning)) }) : `${r.kills} / ${r.spec.total}` : i18nText("ui.panels.realms.6b263dc900", { p0: (r.cleared), p1: (spec.unit) });
      if (r.phase === 'rest') {
        $('quest-detail').textContent = r.mode === 'guardian' ? i18nText("ui.panels.realms.0181ceb1b3", { p0: (r.stage + 1) }) : i18nText("ui.panels.realms.ab8bb2c40c", { p0: (r.stage + 1) });
        $('quest-count').textContent = i18nText("ui.panels.realms.de08934433", { p0: (Math.ceil(r.restRemaining)) });
      }
      $('quest').classList.toggle('incoming', r.phase === 'combat' && r.warning > 0);
      $('zone-name').textContent = i18nText("ui.panels.realms.f5dc54fbda");
      $('wave-label').textContent = spec.name;
    }
    if(r?.mode==='football'){
      $('quest-title').textContent=i18nText("ui.panels.realms.a3d1fdf788", { p0: (r.score||0) });
      $('quest-detail').textContent=r.phase==='build'?i18nText("ui.panels.realms.e8d90b1466"):r.phase==='won'?i18nText("ui.panels.realms.60f43e1771"):i18nText("ui.panels.realms.ba70857fbb");
      $('quest-count').textContent=r.phase==='combat'?r.warning>0?i18nText("ui.panels.realms.95d3809feb", { p0: (Math.ceil(r.warning)) }):i18nText("ui.hud.67d54f9c74", { p0: (Math.ceil(r.remaining)) }):r.phase==='won'?i18nText("balance.app.fb36be9756", { p0: (r.score) }):i18nText("ui.panels.realms.ddbff27411");
      $('quest').classList.toggle('incoming',r.warning>0);$('zone-name').textContent=i18nText("ui.panels.realms.6b5e2e32bd");$('wave-label').textContent=i18nText("ui.panels.realms.7d69f0c8c8");
      if(game.state==='paused'){$('overlay-title').textContent=i18nText("ui.panels.realms.bef306dfef");$('overlay-text').textContent=i18nText("ui.panels.realms.0564ae4d54");$('resume').textContent=i18nText("ui.panels.realms.414dbc563e");}
    }
    raceControls.render();
    const mandatory = r && !['combat', 'rest'].includes(r.phase) && !(r.mode === 'guardian' && ['build','rest'].includes(r.phase));
    // 肉鸽入场补给页把退出入口收进右上角，关闭时执行完整返回森林事务。
    const rogueEntry=r?.mode==='rogue'&&r.phase==='loadout';
    $('close-realm').hidden = !!mandatory&&!rogueEntry;
    $('close-realm').setAttribute('aria-label',rogueEntry?'结束挑战并返回森林':'关闭秘境面板');
    let markup;
    if (!r) {
      $('realm-title').textContent = catalogMode?REALMS[catalogMode].name:i18nText("ui.panels.realms.f5dc54fbda");
      markup = '<div class="realm-catalog">' +
        Object.entries(REALMS).filter(([mode])=>!catalogMode||mode===catalogMode).map(([mode, spec]) => {
          const record = game.progress.realms.records[mode];
          if(mode==='fire')return fireCard(record,game.state==='dead');
          if(mode==='race')return raceCard(record);
          if(mode==='football')return footballCard(record);
          const labels = { rogue: i18nText("ui.panels.realms.1f97dba2f6"), tower: i18nText("ui.panels.realms.e48cae7c2e"), guardian: i18nText("ui.panels.realms.cf4e1a4357") };
          const alts = { rogue: i18nText("ui.panels.realms.a5e4b79573"), tower: i18nText("ui.panels.realms.bdb0d5e0a5"), guardian: i18nText("ui.panels.realms.0314496f73") };
          const material = mode === 'rogue' ? 'crystal' : 'parts';
          return `<article class="realm-card realm-${mode}"><div class="realm-art"><img data-realm-art="${mode}" src="${REALM_ART[mode]}" width="768" height="512" alt="${alts[mode]}" loading="eager" decoding="async"><span class="realm-badge">${labels[mode]}</span></div><div class="realm-card-body"><div class="realm-card-heading"><div><h3>${spec.name}</h3><div class="realm-record">${i18nHtml("ui.panels.realms.b23cce01dd", { p0: (record.best), p1: (spec.unit), p2: (record.bosses) })}</div></div><button class="primary" data-enter-realm="${mode}" aria-label="${i18nHtml("ui.panels.realms.778ac3a7c0", { p0: (spec.name) })}" ${game.state === 'dead' ? 'disabled' : ''}>${i18nHtml("ui.football-panel.55716bd0d1")}</button></div><div class="realm-card-loot"><span>${i18nHtml("ui.panels.realms.f4f5e443ed", { p0: (resourceIcon(material)), p1: (mode === 'tower' ? resourceIcon('crystal') : '') })}</span><span>${i18nHtml("ui.panels.realms.59e7d6bbc1", { p0: (spec.unit), p1: (mode === 'tower' ? i18nText("ui.panels.realms.84605e228c") : i18nText("ui.panels.realms.e4f684ed28")), p2: (resourceIcon('core')) })}</span></div></div></article>`;
        }).join('') + '</div>' +
        (game.state === 'dead' ? `<p>${i18nHtml("ui.panels.realms.d6a949ef10")}</p>` : '');

    } else if(r.mode==='race'){
      $('realm-title').textContent=['won','lost'].includes(r.phase)?'比赛结束':'森林运动会';markup=raceMarkup(game);
    } else if(r.mode==='football'){
      $('realm-title').textContent=r.phase==='won'?i18nText("ui.panels.realms.73e865ac93"):i18nText("config.realms.3e048c8268");markup=footballMarkup(game);
    } else {
      const spec = REALMS[r.mode], buffs = Object.entries(r.buffs).filter(([, n]) => n > 0);
      $('realm-title').textContent = r.phase === 'won' ? i18nText("ui.panels.realms.e287e52b60") : r.phase === 'lost' ? i18nText("ui.panels.realms.a4ba0336c1") : spec.name;
      markup = `<p class="realm-lead">${i18nHtml("ui.panels.realms.309dd58b3f", { p0: (r.stage), p1: (spec.unit) })}</p>`;
      // 首次第五关的返回操作优先展示，继续挑战仍由原关卡推进接口处理。
      if (r.phase === 'guide') markup += `<section class="realm-first-guide"><h3>已经抵达第 5 关</h3><p>远征的基本玩法已经体验过啦！建议先返回营地，继续主线任务。已获得的资源会保留，以后随时可以再来挑战。</p><button class="primary" data-realm-exit>返回营地，继续主线</button><button data-realm-next>继续挑战第 5 关</button></section>`;
      if (r.phase === 'loadout') markup += slots.markup();
      else if (r.loadout?.weapon !== null && r.loadout?.vehicle != null) markup += `<p class="expedition-summary">${WEAPONS[r.loadout.weapon].name} · ${COLLECTED_VEHICLES[r.loadout.vehicle].shortName}<br>${i18nHtml("ui.panels.realms.e0f7a6bf34", { p0: (r.stage), p1: (nativeVehicleWeapon(r.loadout.vehicle)?.name || (r.loadout.vehicle===4?'消防水炮':'无载具主武器')), p2: (r.cleared === r.stage ? i18nText("ui.panels.realms.a9e7a90cd9", { p0: (r.stage + 1) }) : '') })}</p>`;
      if (r.mode === 'guardian') markup += `<p>${i18nHtml("ui.panels.realms.854121d351", { p0: (r.realmCoins), p1: (Math.ceil(r.goddess.hp)), p2: (r.goddess.maxHp) })}</p><p>${i18nHtml("ui.panels.realms.f74ee3d08d")}</p>`;
      if (r.phase === 'build') markup += `<button class="primary" data-realm-resume>${i18nHtml("ui.panels.realms.e1720b1406")}</button>`;
      if (r.mode === 'rogue' && r.phase === 'choice') markup += `<h3>${i18nHtml("ui.panels.realms.fca329a7e5")}</h3><div class="realm-choices">${r.offers.map(key => {
        const b = BLESSINGS[key], summary = blessingSummary(key, r);
        return `<button data-realm-blessing="${key}">${blessingIcon(key)}<span><b>${b.name}</b><small class="blessing-count">${summary.selectionText}${summary.capped ? i18nText("ui.panels.realms.8f03f4b907") : ''}</small><small class="blessing-current">${i18nHtml("ui.panels.realms.72c75e2450", { p0: (summary.effect) })}</small><small>${summary.nextEffect}</small></span><em aria-hidden="true">↗</em></button>`;
      }).join('')}</div>`;
      if (r.phase === 'rest') markup += `<p>${i18nHtml("ui.panels.realms.464302b17d", { p0: (r.mode === 'guardian' ? i18nText("ui.panels.realms.4c836aabd4") : i18nText("ui.panels.realms.8dd40f2efc")), p1: (Math.ceil(r.restRemaining)), p2: (spec.unit) })}</p><p>${i18nHtml("ui.panels.realms.abaa970622")}</p><button class="primary" data-realm-resume>${i18nHtml("ui.panels.realms.25aa5ece41")}</button><button data-realm-next>${i18nHtml("ui.panels.realms.bcb4ca06d2", { p0: (spec.unit) })}</button>`;
      if (r.phase === 'combat') markup += `<button class="primary" data-realm-resume>${i18nHtml("ui.panels.realms.25aa5ece41")}</button>`;
      if (r.phase === 'lost') markup += `<p>${r.goddess.hp <= 0 ? i18nText("ui.panels.realms.5a3a289414") : i18nText("ui.panels.realms.f2e61e2274")}</p>`;
      if (buffs.length) markup += `<div class="realm-buffs">${buffs.map(([key, count]) => `<span>${BLESSINGS[key].name} ×${count} · ${blessingSummary(key, r).effect}</span>`).join('')}</div>`;
      if (r.phase !== 'loadout') markup += `<h3>${i18nHtml("ui.panels.realms.f32dd41e53")}</h3><div class="realm-earnings">${rewards(r.earnings)}</div>`;
      if(!rogueEntry&&r.phase!=='guide')markup += `<button class="realm-exit" data-realm-exit>${['won', 'lost'].includes(r.phase) ? i18nText("ui.football-panel.ab3db96cd6") : i18nText("ui.panels.realms.776358b45c")}</button>`;
    }
    // 委托提示读取故事配置，秘境计时、交易和奖励仍由正式系统处理。
    const story=game.progress.story.run,chapter=STORY_CAMPAIGN[story?.chapterId],node=chapter?.nodes[story?.stageId];
    if(r&&node?.excursion?.mode===r.mode)markup=`<p class="story-note">${story.flags[node.excursion.flag]?node.excursion.completeText:node.panel.text}</p>`+markup;
    // 未修复时复用完整原卡片和插画，只将进入操作替换为修复条件；解锁变化也触发重绘。
    const locked = r ? [] : Object.keys(REALMS).filter(mode=>!facilityOpen(game.progress,mode));
    const lockedKey = locked.join(',');
    if (markup !== lastMarkup || lockedKey !== lastLocked) {
      $('realm-content').innerHTML = markup; lastMarkup = markup; lastLocked = lockedKey;
      for (const mode of locked) {
        const button=$('realm-content').querySelector(`[data-enter-realm="${mode}"]`);
        if(!button)continue;
        button.textContent='查看修复条件';button.setAttribute('aria-label',REALMS[mode].name+'：查看修复条件');button.disabled=false;
      }
      paintFootballPanel(root,game);paintRacePanel(root);paintFirePanel(root);layoutMobileActions($('realm-content'));
    }
    slots.render();
    if (mandatory && !dialog.open && !opening) {
      opening = true; dialogs.open('realm-dialog'); opening = false;
    }
  }
  dialogs.register('realm-dialog');
  // 问号按当前玩法提供规则；独立弹窗沿用暂停归属，避免跳过必选祝福。
  dialogs.register('realm-help-dialog', { onOpen: () => {
    const r = game.realm, specs = r ? [REALMS[r.mode]] : catalogMode?[REALMS[catalogMode]]:Object.values(REALMS);
    $('realm-help-title').textContent = r ? i18nText("ui.panels.realms.da6d49c517", { p0: (REALMS[r.mode].name) }) : i18nText("ui.panels.realms.bdbe137c7e");
    $('realm-help-content').innerHTML = `${specs.map(spec => `<section><h3>${spec.name}</h3><p>${spec.description}</p><p>${spec.reward}</p></section>`).join('') +
      (r?.mode === 'rogue' && r.phase === 'combat' ? `<section><h3>${ENCOUNTERS[r.encounter].name}</h3><p>${ENCOUNTERS[r.encounter].hint}</p></section>` : '')}<section><h3>${i18nHtml("ui.panels.realms.d27e09d569")}</h3><p>${i18nHtml("ui.panels.realms.ad15a018dd")}</p><p>${i18nHtml("ui.panels.realms.9a3b4fa084")}</p></section>`;
  } });
  scope.on($('realm-help'), 'click', () => dialogs.open('realm-help-dialog'));
  scope.on($('close-realm-help'), 'click', () => dialogs.close('realm-help-dialog'));
  scope.on($('realm-help-done'), 'click', () => dialogs.close('realm-help-dialog'));
  // 点击入口时先准备内容，再打开弹窗；暂停归属由公共管理器维护。
  scope.on($('realm-button'), 'click', () => open());
  // 补给页的X等同原底部退出；其他阶段继续使用原关闭行为。
  scope.on($('close-realm'), 'click', () => {
    if(game.realm?.mode==='rogue'&&game.realm.phase==='loadout'){
      if(!game.leaveRealm())return;
      dialogs.cancelResume();dialogs.close('realm-dialog');onChange();return;
    }
    dialogs.close('realm-dialog');
  });
  scope.on($('realm-dialog'), 'cancel', event => { if (game.realm && !['combat', 'rest'].includes(game.realm.phase) && !(game.realm.mode==='guardian' && ['build','rest'].includes(game.realm.phase))) event.preventDefault(); });
  // 委托按钮事件，重绘祝福列表后无需重复绑定监听器。
  scope.on($('realm-content'), 'click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-realm-resume')) { dialogs.close('realm-dialog'); return; }
    if (button.dataset.realmRoll) { slots.spin(button.dataset.realmRoll); return; }
    let changed = false;
    if (button.dataset.enterRealm) { enter(button.dataset.enterRealm); return; }
    if (button.hasAttribute('data-football-gun')) changed=game.chooseFootballGun(Number(button.dataset.footballGun));
    if (button.hasAttribute('data-fire-start')) changed=game.startFireRescue();
    if (button.hasAttribute('data-race-start')) changed=game.startRace();
    if (button.hasAttribute('data-football-start')) changed=game.startFootball();
    if (button.hasAttribute('data-realm-ready') && !slots.busy) changed = game.readyRealm();
    if (button.dataset.realmBlessing) changed = game.chooseRealmBlessing(button.dataset.realmBlessing);
    if (button.hasAttribute('data-realm-next')) changed = game.continueRealm();
    if (button.hasAttribute('data-realm-exit')) changed = game.leaveRealm();
    if (changed) {
      dialogs.cancelResume();
      if (!game.realm || game.realm.phase === 'combat') dialogs.close('realm-dialog');
      onChange();
      if(button.hasAttribute('data-football-gun'))root.querySelector(`[data-football-gun="${button.dataset.footballGun}"]`)?.focus();
    }
  });
  // 先停止转轮定时器，再释放面板事件。
  function dispose() { raceControls.dispose();slots.dispose(); scope.dispose(); }
  // 离开战场时停止补给机的表现计时，结果已由点击事务保存。
  function suspend() { raceControls.release();slots.dispose(); lastMarkup = ''; }
  return { render, enter, open, dispose, suspend };
}
