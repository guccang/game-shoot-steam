import {MECH_HULL} from '../config/biped-mech.js';
import horse from '../../assets/vehicle-eras/horse.json' with {type:'json'};
import {eraVehicle} from '../config/vehicle-eras.js';
// 轮式载具按真实位移滚动，避免撞墙空转和停车重置轮姿。
import { nearest } from '../world/coordinates.js';

// 在正式移动完成后累计有界轮角；反向驾驶反转，暂停及下车保留姿态。
export function advanceVehicleWheels(vehicle, player, previous, dt=0) {
  if (!vehicle.active || vehicle.index!==MECH_HULL && !eraVehicle(vehicle.index) && ![0,4,5,6,7,8,9,10].includes(vehicle.index)) return;
  const point = nearest(player, previous), dx = point.x - previous.x, dy = point.y - previous.y;
  const distance = Math.hypot(dx, dy);
  if(eraVehicle(vehicle.index)?.horse){
    const mode=distance>.02?'walk':'idle';
    if(mode!==vehicle.horseMode){
      vehicle.horseCursor=horse.transitions[mode][vehicle.horseFrame??0];
      vehicle.horseMode=mode;
    }
    const sequence=horse[mode];
    vehicle.horseCursor=(vehicle.horseCursor+(mode==='walk'?distance/7:dt*horse.fps))%sequence.length;
    vehicle.horseFrame=sequence[Math.floor(vehicle.horseCursor)];
  }
  if (distance < 1e-8) return;
  const direction = Math.sign(Math.abs(dy) >= Math.abs(dx) ? dy : dx);
  const cycle = Math.PI * 2;
  vehicle.wheelPhase = ((vehicle.wheelPhase || 0) + direction * distance / 12) % cycle;
}
