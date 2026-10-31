// 脉冲视觉只读取战斗状态，所有振动、汇聚、余辉均不修改瞄准和伤害。
import { weaponPose, RECOIL_PROFILES, PLAYER_SCALE, GUN_SCALE } from '../combat/recoil.js';

// 随蓄能逐渐增强局部位移和扭振；减少动态模式完全关闭枪身震动。
export function pulseChargePose(charge, time, reduced = false) {
  const q = reduced ? 0 : Math.max(0, Math.min(1, charge));
  const power = q * q;
  return {
    x: Math.sin(time * 92) * 3.4 * power,
    y: Math.sin(time * 117 + 0.7) * 2.2 * power,
    rotation: Math.sin(time * 83 + 0.3) * 0.045 * power,
  };
}

// 汇聚中心跟随枪身的局部振动，实际开火仍使用规则层的原始枪口坐标。
export function chargeMuzzle(player, guide, weapon, vibration) {
  const pose = weaponPose(guide.angle, weapon, player.recoil);
  const tipX = 8 + RECOIL_PROFILES[weapon].muzzle * GUN_SCALE,
    tipY = -1.5 * GUN_SCALE;
  const dx =
    vibration.x + (Math.cos(vibration.rotation) - 1) * tipX - Math.sin(vibration.rotation) * tipY;
  const dy =
    vibration.y + Math.sin(vibration.rotation) * tipX + (Math.cos(vibration.rotation) - 1) * tipY;
  return {
    x:
      guide.muzzle.x +
      pose.flip * (Math.cos(pose.rotation) * dx - Math.sin(pose.rotation) * dy) * PLAYER_SCALE,
    y:
      guide.muzzle.y + (Math.sin(pose.rotation) * dx + Math.cos(pose.rotation) * dy) * PLAYER_SCALE,
  };
}

// 环形约束场、螺旋光流和向内吸入的粒子共同表达蓄力；所有相位来自战斗时钟。
export function drawPulseCharge(c, guide, zoom, time, reduced) {
  if (guide?.kind !== 'pulse' || guide.charge <= 0) return;
  const q = guide.charge;
  c.save();
  c.translate(guide.muzzle.x, guide.muzzle.y);
  c.scale(1 / zoom, 1 / zoom);
  c.strokeStyle = '#acfff0';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, 0, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * q);
  c.stroke();
  if (!reduced) {
    const radius = 24 + q * 34;
    const glow = c.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, '#ffffef');
    glow.addColorStop(0.12, '#d6fff6');
    glow.addColorStop(0.35, '#4fffc6aa');
    glow.addColorStop(1, '#4fffc600');
    c.fillStyle = glow;
    c.fillRect(-radius, -radius, radius * 2, radius * 2);
    c.globalCompositeOperation = 'lighter';
    // 两道反向旋转的约束环逐渐收拢，末段仍保留清楚的枪口轮廓。
    for (let ring = 0; ring < 2; ring++) {
      const r = 22 + (1 - q) * 16 + ring * 11;
      c.strokeStyle = ring ? '#7effd6' : '#dcfff3';
      c.lineWidth = 1.5 + q;
      c.globalAlpha = 0.35 + q * 0.45;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 + time * (ring ? -2.3 : 2.8);
        c.beginPath();
        c.ellipse(0, 0, r, r * 0.62, guide.angle, a, a + 0.95);
        c.stroke();
      }
    }
    // 固定粒子数量与确定性相位，暂停时冻结，也不会消耗战斗随机源。
    for (let i = 0; i < 20; i++) {
      const phase = (time * (0.85 + q * 0.8) + i * 0.618) % 1;
      const a = i * 2.399 + phase * 0.9,
        r = 7 + (1 - phase) ** 1.5 * (62 + q * 22);
      const tail = 7 + q * 13;
      c.globalAlpha = (0.25 + q * 0.7) * Math.sin(phase * Math.PI);
      c.strokeStyle = i % 3 ? '#80ffe1' : '#f0fff1';
      c.lineWidth = 1.2 + q * 1.5;
      c.beginPath();
      c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      c.quadraticCurveTo(
        Math.cos(a - 0.12) * (r + tail * 0.5),
        Math.sin(a - 0.12) * (r + tail * 0.5),
        Math.cos(a - 0.22) * (r + tail),
        Math.sin(a - 0.22) * (r + tail),
      );
      c.stroke();
      c.fillStyle = '#eefff3';
      c.beginPath();
      c.arc(Math.cos(a) * r, Math.sin(a) * r, 1.5 + q, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 0.7 + q * 0.3;
    c.fillStyle = '#f7ffed';
    c.beginPath();
    c.arc(0, 0, 3 + q * 5, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

// 从发射原点延伸至已经飞过的位置，粗亮芯和侧翼电流在弹头消失后短暂衰减。
export function drawPulseBeam(c, beam, reduced = false) {
  const length = Math.hypot(beam.ex - beam.x, beam.ey - beam.y);
  if (length < 1) return;
  const fade = Math.max(0, Math.min(1, beam.life / beam.lifetime));
  c.save();
  c.translate(beam.x, beam.y);
  c.rotate(Math.atan2(beam.ey - beam.y, beam.ex - beam.x));
  c.globalAlpha = fade * (reduced ? 0.55 : 1);
  c.lineCap = 'butt';
  const widths = reduced
    ? [
        [18, '#8fead3'],
        [6, '#f1fff6'],
      ]
    : [
        [96, '#38e8bb12'],
        [66, '#50ffce32'],
        [38, '#74ffdfa0'],
        [23, '#b8fff0'],
        [9, '#ffffef'],
      ];
  for (const [width, color] of widths) {
    c.strokeStyle = color;
    c.lineWidth = width * (0.65 + fade * 0.35);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(length, 0);
    c.stroke();
  }
  if (!reduced) {
    c.strokeStyle = '#d6fff0';
    c.lineWidth = 2;
    c.globalAlpha *= 0.75;
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(0, side * 20);
      for (let x = 12; x < length; x += 12)
        c.lineTo(x, side * (20 + Math.sin(x * 0.16 - beam.phase * 30) * 5));
      c.lineTo(length, side * 20);
      c.stroke();
    }
  }
  c.restore();
}

// 明亮的压缩弹头位于真实碰撞前沿，与能量通道共同组成一次发射。
export function drawPulseProjectile(c, b, reduced) {
  c.save();
  c.translate(b.x, b.y - ((b.z ?? 9) - 9));
  c.rotate(Math.atan2(b.dy, b.dx));
  c.fillStyle = reduced ? '#ddfff1' : '#f3fff0';
  c.beginPath();
  c.ellipse(0, 0, reduced ? 10 : 19, reduced ? 9 : 19, 0, 0, Math.PI * 2);
  c.fill();
  if (!reduced) {
    c.strokeStyle = '#b8ffea';
    c.lineWidth = 4;
    for (let i = 0; i < 2; i++) {
      c.beginPath();
      c.ellipse(-i * 14, 0, 13, 33 + i * 8, 0, -1.5, 1.5);
      c.stroke();
    }
  }
  c.restore();
}
