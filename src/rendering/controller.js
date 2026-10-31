// 手持控制器与浮游炮体独立绘制，避免枪械和阵列互相依赖。
import { box, oval } from './primitives.js';
const INK = '#34564c';
// 控制器使用短圆角机身和能源屏，避免新增武器落入手枪默认画像。
export function drawFunnelController(c, flash = 0) {
  box(c, -13, -9, 28, 19, 6, '#f4edcc', INK, 2);
  box(c, -5, -6, 14, 11, 3, flash > 0 ? '#edffef' : '#83d8cc', INK, 1.5);
  oval(c, -9, 2, 2, 2, '#d7ad62');
  box(c, 9, -15, 3, 7, 1, '#d7ad62', INK, 1);
}

