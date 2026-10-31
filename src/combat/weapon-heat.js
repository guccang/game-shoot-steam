// 加特林热度是独立炮管的运行时表现状态，不改变伤害、射速或弹药规则。
const HEAT_UP_SECONDS = 4;
const COOL_DOWN_SECONDS = 3;

// 渲染只读真实运转累计热量，剩余一发或空弹夹都不会自动变红。
export function gatlingHeat(weapon, magazine) {
  if (weapon?.id !== 'gatling' || !magazine) return 0;
  const heat = magazine.heat ?? 0;
  return Math.max(0, Math.min(1, Number.isFinite(heat) ? heat : 0));
}

// 有效开火才维持炮管运转，短暂尾转覆盖两发之间的间隔，不按扣弹量加热。
export function recordGatlingShot(magazine, weapon) {
  if (weapon?.id !== 'gatling' || !magazine) return;
  magazine.heatSpin = Math.min(0.25, Math.max(0.1, weapon.interval * 1.5));
}

// 持续运转四秒烧红，停转三秒自然冷却；装填从当前温度平滑降至零。
export function advanceGatlingHeat(magazine, weapon, dt, reloading = false) {
  if (weapon?.id !== 'gatling' || !magazine || !(dt > 0)) return;
  const heat = gatlingHeat(weapon, magazine);
  if (reloading && magazine.remaining > 0) {
    // 与弹夹结束阈值一致，避免分帧浮点余量让补满后仍留下极小热色。
    magazine.heat = magazine.remaining - dt < 1e-8
      ? 0 : heat * Math.max(0, 1 - dt / magazine.remaining);
    magazine.heatSpin = 0;
    return;
  }
  const running = Math.min(dt, Math.max(0, magazine.heatSpin || 0));
  magazine.heatSpin = Math.max(0, (magazine.heatSpin || 0) - dt);
  magazine.heat = Math.max(
    0,
    Math.min(1, heat + running / HEAT_UP_SECONDS) - (dt - running) / COOL_DOWN_SECONDS,
  );
}

// 平滑插值冷色到炽红，保持六位颜色格式以兼容现有尾迹透明度拼接。
export function heatColor(cold, hot, heat) {
  const t = Math.max(0, Math.min(1, heat));
  const a = parseInt(cold.slice(1), 16),
    b = parseInt(hot.slice(1), 16);
  return (
    '#' +
    [16, 8, 0]
      .map((shift) =>
        Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

// 子弹在出膛时锁定颜色，装填或换枪不会让已发射的弹丸突然变色。
export function gatlingShotColor(weapon, magazine) {
  return heatColor(weapon.color, '#ff4938', gatlingHeat(weapon, magazine));
}
