import {facilityOpen} from '../config/town-restoration.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { recordEconomy } from './economy-ledger.js';
import {availableParkingSpot,parkNewVehicle} from './camp-parking.js';
// 载具与独立炮塔交易：先验证全部条件，再一次性扣除资源。
import { VEHICLE_WEAPONS, grantVehicleArmament, isVehicleArmament } from '../config/vehicle-armaments.js';
import {
  ownsVehicleWeapon,
} from '../config/vehicles.js';
import { upgradeCost } from './progress.js';
import { payEquipment } from './equipment-goals.js';

// 购买车体附带专属主炮，主炮可以独立升级；车体部件由整备事务升级。
export function transactVehicle(progress, kind, index, action) {
  if(kind==='vehicle'&&action==='upgrade')return false;
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
  if (
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
  progress.vehicleWeapons[index]++;
  return true;
}
