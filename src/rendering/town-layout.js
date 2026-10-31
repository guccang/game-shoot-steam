// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import {WORLD} from '../world/coordinates.js';
import { TOWN_COURTS } from '../config/town-layout.js';
import { box, oval } from './primitives.js';
import { drawWorldSign } from './world-signs.js';

// 小镇院落复用正式地块缓存和木牌画法；不添加碰撞、位图或新的动态缓存。

// 门前铺地收在各自院落内，低对比边缘保留草地过渡，石缝只点到为止。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawTownGround(c) {
  for (const base of TOWN_COURTS) for(const dx of base.x<0?[0,WORLD.width]:[0]) {
    const p={...base,x:base.x+dx};
    const stone = p.material === 'stone';
    box(c, p.x - 5, p.y - 5, p.w + 10, p.h + 10, 27, stone ? '#aab68a88' : '#bdb88888');
    box(
      c,
      p.x,
      p.y,
      p.w,
      p.h,
      23,
      stone ? style.townLayout.drawTownGroundColor : style.townLayout.drawTownGroundColor2,
    );
    if (stone) {
      c.strokeStyle = style.townLayout.drawTownGround_strokeStyleColor;
      c.lineWidth = 1;
      for (let y = p.y + 32; y < p.y + p.h - 16; y += 38) {
        c.beginPath();
        c.moveTo(p.x + 15, y);
        c.lineTo(p.x + p.w - 15, y);
        c.stroke();
        for (let x = p.x + 38 + (Math.round(y / 38) % 2) * 23; x < p.x + p.w - 20; x += 58) {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x, y - 27);
          c.stroke();
        }
      }
    }
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawTownSign(c, item, night = 0) {
  c.save();
  c.translate(item.x, item.y);
  oval(c, 5, 3, 23, 6, '#31523e26');
  box(
    c,
    -3,
    -37,
    6,
    39,
    2,
    night > 0.5 ? '#867555' : style.townLayout.drawTownSignColor,
    style.townLayout.drawTownSignColor2,
    1.5,
  );
  drawWorldSign(c, item.label, 0, -29);
  c.restore();
}
