import {scooterCapacity} from '../config/scooter-capacity.js';
import { i18nText } from "../i18n/index.js";
// 三炮供给压缩为三个独立仪表，顺序与配置页的炮位保持一致。
import { funnelWeapon } from '../config/funnel-loadouts.js';
import { realmWeapon } from '../config/realms.js';
import { ringMarkup, ammoRingState, updateRing } from './status-rings.js';
// 圆环读取实际挂载武器，返航、装填和暂停均不自行推进时钟。
export function updateFunnelSupply(root, game, weapon) {
  const host = root.getElementById('funnel-supply');
  host.hidden = !weapon.independentSupply;
  root.getElementById('game-frame').dataset.supply = weapon.independentSupply
    ? 'independent'
    : 'shared';
  if (host.hidden) return;
  if (!host.children.length)
    host.innerHTML = [1, 2, 3]
      .map(
        (i) =>
          `<div class="status-ring supply-node" tabindex="0" data-slot="${i}">${ringMarkup(i)}</div>`,
      )
      .join('');
  game.funnel.nodes.forEach((node, i) => {
    const module = scooterCapacity(realmWeapon(funnelWeapon((game.loadout || game.progress), i), game.realm?.buffs),game);
    updateRing(
      host.children[i],
      ammoRingState(node.magazine, module, {
        prefix: i18nText("ui.funnel-supply.67cd7779d5", { p0: (i + 1) }),
        returning: node.charging && node.flight.mode !== 'dock',
        stopped: game.state === 'paused' ? i18nText("ui.funnel-supply.4ea1173d1f") : game.state === 'dead' ? i18nText("ui.funnel-supply.6111993e75") : '',
        skill:
          module.chargeTime && node.pulse.charge > 0 ? node.pulse.charge / module.chargeTime : null,
      }),
    );
  });
}
