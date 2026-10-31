// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { snowCap } from './winter-art.js';
import { oval } from './primitives.js';

// 全地图树木使用暖顶光、中间色和冷底影三级叶团；全部预绘进原树木图集。

// 不规则圆角叶团保留手绘轮廓，避免密集圆球或细碎叶纹。
// 共用绘制与动作输入，风格差异由配置提供。
function clusterPath(c, x, y, rx, ry) {
  c.beginPath();
  c.moveTo(x - rx, y + ry * 0.18);
  c.bezierCurveTo(x - rx * 1.14, y - ry * 0.4, x - rx * 0.6, y - ry * 0.7, x - rx * 0.38, y - ry * 0.72);
  c.bezierCurveTo(x - rx * 0.12, y - ry * 1.23, x + rx * 0.6, y - ry, x + rx * 0.65, y - ry * 0.5);
  c.bezierCurveTo(x + rx * 1.2, y - ry * 0.48, x + rx * 1.12, y + ry * 0.55, x + rx * 0.55, y + ry * 0.64);
  c.bezierCurveTo(x + rx * 0.3, y + ry, x - rx * 0.7, y + ry, x - rx, y + ry * 0.18);
  c.closePath();
}
// 共用绘制与动作输入，风格差异由配置提供。
function trunk(c, lean, color, branched) {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(-12, 5);
  c.quadraticCurveTo(-4, -7, -8 + lean, -67);
  c.lineTo(6 + lean, -69);
  c.quadraticCurveTo(6, -12, 14, 6);
  c.quadraticCurveTo(1, 11, -12, 5);
  c.fillStyle = color('#ad8655');
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = color(style.treeCanopy.trunk_strokeStyleColor);
  c.stroke();
  c.beginPath();
  c.moveTo(4, 4);
  c.lineTo(2 + lean, -57);
  c.strokeStyle = color('#856e49');
  c.lineWidth = 4;
  c.stroke();
  c.beginPath();
  c.moveTo(-5, -2);
  c.quadraticCurveTo(-3, -33, -5 + lean, -57);
  c.strokeStyle = color('#e1bd7b');
  c.lineWidth = 3;
  c.stroke();
  if (branched)
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(lean, -42);
      c.quadraticCurveTo(side * 17, -48, side * 22, -68);
      c.strokeStyle = color(style.treeCanopy.trunk_strokeStyleColor);
      c.lineWidth = 8;
      c.stroke();
      c.strokeStyle = color('#b99560');
      c.lineWidth = 5;
      c.stroke();
    }
  oval(c, -9, 5, 10, 3, color('#72915a'));
  oval(c, 9, 7, 6, 2.5, color('#9ab16a'));
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawSampleTree(c, paletteIndex, pine, variant, color, winter = false) {
  const palettes = style.treeCanopy.leafRamps;
  const p = palettes[paletteIndex].map(color),
    lean = [-5, 3, 0, 6, -3, 2][variant];
  oval(c, 2, 4, 13, 4, color('#314b3952'));
  trunk(c, lean, color, !pine);
  const wide = [1, 0.88, 1.07, 0.95, 1.04, 0.9][variant];
  const tall = [1, 1.06, 0.91, 1.03, 0.95, 1.08][variant];
  c.save();
  c.translate(lean, -5);
  c.scale(wide, pine ? tall * 0.91 : tall);
  if (pine) {
    // 连续圆润的锥形叶冠用错落侧瓣收尖，不再由三个独立三角形堆叠。
    c.beginPath();
    c.moveTo(-3, -133);
    c.bezierCurveTo(3, -138, 10, -119, 13, -110);
    c.bezierCurveTo(22, -109, 24, -98, 19, -91);
    c.bezierCurveTo(31, -92, 35, -79, 29, -72);
    c.bezierCurveTo(39, -72, 44, -61, 37, -53);
    c.bezierCurveTo(49, -47, 46, -35, 33, -33);
    c.bezierCurveTo(18, -26, 8, -31, 1, -29);
    c.bezierCurveTo(-11, -24, -27, -29, -34, -33);
    c.bezierCurveTo(-48, -34, -48, -47, -37, -55);
    c.bezierCurveTo(-44, -62, -34, -75, -27, -75);
    c.bezierCurveTo(-33, -85, -23, -96, -18, -96);
    c.bezierCurveTo(-24, -106, -13, -116, -10, -122);
    c.quadraticCurveTo(-7, -132, -3, -133);
    c.closePath();
    c.fillStyle = p[2];
    c.fill();
    c.strokeStyle = p[0];
    c.lineWidth = style.treeCanopy.drawSampleTree_lineWidthValue;
    c.stroke();
    c.save();
    c.clip();
    c.beginPath();
    c.moveTo(6, -139);
    c.bezierCurveTo(17, -106, 5, -88, 21, -74);
    c.bezierCurveTo(36, -57, 12, -39, -45, -46);
    c.lineTo(-48, -20);
    c.lineTo(53, -20);
    c.lineTo(53, -140);
    c.closePath();
    c.fillStyle = p[1];
    c.fill();
    clusterPath(c, -4, -111, 12, 23);
    c.fillStyle = p[3];
    c.fill();
    clusterPath(c, -10, -83, 22, 18);
    c.fillStyle = p[3];
    c.fill();
    clusterPath(c, -17, -56, 24, 14);
    c.fillStyle = p[2];
    c.fill();
    c.globalAlpha = style.treeCanopy.drawSampleTree_globalAlphaValue;
    // 细节开关只控制局部绘制，保留共同分层与动作输入。
    if (style.treeCanopy.fineHighlights) {
      clusterPath(c, -7, -117, 7, 12);
      c.fillStyle = p[4];
      c.fill();
      c.globalAlpha = 0.55;
    }
    c.strokeStyle = p[1];
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(-20, -94);
    c.quadraticCurveTo(-8, -86, 2, -94);
    c.moveTo(2, -66);
    c.quadraticCurveTo(17, -61, 24, -70);
    c.stroke();
    c.restore();
  } else {
    // 连续树冠只描外轮廓；内部叶团共用底影，避免像堆叠的圆盘。
    c.beginPath();
    c.moveTo(-35, -43);
    c.bezierCurveTo(-55, -47, -55, -69, -44, -77);
    c.bezierCurveTo(-51, -94, -33, -109, -19, -103);
    c.bezierCurveTo(-13, -126, 16, -126, 24, -107);
    c.bezierCurveTo(44, -112, 54, -94, 45, -80);
    c.bezierCurveTo(60, -62, 45, -41, 30, -44);
    c.bezierCurveTo(14, -28, -13, -31, -21, -40);
    c.quadraticCurveTo(-29, -36, -35, -43);
    c.closePath();
    c.fillStyle = p[2];
    c.fill();
    c.strokeStyle = p[0];
    c.lineWidth = style.treeCanopy.drawSampleTree_lineWidthValue;
    c.stroke();
    c.save();
    c.clip();
    c.beginPath();
    c.moveTo(-56, -69);
    c.bezierCurveTo(-30, -48, -15, -65, 5, -57);
    c.bezierCurveTo(29, -48, 39, -68, 55, -77);
    c.lineTo(60, -20);
    c.lineTo(-60, -20);
    c.closePath();
    c.fillStyle = p[1];
    c.fill();
    clusterPath(c, -19, -86, 30, 25);
    c.fillStyle = p[3];
    c.fill();
    clusterPath(c, 8, -104, 24, 21);
    c.fillStyle = p[3];
    c.fill();
    clusterPath(c, 27, -81, 20, 21);
    c.fillStyle = p[2];
    c.fill();
    c.globalAlpha = style.treeCanopy.drawSampleTree_globalAlphaValue2;
    // 细节开关只控制局部绘制，保留共同分层与动作输入。
    if (style.treeCanopy.fineHighlights) {
      clusterPath(c, -14, -108, 17, 11);
      c.fillStyle = p[4];
      c.fill();
      c.globalAlpha = 1;
    }
    c.strokeStyle = p[2];
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(-35, -77);
    c.quadraticCurveTo(-25, -69, -18, -77);
    c.moveTo(3, -94);
    c.quadraticCurveTo(14, -85, 23, -94);
    c.stroke();
    c.restore();
  }
  if (winter) {
    const caps = pine
      ? [
          [-3, -126, 9, 9],
          [-7, -101, 18, 10],
          [-10, -77, 27, 10],
          [-8, -53, 35, 11],
        ]
      : [
          [5, -111, 25, 13],
          [-27, -91, 22, 12],
          [29, -86, 20, 11],
        ];
    for (const [x, y, rx, ry] of caps) snowCap(c, x, y, rx, ry, color);
  }
  c.restore();
}
