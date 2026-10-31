// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { SETTLEMENT_FENCES } from '../world/settlements.js';
import { worldDistance } from '../world/coordinates.js';
import { box, oval, poly } from './primitives.js';
import { canvasFont } from './text-style.js';
import { clearingSite } from '../progression/clearing-site.js';

// 木护栏与双扇门参与正式脚底排序，独立门叶绕门柱开启。

// 剧情仍保留原世界边界，独立秘境不带入围栏。
// 共用绘制与动作输入，风格差异由配置提供。
export function settlementObjects(game) {
  return game.mapId === 'forest' && !game.realm
    ? [
        ...SETTLEMENT_FENCES,
        ...(game.progress.living.patrolActive
          ? [{ ...clearingSite(game.progress), type: 'story-prop', kind: 'route', label: '清缴场' }]
          : []),
      ]
    : [];
}
// 共用绘制与动作输入，风格差异由配置提供。
function timber(c, a, b, z, height, palette, thickness = 6) {
  const dx = thickness,
    dy = -thickness * 0.5,
    [wood, edge, light, dark] = palette;
  const A = [a.x, a.y - z],
    B = [b.x, b.y - z],
    C = [b.x, b.y - z - height],
    D = [a.x, a.y - z - height];
  poly(c, [A, B, C, D], wood, edge, style.settlements.timberValue);
  poly(c, [B, [B[0] + dx, B[1] + dy], [C[0] + dx, C[1] + dy], C], dark, edge, style.settlements.timberValue2);
  poly(c, [D, C, [C[0] + dx, C[1] + dy], [D[0] + dx, D[1] + dy]], light, edge, style.settlements.timberValue2);
  if (Math.abs(a.x - b.x) < 1)
    poly(c, [A, [A[0] + dx, A[1] + dy], [B[0] + dx, B[1] + dy], B], dark, edge, style.settlements.timberValue2);
}
// 共用绘制与动作输入，风格差异由配置提供。
function post(c, p, palette) {
  const [wood, edge, light, dark] = palette;
  oval(c, p.x + 3, p.y + 3, 9, 5, '#29423540');
  poly(
    c,
    [
      [p.x - 5, p.y],
      [p.x + 5, p.y],
      [p.x + 5, p.y - 43],
      [p.x - 5, p.y - 43],
    ],
    wood,
    edge,
    style.settlements.postValue,
  );
  poly(
    c,
    [
      [p.x + 5, p.y],
      [p.x + 10, p.y - 4],
      [p.x + 10, p.y - 47],
      [p.x + 5, p.y - 43],
    ],
    dark,
    edge,
    style.settlements.postValue2,
  );
  poly(
    c,
    [
      [p.x - 5, p.y - 43],
      [p.x, p.y - 48],
      [p.x + 10, p.y - 47],
      [p.x + 5, p.y - 43],
    ],
    light,
    edge,
    style.settlements.postValue2,
  );
  oval(c, p.x, p.y - 30, 1.3, 1.3, edge);
}
// 共用绘制与动作输入，风格差异由配置提供。
function gateLeaf(c, a, b, palette) {
  timber(c, a, b, 12, 7, palette);
  timber(c, a, b, 32, 7, palette);
  timber(c, b, b, 8, 34, palette, 7);
  const low = { x: a.x, y: a.y - 12 },
    high = { x: b.x, y: b.y - 32 };
  timber(c, low, high, 0, 4, palette, 4);
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawSettlement(c, item, game, night) {
  const palette = night > 0.5 ? style.settlements.drawSettlementValue : style.settlements.drawSettlementValue2;
  const half = item.length / 2,
    ends = item.horizontal
      ? [
          { x: -half, y: 0 },
          { x: half, y: 0 },
        ]
      : [
          { x: 0, y: -half },
          { x: 0, y: half },
        ];
  c.save();
  c.translate(item.x, item.y);
  c.save();
  c.strokeStyle = '#29423524';
  c.lineWidth = 9;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(ends[0].x + 9, ends[0].y + 7);
  c.lineTo(ends[1].x + 9, ends[1].y + 7);
  c.stroke();
  c.restore();
  if (item.type === 'settlement-gate') {
    const open = Math.max(0, Math.min(1, (180 - worldDistance(game.player, item)) / 85)),
      angle = open * Math.PI * 0.47,
      span = half - 13;
    for (let i = 0; i < 2; i++) {
      const a = ends[i],
        sign = i === 0 ? 1 : -1,
        b = item.horizontal
          ? { x: a.x + sign * Math.cos(angle) * span, y: a.y - Math.sin(angle) * span }
          : { x: a.x + Math.sin(angle) * span, y: a.y + sign * Math.cos(angle) * span };
      gateLeaf(c, a, b, palette);
    }
  } else {
    timber(c, ends[0], ends[1], 13, 7, palette);
    timber(c, ends[0], ends[1], 30, 7, palette);
  }
  for (const end of ends) post(c, end, palette);
  if (item.type === 'settlement-gate' && item.horizontal) {
    box(c, -half - 35, -68, 70, 22, 4, palette[2], palette[1], 1.7);
    c.fillStyle = palette[1];
    c.font = canvasFont(11);
    c.textAlign = 'center';
    c.fillText(item.name, -half, -53);
  }
  c.restore();
}
