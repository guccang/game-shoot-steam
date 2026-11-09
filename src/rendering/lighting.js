// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { box, oval, poly } from './primitives.js';
import { nightColor } from './river.js';
import { localIllumination } from '../world/lighting.js';
import {lightTransmission} from '../world/scene-depth.js';

// 卡通环境灯具：暖木灯柱、圆角提灯与双色火焰，光照不覆盖界面和伤害数字。

// 柔光使用有限半径渐变，保持中心温暖和边缘透明，不做全屏泛白。
// 共用绘制与动作输入，风格差异由配置提供。
function glow(c, x, y, radius, power, squash = 1) {
  if (power <= 0.001) return;
  c.save();
  c.translate(x, y);
  c.scale(1, squash);
  // 局部滤色保留地表原有明暗，只提亮灯芯附近，不铺满白雾。
  c.globalCompositeOperation = 'screen';
  const gradient = c.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, `rgba(255,222,139,${power * 0.55})`);
  gradient.addColorStop(0.36, `rgba(255,196,99,${power * 0.16})`);
  gradient.addColorStop(1, 'rgba(255,184,86,0)');
  c.fillStyle = gradient;
  c.fillRect(-radius, -radius, radius * 2, radius * 2);
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawLampGround(c, lights, objects) {
  c.save();
  const trees=objects.filter(item=>item.type==='tree');
  for (const light of lights) {
    c.save();
    // 树干的遮挡楔形只裁剪这一盏灯，不涂黑其他光源与地表；多个遮挡逐一相交。
    for(const tree of trees){
      const sx=light.x+(light.offset||0),sy=light.y,dx=tree.x-sx,dy=tree.y-sy,d=Math.hypot(dx,dy),r=9*(tree.size||1);
      if(d<=r||d>light.radius)continue;
      const nx=-dy/d*r,ny=dx/d*r,k=(light.radius*2+d)/d;
      c.beginPath();c.rect(sx-light.radius*3,sy-light.radius*3,light.radius*6,light.radius*6);
      c.moveTo(tree.x+nx,tree.y+ny);c.lineTo(sx+dx*k+nx*k,sy+dy*k+ny*k);c.lineTo(sx+dx*k-nx*k,sy+dy*k-ny*k);c.lineTo(tree.x-nx,tree.y-ny);c.closePath();c.clip('evenodd');
    }
    glow(c, light.x + light.offset, light.y - 3, light.radius * 0.8, light.power, 0.72);
    c.restore();
  }
  for (const item of objects) {
    if (item.type === 'fixture') continue;
    const { power, source } = localIllumination(item, lights);
    if (power < 0.025) continue;
    if(lightTransmission(item,source,trees)<.2)continue;
    const angle = Math.atan2(item.y - source.y, item.x - source.x - source.offset);
    const length = (item.type === 'tree' ? 34 : 17) * (0.5 + power);
    c.save();
    c.translate(item.x, item.y + 4);
    c.rotate(angle);
    oval(c, length * 0.7, 0, length, item.type === 'tree' ? 9 : 6, `rgba(29,42,44,${power * 0.23})`);
    c.restore();
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function flame(c, time, phase, reduced, rain) {
  const sway = reduced ? 0 : Math.sin(time * 6 + phase) * 2.4;
  c.save();
  c.scale(1, 1 - rain * 0.12);
  c.beginPath();
  c.moveTo(-7, 3);
  c.bezierCurveTo(-15, -8, -5, -13, -3 + sway, -27);
  c.bezierCurveTo(1 + sway, -21, 8, -18, 6, -11);
  c.quadraticCurveTo(13, -17, 10, -5);
  c.quadraticCurveTo(9, 6, -7, 3);
  c.fillStyle = '#ed9e50';
  c.fill();
  c.strokeStyle = '#b87848';
  c.lineWidth = 1.7;
  c.stroke();
  c.beginPath();
  c.moveTo(-4, 2);
  c.quadraticCurveTo(-6, -6, 1 + sway * 0.4, -15);
  c.quadraticCurveTo(1, -7, 6, -3);
  c.quadraticCurveTo(6, 5, -4, 2);
  c.fillStyle = '#fff0aa';
  c.fill();
  if (!reduced)
    for (let i = 0; i < 3; i++) {
      const age = (((time * 0.42 + phase + i / 3) % 1) + 1) % 1;
      c.globalAlpha = Math.sin(age * Math.PI) * (1 - rain * 0.6);
      oval(c, Math.sin(age * 5 + i) * 6, -20 - age * 25, 1.4, 2, '#ffe8a0');
    }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawLightFixture(c, light, time, environment, reduced = false) {
  c.save();
  c.translate(light.x, light.y);
  const color = (hex) => nightColor(hex, environment.night * 0.75);
  const outline = color(style.lighting.drawLightFixtureColor);
  oval(c, 4, 5, 17, 6, '#304b3530');
  box(
    c,
    -12,
    -5,
    24,
    10,
    4,
    color(style.lighting.drawLightFixtureColor2),
    outline,
    style.lighting.drawLightFixtureValue,
  );
  if (light.kind === 'lamp') {
    box(
      c,
      -5,
      -111,
      10,
      109,
      3,
      color(style.lighting.drawLightFixtureColor3),
      outline,
      style.lighting.drawLightFixtureValue,
    );
    box(c, -2, -103, 3, 92, 1, color('#d4be8b'));
    box(
      c,
      -8,
      -113,
      36,
      7,
      3,
      color(style.lighting.drawLightFixtureColor4),
      outline,
      style.lighting.drawLightFixtureValue,
    );
    box(c, 15, -108, 5, 12, 2, outline);
    box(c, 7, -96, 23, 28, 5, color('#d9c58e'), outline, style.lighting.drawLightFixtureValue);
    c.globalAlpha = light.power;
    box(c, 9, -94, 19, 24, 4, '#ffe4a0');
    oval(c, 18, -81, 4, 8, '#fff7d1');
    c.globalAlpha = 1;
    poly(
      c,
      [
        [4, -96],
        [12, -103],
        [24, -103],
        [33, -96],
      ],
      color(style.lighting.drawLightFixtureColor5),
      outline,
      style.lighting.drawLightFixtureValue,
    );
    box(c, 5, -70, 27, 5, 2, color(style.lighting.drawLightFixtureColor5), outline, 2);
    box(c, 16, -95, 3, 25, 1, color('#a28e5e'));
    poly(
      c,
      [
        [-2, -112],
        [-10, -119],
        [-4, -121],
        [1, -116],
      ],
      color('#9eb87b'),
      outline,
      1.5,
    );
  } else {
    box(c, -5, -49, 10, 48, 3, color('#af875c'), outline, style.lighting.drawLightFixtureValue);
    box(c, -2, -40, 3, 34, 1, color('#d1ac75'));
    c.save();
    c.translate(0, -55);
    flame(c, time, light.phase, reduced, environment.rain || 0);
    c.restore();
    poly(
      c,
      [
        [-13, -54],
        [13, -54],
        [8, -43],
        [-8, -43],
      ],
      color('#667761'),
      outline,
      style.lighting.drawLightFixtureValue,
    );
    box(c, -14, -56, 28, 5, 2, color('#9a9c76'), outline, 2);
    box(c, -6, -31, 12, 5, 2, color('#68745a'));
  }
  glow(c, light.offset, -light.height, light.kind === 'lamp' ? 30 : 26, light.power * 0.95);
  c.restore();
}
