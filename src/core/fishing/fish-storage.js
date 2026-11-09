// 收鱼预览与实际入库共享选择规则：已选容器、背包、由近至远的可用载具。
import {FISH_SPECIES,OUTDOOR_RULES} from '../../config/outdoors.js';
import {FISHING_CONTAINERS} from '../../config/fishing-tackle.js';
import {fishStoreStats} from '../../progression/fishing/fish-storage.js';
import {validateProgress} from '../../progression/progress.js';
import {catLoad,vehicleLoad} from '../../progression/inventory/load-weight.js';
import {vehicleModel} from '../../config/vehicles.js';
import {vehicleLocations} from '../vehicles/vehicle-location.js';
import {cargoAccessible} from '../inventory/cargo.js';
import {worldDistance} from '../../world/coordinates.js';
// 附近必须是同地图、可装卸的自有载具；维修、远车、另一层地面车不参与。
export function nearbyFishVehicles(game){return vehicleLocations(game).filter(v=>(game.progress.campParking.owned.some(r=>r.hull===v.hull)||game.vehicle.active&&game.vehicle.index===v.hull||v.hull===4&&game.fireGarageParked)&&cargoAccessible(game,v.hull)).sort((a,b)=>worldDistance(a,game.player)-worldDistance(b,game.player)).map(v=>v.hull);}
// 仅修改候选存档；失败时鱼仍在待确认状态，图鉴与调查计数由提交方更新。
export function planFishStorage(game,fishId,destination='auto'){
 const fish=FISH_SPECIES.find(f=>f.id===fishId);if(!fish)return {ok:false,message:'鱼获信息无效，请重新查看。'};
 const next=validateProgress(structuredClone(game.progress)),p=next.outdoors,cars=nearbyFishVehicles(game);
 const places=destination==='auto'?[p.selectedContainer,'bag',...cars]:destination==='vehicle'?cars:[destination];
 for(const where of places){
  if(Object.hasOwn(FISHING_CONTAINERS,where)){
   if(!p.containers[where])continue;const stats=fishStoreStats(p.fishStores[where]),gear=FISHING_CONTAINERS[where];
   if(stats.count>=OUTDOOR_RULES.maxFish||stats.mass+fish.mass>gear.capacity+1e-6)continue;
   p.fishStores[where][fish.id]++;return {ok:true,next,where,label:gear.name};
  }
  if(where==='bag'){
   if(fishStoreStats(p.fish).count>=OUTDOOR_RULES.maxFish)continue;
   p.fish[fish.id]++;if(!catLoad(Object.assign(Object.create(game),{progress:next})).overloaded)return {ok:true,next,where,label:'背包鱼护'};p.fish[fish.id]--;
  }else if(Number.isInteger(where)&&cars.includes(where)){
   const store=next.shopStock[where]??={},key='fish:'+fish.id;if((store[key]||0)>=OUTDOOR_RULES.maxFish)continue;
   store[key]=(store[key]||0)+1;if(!vehicleLoad(game,where,{driver:false,progress:next}).overloaded)return {ok:true,next,where,label:vehicleModel(where).name+'的载具仓库'};store[key]--;if(!store[key])delete store[key];
  }
 }
 return {ok:false,message:destination==='auto'?'鱼获容器、背包和附近载具都无法容纳这条鱼，请整理后重试或放生。':destination==='vehicle'?'附近没有能装下这条鱼的载具。':'所选位置未拥有或容量不足，请更换存放位置。'};
}
