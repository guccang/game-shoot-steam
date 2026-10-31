import { i18nText } from "../i18n/index.js";
// 工坊分类使用现有卡通武器画像，文字只用于悬停和屏幕阅读器。
import { WEAPON_CATEGORIES } from '../config/weapon-categories.js';
import { WEAPONS } from '../config/weapons.js';
import { drawWeapon } from '../rendering/characters.js';
import { drawFunnelIcon } from '../rendering/funnel.js';
import { drawVehicleIcon } from '../rendering/vehicle.js';
import { box } from '../rendering/primitives.js';

// 六个图像入口固定排列；载具属于独立炮塔工坊入口，不混入手持枪械清单。
export function renderWeaponCategories(container, selected, vehicleIndex) {
  const entries = [...WEAPON_CATEGORIES, { id: 'vehicles', name: i18nText("app.game-events.8f9f50d425"), dialog: true }];
  container.innerHTML = entries
    .map(
      (item) =>
        `<button data-category="${item.id}" title="${item.dialog ? i18nText("ui.weapon-category-icons.29f8541c37") : item.name}" aria-label="${item.name}" ${item.dialog ? 'aria-haspopup="dialog"' : `aria-pressed="${item.id === selected}"`}><canvas width="120" height="100" aria-hidden="true"></canvas></button>`,
    )
    .join('');
  for (const button of container.children) {
    const c = button.querySelector('canvas').getContext('2d'),
      kind = button.dataset.category;
    if (kind === 'vehicles') {
      drawVehicleIcon(c, vehicleIndex);
      continue;
    }
    if (kind === 'automated') {
      drawFunnelIcon(c, 60, 58, 1.25);
      continue;
    }
    if (kind === 'all') {
      for (let i = 0; i < 4; i++)
        box(
          c,
          27 + (i % 2) * 37,
          17 + Math.floor(i / 2) * 37,
          29,
          29,
          7,
          ['#8eac75', '#c7ad70', '#83b7b1', '#bac6a0'][i],
          '#456349',
          3,
        );
      continue;
    }
    const id = { standard: 'pistol', heavy: 'gatling', elemental: 'water' }[kind];
    const index = WEAPONS.findIndex((w) => w.id === id);
    c.save();
    c.translate(36, 58);
    c.rotate(-0.3);
    drawWeapon(c, index, 0, 0, kind === 'standard' ? 2.6 : 1.65);
    c.restore();
  }
}
