// 收获物优先进入当前视野内最近的自有载具；负重预演和确认使用正式库存计算。
import {cargoAccessible} from './cargo.js';
import {personalFleet} from './vehicle-repair.js';
import {arrivalView} from './enemy-arrival.js';
import {vehicleLocations} from './vehicle-location.js';
import {nearest,worldDistance} from '../world/coordinates.js';
import {vehicleModel} from '../config/vehicles.js';
import {catLoad,vehicleLoad} from '../progression/load-weight.js';

// 使用渲染器发布的真实视野，随缩放、镜头偏移和屏幕尺寸变化，循环世界按最近镜像判断。
function visibleHarvestVehicle(game,site){
 if(site.mapId!==game.mapId)return false;
 if(game.cottage)return cargoAccessible(game,site.hull);
 const view=arrivalView(game),point=nearest(site,game.player),x=point.x-game.player.x,y=point.y-game.player.y;
 return x>=view.left&&x<=view.right&&y>=view.top&&y<=view.bottom;
}
// 满载不偷偷改投背包；排除报废、救援及被牵引车辆，视野内多车按距离选取。
export function harvestDestination(game){
 const sites=personalFleet(game)&&['playing','paused'].includes(game.state)?vehicleLocations(game).filter(v=>visibleHarvestVehicle(game,v)&&!game.progress.vehicleService[v.hull]?.phase&&game.vehicles[v.hull]?.hp>0&&game.progress.logistics.tow?.target!==v.hull):[];
 sites.sort((a,b)=>worldDistance(a,game.player)-worldDistance(b,game.player)||(a.hull===game.vehicle.index?-1:b.hull===game.vehicle.index?1:a.hull-b.hull));
 const hull=sites[0]?.hull??null;return {hull,name:hull===null?'猫猫背包':vehicleModel(hull).name+'货舱'};
}
// 同时计入本次奖励种子；按实际收货位置提示重量。
export function harvestLoadPreview(game,next,destination){
 const hull=destination.hull,snapshot=Object.assign(Object.create(game),{progress:next});
 const before=hull===null?catLoad(game):vehicleLoad(game,hull,{driver:true});
 const after=hull===null?catLoad(snapshot):vehicleLoad(game,hull,{driver:true,progress:next});
 return {...destination,before:before.weight??before.payload,after:after.weight??after.payload,capacity:after.capacity,overloaded:after.overloaded};
}
