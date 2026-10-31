// 仅迁移旧领主的血量快照，攻击、技能、胜场、装备和资源全部保留。
import { HEALTH_BALANCE_VERSION, waveDifficulty } from '../config/waves.js';

// 用未调整的攻击公式还原挑战波次，避免死亡回退后误用当前波次降低领主强度。
export function migrateBossHealth(progress) {
  const challenge = progress.bossChallenge;
  if (!challenge || challenge.healthVersion === HEALTH_BALANCE_VERSION) return;
  const attackMultiplier = Math.max(1, challenge.damage / 18);
  const n = Math.max(0, Math.round(
    (Math.sqrt(0.16 ** 2 + 4 * 0.015 * (attackMultiplier - 1)) - 0.16) / (2 * 0.015),
  ));
  const oldMultiplier = (1 + 0.24 * n + 0.025 * n * n) * ([0.55, 0.7, 0.85][n] ?? 1);
  const oldMax = challenge.maxHp;
  challenge.maxHp = Math.max(1, Math.round(oldMax * waveDifficulty(n + 1).health / oldMultiplier));
  challenge.healthVersion = HEALTH_BALANCE_VERSION;
  // 在途战斗按剩余比例换算，重复加载不再次削血，也不会刷新为满血。
  if (progress.patrol?.bossHp != null)
    progress.patrol.bossHp = Math.max(1, Math.min(challenge.maxHp,
      progress.patrol.bossHp / oldMax * challenge.maxHp));
}
