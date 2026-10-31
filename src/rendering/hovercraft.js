// 气垫船共用战场与收藏页造型：橡胶裙边、双色船壳、双风扇和随航向变化的水纹。
import { box, oval, poly, outline } from './primitives.js';
import { isWaterBlocked } from '../world/river-geometry.js';
import { isLakeWater } from '../world/natural-terrain.js';
import { valleyBlocked } from '../world/jiuzhaigou.js';

// 尾迹仅在水上移动时出现；静止和减少动态模式保留静态接触水纹。
function drawWake(c, player, time, reduced) {
  if (!player.amphibious || !(player.mapId === 'jiuzhaigou' ? valleyBlocked(player.x, player.y, 0) : isWaterBlocked(player.x, player.y, 0) || isLakeWater(player.x, player.y))) return;
  const speed = Math.hypot(player.vx || 0, player.vy || 0);
  oval(c, 0, 16, 58, 24, '#a9f2eb35', '#cefff49a', 2);
  if (reduced || speed < 8) return;
  c.save();
  c.rotate(Math.atan2(player.vy || 0, player.vx || 0));
  for (let i = 0; i < 3; i++) {
    const phase = (time * 1.4 + i / 3) % 1, x = -42 - phase * 49;
    c.globalAlpha = (1 - phase) * Math.min(0.7, speed / 220);
    c.strokeStyle = '#ddfff4'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(x - 12, -29 - phase * 14);
    c.quadraticCurveTo(x + 14, 0, x - 12, 29 + phase * 14); c.stroke();
  }
  c.restore();
}

// 风扇藏在驾驶员后方，护圈固定，叶片只依赖游戏时钟旋转。
function drawFan(c, x, time, reduced) {
  box(c, x - 4, -25, 8, 23, 3, '#b09b60', outline);
  oval(c, x, -29, 16, 17, '#455e59', outline, 2.5);
  oval(c, x, -29, 12, 13, '#273f3b', '#adcdba', 2);
  c.save(); c.translate(x, -29); c.rotate(reduced ? 0.6 : time * 20);
  for (let i = 0; i < 3; i++) {
    c.rotate(Math.PI * 2 / 3);
    poly(c, [[-2, 0], [-4, -10], [2, -12], [4, -4]], '#8cae9b', null);
  }
  c.restore(); oval(c, x, -29, 3, 3, '#e6c781');
}

// 船底和后甲板先绘制，避免船壳把驾驶员头部与手持武器覆盖。
export function drawHovercraftRear(c, player, time = 0, reduced = false) {
  drawWake(c, player, time, reduced);
  oval(c, 2, 22, 55, 21, '#233f382b');
  oval(c, 0, 8, 53, 28, '#354e48', outline, 2.5);
  oval(c, 0, 2, 51, 24, '#5c7970', '#adc2a0', 1.5);
  for (const x of [-43, -31, -18, 0, 18, 31, 43]) {
    const y = 8 + 17 * Math.sqrt(1 - (x / 53) ** 2);
    box(c, x - 2, y - 1, 4, 7, 2, '#263f3b');
  }
  oval(c, 0, -3, 42, 22, '#70b5a0', outline, 2.5);
  oval(c, 0, -8, 25, 12, '#355a50', '#c8dec1', 2);
  drawFan(c, -31, time, reduced); drawFan(c, 31, time, reduced);
}

// 船首高光、舷灯与防撞条形成前景层，遮住驾驶员双脚并承托独立炮塔。
export function drawHovercraftFront(c, flash = false) {
  poly(c, [[-40, -4], [-28, -9], [28, -9], [40, -4], [35, 16], [20, 23], [-20, 23], [-35, 16]],
    flash ? '#fff1bd' : '#70b5a0', outline, 2.5);
  poly(c, [[-38, 3], [0, 10], [38, 3], [35, 16], [20, 23], [-20, 23], [-35, 16]], '#3f8776', null);
  poly(c, [[-34, -3], [0, 3], [34, -3], [30, 2], [0, 8], [-30, 2]], '#c9dec0', null);
  box(c, -22, 16, 44, 5, 2, '#daba73', outline, 1.5);
  for (const x of [-31, 23]) box(c, x, 5, 8, 6, 2, '#ffe7a4', outline, 1.5);
}
