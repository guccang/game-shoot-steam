// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { drawCrewUpgradePart } from './cat-crew.js';
import { drawVehicleUpgradePart } from './vehicle-upgrade-art.js';
import { drawGatlingPart } from './gatling-art.js';
import { drawUpgradePart } from './weapon-upgrade-art.js';
import { VEHICLE_WEAPONS } from '../config/vehicle-armaments.js';
import { box, oval, poly, outline } from './primitives.js';
import { equipmentParts, partLevel } from '../config/equipment-parts.js';
import { WEAPONS } from '../config/weapons.js';

// 装备可替换部件的正式绘制：局部结构独立，工坊和战斗共用同一入口。

// 部件外包围用于工坊热点与完成高亮，不参与裁剪正式枪身。
// 共用绘制与动作输入，风格差异由配置提供。
export function partBounds(part) {
  if (part.growthBounds) {
    const b = part.growthBounds,
      s = part.scale || 1;
    return { x: part.x + b.left * s, y: part.y + b.top * s, width: b.width * s, height: b.height * s };
  }
  // 加特林改装前后的部件位置有延展，热点覆盖共享挂点周围的联合包围。
  if (part.bounds)
    return {
      x: part.x + (part.bounds.left ?? -part.bounds.width / 2),
      y: part.y + (part.bounds.top ?? -part.bounds.height / 2),
      width: part.bounds.width,
      height: part.bounds.height,
    };
  const size = {
    damage: [17, 14],
    rate: [12, 15],
    capacity: [13, 14],
    reload: [10, 8],
    range: [14, 11],
    accuracy: [9, 8],
    coordination: [23, 19],
  }[part.key] || [18, 12];
  const scale = part.scale || 1;
  return {
    x: part.x - (size[0] * scale) / 2,
    y: part.y - (size[1] * scale) / 2,
    width: size[0] * scale,
    height: size[1] * scale,
  };
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawEquipmentPart(c, index, part, level = 1, isolated = false) {
  const w = VEHICLE_WEAPONS[index],
    energy = ['laser', 'pulse', 'arc', 'frost', 'funnel', 'drone', 'mechanical-core', 'mechanical-spider'].includes(
      w?.id,
    );
  const liquid = ['water', 'flame', 'hover-tide'].includes(w?.id),
    key = part.key;
  const step = level - 1,
    tier = Math.floor(step / 5),
    detail = step % 5;
  const width = 13 + (key === 'capacity' ? step * 1.2 : 0);
  c.save();
  c.translate(isolated ? 0 : part.x, isolated ? 0 : part.y);
  if (!isolated) c.scale(part.scale || 1, part.scale || 1);
  try {
    if (w?.crew) {
      drawCrewUpgradePart(c, key, level);
      return;
    }
    if (drawVehicleUpgradePart(c, index, key, level)) return;
    if (index === 2 && part.bounds) {
      drawGatlingPart(c, key, level, isolated);
      return;
    }
    if (drawUpgradePart(c, index, key, level)) return;
    if (key === 'damage') {
      if (energy)
        poly(
          c,
          [
            [-9 - tier, -3],
            [-3, -9 - detail * 0.35],
            [7 + tier, -5],
            [8 + tier, 5],
            [0, 8 + detail * 0.3],
            [-9, 4],
          ],
          '#91c3b0',
          outline,
          1.6,
        );
      else
        box(
          c,
          -9 - tier,
          -7 - detail * 0.3,
          18 + tier * 2,
          14 + detail * 0.6,
          3,
          liquid ? '#a1c9b1' : '#b9aa77',
          outline,
          1.6,
        );
      oval(
        c,
        0,
        0,
        4 + detail * 0.35,
        4 + tier * 0.4,
        energy ? '#d5f6c4' : style.equipmentParts.drawEquipmentPartColor,
        outline,
        1,
      );
      for (let i = 0; i <= tier; i++) box(c, -7 + i * 4, -6 - detail * 0.3, 2, 4, 0.5, '#f4dca0', outline, 0.6);
      if (w?.id === 'chainsaw')
        for (let i = 0; i < 3 + tier; i++)
          poly(
            c,
            [
              [-8 + i * 4, 6],
              [-6 + i * 4, 11 + detail * 0.4],
              [-4 + i * 4, 6],
            ],
            '#e7e6cf',
            outline,
            1,
          );
    } else if (key === 'coordination') {
      // 每级多一个端口，母巢十三级使用紧凑双排，端口不越出部件轮廓。
      box(c, -11, -7, 22, 14, 3, style.equipmentParts.drawEquipmentPartColor, outline, 1.5);
      const columns = index === 16 ? 7 : 4;
      for (let i = 0; i < level; i++)
        box(
          c,
          -8 + (i % columns) * (index === 16 ? 2.6 : 5),
          -4 + Math.floor(i / columns) * 7,
          index === 16 ? 1.8 : 3,
          4,
          1,
          '#bde4bd',
          outline,
          0.6,
        );
      box(c, -3, -9, 6, 3, 1, '#f4dca0', outline, 0.7);
    } else if (key === 'rate') {
      box(c, -6 - step * 0.3, -7, 12 + step * 0.6, 15, 3, style.equipmentParts.drawEquipmentPartColor, outline, 1.5);
      for (let i = 0; i < 2 + step; i++) box(c, -5 + i * 2, -5, 1, 10, 0.4, '#f4dca0', null);
      oval(
        c,
        0,
        0,
        2 + step * 0.35,
        2 + step * 0.35,
        energy ? '#a7e9d5' : style.equipmentParts.drawEquipmentPartColor2,
        outline,
        1,
      );
    } else if (key === 'capacity') {
      box(
        c,
        -width / 2,
        -6,
        width,
        13 + step,
        liquid || energy ? 5 : 2,
        liquid ? '#a8c6c1' : style.equipmentParts.drawEquipmentPartColor3,
        outline,
        1.5,
      );
      for (let i = 0; i <= step; i++)
        box(c, -width / 2 + 3 + i * 2.5, -3, 1.5, 8 + step, 0.5, energy ? '#d1f3bf' : '#f4dca0', null);
    } else if (key === 'reload') {
      box(c, -5 - step * 0.5, -4, 10 + step, 8, 2, style.equipmentParts.drawEquipmentPartColor2, outline, 1.4);
      for (let i = 0; i <= step; i++) oval(c, -3 + i * 2, 0, 1, 2, '#f4dca0', outline, 0.6);
    } else if (key === 'range') {
      box(
        c,
        -7,
        -5 - step * 0.4,
        14,
        10 + step * 0.8,
        liquid ? 4 : 2,
        energy ? '#8aaba1' : style.equipmentParts.drawEquipmentPartColor,
        outline,
        1.5,
      );
      for (let i = 0; i <= step; i++)
        box(c, -5 + i * 2.5, -5 - step * 0.4, 1.2, 10 + step * 0.8, 0.5, '#cbd5b3', outline, 0.5);
      box(c, -7, -1, 14, 2, 0.5, energy ? '#b9eed2' : style.equipmentParts.drawEquipmentPartColor4, null);
    } else if (key === 'accuracy') {
      poly(
        c,
        [
          [-5, -4 - step],
          [-2, -6 - step],
          [4, -3],
          [4, 3],
          [-2, 5 + step],
          [-5, 3],
        ],
        '#b8c599',
        outline,
        1.3,
      );
      box(c, -2, -3 - step, 2, 7 + step * 2, 1, '#f4dca0', null);
    } else if (key === 'armor') {
      poly(
        c,
        [
          [-12 - tier, -6],
          [-8, -9 - detail * 0.4],
          [10 + tier, -7],
          [12 + tier, 5],
          [7, 9 + detail * 0.4],
          [-12 - tier, 6],
        ],
        '#a9b980',
        outline,
        1.6,
      );
      box(c, -8, -4, 16 + tier, 5 + detail * 0.4, 1, '#d3d8a5', null);
      for (let i = 0; i <= tier; i++) oval(c, -7 + i * 5, 5, 1.2, 1.2, '#f4dca0', outline, 0.5);
    } else if (key === 'engine') {
      box(c, -12, -6, 24 + step, 12, 3, style.equipmentParts.drawEquipmentPartColor, outline, 1.6);
      oval(c, -3, 0, 7 + step * 0.4, 7 + step * 0.4, style.equipmentParts.drawEquipmentPartColor3, outline, 1.4);
      oval(c, -3, 0, 3, 3, '#f4dca0', outline, 1);
      for (let i = 0; i <= step; i++) box(c, 6 + i * 2, -8, 1.3, 16, 1, '#bbcbaa', outline, 0.5);
      box(c, -14, -3, 4, 6, 1, style.equipmentParts.drawEquipmentPartColor2, outline, 1);
    }
  } finally {
    c.restore();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawWeaponParts(c, index, levels, slide = 0) {
  for (const p of equipmentParts('weapons', index))
    if (levels?.omitted !== p.key && (levels?.[p.key] || 1) > 1) {
      // 手枪上部强化件与原滑套共同退让，握把和弹仓仍固定在手中。
      c.save();
      if (index === 0 && ['damage', 'rate'].includes(p.key)) c.translate(-slide, 0);
      drawEquipmentPart(c, index, p, levels[p.key]);
      c.restore();
    }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawVehicleParts(c, index, progress, omitted = null) {
  for (const part of equipmentParts('vehicle', index)) {
    const level = partLevel(progress, 'vehicle', index, part.key);
    if (level <= 1 || omitted === part.key) continue;
    for (const x of part.paired ? [-Math.abs(part.x), Math.abs(part.x)] : [part.x]) {
      c.save();
      c.translate(x, part.y);
      c.scale(0.72 * (part.scale || 1), 0.72 * (part.scale || 1));
      try {
        drawEquipmentPart(c, index, part, level, true);
      } finally {
        c.restore();
      }
    }
  }
}
