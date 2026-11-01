import {recordLogisticsLesson} from '../progression/mainline-logistics.js';
// 仓库事务在保存成功后才提交，存取均保留物品总数与正式负重计算。
import {createResourceDrop} from '../combat/resource-pickup.js';
import {canInspectBuilding} from './building-entry.js';
import {WAREHOUSE} from '../config/warehouse.js';
import {AMMO_TYPES} from '../config/supplies.js';
import {FARM_CROPS,FARM_STOCK_CAP} from '../config/farm.js';
import {RESOURCE_CAP} from '../config/resource-limits.js';
import {itemDefinition} from '../config/items.js';
import {RANGER} from '../config/ranger-arrival.js';
import {validateProgress} from '../progression/progress.js';
import {catLoad,vehicleLoad} from '../progression/load-weight.js';
import {personalFleet} from './vehicle-repair.js';
import {vehicleLocations} from './vehicle-location.js';
import {commitCargo} from './cargo.js';
import {worldDistance} from '../world/coordinates.js';
export const WAREHOUSE_ITEMS=['material:wood',...Object.keys(AMMO_TYPES).map(k=>'ammo:'+k),...FARM_CROPS.map((_,i)=>'seed:'+i)];
// 靠近仓库直接存取，步行和骑乘均可；其他房屋、战斗和远处不能隔空装卸。
export function canUseWarehouse(game){return personalFleet(game)&&canInspectBuilding(game)&&!game.progress.restoration?.build&&game.player.hp>0&&['playing','paused'].includes(game.state)&&worldDistance(game.player,{x:WAREHOUSE.x,y:WAREHOUSE.y+22})<=150;}
// 使用仓库门前的世界位置核验车辆，排除远处与维修救援中的车。
export function warehouseVehicles(game){
 if(!canUseWarehouse(game))return [];
 return game.progress.vehicleHulls.flatMap((owned,i)=>{const p=vehicleLocations(game).find(v=>v.hull===i),service=game.progress.vehicleService?.[i];return owned&&p?.mapId==='forest'&&worldDistance(p,{x:WAREHOUSE.x,y:WAREHOUSE.y+60})<=130&&!['outbound','hooking','towing','repairing','ready'].includes(service?.phase)?[i]:[];});
}
// 返回一对真实存量引用；种子目前只存在背包和仓库，车辆保留原有货物类型。
function stores(p,id,source){
 const item=itemDefinition(id),car=source!=='bag';if(!WAREHOUSE_ITEMS.includes(id)||car&&(!Number.isInteger(source)||!p.vehicleHulls[source]))return null;
 if(id==='material:wood')return {item,carry:car?p.logistics.builds[source]:p.logistics,key:car?'wood':'bagWood',store:p,storeKey:'wood',cap:RESOURCE_CAP};
 if(item.category==='ammo')return {item,carry:car?p.supplies.vehicles[source]:p.supplies.hand,key:item.key,store:p.warehouse.ammo,storeKey:item.key,cap:100000};
 if(car)return null;
 return {item,carry:p.farm.seeds,key:item.index,store:p.warehouse.seeds,storeKey:item.index,cap:FARM_STOCK_CAP};
}
// 列表只展示有货的条目；弹药数量不含已装填弹匣，避免复制或拆走正在使用的弹药。
export function warehouseRows(game,source='bag'){return WAREHOUSE_ITEMS.flatMap(id=>{const s=stores(game.progress,id,source);return s?[{...s.item,carried:s.carry[s.key],stored:s.store[s.storeKey]}]:[];});}
// 预演与提交共用校验，并给出取出后的实际负重；满载需要玩家再次明确确认。
export function warehouseTransferPreview(game,source,id,count,direction){
 if(!canUseWarehouse(game)||source!=='bag'&&!warehouseVehicles(game).includes(source))return {ok:false,message:'请靠近仓库打开存取页面；载具需位于仓库附近。'};
 if(!Number.isSafeInteger(count)||count<=0||!['deposit','withdraw'].includes(direction))return {ok:false,message:'请选择有效的存取数量。'};
 const next=validateProgress(structuredClone(game.progress)),s=stores(next,id,source);if(!s)return {ok:false,message:'该物品不能存入此位置。'};
 const deposit=direction==='deposit',from=deposit?s.carry:s.store,to=deposit?s.store:s.carry,fk=deposit?s.key:s.storeKey,tk=deposit?s.storeKey:s.key;
 if(from[fk]<count||to[tk]+count>s.cap)return {ok:false,message:'物品不足或目标库存已满，请减少数量。'};
 from[fk]-=count;to[tk]+=count;
 if(deposit&&id==='material:wood'&&next.arrival?.phase==='gather'&&next.wood>=RANGER.repairWood)next.arrival.phase='repair';
 const snapshot=Object.create(game);snapshot.progress=next;const load=source==='bag'?catLoad(snapshot):vehicleLoad(snapshot,source,{driver:true}),weight=load.weight??load.payload;
 return {ok:true,next,weight,capacity:load.capacity,needsConfirmation:!deposit&&load.overloaded,message:`${s.item.name} ×${count} 已${deposit?'存入仓库':source==='bag'?'取回背包':'装入载具'}。`};
}
// 确认后重新读取实时库存，保存失败或拒绝超载均不改变任何存量。
export function transferWarehouse(game,source,id,count,direction,confirmOverload=false){const result=warehouseTransferPreview(game,source,id,count,direction);if(!result.ok)return result;if(result.needsConfirmation&&!confirmOverload)return {...result,ok:false,message:'取出后载荷已满，将无法移动。请减少数量或确认继续取出。'};recordLogisticsLesson(result.next,direction==='deposit'?'warehouseDeposited':'warehouseWithdrawn');if(direction==='withdraw'&&source!=='bag')recordLogisticsLesson(result.next,'cargoLoaded');const saved=commitCargo(game,result.next,result.message);if(saved.ok&&id==='material:wood'&&direction==='withdraw'){const state=game.warehouseAutoWood??={held:[],retry:0,notice:''};if(!state.held.includes(source))state.held.push(source);}return saved;}

// 每次靠近仅处理附近的木材；手动取出的来源直到离开范围才重新自动收取。
export function updateWarehouseWood(game,dt){
 if(game.state!=='playing'||dt<=0)return;
 const door={x:WAREHOUSE.x,y:WAREHOUSE.y+22};
 if(game.mapId!=='forest'||game.cottage||worldDistance(game.player,door)>150){game.warehouseAutoWood=null;return;}
 if(!canUseWarehouse(game))return;
 const state=game.warehouseAutoWood??={held:[],retry:0,notice:''};
 state.retry=Math.max(0,state.retry-dt);if(state.retry>0)return;
 const sources=['bag',...warehouseVehicles(game)].filter(source=>!state.held.includes(source));
 const carrying=sources.filter(source=>(source==='bag'?game.progress.logistics.bagWood:game.progress.logistics.builds[source].wood)>0);
 if(!carrying.length){state.notice='';return;}
 if(game.progress.wood>=RESOURCE_CAP){warehouseWoodNotice(game,state,'仓库木材已满，剩余木头留在原处。');return;}
 const next=validateProgress(structuredClone(game.progress)),receipts=[],locations=vehicleLocations(game);
 for(const source of carrying){
  const stock=source==='bag'?next.logistics:next.logistics.builds[source],key=source==='bag'?'bagWood':'wood',count=Math.min(stock[key],RESOURCE_CAP-next.wood);
  if(count<=0)continue;
  stock[key]-=count;next.wood+=count;receipts.push({count,origin:source==='bag'?{...game.player}:locations.find(v=>v.hull===source)});
 }
 if(next.arrival?.phase==='gather'&&next.wood>=RANGER.repairWood)next.arrival.phase='repair';
 const count=receipts.reduce((sum,r)=>sum+r.count,0),result=commitCargo(game,next,`木头 ${count} 份自动入库`);
 if(!result.ok){state.retry=2;warehouseWoodNotice(game,state,result.message);return;}
 // 事务一次落盘后才创建飞行批次，终点固定在仓库门，不在到达时重复加库存。
 for(const receipt of receipts)game.drops.push({...createResourceDrop(receipt.origin,0,receipt.count),destination:{x:WAREHOUSE.x,y:WAREHOUSE.y-16},warehouseWood:true});
 state.notice='';game.float(WAREHOUSE.x,WAREHOUSE.y-24,`木头 +${count} 已入库`,'#e2f3ce');
}

// 相同失败或满仓原因只提示一次，避免站在门口时刷屏。
function warehouseWoodNotice(game,state,message){if(state.notice===message)return;state.notice=message;game.float(game.player.x,game.player.y-45,message,'#f5d9a0');}
