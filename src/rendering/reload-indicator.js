// 角色头顶的弹夹装填提示：只读真实装填时间，保持固定屏幕尺寸，天气和树冠不会遮挡。
import { RELOAD_BADGE } from './view-safety.js';
import { box, poly } from './primitives.js';

// 圆环从十二点方向顺时针填满，装填结束即隐藏；暂停和减少动态模式无需独立动画。
export function drawReloadIndicator(c, player, view, magazine, reloadTime, resourceType = 'ammo') {
  if (!magazine || magazine.remaining <= 0 || reloadTime <= 0) return;
  const progress = Math.max(0, Math.min(1, 1 - magazine.remaining / reloadTime));
  const x = (player.x - view.x) * view.zoom;
  const y = (player.y - view.y) * view.zoom - RELOAD_BADGE.offsetY;
  c.save();
  c.translate(x, y);
  c.globalAlpha = 1;
  c.setLineDash([]);
  c.shadowColor = '#203a3266';
  c.shadowBlur = RELOAD_BADGE.shadow;
  c.shadowOffsetY = 2;
  c.beginPath();
  c.arc(0, 0, RELOAD_BADGE.radius, 0, Math.PI * 2);
  c.fillStyle = '#fff9e9f5';
  c.fill();
  c.shadowBlur = 0;
  c.shadowOffsetY = 0;
  c.strokeStyle = '#4c6451';
  c.lineWidth = 1.5;
  c.stroke();
  c.beginPath();
  c.arc(0, 0, 18.5, 0, Math.PI * 2);
  c.strokeStyle = '#dfd9b9';
  c.lineWidth = 3.5;
  c.stroke();
  if (progress > 0) {
    c.beginPath();
    c.arc(0, 0, 18.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    c.strokeStyle = resourceType === 'energy' ? '#479c91' : '#d39232';
    c.lineCap = 'round';
    c.stroke();
  }
  // 能源核心与普通弹夹共用真实进度圆环。
  if (resourceType === 'energy') {
    poly(
      c,
      [
        [0, -12],
        [10, 0],
        [0, 12],
        [-10, 0],
      ],
      '#8cdece',
      '#34564c',
      2,
    );
    poly(
      c,
      [
        [0, -6],
        [4, 0],
        [0, 6],
        [-4, 0],
      ],
      '#f4ffdd',
      null,
    );
    c.restore();
    return;
  }
  // 倾斜的弧形弹夹与铜色弹头，轮廓不依赖字体或外部图片。
  c.rotate(-0.22);
  box(c, -6, -11, 12, 5, 1.5, '#edbf62', '#594f38', 1.5);
  poly(
    c,
    [
      [-6, -7],
      [6, -7],
      [6, 5],
      [3, 11],
      [-7, 9],
      [-5, 3],
    ],
    '#58786a',
    '#324f43',
    1.6,
  );
  c.strokeStyle = '#b9ccb0';
  c.lineWidth = 1.4;
  for (const row of [-3, 1, 5]) {
    c.beginPath();
    c.moveTo(-2, row);
    c.lineTo(3, row + 0.5);
    c.stroke();
  }
  box(c, -8, 8, 13, 4, 1, '#354f43', '#324f43', 1);
  c.restore();
}
