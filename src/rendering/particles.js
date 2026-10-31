import {drawDumplingImpact} from './dumpling-impact.js';
// 战斗粒子的 Canvas 适配器，不负责更新或伤害。
import { drawFunnelBurst } from './funnel-effects.js';
import { drawTideSplash } from './tide-cannon.js';
import { nearest } from '../world/coordinates.js';
// 低动态模式保留小幅命中光点，隐藏烟雾、弹壳和扩散环。
export function drawCombatFX(c, items, reduced = false, reference = null) {
  c.save();
  c.lineCap = 'round';
  for (const original of items) {
    const p = reference ? { ...original, ...nearest(original, reference) } : original;
    if (reduced && !['gel-impact','spark','blast','funnel-burst','tide-splash','tide-muzzle'].includes(p.kind)) continue;
    const age = 1 - p.life / p.duration;
    if (p.z > 0) {
      c.save();
      c.globalAlpha = 0.13 * Math.min(1, p.life);
      c.fillStyle = '#304d35';
      c.beginPath();
      c.ellipse(p.x, p.y + 8, p.size * 0.8, p.size * 0.3, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    c.save();
    c.translate(p.x, p.y - p.z);
    c.rotate(p.angle);
    c.globalAlpha = Math.min(1, (p.life / p.duration) * 2) * (reduced ? 0.45 : 1);
    c.fillStyle = p.color;
    c.strokeStyle = p.color;
    if(p.kind==='gel-impact'){drawDumplingImpact(c,p,age,reduced);}
    else if(p.kind==='tide-splash'||p.kind==='tide-muzzle') {
      drawTideSplash(c,p,age,reduced);
    } else if (p.kind === 'funnel-burst') {
      drawFunnelBurst(c, p, age, reduced);
    } else if (p.kind === 'pulse-scar') {
      // 地表裂纹先亮后暗，按能量前进方向逐段出现，不永久改变关卡地形。
      c.strokeStyle = '#42584d';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-20, 2);
      c.lineTo(-8, -3);
      c.lineTo(1, 3);
      c.lineTo(19, 0);
      c.stroke();
      c.strokeStyle = p.color;
      c.lineWidth = 1.2;
      c.globalAlpha *= 1 - age;
      for (const side of [-1, 1]) {
        c.beginPath();
        c.moveTo(-8, 0);
        c.lineTo(0, side * 12);
        c.lineTo(-5, side * 21);
        c.stroke();
      }
    } else if (p.kind === 'pulse-wave') {
      // 沿途冲击前沿依次触发，椭圆波面向弹道两侧快速扩散，随后自然消散。
      const expansion = 1 - Math.pow(1 - age, 3);
      c.globalAlpha *= (1 - age) * 0.8;
      for (let i = 0; i < 2; i++) {
        c.lineWidth = (i ? 2 : 5) * (1 - age) + 0.7;
        c.strokeStyle = i ? '#f1fff6' : '#80ffe0';
        c.beginPath();
        c.ellipse(
          -age * 12 - i * 9,
          0,
          p.size * (0.09 + expansion * 0.3),
          p.size * (0.25 + expansion * 0.95),
          0,
          0,
          Math.PI * 2,
        );
        c.stroke();
      }
    } else if (p.kind === 'pressure') {
      // 垂直于弹道的压缩波向外扩散，前后错开的弧线表达高速冲击。
      c.globalAlpha *= (1 - age) * 0.75;
      c.lineWidth = 3 * (1 - age) + 0.5;
      for (let i = 0; i < 2; i++) {
        c.beginPath();
        c.ellipse(
          -age * 10 - i * 8,
          0,
          p.size * (0.12 + age * 0.45),
          p.size * (0.2 + age),
          0,
          -1.5,
          1.5,
        );
        c.stroke();
      }
    } else if (p.kind === 'impact-flash') {
      // 炮弹使用暖色冲击亮芯，其他武器沿用白蓝亮芯，均限制在局部。
      const glow = c.createRadialGradient(0, 0, 0, 0, 0, p.size);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.15, p.warm ? '#fff0c4' : '#e8faff');
      glow.addColorStop(0.45, p.warm ? '#e8ad5e88' : '#8cdcff88');
      glow.addColorStop(1, p.warm ? '#e8ad5e00' : '#8cdcff00');
      c.fillStyle = glow;
      c.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
      c.fillStyle = p.warm ? '#fff3d0' : '#f4fcff';
      c.beginPath();
      c.moveTo(-p.size * 0.6, 0);
      c.lineTo(0, -5);
      c.lineTo(p.size, 0);
      c.lineTo(0, 5);
      c.closePath();
      c.fill();
    } else if (p.kind === 'blast') {
      const radius = p.size * (reduced ? 1 : Math.min(1, 0.3 + age * 2.8));
      c.globalAlpha *= (1 - age) * (reduced ? 0.3 : 0.8);
      const glow = c.createRadialGradient(0, 0, 0, 0, 0, radius);
      glow.addColorStop(0, '#fff6c6');
      glow.addColorStop(0.35, '#ffd574');
      glow.addColorStop(0.7, '#f98e49bb');
      glow.addColorStop(1, '#db642000');
      c.fillStyle = glow;
      c.beginPath();
      c.arc(0, 0, radius, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ffe8ac';
      c.lineWidth = 3 * (1 - age) + 1;
      c.stroke();
    } else if (p.kind === 'ring') {
      c.globalAlpha *= 1 - age;
      c.lineWidth = 2 * (1 - age) + 0.5;
      c.beginPath();
      c.ellipse(0, 0, 3 + p.size * age, 2 + p.size * age * 0.65, 0, 0, Math.PI * 2);
      c.stroke();
    } else if (p.kind === 'smoke') {
      c.globalAlpha *= 0.23 * (1 - age);
      c.beginPath();
      c.arc(0, 0, p.size * (1 + age * 1.8), 0, Math.PI * 2);
      c.fill();
    } else if (p.kind === 'spark') {
      c.lineWidth = reduced ? 1.5 : 2;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(-p.size * (reduced ? 1 : 2.5), 0);
      c.stroke();
    } else if (p.kind === 'chip') {
      c.beginPath();
      c.moveTo(-p.size, -p.size * 0.3);
      c.lineTo(p.size * 0.6, -p.size * 0.6);
      c.lineTo(p.size, p.size * 0.3);
      c.lineTo(-p.size * 0.3, p.size * 0.65);
      c.closePath();
      c.fill();
      c.strokeStyle = p.material === 'wood' ? '#f0cd8e' : '#ecd7ff';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-p.size * 0.5, 0);
      c.lineTo(p.size * 0.5, -p.size * 0.15);
      c.stroke();
    } else if (p.kind === 'drop') {
      c.beginPath();
      c.ellipse(0, 0, p.size * 1.6, p.size, 0, 0, Math.PI * 2);
      c.fill();
    } else {
      c.fillRect(-p.size / 2, -1.5, 5, 3);
    }
    c.restore();
  }
  c.restore();
}
