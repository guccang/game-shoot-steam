// 商店推荐与正式装填共用弹药类型，读取已装备主炮而非车体原装炮。
import {ammoKind,AMMO_TYPES} from '../../config/supplies.js';
import {vehicleWeapon,vehicleModel} from '../../config/vehicles.js';
// 选购分类决定比较对象，无实物供给的装备不推荐任何可买弹药。
export function equippedAmmo(game,target){
 const car=target==='vehicle',p=game.loadout||game.progress,owned=!!p.vehicleHulls[game.vehicle.index],weapon=car?(owned?vehicleWeapon(p,game.vehicle.weaponIndex):null):game.weapon(),key=ammoKind(weapon);
 return {target,key,name:car?(owned?vehicleModel(game.vehicle.index).name:'暂无载具'):weapon?.name||'未装备武器',weapon:weapon?.name||'',ammo:key?AMMO_TYPES[key].name:'',reason:key?'':car&&!owned?'尚未拥有当前载具':car&&!weapon?'未安装主炮，无需车载弹药':'此装备无需购买实物弹药'};
}
