import {drawGravityProjectile} from './gravity-gun.js';
import { drawTankShell } from './vehicle-armaments.js';
import { drawTideProjectile } from './tide-cannon.js';
// 各类弹丸使用不同色彩、粗细与尾迹；水弹为连续流珠，弹射保留折线轨迹。
import { drawFunnelProjectile } from './funnel-effects.js';
import { drawPulseProjectile } from './pulse.js';
export function drawBallistics(c, bullets, reduced = false) {
  c.save();
  c.lineCap = 'round';
  for (const b of bullets) {
    if(b.effectKind==='hover-tide'){drawTideProjectile(c,b,reduced);continue;}
    if(b.kind==='gravity-gun'){drawGravityProjectile(c,b,reduced);continue;}
    if(['tank-125','wolf-256'].includes(b.kind)){drawTankShell(c,b,reduced);continue;}
    if (['funnel', 'drone'].includes(b.kind)) {
      drawFunnelProjectile(c, b, reduced);
      continue;
    }
    if (b.kind === 'pulse') {
      drawPulseProjectile(c, b, reduced);
      continue;
    }
    if (b.kind === 'grenade-bomb' || b.kind === 'flame') {
      drawSpecialProjectile(c, b, reduced);
      continue;
    }
    const water = b.kind === 'water',
      sniper = b.kind === 'sniper',
      height = (b.z ?? 9) - 9,
      tail = Math.min(reduced ? 9 : sniper ? 135 : water ? 16 : 26, b.travelled);
    c.save();
    c.fillStyle = '#31503b22';
    c.beginPath();
    c.ellipse(b.x, b.y + 5, water ? 7 : 4, 2, 0, 0, Math.PI * 2);
    c.fill();
    c.translate(0, -height);
    c.beginPath();
    if (!reduced && b.kind === 'ricochet' && b.trail.length) {
      c.moveTo(b.trail[0].x, b.trail[0].y);
      for (const p of b.trail) c.lineTo(p.x, p.y);
    } else c.moveTo(b.x - b.dx * tail, b.y - b.dy * tail);
    c.lineTo(b.x, b.y);
    c.strokeStyle = (b.color || '#fff1ac') + '55';
    c.lineWidth = water ? 12 : sniper && !reduced ? 13 : 7;
    c.stroke();
    c.strokeStyle = b.color || '#fff1ac';
    c.lineWidth = water ? 5 : sniper ? 3.5 : 2.5;
    c.stroke();
    if (sniper) {
      c.strokeStyle = '#f5fcff';
      c.lineWidth = 1.3;
      c.stroke();
    }
    if (b.kind === 'frost') {
      c.save();
      c.translate(b.x, b.y);
      c.rotate(Math.atan2(b.dy, b.dx));
      c.fillStyle = '#e7fbff';
      c.strokeStyle = '#8ac9ed';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(8, 0);
      c.lineTo(-3, -4);
      c.lineTo(-7, 0);
      c.lineTo(-3, 4);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    } else if (water) {
      c.beginPath();
      c.arc(b.x, b.y, 3 + b.age * 4, 0, Math.PI * 2);
      c.fillStyle = '#e6fbff';
      c.fill();
    } else {
      c.save();
      c.translate(b.x, b.y);
      c.rotate(Math.atan2(b.dy, b.dx) + (b.kind === 'ricochet' ? b.age * 20 : 0));
      c.fillStyle = b.color || '#fff1ac';
      c.fillRect(-4, -2, 8, 4);
      c.restore();
    }
    c.restore();
  }
  c.restore();
}

// 连锁电弧逐段衰减，折线由固定种子生成，低动态模式只显示稳定细线。
export function drawArcLink(c, shot, reduced) {
  c.save();
  c.globalAlpha = Math.max(0, shot.life / shot.lifetime);
  const dx = shot.ex - shot.x,
    dy = shot.ey - shot.y,
    length = Math.hypot(dx, dy) || 1;
  c.beginPath();
  c.moveTo(shot.x, shot.y);
  for (let i = 1; i <= 8; i++) {
    const offset = reduced || i === 8 ? 0 : Math.sin(shot.seed * 7 + i * 2.47) * 9;
    c.lineTo(
      shot.x + (dx * i) / 8 - (dy / length) * offset,
      shot.y + (dy * i) / 8 + (dx / length) * offset,
    );
  }
  c.lineJoin = 'round';
  c.strokeStyle = '#baa4f444';
  c.lineWidth = reduced ? 3 : 10;
  c.stroke();
  c.strokeStyle = '#c9c0ff';
  c.lineWidth = 3;
  c.stroke();
  c.strokeStyle = '#f9f5ff';
  c.lineWidth = 1.2;
  c.stroke();
  c.fillStyle = '#f2ebff';
  c.beginPath();
  c.arc(shot.ex, shot.ey, reduced ? 2 : 3.5, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// 榴弹显示离地高度与投影；火流宽度随实际飞行距离展开，低动态模式保留攻击边界。
function drawSpecialProjectile(c, b, reduced) {
  c.save();
  if (b.kind === 'grenade-bomb') {
    c.fillStyle = '#39462e40';
    c.beginPath();
    c.ellipse(b.x, b.y + 7, 8, 4, 0, 0, Math.PI * 2);
    c.fill();
    c.translate(b.x, b.y - b.z + 9);
    c.rotate(reduced ? 0 : b.age * 9);
    c.fillStyle = '#71865a';
    c.strokeStyle = '#354d38';
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(-7, -6, 14, 12, 4);
    c.fill();
    c.stroke();
    c.fillStyle = '#e8c76f';
    c.fillRect(-2, -6, 4, 12);
    c.fillStyle = '#fff1ae';
    c.fillRect(7, -2, 4, 4);
  } else {
    const radius = 5 + b.travelled * 0.16;
    c.globalAlpha = reduced ? 0.4 : Math.min(0.9, b.remaining / 45);
    c.translate(b.x, b.y);
    c.rotate(Math.atan2(b.dy, b.dx));
    const glow = c.createRadialGradient(0, 0, 1, 0, 0, radius * 1.5);
    glow.addColorStop(0, '#fff6b8');
    glow.addColorStop(0.25, '#ffcb62');
    glow.addColorStop(0.6, '#f7833bcc');
    glow.addColorStop(1, '#df502000');
    c.fillStyle = glow;
    c.beginPath();
    c.ellipse(0, 0, radius * 1.5, radius, 0, 0, Math.PI * 2);
    c.fill();
    if (!reduced) {
      c.fillStyle = '#fff2ad';
      c.beginPath();
      c.ellipse(
        -radius * 0.4,
        Math.sin(b.age * 33) * 3,
        radius * 0.5,
        radius * 0.22,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  }
  c.restore();
}
