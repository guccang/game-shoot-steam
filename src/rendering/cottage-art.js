import { onArtStyleChange } from '../art-styles/state.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { box, oval, poly } from './primitives.js';

// 小屋母版与窗光、薄雪共用世界锚点；母版导出透明 PNG，运行时只缓存一次。

let INK = style.cottageArt.materialColor;
// 共用绘制与动作输入，风格差异由配置提供。
export function drawCottageArtwork(c) {
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  poly(
    c,
    [
      [-57, -9],
      [32, -7],
      [63, -21],
      [63, -10],
      [32, 4],
      [-57, 1],
    ],
    '#909b80',
    INK,
    style.cottageArt.drawCottageArtworkValue,
  );
  poly(
    c,
    [
      [-57, -65],
      [-14, -106],
      [32, -64],
      [32, -2],
      [-57, -5],
    ],
    style.cottageArt.drawCottageArtworkColor,
    INK,
    style.cottageArt.drawCottageArtworkValue,
  );
  poly(
    c,
    [
      [32, -64],
      [63, -79],
      [63, -13],
      [32, -2],
    ],
    style.cottageArt.drawCottageArtworkColor2,
    INK,
    style.cottageArt.drawCottageArtworkValue,
  );
  poly(
    c,
    [
      [-56, -64],
      [-14, -102],
      [31, -63],
      [31, -57],
      [-14, -94],
      [-56, -57],
    ],
    '#b9ac7d',
    null,
  );
  box(c, -17, -53, 34, 51, [17, 17, 2, 2], '#ae8754', INK, style.cottageArt.drawCottageArtworkValue);
  box(c, -12, -47, 24, 44, [12, 12, 1, 1], '#c7a16a', '#816c48', 1.5);
  c.strokeStyle = '#aa8656';
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(-4, -40);
  c.lineTo(-4, -7);
  c.moveTo(4, -40);
  c.lineTo(4, -7);
  c.stroke();
  oval(c, 7, -25, 2, 2, '#f1d18a', INK, 1);
  box(c, -50, -51, 26, 27, 3, style.cottageArt.drawCottageArtworkColor3, INK, 1.8);
  box(c, -46, -47, 18, 19, 1, '#e9dca7', '#7b8b6d', 1.2);
  box(c, -38, -47, 2, 19, 0, '#b39460');
  box(c, -46, -38, 18, 2, 0, '#b39460');
  box(c, -53, -27, 32, 5, 1, '#d2b679', INK, 1.4);
  poly(
    c,
    [
      [43, -52],
      [55, -58],
      [55, -34],
      [43, -28],
    ],
    '#829a83',
    INK,
    1.6,
  );
  poly(
    c,
    [
      [45, -49],
      [53, -53],
      [53, -36],
      [45, -32],
    ],
    '#dfd5a0',
    null,
  );
  poly(
    c,
    [
      [48, -51],
      [50, -52],
      [50, -34],
      [48, -33],
    ],
    '#b29963',
    null,
  );
  box(c, 20, -51, 7, 12, 2, '#dfc17f', INK, 1.4);
  box(c, 22, -49, 3, 7, 1, '#f6e7b1');
  box(c, -57, -59, 5, 54, 1, '#bd9a62', INK, 1.3);
  box(c, 29, -59, 5, 57, 1, '#ad8b57', INK, 1.3);
  oval(c, -14, -80, 8, 9, '#b08e58', INK, 1.6);
  oval(c, -14, -80, 4.8, 5.8, '#dcdca9');
  box(c, 36, -134, 14, 29, 2, '#a6ad91', INK, 1.8);
  box(c, 33, -137, 20, 6, 2, '#c8c9a8', INK, 1.8);
  c.strokeStyle = '#7e8e75';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(37, -124);
  c.lineTo(49, -124);
  c.moveTo(42, -131);
  c.lineTo(42, -124);
  c.stroke();
  poly(
    c,
    [
      [-14, -112],
      [17, -124],
      [75, -78],
      [33, -61],
    ],
    style.cottageArt.drawCottageArtworkColor4,
    INK,
    style.cottageArt.drawCottageArtworkValue2,
  );
  poly(
    c,
    [
      [-14, -112],
      [17, -124],
      [24, -118],
      [-8, -106],
    ],
    style.cottageArt.drawCottageArtworkColor5,
    null,
  );
  c.strokeStyle = style.cottageArt.drawCottageArtwork_strokeStyleColor;
  c.lineWidth = 1.6;
  for (const [x, y, ex, ey] of style.cottageArt.drawCottageArtworkValue3) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(ex, ey);
    c.stroke();
  }
  poly(
    c,
    [
      [33, -61],
      [75, -78],
      [75, -72],
      [33, -55],
    ],
    style.cottageArt.drawCottageArtwork_strokeStyleColor,
    INK,
    1.8,
  );
  poly(
    c,
    [
      [-66, -66],
      [-14, -116],
      [37, -65],
      [33, -58],
      [-14, -104],
      [-62, -60],
    ],
    '#d5b879',
    INK,
    style.cottageArt.drawCottageArtworkValue4,
  );
  box(c, -51, -18, 28, 12, 2, '#a58c5f', INK, 1.5);
  for (const [x, y] of [
    [-47, -21],
    [-38, -23],
    [-28, -21],
  ])
    oval(c, x, y, 5, 6, '#799663');
  for (const [x, y] of [
    [-46, -25],
    [-33, -26],
  ]) {
    oval(c, x, y, 4, 4, '#f3d98a');
    oval(c, x, y, 1.5, 1.5, '#bf9458');
  }
  box(c, -21, -1, 42, 9, 3, '#a7ad8e', INK, 1.6);
  box(c, -20, -3, 40, 6, 2, '#d0c9a1', INK, 1.5);
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawCottageWindowLight(c) {
  c.save();
  c.globalAlpha *= 0.85;
  for (const x of [-45, -36]) for (const y of [-46, -36]) box(c, x, y, 7, 7, 0, '#f3d88e');
  oval(c, -14, -80, 4.5, 5.5, '#f1d88f');
  box(c, 22, -49, 3, 7, 1, '#ffe4a2');
  poly(
    c,
    [
      [45, -49],
      [47, -50],
      [47, -34],
      [45, -33],
    ],
    '#eddb9f',
    null,
  );
  poly(
    c,
    [
      [51, -52],
      [53, -53],
      [53, -36],
      [51, -35],
    ],
    '#eddb9f',
    null,
  );
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawCottageRoofSnow(c) {
  c.save();
  c.lineJoin = 'round';
  poly(
    c,
    [
      [-14, -113],
      [17, -126],
      [25, -120],
      [13, -116],
      [7, -117],
      [-6, -109],
    ],
    '#edf0dd',
    '#bdcbb7',
    1,
  );
  poly(
    c,
    [
      [-65, -67],
      [-15, -116],
      [-9, -111],
      [-23, -99],
      [-29, -98],
      [-42, -84],
      [-49, -81],
      [-61, -64],
    ],
    '#edf0dd',
    '#bdcbb7',
    1,
  );
  poly(
    c,
    [
      [39, -66],
      [75, -80],
      [77, -76],
      [64, -70],
      [56, -70],
      [47, -65],
    ],
    '#e5ebd9',
    null,
  );
  box(c, 32, -139, 22, 5, 2, '#edf0dd', '#bdcbb7', 1);
  box(c, -51, -28, 29, 3, 1, '#e5ebd9');
  c.restore();
}

// 同步共享模块顶层的材质常量，后续绘制立即使用新配置。
onArtStyleChange(() => {
  INK = style.cottageArt.materialColor;
});
