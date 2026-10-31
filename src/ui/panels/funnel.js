import { i18nText, i18nHtml } from "../../i18n/index.js";
import { isSummonEnergy, summonRegenRate } from '../../config/summon-energy.js';
// 浮游炮独立配置面板：每炮独立挂载已拥有的武器，规则校验由 Game 执行。
import { createEventScope } from '../../platform/events.js';
import { availableFunnelWeapons, funnelWeapon } from '../../config/funnel-loadouts.js';
import { effectiveWeapon } from '../../config/weapon-mods.js';
import { drawWeapon } from '../../rendering/characters.js';
import { drawFunnelCannon } from '../../rendering/funnel.js';

// 复用原生弹窗的暂停与焦点管理，关闭后回到武器工坊。
export function createFunnelPanel({ game, root, dialogs, onChange }) {
  const $ = (id) => root.getElementById(id),
    scope = createEventScope();
  let selected = 0;
  // 三槽身份固定；中间详情和候选清单只展示当前选中的炮位。
  function render() {
    $('funnel-slots').innerHTML = [0, 1, 2]
      .map((i) => {
        const w = funnelWeapon(game.progress, i);
        return `<button role="tab" id="funnel-slot-${i}" data-funnel-slot="${i}" aria-controls="funnel-module-panel" aria-selected="${selected === i}" tabindex="${selected === i ? 0 : -1}"><b>${i18nHtml("ui.panels.funnel.f827d0589e", { p0: (i + 1) })}</b><small>${w.id === 'funnel' ? i18nText("ui.panels.funnel.8b354bfe73") : w.name}</small></button>`;
      })
      .join('');
    const weapon = funnelWeapon(game.progress, selected),
      node = game.funnel.nodes[selected];
    $('funnel-module-panel').setAttribute('aria-labelledby', `funnel-slot-${selected}`);
    $('funnel-module-name').textContent = weapon.id === 'funnel' ? i18nText("ui.panels.funnel.8b354bfe73") : weapon.name;
    $('funnel-module-description').textContent = weapon.description;
    $('funnel-module-stats').innerHTML =
      `<div><small>${i18nHtml("ui.panels.funnel.6e1df80bf7")}</small><b>${game.damage(weapon.weaponIndex)}</b></div><div><small>${i18nHtml("ui.panels.funnel.eb4b45a7b1")}</small><b>${i18nHtml("common.secondsShort", { p0: weapon.interval.toFixed(2) })}</b></div><div><small>${weapon.resourceType === 'energy' ? i18nText("ui.panels.funnel.00f4232e08") : i18nText("ui.panels.funnel.286507c47b")}</small><b>${weapon.magazineSize}</b></div><div><small>${isSummonEnergy(weapon)?i18nText("ui.panels.funnel.d87a03ca6b"):i18nText("ui.panels.funnel.438ee37336")}</small><b>${isSummonEnergy(weapon)?summonRegenRate(weapon).toFixed(2):i18nHtml("common.secondsShort", { p0: weapon.reloadTime.toFixed(1) })}</b></div>`;
    $('funnel-module-status').textContent =
      i18nText("ui.panels.funnel.e0436348e2", { p0: (node.magazine.ammo), p1: (weapon.magazineSize), p2: (isSummonEnergy(weapon)?(node.magazine.ammo<weapon.magazineSize?i18nText("ui.inventory.964669e7ae"):i18nText("ui.panels.funnel.4bc01043f7")):node.magazine.remaining > 0 ? i18nText("ui.panels.funnel.7596190d76", { p0: (node.magazine.remaining.toFixed(1)) }) : i18nText("ui.panels.funnel.abea207988")), p3: (weapon.chargeTime ? i18nText("ui.panels.funnel.e9eabad708", { p0: (weapon.chargeTime.toFixed(1)) }) : weapon.grenade ? i18nText("ui.panels.funnel.ca6499953c", { p0: (weapon.grenade.charge) }) : '') });
    const choices = availableFunnelWeapons(game.progress);
    $('funnel-choice-count').textContent = i18nText("ui.panels.funnel.9eab3765fb", { p0: (choices.length) });
    $('funnel-choices').innerHTML = choices
      .map((index) => {
        const w = effectiveWeapon(game.progress, index),
          equipped = index === weapon.weaponIndex;
        return `<button data-loadout-weapon="${index}" aria-pressed="${equipped}" ${equipped ? 'disabled' : ''}><canvas width="240" height="110" aria-hidden="true" data-module-icon="${index}"></canvas><b>${index === 12 ? i18nText("ui.panels.funnel.8b354bfe73") : w.name}</b><small>${w.magazineSize} ${w.resourceType === 'energy' ? i18nText("ui.inventory.06f2f8e0a8") : i18nText("ui.inventory.05b5d32c72")} · ${isSummonEnergy(w)?i18nText("ui.panels.funnel.e64656fe1a", { p0: (summonRegenRate(w).toFixed(2)) }):i18nText("ui.panels.funnel.56cf6c4cc9", { p0: (w.reloadTime.toFixed(1)) })}</small><span>${equipped ? i18nText("ui.panels.funnel.6e6fdcf66d") : i18nText("ui.panels.funnel.9c738b342f", { p0: (selected + 1) })}</span></button>`;
      })
      .join('');
    for (const canvas of root.querySelectorAll('[data-module-icon]')) {
      const index = +canvas.dataset.moduleIcon,
        c = canvas.getContext('2d');
      c.save();
      c.translate(index === 12 ? 120 : 95, 55);
      if (index === 12) {
        c.scale(2.3, 2.3);
        drawFunnelCannon(c);
      } else drawWeapon(c, index, 0, 0, index >= 8 ? 1.9 : 2.5);
      c.restore();
    }
  }
  dialogs.register('funnel-dialog', {
    onOpen: () => {
      selected = 0;
      $('funnel-feedback').textContent = '';
      render();
    },
    focusId: 'close-funnel',
  });
  scope.on(root, 'click', (event) => {
    if (event.target.closest('[data-funnel-config]') && game.progress.weapons[12] && !game.realm)
      dialogs.open('funnel-dialog');
  });
  scope.on($('funnel-slots'), 'click', (event) => {
    const button = event.target.closest('[data-funnel-slot]');
    if (!button) return;
    selected = +button.dataset.funnelSlot;
    render();
    $(`funnel-slot-${selected}`).focus();
  });
  scope.on($('funnel-slots'), 'keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    selected = (selected + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    render();
    $(`funnel-slot-${selected}`).focus();
  });
  scope.on($('funnel-choices'), 'click', (event) => {
    const button = event.target.closest('[data-loadout-weapon]');
    if (!button) return;
    if (game.configureFunnel(selected, +button.dataset.loadoutWeapon)) {
      render();
      onChange();
      $(`funnel-slot-${selected}`).focus();
      $('funnel-feedback').textContent =
        i18nText("ui.panels.funnel.fdcde91096", { p0: (selected + 1), p1: (funnelWeapon(game.progress, selected).name) });
    }
  });
  for (const id of ['close-funnel', 'funnel-done'])
    scope.on($(id), 'click', () => dialogs.close('funnel-dialog'));
  return { dispose: scope.dispose };
}
