// 收获物在仓库门前整笔兑换，保存成功后才播放飞行，不把表现完成当作第二次入账。
import {canUseWarehouse,warehouseVehicles} from './warehouse.js';
import {WAREHOUSE} from '../config/warehouse.js';
import {FARM_CROPS} from '../config/farm.js';
import {RESOURCE_CAP} from '../config/resource-limits.js';
import {validateProgress} from '../progression/progress.js';
import {creditResource} from '../progression/resource-wallet.js';
import {recordEconomy} from '../progression/economy-ledger.js';
import {commitCargo} from './cargo.js';
import {vehicleLocations} from './vehicle-location.js';
import {worldDistance} from '../world/coordinates.js';
import {createResourceDrop} from '../combat/resource-pickup.js';

// 同一失败原因只提示一次，留在门前不会不断生成飘字和保存请求。
function harvestNotice(game,state,message){if(state.notice===message)return;state.notice=message;game.float(game.player.x,game.player.y-45,message,'#f5d9a0');}

// 背包和附近自有载具共用正式售价；只扣能完整兑换的作物，金币满时保留余货。
export function updateWarehouseHarvest(game,dt){
 if(game.state!=='playing'||dt<=0)return;
 if(game.mapId!=='forest'||game.cottage||worldDistance(game.player,{x:WAREHOUSE.x,y:WAREHOUSE.y+22})>150){game.warehouseAutoHarvest=null;return;}
 if(!canUseWarehouse(game))return;
 const state=game.warehouseAutoHarvest??={retry:0,notice:''};state.retry=Math.max(0,state.retry-dt);if(state.retry>0)return;
 const sources=['bag',...warehouseVehicles(game)],stocks=sources.map(source=>source==='bag'?game.progress.farm.inventory:game.progress.logistics.builds[source].cargo);
 if(!stocks.some(stock=>stock.some(n=>n>0))){state.notice='';return;}
 const next=validateProgress(structuredClone(game.progress)),locations=vehicleLocations(game),receipts=[];let coins=0,count=0;
 for(const source of sources){
  const stock=source==='bag'?next.farm.inventory:next.logistics.builds[source].cargo;
  for(let crop=0;crop<FARM_CROPS.length;crop++){
   const value=FARM_CROPS[crop].value,n=Math.min(stock[crop],Math.floor((RESOURCE_CAP-next.coins)/value));if(n<=0)continue;
   stock[crop]-=n;count+=n;coins+=creditResource(next,'coins',n*value);
   receipts.push({crop,count:n,origin:source==='bag'?{x:game.player.x,y:game.player.y}:locations.find(v=>v.hull===source)});
  }
 }
 if(!count){state.retry=2;harvestNotice(game,state,'金币容量不足，剩余农作物仍留在背包或载具中。');return;}
 recordEconomy(next,'income','farm:sale',{coins});
 const result=commitCargo(game,next,`农作物 ${count} 份入库结算，金币 +${coins}。`);
 if(!result.ok){state.retry=2;harvestNotice(game,state,result.message);return;}
 // 飞行保留真实品种与来源；数量已在同一存档里扣除，读档或重复绘制不会再发金币。
 for(const r of receipts)game.drops.push({...createResourceDrop(r.origin,0,0),crop:r.crop,cropCount:r.count,warehouseHarvest:true,destination:{x:WAREHOUSE.x,y:WAREHOUSE.y-16}});
 state.notice='';game.float(WAREHOUSE.x,WAREHOUSE.y-54,`收成 +${coins} 金币`,'#f5d890');
}
