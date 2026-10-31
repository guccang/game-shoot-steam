// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { drawWorldSign } from './world-signs.js';
import { box, oval, poly } from './primitives.js';
import { GARAGE, VEHICLE_WORKSHOP } from '../world/workshop.js';

// 宽门载具工坊：独立屋顶、侧墙、维修角和内部车位，不拉伸住宅造型。

// 建筑缓存使用底座为原点，门洞留足整车及推车人的宽度。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawGarage(c, winter = false, options = {}) {
  const edge = style.garage.outline;
  box(c, -106, -10, 212, 18, 5, '#929e87', edge, style.garage.strokeWidth);
  poly(
    c,
    [
      [-104, -115],
      [86, -115],
      [105, -98],
      [105, 0],
      [86, 6],
      [-104, 0],
    ],
    style.garage.wall,
    edge,
    style.garage.strokeWidth,
  );
  poly(
    c,
    [
      [86, -115],
      [105, -98],
      [105, 0],
      [86, 6],
    ],
    style.garage.wallShadow,
    edge,
    style.garage.strokeWidth,
  );
  box(c, -98, -109, 184, 109, 2, style.garage.wallLight, edge, style.garage.strokeWidth);
  box(c, -GARAGE.bayHalf, GARAGE.bayTop, GARAGE.bayHalf * 2, 108, 2, '#476354', edge, style.garage.strokeWidth);
  poly(
    c,
    [
      [-62, -40],
      [62, -40],
      [62, 3],
      [-62, 3],
    ],
    '#9ca58b',
  );
  poly(
    c,
    [
      [-62, -104],
      [-48, -93],
      [-48, -39],
      [-62, 3],
    ],
    '#66806b',
  );
  poly(
    c,
    [
      [62, -104],
      [49, -93],
      [49, -39],
      [62, 3],
    ],
    '#344e43',
  );
  box(c, -42, -35, 84, 34, 3, '#aeb393');
  c.strokeStyle = '#e2d8ac';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-40, -30);
  c.lineTo(-40, -3);
  c.lineTo(40, -3);
  c.lineTo(40, -30);
  c.stroke();
  box(c, -94, -71, 23, 37, 3, '#829b83', edge, style.garage.strokeWidth);
  box(c, -91, -67, 17, 17, 2, '#bfd3b1', edge, 1.5);
  c.strokeStyle = edge;
  c.beginPath();
  c.moveTo(-83, -65);
  c.lineTo(-83, -52);
  c.stroke();
  oval(c, 77, -26, 12, 16, '#526b58', edge, style.garage.strokeWidth);
  oval(c, 77, -26, 6, 9, '#b6c29d', edge, 1.5);
  box(c, 68, -79, 14, 28, 2, '#a7824f', edge, 1.5);
  box(c, 71, -76, 8, 5, 1, '#e2c781');
  for (const x of [-68, 62]) {
    box(c, x, -107, 7, 111, 2, '#a4ad83', edge, style.garage.strokeWidth);
    box(c, x + 1, -103, 2, 102, 1, '#e5d8a6');
  }
  box(c, -68, -116, 137, 14, 3, '#92a283', edge, style.garage.strokeWidth);
  for (const y of [-112, -108]) box(c, -61, y, 123, 2, 1, '#c0c9a0');
  poly(
    c,
    [
      [-112, -117],
      [-81, -163],
      [84, -163],
      [114, -117],
    ],
    style.garage.roof,
    edge,
    style.garage.roofStrokeWidth,
  );
  poly(
    c,
    [
      [-112, -117],
      [-81, -163],
      [4, -163],
      [-16, -117],
    ],
    style.garage.roofLight,
  );
  for (const x of style.garage.roofSeams) {
    c.strokeStyle = style.garage.roofSeamColor;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, -158);
    c.lineTo(x + 12, -123);
    c.stroke();
  }
  // 工业车库加装采光天窗与分段卷帘梁，维修库配橙色安全护角。
  poly(c,[[-54,-154],[-37,-170],[42,-170],[58,-154]],'#547566',edge,2);
  box(c,-36,-167,77,13,2,'#a9cbbb',edge,1.5);
  for(const x of [-16,8,30])box(c,x,-166,2,11,0,'#547566');
  box(c,-104,-12,25,13,2,options.repair?'#cfad6d':'#b6c39b',edge,1.5);
  box(c,80,-12,25,13,2,options.repair?'#cfad6d':'#b6c39b',edge,1.5);
  box(c, -114, -120, 228, 11, 3, '#a6b58b', edge, style.garage.strokeWidth);
  box(c, -31, -139, 62, 21, 5, '#e4d8a6', edge, style.garage.strokeWidth);
  oval(c, -15, -128, 6, 6, '#718b70', edge, 1.5);
  oval(c, 15, -128, 6, 6, '#718b70', edge, 1.5);
  box(c, -10, -131, 20, 6, 2, '#92a481', edge, 1.5);
  // 维修库复用门洞与车体遮挡，只替换招牌及独立工具徽记。
  if(options.repair){
    box(c,-28,-137,56,17,4,'#e4d8a6');
    c.strokeStyle=edge;c.lineWidth=3;c.beginPath();c.moveTo(-9,-133);c.lineTo(8,-123);c.moveTo(-9,-133);c.lineTo(-14,-128);c.moveTo(-9,-133);c.lineTo(-4,-136);c.stroke();
  }
  drawWorldSign(c, options.label||'载具工坊', 0, -151);
  if (winter) {
    poly(
      c,
      [
        [-110, -121],
        [-81, -164],
        [84, -164],
        [109, -124],
        [90, -128],
        [74, -154],
        [-75, -154],
        [-94, -123],
      ],
      '#edf2dc',
      '#c4d4c3',
      1.5,
    );
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawGarageGround(c) {
  poly(
    c,
    [
      [-106, -4],
      [104, -8],
      [125, 23],
      [96, 31],
      [-82, 20],
    ],
    '#284f3a24',
  );
  oval(c, 0, 4, 108, 10, '#304d3730');
  poly(
    c,
    [
      [-66, 2],
      [66, 2],
      [73, 43],
      [-74, 43],
    ],
    '#b6baa0',
    '#89967c',
    1.5,
  );
  poly(
    c,
    [
      [-66, 2],
      [66, 2],
      [66, 7],
      [-67, 7],
    ],
    '#d7d7b5',
  );
  for (const x of [-38, 38]) box(c, x, 12, 3, 24, 1, '#8e9c8044');
}
// 共用绘制与动作输入，风格差异由配置提供。
export function clipGarageOpening(c, g = VEHICLE_WORKSHOP) {
  c.beginPath();
  c.rect(g.x - GARAGE.bayHalf, g.y + GARAGE.bayTop, GARAGE.bayHalf * 2, -GARAGE.bayTop + GARAGE.threshold);
  c.rect(g.x - 180, g.y + GARAGE.threshold, 360, 220);
  c.clip();
}
