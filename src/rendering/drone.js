// 无人机使用圆形涵道与橄榄绿机身，区别于浮游炮的浅色展开翼。
import { box, oval } from './primitives.js';
import { drawFunnelFlash } from './funnel-effects.js';

// 双涵道保持小半径轮廓；低动态下旋翼静止，开火仍读取真实后坐。
export function drawDrone(c, folded = false, flash = 0, reduced = false, time = 0) {
  for (const side of [-1, 1]) {
    oval(c, -6, side * 11, 8, 7, '#d4c58e', '#34564c', 1.8);
    oval(c, -6, side * 11, 5.5, 4.5, '#52776a');
    c.save();
    c.translate(-6, side * 11);
    c.rotate(reduced ? 0.5 : time * 30);
    box(c, -5, -1, 10, 2, 1, '#c9dfc3');
    c.restore();
  }
  box(c, -13, -6, 27, 12, 5, '#a0b68d', '#34564c', 2);
  box(c, 10, -3, 7, 6, 2, '#d4bb73', '#34564c', 1.5);
  oval(c, 0, 0, 4, 3, folded ? '#6e9985' : '#b5f2d0', '#34564c', 1);
  drawFunnelFlash(c, flash / 0.14, reduced);
}
