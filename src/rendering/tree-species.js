// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { snowCap } from './winter-art.js';
import { oval } from './primitives.js';

// 白桦、垂柳、枫树和柏树的独立剪影；沿用现有脚底锚点、风摆和昼夜图集。

// 叶团共用森林绿外轮廓、右下冷影与左上暖光，避免用换色代替树种差异。
// 共用绘制与动作输入，风格差异由配置提供。
function crown(c, x, y, rx, ry, color, jagged = false) {
  c.beginPath();
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2,
      r = jagged ? (i % 4 === 0 ? 1.12 : i % 2 === 0 ? 0.86 : 1) : 1 + 0.045 * Math.sin(a * 7);
    const px = x + Math.cos(a) * rx * r,
      py = y + Math.sin(a) * ry * r;
    if (i) c.lineTo(px, py);
    else c.moveTo(px, py);
  }
  c.closePath();
  c.fillStyle = color[1];
  c.fill();
  c.strokeStyle = color[0];
  c.lineWidth = style.treeSpecies.crown_lineWidthValue;
  c.stroke();
  c.save();
  c.clip();
  oval(c, x - 7, y - ry * 0.31, rx * 0.94, ry * 0.92, color[2]);
  oval(c, x - rx * 0.22, y - ry * 0.51, rx * 0.6, ry * 0.45, color[3]);
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function branch(c, x, y, tipX, tipY, width, color) {
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x, tipY + 20, tipX, tipY);
  c.lineCap = 'round';
  c.lineWidth = width + style.treeSpecies.branch_lineWidthValue;
  c.strokeStyle = color(style.treeSpecies.branch_strokeStyleColor);
  c.stroke();
  c.lineWidth = width;
  c.strokeStyle = color('#b99b6a');
  c.stroke();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawSpeciesTree(c, species, variant, color, winter = false) {
  const lean = variant % 2 ? 3 : -3;
  oval(c, 2, 5, 14, 4, color('#314b3952'));
  c.save();
  c.translate(lean, 0);
  if (species === 'birch') {
    for (const [x, top] of [
      [-10, -90],
      [8, -108],
    ]) {
      branch(c, x, 5, x + 3, top, 6, color);
      c.strokeStyle = color('#e3dfc4');
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(x, 3);
      c.lineTo(x + 3, top);
      c.stroke();
      c.strokeStyle = color('#65755e');
      c.lineWidth = 2;
      for (let y = -8; y > top; y -= 13) {
        c.beginPath();
        c.moveTo(x - 1, y);
        c.lineTo(x + 3, y - 1);
        c.stroke();
      }
    }
    const p = style.treeSpecies.leafRamps[0].map(color);
    crown(c, -15, -80, 22, 30, p);
    crown(c, 13, -101, 25, 32, p);
    crown(c, 22, -66, 21, 23, p);
  } else if (species === 'willow') {
    branch(c, -3, 5, 3, -87, 13, color);
    branch(c, 0, -42, -29, -80, 6, color);
    branch(c, 0, -40, 31, -76, 6, color);
    const p = style.treeSpecies.leafRamps[1].map(color);
    crown(c, 0, -86, 45, 26, p);
    for (const [x, y, rx, ry] of [
      [-37, -67, 15, 34],
      [31, -64, 18, 38],
      [-15, -64, 16, 30],
      [12, -65, 17, 31],
    ])
      crown(c, x, y, rx, ry, p);
    c.strokeStyle = p[1];
    c.lineWidth = 2;
    for (const x of [-42, -30, -17, 13, 30, 40]) {
      c.beginPath();
      c.moveTo(x, -83);
      c.quadraticCurveTo(x + 5, -53, x - 1, -35);
      c.stroke();
    }
  } else if (species === 'maple') {
    branch(c, 0, 5, -3, -80, 13, color);
    branch(c, -2, -44, -27, -73, 6, color);
    branch(c, 0, -46, 30, -78, 6, color);
    const p = style.treeSpecies.leafRamps[2].map(color);
    crown(c, -27, -73, 26, 30, p, true);
    crown(c, 27, -77, 27, 31, p, true);
    crown(c, -3, -102, 30, 30, p, true);
    crown(c, 0, -64, 26, 22, p, true);
  } else {
    branch(c, 0, 4, 0, -112, 10, color);
    branch(c, 0, -40, -17, -94, 5, color);
    branch(c, 0, -42, 19, -84, 5, color);
    const p = style.treeSpecies.leafRamps[3].map(color);
    crown(c, -18, -74, 15, 38, p);
    crown(c, 19, -68, 16, 35, p);
    crown(c, 0, -92, 21, 48, p);
  }
  if (winter) {
    const caps =
      species === 'maple'
        ? [
            [-27, -94, 23, 10],
            [27, -98, 24, 11],
            [-3, -125, 25, 10],
          ]
        : species === 'cypress'
          ? [
              [-18, -101, 13, 10],
              [19, -93, 14, 10],
              [0, -129, 15, 10],
            ]
          : species === 'birch'
            ? [
                [-15, -102, 18, 9],
                [13, -124, 20, 9],
                [22, -82, 17, 8],
              ]
            : [
                [-4, -106, 33, 9],
                [-36, -93, 13, 7],
                [30, -94, 15, 8],
              ];
    for (const [x, y, rx, ry] of caps) snowCap(c, x, y, rx, ry, color);
  }
  c.restore();
}
