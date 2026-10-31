import {facilityOpen} from '../config/town-restoration.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { recordEconomy } from './economy-ledger.js';
import {availableParkingSpot,parkNewVehicle} from './camp-parking.js';
// 载具与独立炮塔交易：先验证全部条件，再一次性扣除资源。
import { VEHICLE_WEAPONS, grantVehicleArmament, isVehicleArmament } from '../config/vehicle-armaments.js';
import {
  vehicleUpgradeCost,
  ownsVehicleWeapon,
  VEHICLE_MAX_LEVEL,
  COLLECTED_VEHICLES,
} from '../config/vehicles.js';
import { upgradeCost } from './progress.js';
import { payEquipment } from './equipment-goals.js';

// 车体购买附带专属主炮；旧炮塔保留独立交易兼容，角色枪械不随之获取。
export function transactVehicle(progress, kind, index, action) {
  if(!facilityOpen(progress,'garage'))return false;
  if (!['vehicle', 'turret'].includes(kind)) return false;
  if(kind==='turret' && (!isVehicleArmament(index) || !progress.vehicleHulls[VEHICLE_WEAPONS[index].hullIndex]))return false;
  if (action === 'buy') {
    if(kind==='vehicle'&&!availableParkingSpot(progress,index))return false;
    if (!payEquipment(progress, kind, index)) return false;
    if (kind === 'vehicle') { progress.vehicleHulls[index] = 1; grantVehicleArmament(progress,index);parkNewVehicle(progress,index); }
    else progress.vehicleWeapons[index] = 1;
    return true;
  }
  let cost;
  if (kind === 'vehicle' && Number.isInteger(index) && COLLECTED_VEHICLES[index]) {
    const level = progress.vehicleHulls[index];
    if (action === 'upgrade' && level > 0 && level < VEHICLE_MAX_LEVEL)
      cost = vehicleUpgradeCost(level, index, progress);
  } else if (
    kind === 'turret' &&
    Number.isInteger(index) &&
    VEHICLE_WEAPONS[index]
  ) {
    const level = progress.vehicleWeapons[index];
    if (action === 'upgrade' && ownsVehicleWeapon(progress, index) && level < GAMEPLAY_VALUES.progress.maxEquipmentLevel)
      cost = upgradeCost(level,progress,'turret',index);
  }
  if (!cost || progress.coins < cost.coins || progress.wood < cost.wood) return false;
  recordEconomy(progress,'expense','upgrade:'+kind+':'+index,cost);
  progress.coins -= cost.coins;
  progress.wood -= cost.wood;
  if (kind === 'vehicle') progress.vehicleHulls[index]++;
  else progress.vehicleWeapons[index]++;
  return true;
}
