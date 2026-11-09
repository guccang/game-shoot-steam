// 一键解锁只授予未拥有武器的一级所有权，不改变装备、资源或成长。
import { validateProgress } from '../progress.js';
import {storeDebugWeaponOverflow} from '../inventory/debug-storage.js';
import { WEAPONS } from '../../config/weapons.js';

// 返回独立候选快照，由应用先保存成功再提交内存，避免失败时部分解锁。
export function unlockedWeaponProgress(progress,game=null) {
  return storeDebugWeaponOverflow(progress,validateProgress({
    ...progress,
    weapons: WEAPONS.map((_, index) => Math.max(1, progress.weapons[index] || 0)),
  }),game);
}
