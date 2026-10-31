// 轮式载具按真实位移滚动，避免撞墙空转和停车重置轮姿。
import { nearest } from '../world/coordinates.js';

// 在正式移动完成后累计有界轮角；反向驾驶反转，暂停及下车保留姿态。
export function advanceVehicleWheels(vehicle, player, previous) {
  if (!vehicle.active || ![0,4,5,6,7,8].includes(vehicle.index)) return;
  const point = nearest(player, previous), dx = point.x - previous.x, dy = point.y - previous.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-8) return;
  const direction = Math.sign(Math.abs(dy) >= Math.abs(dx) ? dy : dx);
  const cycle = Math.PI * 2;
  vehicle.wheelPhase = ((vehicle.wheelPhase || 0) + direction * distance / 12) % cycle;
}
