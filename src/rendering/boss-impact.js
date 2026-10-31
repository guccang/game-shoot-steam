// 五种 Boss 共用重击姿态；形变仅作用于美术，不改变脚底碰撞、技能时钟或镜头。
import { bossImpactProfile } from '../config/boss-combat.js';

// 沿真实来弹方向压缩并回弹，减少动态模式关闭形变，保留原有闪亮与弱碎光。
export function applyBossImpact(c, boss, reduced = false) {
  if (reduced || !(boss.heavyHit > 0)) return;
  const p = bossImpactProfile(boss.heavyKind),
    strength = Math.min(1, boss.heavyHit / p.flash),
    recoil = Math.sin(strength * Math.PI * 0.8) * p.pose;
  c.translate((boss.heavyHitX || 0) * recoil, (boss.heavyHitY || 0) * recoil * 0.5);
  c.scale(1 + strength * 0.09, 1 - strength * 0.09);
}
