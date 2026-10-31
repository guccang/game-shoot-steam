// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { CAMP_GATES } from '../config/camp-defense.js';
import { box, oval, poly } from './primitives.js';
import { PLAYER_SCALE } from '../combat/recoil.js';
import { drawCat } from './characters.js';
import { drawVehicleTracks, drawVehicleArmor } from './vehicle.js';
import { riderPosition } from '../config/vehicle-rider.js';
import { canvasFont } from './text-style.js';
import { nearest } from '../world/coordinates.js';

// 守门标记、厚木拒马和伙伴复用正式猫猫、战车与独立武器绘制器。

// 战区边界与真实活动圆共用坐标，地面虚线不会遮挡角色和攻击预警。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawCampDefenseGround(c, game) {
  const r = game.campDefense;
  if (!r) return;
  const p = nearest(r.arena, game.player);
  c.save();
  c.beginPath();
  c.arc(p.x, p.y, r.arena.radius, 0, Math.PI * 2);
  c.strokeStyle = '#f0df9ba0';
  c.lineWidth = 3;
  c.setLineDash([9, 10]);
  c.stroke();
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function campDefenseObjects(game) {
  if (game.mapId !== 'forest' || game.story || game.realm || game.arrivalPending) return [];
  const r = game.campDefense;
  if (r)
    return [
      { ...r.barrier, type: 'camp-defense', kind: 'barricade', gate: r.gate },
      ...r.helpers
        .filter((h) => h.entered)
        .map((helper, i) => ({ ...helper.local.player, type: 'camp-defense', kind: 'ally', helper, index: i })),
    ];
  // 累计只读取正式已结算记录，两个营门共用同一成绩，不把本场波次当作完成次数。
  const completed = game.progress?.campDefense?.runs ?? 0;
  return CAMP_GATES.map((g) => ({
    ...g,
    x: g.x - g.ny * 108,
    y: g.y + g.nx * 108,
    type: 'camp-defense',
    kind: 'marker',
    completed,
    countText: String(completed),
  }));
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawBarricade(c, item) {
  const { gate } = item;
  c.save();
  c.translate(item.x, item.y);
  for (const t of [-52, 0, 52]) {
    const x = -gate.ny * t,
      y = gate.nx * t;
    c.save();
    c.translate(x, y);
    oval(c, 5, 5, 26, 9, '#274c3b35');
    const broken = item.hp <= 0;
    poly(
      c,
      [
        [-25, 0],
        [-16, 3],
        [24, broken ? -4 : -35],
        [17, broken ? -10 : -43],
      ],
      '#aa8050',
      '#3e5947',
      2,
    );
    poly(
      c,
      [
        [-25, broken ? -6 : -35],
        [-18, broken ? -12 : -42],
        [24, 0],
        [16, 4],
      ],
      item.flash > 0 ? '#fff0be' : '#d4ac6e',
      '#3e5947',
      2,
    );
    poly(
      c,
      [
        [-25, broken ? -6 : -35],
        [-18, broken ? -12 : -42],
        [-14, broken ? -9 : -40],
        [-21, broken ? -3 : -33],
      ],
      '#ead094',
      '#3e5947',
      1,
    );
    box(c, -8, broken ? -8 : -25, 16, 8, 2, '#6e8066', '#3e5947', 1.5);
    c.restore();
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawHordeEmblem(c) {
  for (const x of [-21, 21]) {
    poly(
      c,
      [
        [x - 9, -120],
        [x - 7, -130],
        [x - 2, -124],
        [x + 4, -126],
        [x + 10, -118],
      ],
      '#b6c58b',
      '#365c48',
      1.5,
    );
    oval(c, x, -116, 10, 9, '#b6c58b', '#365c48', 1.5);
    oval(c, x - 3, -117, 1.5, 2, '#365c48');
    oval(c, x + 3, -117, 1.5, 2, '#365c48');
  }
  poly(
    c,
    [
      [-12, -120],
      [-15, -133],
      [-5, -128],
      [5, -128],
      [15, -133],
      [12, -120],
    ],
    '#e0b779',
    '#365c48',
    1.5,
  );
  box(c, -14, -128, 28, 26, 9, '#ecd299', '#365c48', 1.8);
  poly(
    c,
    [
      [-10, -121],
      [-3, -118],
      [-10, -116],
    ],
    '#365c48',
    null,
  );
  poly(
    c,
    [
      [10, -121],
      [3, -118],
      [10, -116],
    ],
    '#365c48',
    null,
  );
  oval(c, 0, -110, 8, 5, '#b49560', '#365c48', 1.2);
  oval(c, -3, -111, 1.2, 1.8, '#365c48');
  oval(c, 3, -111, 1.2, 1.8, '#365c48');
  poly(
    c,
    [
      [-11, -113],
      [-11, -104],
      [-5, -106],
    ],
    '#fff5d6',
    '#365c48',
    1,
  );
  poly(
    c,
    [
      [11, -113],
      [11, -104],
      [5, -106],
    ],
    '#fff5d6',
    '#365c48',
    1,
  );
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawCampDefense(c, item, game, reduced = false) {
  if (item.kind === 'barricade') {
    drawBarricade(c, item);
    return;
  }
  if (item.kind === 'ally') {
    const { local, spec } = item.helper,
      p = local.player,
      v = local.vehicle;
    c.save();
    c.translate(item.x - p.x, item.y - p.y);
    drawVehicleTracks(c, p, v, reduced, game.time,local.progress);
    drawCat(
      c,
      p.x,
      riderPosition(p, v).y,
      spec.hero,
      p.angle,
      PLAYER_SCALE,
      p.walkPhase,
      spec.weapon,
      p.recoil,
      reduced ? 0.35 : 1,
      null,
      0,
      false,
      false,
      p.bodyAnimation,
      local.weapon().modChoice,
      local.weapon().parts,
    );
    drawVehicleArmor(c, p, v, local.progress, game.time, reduced);
    c.restore();
    return;
  }
  c.save();
  c.translate(item.x, item.y);
  oval(c, 5, 4, 17, 6, '#274c3b30');
  box(c, -4, -64, 8, 66, 2, style.campDefense.drawCampDefenseColor, '#3e5947', 2);
  poly(
    c,
    [
      [-44, -138],
      [44, -138],
      [42, -80],
      [0, -54],
      [-42, -80],
    ],
    '#f4e5b9',
    '#365c48',
    2.5,
  );
  poly(
    c,
    [
      [-39, -133],
      [39, -133],
      [38, -101],
      [-38, -101],
    ],
    '#52755a',
    null,
  );
  drawHordeEmblem(c);
  c.textAlign = 'center';
  c.fillStyle = '#35543e';
  c.font = canvasFont(22);
  c.fillText(item.countText, 0, -78, 68);
  c.restore();
}
