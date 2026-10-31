// 旧战车回归显式创建已拥有松果战车的存档，避免依赖新手默认赠车。
import { freshProgress } from '../../src/progression/progress.js';
import { grantVehicleArmament } from '../../src/config/vehicle-armaments.js';
// 只用于已购战车的测试，不改变正式新玩家获取规则。
export function ownedPineProgress() {
  const p = freshProgress();
  p.vehicleHulls.fill(0); p.vehicleHulls[0] = 1; p.vehicleIndex = 0;
  grantVehicleArmament(p, 0);
  return p;
}
