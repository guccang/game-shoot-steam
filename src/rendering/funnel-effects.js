// 星环专属能量表现：只读战斗时钟与姿态，不参与锁定、命中或能源结算。
import { oval, poly } from './primitives.js';

// 两层低透明度辉光保持卡通轮廓，避免全屏泛白或持续霓虹覆盖。
function glow(c, x, y, radius) {
  oval(c, x, y, radius, radius, '#78e7df22');
  oval(c, x, y, radius * 0.65, radius * 0.65, '#a9ffed44');
}

// 炮口在开火前收束环与微粒，范围限制在炮体锚点三十单位以内。
export function drawFunnelGather(c, progress, time, index) {
  if (progress <= 0) return;
  c.save();
  c.globalAlpha = 0.35 + progress * 0.65;
  const radius = 10 - progress * 5;
  glow(c, 17, 0, 11);
  c.strokeStyle = '#a3fbed';
  c.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3 + time * 3 + index;
    c.beginPath();
    c.arc(17, 0, radius, angle, angle + 1.25);
    c.stroke();
    const p = (time * 2.4 + i / 3) % 1;
    oval(
      c,
      17 + Math.cos(angle) * 10 * (1 - p),
      Math.sin(angle) * 10 * (1 - p),
      1.8,
      1.8,
      '#e5fff3',
    );
  }
  oval(c, 17, 0, 1.5 + progress * 3, 1.5 + progress * 3, '#f1ffe6');
  c.restore();
}

// 发射亮芯与横向冲击环独立于弹丸，开火后快速消退，不改变炮口坐标。
export function drawFunnelFlash(c, strength, reduced = false) {
  if (strength <= 0) return;
  c.save();
  if (reduced) {
    oval(c, 17, 0, 2.5, 2, '#e0ffe9');
  } else {
    const power = Math.min(1, strength);
    c.globalAlpha = power;
    glow(c, 17, 0, 12);
    poly(
      c,
      [
        [14, 0],
        [22, -4],
        [29, 0],
        [22, 4],
      ],
      '#f6ffe8',
      null,
    );
    c.strokeStyle = '#b8fff1';
    c.lineWidth = 1 + power * 1.5;
    c.beginPath();
    c.ellipse(17, 0, 2 + (1 - power) * 7, 5 + (1 - power) * 11, 0, 0, Math.PI * 2);
    c.stroke();
    // 核心至炮口的导轨短亮一次，与每门炮的错峰后坐同步。
    c.strokeStyle = '#efffe5';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-4, -3);
    c.lineTo(12, -3);
    c.stroke();
  }
  c.restore();
}

// 炮体返航进入近身区域后，充能光点从控制器沿曲线输送到各核心。
export function drawFunnelReturn(c, player, state) {
  c.save();
  c.translate(player.x, player.y);
  const start = { x: 8, y: -12 };
  glow(c, start.x, start.y, 10);
  for (const node of state.nodes) {
    // 远处炮体先飞回泊位，再显示控制器的近距离充能连接。
    if (
      (!state.charging && (!node.charging || node.flight.mode !== 'dock')) ||
      Math.hypot(node.x, node.y) > 105
    )
      continue;
    const end = {
      x: node.x - Math.cos(node.angle) * (4 + node.recoil.kick),
      y: node.y - Math.sin(node.angle) * (4 + node.recoil.kick),
    };
    const control = {
      x: (start.x + end.x) * 0.5 + (node.index === 2 ? 12 : -12),
      y: (start.y + end.y) * 0.5 + 12,
    };
    c.beginPath();
    c.moveTo(start.x, start.y);
    c.quadraticCurveTo(control.x, control.y, end.x, end.y);
    c.strokeStyle = '#79e3d433';
    c.lineWidth = 5;
    c.stroke();
    c.strokeStyle = '#c6ffed70';
    c.lineWidth = 1;
    c.stroke();
    // 五组头尾光点沿曲线回流，数量固定，不产生跨帧增长的粒子列表。
    for (let i = 0; i < 5; i++) {
      const p = (state.time * 0.9 + i / 5 + node.index * 0.07) % 1;
      for (let tail = 0; tail < 3; tail++) {
        const t = Math.max(0, p - tail * 0.035),
          inv = 1 - t;
        const x = inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x;
        const y = inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y;
        c.globalAlpha = (1 - tail * 0.3) * Math.sin(p * Math.PI);
        oval(c, x, y, tail ? 1.6 : 2.4, tail ? 1.6 : 2.4, tail ? '#8fead9' : '#efffe6');
      }
    }
    c.globalAlpha = 1;
    glow(c, end.x, end.y, 11);
    // 核心周围的收缩弧与回流方向一致，避开中央头顶充能徽章。
    const pulse = (state.time * 1.1 + node.index / 3) % 1;
    c.globalAlpha = 0.65 * Math.sin(pulse * Math.PI);
    c.strokeStyle = '#b2ffe6';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(end.x, end.y, 11 - pulse * 6, node.angle + 0.4, node.angle + 5.6);
    c.stroke();
    c.globalAlpha = 1;
  }
  c.restore();
}

// 命中爆裂使用局部亮芯、扩散断环和定向星芒；低动态仅保留微弱命中光点。
export function drawFunnelBurst(c, particle, age, reduced = false) {
  if (reduced) {
    oval(c, 0, 0, 4, 3, '#b7eee0');
    return;
  }
  const expansion = 1 - Math.pow(1 - age, 3),
    radius = 3 + particle.size * expansion;
  c.save();
  c.globalAlpha *= 1 - age;
  glow(c, 0, 0, Math.min(28, radius));
  c.strokeStyle = '#81ddda';
  c.lineWidth = 3.5 * (1 - age) + 0.5;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.ellipse(0, 0, radius * 0.8, radius, 0, i * 2.1, i * 2.1 + 1.65);
    c.stroke();
  }
  c.strokeStyle = '#ddfff0';
  c.lineWidth = 1.4;
  c.beginPath();
  c.ellipse(0, 0, radius * 0.45, radius * 0.72, 0, 0, Math.PI * 2);
  c.stroke();
  const flash = Math.max(0, 1 - age * 2.6);
  if (flash > 0) {
    c.globalAlpha *= flash;
    poly(
      c,
      [
        [-14 * flash, 0],
        [-3, -4],
        [0, -18 * flash],
        [4, -3],
        [25 * flash, 0],
        [4, 4],
        [0, 18 * flash],
        [-3, 3],
      ],
      '#efffda',
      null,
    );
    oval(c, 0, 0, 6, 5, '#ffffff');
  }
  c.restore();
}

// 能量弹使用短促亮芯与有限尾迹，范围始终跟随真实已飞行距离。
export function drawFunnelProjectile(c, bullet, reduced = false) {
  const tail = Math.min(reduced ? 8 : 38, bullet.travelled);
  c.save();
  c.translate(bullet.x, bullet.y);
  c.rotate(Math.atan2(bullet.dy, bullet.dx));
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-tail, 0);
  c.lineTo(0, 0);
  if (!reduced) {
    c.strokeStyle = '#83e8df44';
    c.lineWidth = 10;
    c.stroke();
  }
  c.strokeStyle = '#91eddf';
  c.lineWidth = reduced ? 2 : 4;
  c.stroke();
  c.strokeStyle = '#eefff0';
  c.lineWidth = 1.5;
  c.stroke();
  oval(c, 0, 0, reduced ? 2 : 5, reduced ? 2 : 3, '#efffe7');
  c.restore();
}
