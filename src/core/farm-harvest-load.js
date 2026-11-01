// 收获物优先进入最近的可装卸自有载具；负重预演和确认使用正式库存计算。
import {cargoAccessible} from './cargo.js';
import {vehicleLocations} from './vehicle-location.js';
import {worldDistance} from '../world/coordinates.js';
import {vehicleModel} from '../config/vehicles.js';
import {catLoad,vehicleLoad} from '../progression/load-weight.js';

// 满载不偷偷改投背包；排除报废、救援及被牵引车辆，距离相同时优先当前车辆。
export function harvestDestination(game){
 const sites=vehicleLocations(game).filter(v=>cargoAccessible(game,v.hull)&&!game.progress.vehicleService[v.hull]?.phase&&game.vehicles[v.hull]?.hp>0&&game.progress.logistics.tow?.target!==v.hull);
 sites.sort((a,b)=>worldDistance(a,game.player)-worldDistance(b,game.player)||(a.hull===game.vehicle.index?-1:b.hull===game.vehicle.index?1:a.hull-b.hull));
 const hull=sites[0]?.hull??null;return {hull,name:hull===null?'猫猫背包':vehicleModel(hull).name+'货舱'};
}
// 同时计入本次奖励种子；车辆按含驾驶员及背包的口径提示，避免装完上车才超载。
export function harvestLoadPreview(game,next,destination){
 const hull=destination.hull,snapshot=Object.assign(Object.create(game),{progress:next});
 const before=hull===null?catLoad(game):vehicleLoad(game,hull,{driver:true});
 const after=hull===null?catLoad(snapshot):vehicleLoad(game,hull,{driver:true,progress:next});
 return {...destination,before:before.weight??before.payload,after:after.weight??after.payload,capacity:after.capacity,overloaded:after.overloaded};
}
