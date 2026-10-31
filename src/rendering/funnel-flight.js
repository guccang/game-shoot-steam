// 飞控可视反馈：实际速度决定矢量推进、尾迹与反向制动喷流，不参与战斗更新。
import { oval } from './primitives.js';

// 历史航迹只在快速出击与回收时短暂显示，驻点后消失；不绘制永久牵引线。
export function drawFunnelFlight(c, player, node) {
  const f = node.flight;
  if (!f) return;
  c.save();
  c.translate(player.x, player.y);
  c.lineCap = 'round';
  for (let i = 1; i < (f.trail?.length || 0); i++) {
    const a = f.trail[i - 1],
      b = f.trail[i];
    c.globalAlpha = (Math.min(a.life, b.life) / 0.2) * 0.42;
    c.strokeStyle = '#82e6df';
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
    c.globalAlpha *= 0.8;
    c.strokeStyle = '#f1ffed';
    c.lineWidth = 1;
    c.stroke();
  }
  // 到站刹停亮一次短环，形成明确的射位确认，不持续闪烁。
  if (f.arrival > 0) {
    c.globalAlpha = (f.arrival / 0.28) * 0.65;
    c.strokeStyle = '#b8ffee';
    c.lineWidth = 1.3;
    c.beginPath();
    c.ellipse(node.x, node.y, 14 + (1 - f.arrival / 0.28) * 12, 8, 0, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
  if (f.thrust < 0.035) return;
  const speed = Math.hypot(f.vx, f.vy);
  if (speed < 1) return;
  const dx = f.vx / speed,
    dy = f.vy / speed,
    power = f.thrust;
  c.save();
  c.translate(player.x + node.x, player.y + node.y);
  c.rotate(Math.atan2(dy, dx));
  // 尾部宽而短的光带在快速侧移时拉长，停稳后自然熄灭，不残留满屏轨迹。
  c.globalAlpha = power * 0.6;
  c.lineCap = 'round';
  c.strokeStyle = '#64cccf';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(-7, 0);
  c.lineTo(-10 - power * 14, 0);
  c.stroke();
  c.globalAlpha = power * 0.95;
  c.strokeStyle = '#effff5';
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(-7, 0);
  c.lineTo(-10 - power * 12, 0);
  c.stroke();
  // 双侧矢量喷口让炮体平移时仍能朝目标瞄准；制动时点亮前方反推喷口。
  for (const sign of [-1, 1]) {
    oval(c, -8, sign * 10, 3 + power * 5, 1.8, '#98f2e7');
    oval(c, -7, sign * 10, 2.5, 1, '#f1fff5');
    if (f.brake > 0.08) {
      c.globalAlpha = f.brake * 0.8;
      oval(c, 13, sign * 8, 2 + f.brake * 4, 1.5, '#c1fff0');
    }
  }
  c.restore();
}
