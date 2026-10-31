// 只为旧模块回放构造低层车库：永久存档会迁移到专属主炮，旧战斗模块仍服务秘境。
import { Game } from '../../src/core/game.js';
import { createVehicle } from '../../src/combat/vehicle.js';

// 显式绕开永久挂载迁移来测试既有弹道与供给，不用于验证新工坊或存档行为。
export function legacyVehicleGame(progress,random) {
  const g=new Game(progress,random);
  g.progress.vehicleLoadouts=[...progress.vehicleLoadouts];
  g.vehicles=g.progress.vehicleHulls.map((_,i)=>createVehicle(g.progress,g.maxHp(),i));
  g.vehicle=g.vehicles[g.progress.vehicleIndex];
  return g;
}
