import { i18nText, i18nHtml } from "../i18n/index.js";
// 林间补给机：使用正式枪械与载具绘制器呈现转轮，动画只负责揭晓已保存结果。
import { nativeVehicleWeapon } from '../config/vehicle-armaments.js';
import { WEAPONS } from '../config/weapons.js';
import { COLLECTED_VEHICLES } from '../config/vehicles.js';
import { SLOT_DELAYS, EXPEDITION_GUNS, EXPEDITION_VEHICLES } from '../config/expedition.js';
import { drawExpeditionSlot } from '../rendering/expedition.js';

// 声音走已有音效总线，尊重静音；销毁与离开时清除未完成的转轮回调。
export function createExpeditionSlots({ game, root, audio, onChange }) {
  const kinds = ['weapon', 'vehicle'];
  const labels = { weapon: i18nText("ui.expedition-slots.4fddf6e096"), vehicle: i18nText("app.game-events.8f9f50d425") };
  const pools = { weapon: EXPEDITION_GUNS, vehicle: EXPEDITION_VEHICLES };
  let spinning = null, timer = null, turn = 0, run = null;
  // 武器和车体按领取顺序启用，主炮随车配套，准备完成后保留结果供玩家确认。
  function markup() {
    const l = game.realm.loadout;
    return `<section class="expedition-machine" aria-label="${i18nHtml("ui.expedition-slots.ab43b73435")}">
      <div class="expedition-machine-title"><b>${i18nHtml("ui.expedition-slots.d1d1d6fd05")}</b><span>${i18nHtml("ui.expedition-slots.cf10883639")}</span></div>
      <p>依次领取喵喵武器和载具；载具固定使用自己的主武器。</p>
      <div class="expedition-reels">${kinds.map((kind, i) => {
        const busy = spinning === kind, index = l[kind], done = index !== null && !busy;
        const name = done ? (kind === 'vehicle' ? COLLECTED_VEHICLES : WEAPONS)[index].name : busy ? i18nText("ui.expedition-slots.d053b3012f") : i18nText("ui.expedition-slots.8b044ab850");
        return `<article class="expedition-reel ${busy ? 'is-spinning' : ''}" data-reel="${kind}" aria-busy="${busy}">
          <h3>${i + 1}. ${labels[kind]}</h3>
          <div class="expedition-window"><canvas width="240" height="150" data-slot-art="${kind}" aria-hidden="true"></canvas></div>
          <strong data-slot-name="${kind}" aria-live="polite">${name}</strong>
          <small>${done ? i18nText("ui.expedition-slots.d24c995cff") : kind === 'vehicle' ? i18nText("ui.expedition-slots.2eb495ae9f") : i18nText("ui.expedition-slots.e26a8a3b1c")}</small>
          <button class="primary" data-realm-roll="${kind}" ${spinning || done || (i > 0 && l[kinds[i - 1]] === null) ? 'disabled' : ''}>${busy ? i18nText("ui.expedition-slots.1a400f1683") : done ? i18nText("ui.expedition-slots.426e458a41") : i18nText("ui.expedition-slots.272330dd03", { p0: (labels[kind]) })}</button>
        </article>`;
      }).join('')}</div>
      <p class="expedition-native">载具主武器：${l.vehicle===null?'随载具领取':nativeVehicleWeapon(l.vehicle)?.name||(l.vehicle===4?'消防水炮（消防任务使用）':'无主武器，保留骑乘手持攻击')}</p>
      <p class="expedition-growth">${i18nHtml("ui.expedition-slots.7d60eb459f")}</p>
      <button class="primary expedition-ready" data-realm-ready ${spinning || kinds.some(kind => l[kind] === null) ? 'disabled' : ''}>${i18nHtml("ui.expedition-slots.634ca19554")}</button>
    </section>`;
  }
  // 正式绘制器共用外形与配色，控制器、浮游炮和无人机保持各自形态。
  function paint(kind, index) {
    const canvas = root.querySelector(`[data-slot-art="${kind}"]`);
    if (!canvas) return;
    drawExpeditionSlot(canvas.getContext('2d'), kind, index);
  }
  // 外层重建面板时重绘当前转轮，不重新抽取或重置减速时钟。
  function render() {
    if (run && game.realm !== run) dispose();
    if (game.realm?.phase !== 'loadout') return;
    for (const kind of kinds) {
      const pool = pools[kind];
      paint(kind, spinning === kind ? pool[turn % pool.length] : game.realm.loadout[kind]);
    }
  }
  // 每次卡嗒对应一次转轮跳格，间隔逐步变长，最后用独立和弦揭晓。
  function spin(kind) {
    if (spinning || !kinds.includes(kind)) return false;
    spinning = kind;
    if (!game.rollRealmEquipment(kind)) { spinning = null; return false; }
    run = game.realm; turn = 0;
    onChange(); audio.play('slot-pull');
    // 定时器只推进表现；战斗事务在点击时已保存，因此刷新不会免费重抽。
    function tick() {
      if (game.realm !== run || game.realm?.phase !== 'loadout') { dispose(); return; }
      if (turn >= SLOT_DELAYS.length) {
        spinning = null; timer = null; audio.play('slot-reveal'); onChange();
        root.querySelector(kind === 'vehicle' ? '[data-realm-ready]' : `[data-realm-roll="${kinds[kinds.indexOf(kind) + 1]}"]`)?.focus({ preventScroll: true });
        return;
      }
      audio.play('slot-tick'); turn++; render();
      timer = setTimeout(tick, SLOT_DELAYS[turn - 1]);
    }
    tick();
    return true;
  }
  // 防止应用卸载后仍播放揭晓音或操作已移除的弹窗。
  function dispose() { clearTimeout(timer); timer = null; spinning = null; run = null; }
  return { markup, render, spin, dispose, get busy() { return !!spinning; } };
}
