import { i18nText } from "../i18n/index.js";
import {canvasRecoveryRevision} from '../rendering/canvas-recovery.js';
import {deathCoinLoss} from '../core/death-penalty.js';
import {livingWaveAllowed,livingProtected,clearingCombatActive} from '../core/living-safety.js';
// 战场 HUD 只读游戏状态，不执行购买、存储或战斗更新。
import { updateFunnelSupply } from './funnel-supply.js';
import { compactWalletResource } from './resource-number.js';
import { updateVehicleHud } from './vehicle-controls.js';
import { ammoRingState, updateRing, statusIcon } from './status-rings.js';
import { bossProfile, nextBoss } from '../config/bosses.js';
import { COLLECTED_VEHICLES } from '../config/vehicles.js';
import { HEROES } from '../config/heroes.js';
import { waveDifficulty } from '../config/waves.js';
import {forestThreatAt} from '../world/forest-levels.js';
import { biomeAt } from '../world/biomes.js';
import { drawBossIcon } from '../rendering/enemies.js';
import { BossHint, bossPawOrigin, bossPawFrames } from './boss-hint.js';
import { updateWaveProgress } from './wave-progress.js';
import { createWaveHelp } from './wave-help.js';
import {livingForest} from '../world/living-spaces.js';
import {calendarView} from '../world/living-calendar.js';
import {clearingRound} from './clearing-round.js';
// 创建与指定页面绑定的刷新函数，资源、波次和弹窗遮罩统一更新。
export function createHud({ game, root, inventory, dialogs, getView = () => null }) {
  const $ = (id) => root.getElementById(id);
  const waveHelp=createWaveHelp({game,root,dialogs});
  let portraitKind = null;
  let canvasRevision=canvasRecoveryRevision();
  const bossHint = new BossHint();
  let pawAnimation = null, pawSequence = 0;
  // 将游戏快照映射到界面，不改变规则数据。
  function updateUI() {
    if(canvasRevision!==canvasRecoveryRevision()){canvasRevision=canvasRecoveryRevision();portraitKind=null;inventory.invalidateArt();}
    // 只按正式战斗状态精简顶栏；暂停不闪回资源栏，结算、退出和离开清缴区自动恢复。
    $('game-frame').classList.toggle('task-combat-active',!!game.campDefense&&game.campDefense.phase!=='result'||clearingCombatActive(game));
    const round=clearingRound(game);
    const p = game.loadout,
      started = game.state !== 'ready';
    updateVehicleHud(root, game);
    $('game-frame').dataset.state = game.state;
    // 借用装备只替换战斗属性，钱包始终显示玩家实际持有资源。
    const wallet=game.story?game.progress:p;
    $('coins').textContent = wallet.coins.toLocaleString();
    $('wood').textContent = wallet.wood.toLocaleString();
    for(const [key,name] of [['coins',i18nText("balance.app.bbece6f829")],['wood',i18nText("balance.app.30a9333b4f")]]) {
      const node=root.querySelector(`[data-${key}]`),exact=wallet[key].toLocaleString();
      node.textContent=compactWalletResource(wallet[key]);node.title=exact;
      node.parentElement.setAttribute('aria-label',`${name} ${exact}`);
    }
    $('kills').textContent = game.kills;
    $('trees').textContent = game.chopped;
    $('bosses').textContent = game.roundBosses;
    // 上车后整组名称、数值与血条切换到载具，驾驶员生命保持原值。
    // 角色名称保留玩家身份，等级与生命仍显示当前任务采用的战斗配置。
    const mounted = game.vehicle.active,
      hp = mounted ? game.vehicle.hp : game.player.hp,
      maxHp = mounted ? game.vehicle.maxHp : game.maxHp(),
      name = mounted
        ? COLLECTED_VEHICLES[p.vehicleIndex].shortName
        : i18nText("common.namedLevel", { p0: HEROES[game.progress.hero].name, p1: p.heroes[p.hero] }),
      healthLabel = mounted ? i18nText("ui.hud.20496aae49") : i18nText("ui.hud.6fb8ecc2a5");
    $('player-name').textContent = name;
    $('player-name').title = mounted ? COLLECTED_VEHICLES[p.vehicleIndex].name : name;
    $('player-health').textContent = `${Math.ceil(hp)} / ${maxHp}`;
    $('player-health').setAttribute('aria-label', `${healthLabel} ${Math.ceil(hp)} / ${maxHp}`);
    // 生命卡跟随当前显示的角色或载具生命，恢复至四分之一即停止红色提醒。
    $('player-health').closest('.player-hud').classList.toggle('low-health',maxHp>0&&hp/maxHp<.25);
    $('health-fill').style.width = `${Math.max(0, Math.min(1, hp / maxHp)) * 100}%`;
    $('health-fill').style.background =
      hp / maxHp < 0.3 ? '#cc785c' : mounted ? '#b29249' : '#699867';
    const healthBar = $('health-fill').parentElement;
    healthBar.setAttribute('role', 'progressbar');
    healthBar.setAttribute('aria-label', `${name} · ${healthLabel}`);
    healthBar.setAttribute('aria-valuemin', '0');
    healthBar.setAttribute('aria-valuemax', String(maxHp));
    healthBar.setAttribute('aria-valuenow', String(Math.ceil(hp)));
    $('intro').hidden = started;
    if (!started) inventory.renderIntro();
    const weapon = game.weapon();
    updateFunnelSupply(root, game, weapon);
    $('magazine-hud').hidden = !!weapon.independentSupply;
    const magazine = weapon.independentSupply ? null : game.magazines[p.weapon];
    const reloading = !!magazine?.remaining;
    const skill = weapon.chargeTime
      ? game.pulse.charge / weapon.chargeTime
      : weapon.grenade && game.weaponCycle.firing
        ? game.weaponCycle.charge / weapon.grenade.charge
        : null;
    if (magazine)
      updateRing(
        $('magazine-hud'),
        ammoRingState(magazine, weapon, {
          skill: !reloading && skill > 0 ? skill : null,
          stopped: game.state === 'paused' ? i18nText("ui.funnel-supply.4ea1173d1f") : game.state === 'dead' ? i18nText("ui.funnel-supply.6111993e75") : '',
        }),
      );
    // 状态仅以图形展示，完整描述放在悬停提示及屏幕阅读器标签中。
    const busy = weapon.independentSupply && game.funnel.nodes.every((n) => n.charging);
    const status =
      game.state === 'paused'
        ? ['pause', i18nText("ui.hud.309d67f25a")]
        : game.state === 'dead'
          ? ['dead', i18nText("ui.hud.fecf4c5bf4")]
          : game.state === 'ready'
            ? ['wait', i18nText("ui.hud.bb3cdc1737")]
            : reloading || busy
              ? ['reload', i18nText("ui.hud.ae0489f7f6")]
              : skill > 0
                ? ['charge', i18nText("ui.hud.5475fb684d", { p0: (Math.round(skill * 100)) })]
                : ['aim', i18nText("ui.hud.b1b7858810")];
    const indicator = $('auto-label');
    if (indicator.dataset.kind !== status[0]) {
      indicator.innerHTML = statusIcon(status[0]);
      indicator.dataset.kind = status[0];
    }
    indicator.title = status[1];
    indicator.setAttribute('aria-label', status[1]);
    $('pause').disabled = !started || game.state === 'dead';
    const settingsOpen = $('settings-dialog').open;
    const keepPaused = settingsOpen && dialogs?.willResume('settings-dialog');
    const resumeAction = game.state === 'paused' && !keepPaused;
    const pauseLabel = resumeAction ? i18nText("ui.hud.a897aeb6cf") : keepPaused ? i18nText("ui.hud.ead8886b1c") : i18nText("ui.hud.63dc641a6b");
    $('pause').textContent = resumeAction ? '▷' : 'Ⅱ';
    $('pause').setAttribute('aria-label', pauseLabel);
    $('pause').title = pauseLabel;
    $('pause-caption').textContent = pauseLabel;
    $('overlay').hidden =
      !['paused', 'dead'].includes(game.state) || !!root.querySelector('dialog[open]');
    if (game.state === 'dead') {
      $('overlay-icon').textContent = '♡';
      $('overlay-title').textContent = i18nText("ui.hud.61ae57a541");
      $('overlay-text').textContent =
        `死亡惩罚：${game.deathPenaltyCoins===null?'回城将扣除':'已损失'} ${game.deathPenaltyCoins??deathCoinLoss(game.progress.coins)} 金币（10%，向下取整）。第 ${round} 轮清缴进度已保留，回城后可继续挑战。`;
      $('resume').textContent = '返回营地';
    } else if (game.state === 'paused') {
      $('overlay-icon').textContent = '☾';
      $('overlay-title').textContent = i18nText("ui.hud.adf092bb4f");
      $('overlay-text').textContent = i18nText("ui.hud.6448b4d398");
      $('resume').textContent = i18nText("ui.hud.b4064d6093");
    }
    const remaining = game.bossReady?0:Math.max(1,game.bossWave-game.wave+(game.waveRest>0?0:1));
    const canChallenge = game.state === 'playing'&&livingWaveAllowed(game);
    // 先恢复头像的布局再测量终点，避免领主战结束时读取隐藏节点得到零坐标。
    $('quest').hidden = !!game.boss||!(livingWaveAllowed(game)||clearingCombatActive(game));
    $('boss-button').disabled = !!game.boss || remaining > 0 || !canChallenge;
    const showPaw = bossHint.update({
      available: !game.realm && !game.boss && remaining === 0 && livingWaveAllowed(game),
      key: `${game.bossKillsAt}:${p.bosses}`,
      // 休整开始即算清波；下一波开始后保持同一编号，避免连续提醒两次。
      completedWave: game.bossReady || game.waveRest > 0 ? game.wave : game.wave - 1,
      playing: canChallenge && !!getView() && !$('boss-button').hidden && !root.hidden && !root.querySelector('dialog[open]'),
    });
    if (showPaw && pawSequence !== bossHint.sequence) {
      pawAnimation?.cancel();
      const paw = $('boss-button').querySelector('.boss-paw');
      const origin = bossPawOrigin(game.player, getView(), $('game').getBoundingClientRect(), paw.getBoundingClientRect());
      pawAnimation = paw.animate(bossPawFrames(origin, root.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches),
        { duration: 2400, easing: 'linear', fill: 'forwards' });
      pawSequence = bossHint.sequence;
    } else if (!showPaw) {
      pawAnimation?.cancel();
      pawAnimation = null;
    }
    $('boss-button').classList.toggle('show-paw', showPaw);
    const upcoming = nextBoss(p);
    const challengeLabel = game.boss
      ? i18nText("ui.hud.32057f4976")
      : remaining
        ? i18nText("ui.hud.49a851b2f7", { p0: (upcoming.name), p1: (remaining) })
        : i18nText("ui.hud.dd131a2ad4", { p0: (upcoming.name), p1: (canChallenge ? i18nText("ui.hud.7d14d5951e") : i18nText("ui.hud.3166f07543")) });
    $('boss-button').title = challengeLabel;
    $('boss-button').setAttribute('aria-label', challengeLabel);
    $('boss-button-badge').textContent = remaining > 0 ? i18nText("common.boss") : i18nText("ui.hud.4eed57b5a1");
    // 仅轮换领主时重绘静态头像，避免随 HUD 刷新重复绘制。
    if (portraitKind !== upcoming.id) {
      drawBossIcon($('boss-button-icon'), upcoming.id);
      portraitKind = upcoming.id;
      $('boss-button').dataset.kind = upcoming.id;
    }
    const wave = waveDifficulty(game.wave, game.recoveryRun);
    const incoming = !game.bossReady && game.waveRest <= 0 && game.waveWarning > 0;
    $('quest').classList.toggle('incoming', incoming);
    $('quest-title').textContent =
      `第 ${round} 轮 · ${game.bossReady?'Boss 将至':game.waveRest>0?'休整':incoming?'怪潮将至':'怪潮'}`;
    $('quest-detail').textContent =
      game.bossReady ? i18nText("ui.hud.90be11a49c") : game.waveRest > 0
        ? i18nText("ui.hud.0efa7afeed")
        : incoming ? i18nText("ui.hud.13bae4de86") :
          i18nText("ui.hud.df52aeb03e", { p0: (wave.health.toFixed(2)), p1: (wave.damage.toFixed(2)) });
    $('quest-count').textContent =
      game.bossReady ? i18nText("ui.hud.5f992daade") : game.waveRest > 0 ? i18nText("ui.hud.67d54f9c74", { p0: (Math.ceil(game.waveRest)) }) :
        incoming ? i18nText("ui.hud.67d54f9c74", { p0: (Math.ceil(game.waveWarning)) }) : `${game.waveKills} / ${wave.total}`;
    updateWaveProgress(root,game);
    $('boss-hud').hidden = !game.boss||livingProtected(game);
    const supportWarning = game.boss?.support?.warning || 0;
    $('boss-hud').classList.toggle('incoming', supportWarning > 0);
    if (game.boss) {
      const profile = bossProfile(game.boss);
      $('boss-name').textContent = `♛ ${profile.name}${game.boss.livingChallenge?' · 巡护训练投影':''}${supportWarning > 0 ? i18nText("ui.hud.02ac4f1593", { p0: (Math.ceil(supportWarning)) }) : ''}`;
      $('boss-fill').style.background = profile.color;
      $('boss-hp').textContent = `${Math.max(0, game.boss.hp)} / ${game.boss.maxHp}`;
      $('boss-fill').style.width = `${(game.boss.hp / game.boss.maxHp) * 100}%`;
    }
    const zone = biomeAt(game.player.x, game.player.y, game.mapId);
    $('zone-name').textContent = zone.name;
    $('wave-label').textContent = `Lv.${game.mapId==='forest'?forestThreatAt(game.player.x,game.player.y).range:zone.range} · 第 ${round} 轮清缴`;
    if(livingForest(game)&&!clearingCombatActive(game))$('wave-label').textContent=calendarView(game.progress.living.calendar).label;
    inventory.render();
    inventory.renderFieldIcons();
  }
  // 应用卸载时释放合成动画，重新挂载不会继承上一局的猫爪状态。
  updateUI.dispose = () => {
    waveHelp.dispose();
    pawAnimation?.cancel();
    pawAnimation = null;
    $('boss-button').classList.remove('show-paw');
  };
  return updateUI;
}
