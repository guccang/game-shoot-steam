import { onArtStyleChange } from '../art-styles/state.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { RIVER_DOCKS } from '../config/river-crossing.js';
import { storyWorldBarriers } from '../core/story/story-world.js';
import { box, oval, poly } from './primitives.js';
import { canvasFont } from './text-style.js';

// 真实河岸渡口与桥头维修设施：地面平台、木桩和标牌分层，位置读取同一配置。

let GREEN = style.riverCrossing.materialColor;
// 共用绘制与动作输入，风格差异由配置提供。
export function riverCrossingObjects(game) {
  return game.mapId === 'forest' && !game.realm ? [...RIVER_DOCKS, ...storyWorldBarriers(game)] : [];
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRiverCrossingGround(c, item, night = 0) {
  c.save();
  c.translate(item.x, item.y);
  const wood = night > 0.5 ? '#8f7e64' : '#bb965f',
    light = night > 0.5 ? '#b2a48a' : '#dec18c';
  if (item.type === 'river-dock') {
    oval(c, 5, 12, 59, 33, '#29423535');
    box(c, -50, -29, 100, 66, 4, '#766747', GREEN, style.riverCrossing.drawRiverCrossingGroundValue);
    for (let x = -50; x < 50; x += 10) box(c, x, -31, 10, 60, 2, (x / 10) % 2 ? wood : light, GREEN, 1);
    box(c, -50, 29, 100, 7, 2, wood, GREEN, 1.5);
  } else oval(c, 7, 5, 20, item.height / 2 + 5, '#29423535');
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRiverCrossing(c, item, night = 0, player = null) {
  c.save();
  c.translate(item.x, item.y);
  const wood = night > 0.5 ? '#917e5c' : '#bd965d',
    light = night > 0.5 ? '#c2b494' : '#ead29a',
    cream = night > 0.5 ? '#ccd0ac' : '#fff1bd';
  if (player && player.y < item.y && Math.hypot(player.x - item.x, player.y - item.y) < 48) c.globalAlpha = 0.65;
  if (item.type === 'river-dock') {
    for (const x of [-43, 43])
      for (const y of [-25, 25]) {
        box(c, x - 5, y - 19, 10, 24, 3, wood, GREEN, 1.7);
        oval(c, x, y - 19, 5, 3, light, GREEN, 1.5);
      }
    const x = -36 * item.direction;
    box(c, x - 4, -65, 8, 40, 2, wood, GREEN, 1.7);
    box(c, x - 30, -83, 60, 28, 4, cream, GREEN, style.riverCrossing.drawRiverCrossingGroundValue);
    poly(
      c,
      [
        [x - 16, -72],
        [x + 17, -72],
        [x + 10, -61],
        [x - 9, -61],
      ],
      '#709583',
      GREEN,
      1.5,
    );
    c.beginPath();
    c.moveTo(x, -78);
    c.lineTo(x, -70);
    c.strokeStyle = GREEN;
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = GREEN;
    c.font = canvasFont(10);
    c.textAlign = 'center';
    c.fillText(item.label, x, -89);
  } else {
    for (const y of [-34, 0, 34]) {
      poly(
        c,
        [
          [-10, y + 5],
          [0, y - 26],
          [10, y + 5],
        ],
        wood,
        GREEN,
        style.riverCrossing.drawRiverCrossingGroundValue,
      );
      poly(
        c,
        [
          [0, y - 26],
          [7, y - 23],
          [16, y + 5],
          [10, y + 5],
        ],
        '#8d754f',
        GREEN,
        1.5,
      );
    }
    poly(
      c,
      [
        [-7, -59],
        [7, -52],
        [7, 25],
        [-7, 18],
      ],
      light,
      GREEN,
      style.riverCrossing.drawRiverCrossingGroundValue,
    );
    for (let y = -48; y < 16; y += 21)
      poly(
        c,
        [
          [-6, y],
          [6, y + 6],
          [6, y + 14],
          [-6, y + 8],
        ],
        '#c89b51',
        GREEN,
        0.6,
      );
    box(c, -39, -75, 78, 25, 4, cream, GREEN, style.riverCrossing.drawRiverCrossingGroundValue);
    c.fillStyle = GREEN;
    c.font = canvasFont(12);
    c.textAlign = 'center';
    c.fillText(item.label, 0, -58);
  }
  c.restore();
}

// 同步共享模块顶层的材质常量，后续绘制立即使用新配置。
onArtStyleChange(() => {
  GREEN = style.riverCrossing.materialColor;
});
