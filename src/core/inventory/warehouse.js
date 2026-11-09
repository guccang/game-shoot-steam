import {warehouseNotice as warehouseWoodNotice} from './warehouse-notice.js';
import {INDUSTRY_GOODS} from '../../config/industry.js';
import {industryStore} from '../../progression/industry/industry.js';
import {WEAPONS} from '../../config/weapons.js';
import {carriedWeapon,storedWarehouseWeapon} from '../../progression/inventory/weapon-storage.js';
import {weaponStorageReason} from './weapon-storage.js';
import {recordLogisticsLesson} from '../../progression/story/mainline-logistics.js';
// 仓库事务在保存成功后才提交，存取均保留物品总数与正式负重计算。
import {createResourceDrop} from '../../combat/resource-pickup.js';
import {canInspectBuilding} from '../camp/building-entry.js';
import {WAREHOUSE} from '../../config/warehouse.js';
import {AMMO_TYPES} from '../../config/supplies.js';
import {FARM_CROPS,FARM_STOCK_CAP} from '../../config/farm.js';
import {RESOURCE_CAP} from '../../config/resource-limits.js';
import {itemDefinition} from '../../config/items.js';
import {RANGER} from '../../config/ranger-arrival.js';
import {validateProgress} from '../../progression/progress.js';
import {catLoad,vehicleLoad} from '../../progression/inventory/load-weight.js';
import {personalFleet} from '../vehicles/vehicle-repair.js';
import {vehicleLocations} from '../vehicles/vehicle-location.js';
import {commitCargo} from './cargo.js';
import {worldDistance} from '../../world/coordinates.js';
export const WAREHOUSE_ITEMS=[...Object.keys(INDUSTRY_GOODS).filter(k=>k!=='wood').map(k=>'industry:'+k),'material:wood',...Object.keys(AMMO_TYPES).map(k=>'ammo:'+k),...FARM_CROPS.map((_,i)=>'seed:'+i)];
// 靠近仓库直接存取，步行和骑乘均可；其他房屋、战斗和远处不能隔空装卸。
export function canUseWarehouse(game){return personalFleet(game)&&canInspectBuilding(game)&&!game.progress.restoration?.build&&game.player.hp>0&&['playing','paused'].includes(game.state)&&worldDistance(game.player,{x:WAREHOUSE.x,y:WAREHOUSE.y+22})<=150;}
// 使用仓库门前的世界位置核验车辆，排除远处与维修救援中的车。
export function warehouseVehicles(game){
 if(!canUseWarehouse(game))return [];
 return game.progress.vehicleHulls.flatMap((owned,i)=>{const p=vehicleLocations(game).find(v=>v.hull===i),service=game.progress.vehicleService?.[i];return owned&&p?.mapId==='forest'&&worldDistance(p,{x:WAREHOUSE.x,y:WAREHOUSE.y+60})<=130&&!['outbound','hooking','towing','repairing','ready'].includes(service?.phase)?[i]:[];});
}
// 返回一对真实存量引用；种子目前只存在背包和仓库，车辆保留原有货物类型。
function stores(p,id,source,create=false){
 const item=itemDefinition(id),car=source!=='bag';if(!WAREHOUSE_ITEMS.includes(id)||car&&(!Number.isInteger(source)||!p.vehicleHulls[source]))return null;
 if(id.startsWith('industry:')){const [carry,key]=industryStore(p,item.key,source,create),[store,storeKey]=industryStore(p,item.key,'home');return {item,carry,key,store,storeKey,cap:RESOURCE_CAP};}
 if(id==='material:wood')return {item,carry:car?p.logistics.builds[source]:p.logistics,key:car?'wood':'bagWood',store:p,storeKey:'wood',cap:RESOURCE_CAP};
 if(item.category==='ammo')return {item,carry:car?p.supplies.vehicles[source]:p.supplies.hand,key:item.key,store:p.warehouse.ammo,storeKey:item.key,cap:100000};
 if(car)return null;
 return {item,carry:p.farm.seeds,key:item.index,store:p.warehouse.seeds,storeKey:item.index,cap:FARM_STOCK_CAP};
}
// 列表只展示有货的条目；弹药数量不含已装填弹匣，避免复制或拆走正在使用的弹药。
export function warehouseRows(game,source='bag'){return [{...itemDefinition('currency:coins'),carried:0,stored:game.progress.coins,readonly:true},...WEAPONS.flatMap((_,i)=>source==='bag'?[{...itemDefinition('weapon:'+i),carried:carriedWeapon(game.progress,i)?1:0,stored:storedWarehouseWeapon(game.progress,i)?1:0}]:[]),...WAREHOUSE_ITEMS.flatMap(id=>{const s=stores(game.progress,id,source);return s?[{...s.item,carried:s.carry[s.key]||0,stored:s.store[s.storeKey]||0}]:[];})];}
// 预演与提交共用校验，并给出取出后的实际负重；满载需要玩家再次明确确认。
export function warehouseTransferPreview(game,source,id,count,direction){
 if(!canUseWarehouse(game)||source!=='bag'&&!warehouseVehicles(game).includes(source))return {ok:false,message:'请靠近仓库打开存取页面；载具需位于仓库附近。'};
 if(!Number.isSafeInteger(count)||count<=0||!['deposit','withdraw'].includes(direction))return {ok:false,message:'请选择有效的存取数量。'};
 if(itemDefinition(id)?.category==='weapon')return warehouseWeaponPreview(game,source,id,count,direction);
 const next=validateProgress(structuredClone(game.progress)),s=stores(next,id,source,true);if(!s)return {ok:false,message:'该物品不能存入此位置。'};
 const deposit=direction==='deposit',from=deposit?s.carry:s.store,to=deposit?s.store:s.carry,fk=deposit?s.key:s.storeKey,tk=deposit?s.storeKey:s.key;
 if((from[fk]||0)<count||(to[tk]||0)+count>s.cap)return {ok:false,message:'物品不足或目标库存已满，请减少数量。'};
 from[fk]-=count;to[tk]=(to[tk]||0)+count;
 if(deposit&&id==='material:wood'&&next.arrival?.phase==='gather'&&next.wood>=RANGER.repairWood)next.arrival.phase='repair';
 const snapshot=Object.create(game);snapshot.progress=next;const load=source==='bag'?catLoad(snapshot):vehicleLoad(snapshot,source,{driver:true}),weight=load.weight??load.payload;
 return {ok:true,next,weight,capacity:load.capacity,needsConfirmation:!deposit&&load.overloaded,message:`${s.item.name} ×${count} 已${deposit?'存入仓库':source==='bag'?'取回背包':'装入载具'}。`};
}
// 确认后重新读取实时库存，保存失败或拒绝超载均不改变任何存量。
export function transferWarehouse(game,source,id,count,direction,confirmOverload=false){const result=warehouseTransferPreview(game,source,id,count,direction);if(!result.ok)return result;if(result.needsConfirmation&&!confirmOverload)return {...result,ok:false,message:'取出后载荷已满，'+(source==='bag'?'猫猫只能缓慢行走。':'载具将无法行驶。')+'请减少数量或确认继续取出。'};recordLogisticsLesson(result.next,direction==='deposit'?'warehouseDeposited':'warehouseWithdrawn');if(direction==='withdraw'&&source!=='bag')recordLogisticsLesson(result.next,'cargoLoaded');const saved=commitCargo(game,result.next,result.message);if(saved.ok&&id==='material:wood'&&direction==='withdraw'){const state=game.warehouseAutoWood??={held:[],retry:0,notice:''};if(!state.held.includes(source))state.held.push(source);}return saved;}

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


// 武器连同原弹匣移动位置；保留当前装备及挂载，取出后由玩家选择装备。
function warehouseWeaponPreview(game,source,id,count,direction){
 const item=itemDefinition(id),i=item.index,p=game.progress,deposit=direction==='deposit';
 if(source!=='bag'||count!==1)return {ok:false,message:'武器只在猫猫背包与小屋仓库之间逐把存取。'};
 if(deposit){
  if(i===p.weapon)return {ok:false,message:'请先换上另一把武器，再存放当前装备。'};
  const reason=weaponStorageReason(p,i);if(reason)return {ok:false,message:reason};
 }else if(!storedWarehouseWeapon(p,i))return {ok:false,message:'这把武器不在小屋仓库中。'};
 const next=validateProgress(structuredClone(p));
 if(deposit)next.warehouse.weapons.push(i);else next.warehouse.weapons=next.warehouse.weapons.filter(n=>n!==i);
 const load=catLoad(Object.assign(Object.create(game),{progress:next}));
 return {ok:true,next,weight:load.weight,capacity:load.capacity,needsConfirmation:!deposit&&load.overloaded,message:`${item.name}已${deposit?'存入小屋仓库':'取回背包'}，等级、改装与弹匣保留。`};
}
