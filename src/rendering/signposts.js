// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { canvasFont } from './text-style.js';
import { i18nText } from '../i18n/index.js';
import { box, oval, poly } from './primitives.js';

// 林间站牌复用圆润卡通图元，按脚底参与场景遮挡，文字不再烘焙到地面。

// 两根木柱、护檐与分区叶标构成站牌，夜间压暗木色并保留文字对比。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRegionSignpost(c, sign, night, player, zoom = 1) {
  const { zone } = sign;
  c.save();
  c.translate(sign.x, sign.y);
  const scale = sign.scenic ? Math.min(2.2, Math.max(1, 0.8 / zoom)) : 1;
  c.scale(scale, scale);
  if (Math.abs(player.x - sign.x) < 86 * scale && player.y > sign.y - 100 * scale && player.y < sign.y)
    c.globalAlpha *= 0.45;
  oval(c, 5, 4, 67, 12, '#304b3527');
  for (const x of [-48, 48]) {
    box(
      c,
      x - 5,
      -75,
      10,
      78,
      3,
      style.signposts.drawRegionSignpostColor,
      style.signposts.drawRegionSignpostColor2,
      style.signposts.drawRegionSignpostValue,
    );
    box(c, x - 3, -29, 3, 26, 1, '#c1a272');
    oval(c, x, 3, 9, 3, '#82905f');
  }
  box(
    c,
    -78,
    -91,
    156,
    62,
    8,
    style.signposts.drawRegionSignpostColor3,
    style.signposts.drawRegionSignpostColor4,
    style.signposts.drawRegionSignpostValue2,
  );
  box(c, -73, -87, 146, 53, 5, style.signposts.drawRegionSignpostColor5);
  if (night > 0) {
    c.save();
    c.globalAlpha *= night * 0.3;
    box(c, -73, -87, 146, 53, 5, '#3d6078');
    c.restore();
  }
  box(
    c,
    -82,
    -96,
    164,
    10,
    4,
    style.signposts.drawRegionSignpostColor6,
    style.signposts.drawRegionSignpostColor4,
    style.signposts.drawRegionSignpostValue,
  );
  oval(
    c,
    0,
    -96,
    13,
    11,
    style.signposts.drawRegionSignpostColor5,
    style.signposts.drawRegionSignpostColor4,
    style.signposts.drawRegionSignpostValue3,
  );
  poly(
    c,
    [
      [-6, -95],
      [-4, -102],
      [4, -103],
      [7, -98],
      [2, -92],
    ],
    zone.accent,
    '#566e49',
    1.4,
  );
  c.strokeStyle = '#6d8653';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-4, -91);
  c.lineTo(4, -100);
  c.stroke();
  for (const x of [-65, 65]) oval(c, x, -76, 2, 2, '#a48655');
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#344f3d';
  c.font = canvasFont(17);
  c.fillText(zone.name, 0, -68);
  c.strokeStyle = '#b8a171';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-47, -55);
  c.lineTo(47, -55);
  c.stroke();
  c.font = canvasFont(12);
  c.fillText(sign.subtitle || i18nText('common.level', { p0: zone.range }), 0, -44);
  c.restore();
}
