import {eraVehicle,eraDonor} from '../config/vehicle-eras.js';
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
    const donor=kind==='vehicle'&&eraDonor(eraVehicle(index));
    if(kind==='vehicle'&&!donor&&!availableParkingSpot(progress,index))return false;
    if (!payEquipment(progress, kind, index)) return false;
    if (kind === 'vehicle') { progress.vehicleHulls[index] = 1; grantVehicleArmament(progress,index);if(donor)refitVehicle(progress,donor.index,index);else parkNewVehicle(progress,index); }
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

// 原车和新车交换仓位，货物、装配、损耗与停车记录均随同一实体迁移。
function refitVehicle(p,from,to){
  p.vehicleHulls[from]=0;
  const parked=p.campParking.owned.find(r=>r.hull===from);parked.hull=to;
  for(const slots of [p.logistics.builds,p.supplies.vehicles,p.supplies.engineFaults,p.vehicleService]){
    [slots[from],slots[to]]=[slots[to],slots[from]];
  }
  if(p.shopStock[from]){p.shopStock[to]=p.shopStock[from];delete p.shopStock[from];}
  for(const location of Object.values(p.treasure.parts))if(location.hull===from)location.hull=to;
  if(p.outdoors.tentHull===from)p.outdoors.tentHull=to;
  if(p.vehicleIndex===from)p.vehicleIndex=to;
}
