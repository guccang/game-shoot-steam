// 背包和车载货格共用实物事务；预览不写存档，提交时重新核对距离和重量。
import {ITEM_TABLE} from '../../config/items.js';
import {FARM_CROPS,FARM_STOCK_CAP} from '../../config/farm.js';
import {INDUSTRY_CAP,INDUSTRY_GOODS,RAW_INDUSTRY} from '../../config/industry.js';
import {AMMO_TYPES} from '../../config/supplies.js';
import {RANGER} from '../../config/ranger-arrival.js';
import {CARGO_GOODS,shopSlot} from '../../progression/economy/shop-stock.js';
import {industryStore} from '../../progression/industry/industry.js';
import {catLoad,vehicleLoad} from '../../progression/inventory/load-weight.js';
import {carriedWeapon} from '../../progression/inventory/weapon-storage.js';
import {validateProgress} from '../../progression/progress.js';
import {cargoAccessible,commitCargo} from './cargo.js';
import {fishStoreStats} from '../../progression/fishing/fish-storage.js';

// 原矿在背包和工业货舱沿用各自字段，外部ID仍指向同一件实物。
export function transferItem(id){
 const item=ITEM_TABLE[id]||CARGO_GOODS[id];if(!item)return null;
 if(id==='material:wood')return {...item,industryKey:'wood',cap:INDUSTRY_CAP};
 if(id.startsWith('industry:'))return {...item,industryKey:item.key,cap:INDUSTRY_CAP};
 if(id.startsWith('ore:')){const key=Object.keys(RAW_INDUSTRY).find(k=>RAW_INDUSTRY[k].ore===id.slice(4));return key?{...item,industryKey:key,cap:INDUSTRY_CAP}:null;}
 if(item.category==='crop')return {...item,cap:FARM_STOCK_CAP};
 const good=CARGO_GOODS[id];return good?{...good,...item,cap:good.cap,icon:item.icon||{kind:'outdoor',key:good.kind}}:null;
}
// 只有当前可装卸的自有车可作为背包移物目标。
export function transferVehicles(game){return game.progress.vehicleHulls.flatMap((n,i)=>n&&cargoAccessible(game,i)?[i]:[]);}
// 查询不创建空货格，避免打开界面就改变进度。
export function transferQuantity(game,id,where='bag'){
 const item=transferItem(id),p=game.progress;if(!item)return 0;
 if(item.industryKey){const [s,k]=industryStore(p,item.industryKey,where);return Number(s[k])||0;}
 if(item.category==='crop')return (where==='bag'?p.farm.inventory:p.logistics.builds[where]?.cargo)?.[item.index]||0;
 if(item.category==='weapon'&&where==='bag')return Number(carriedWeapon(p,item.index));
 if(item.kind==='tent')return Number(p.outdoors.tent&&!p.outdoors.camp?.kit&&(where==='bag'?p.outdoors.tentHull==null:p.outdoors.tentHull===where))+(where==='bag'?0:p.shopStock?.[where]?.[id]||0);
 if(where!=='bag'&&item.category!=='ammo')return p.shopStock?.[where]?.[id]||0;
 const [s,k]=shopSlot(p,item,where);return Number(s[k])||0;
}
// 货舱只列现有实物，空格和已安装主炮不伪装为可以取回的货物。
export function vehicleCargoEntries(game,hull){
 if(!Number.isInteger(hull)||!game.progress.vehicleHulls[hull])return [];
 const ids=new Set(['material:wood',...FARM_CROPS.map((_,i)=>'crop:'+i),...Object.keys(AMMO_TYPES).map(k=>'ammo:'+k),...Object.keys(INDUSTRY_GOODS).filter(k=>k!=='wood').map(k=>'industry:'+k),...Object.keys(game.progress.shopStock?.[hull]||{}),'outdoor:tent']);
 return [...ids].flatMap(id=>{const item=transferItem(id),count=transferQuantity(game,id,hull);return item&&count?[{...item,count,weight:item.mass*count}]:[];});
}
// 写入候选进度；武器只搬位置，等级、改装、弹匣所有权均保留。
function changeQuantity(p,item,where,delta){
 if(item.industryKey){const [s,k]=industryStore(p,item.industryKey,where,true);s[k]=(s[k]||0)+delta;return;}
 if(item.category==='crop'){const s=where==='bag'?p.farm.inventory:p.logistics.builds[where].cargo;s[item.index]+=delta;return;}
 if(item.category==='weapon'&&where==='bag')return;
 const [s,k]=shopSlot(p,item,where),value=(Number(s[k])||0)+delta;
 s[k]=where==='bag'&&(item.kind==='rod'||item.kind==='fish-container'||item.id==='metal-detector')?value>0:value;
 if(where!=='bag'&&!value)delete s[k];
}
// 预览和提交共享校验，过载来源仍可卸货，目的地不允许因此进入满载状态。
export function previewInventoryTransfer(game,id,hull,count,direction){
 const item=transferItem(id),fail=message=>({ok:false,message});
 if(!item||!Number.isSafeInteger(count)||count<=0||!['load','unload'].includes(direction))return fail('请选择有效物品和正整数数量。');
 if(!Number.isInteger(hull)||!cargoAccessible(game,hull)||game.player.hp<=0)return fail('请靠近这辆载具后移物。');
 const p=game.progress,loading=direction==='load',from=loading?'bag':hull,to=loading?hull:'bag';
 if(item.category==='weapon'&&loading&&(item.index===p.weapon||item.index===RANGER.saw||p.funnelLoadout?.includes(item.index)||p.spiderLoadout===item.index))return fail('当前装备、控制器中的武器和巡林电锯需要随身保留。');
 if(item.kind==='rod'&&game.fishing)return fail('请先收竿，再移动鱼竿。');
 if(item.kind==='fish-container'&&loading&&(game.fishing||fishStoreStats(p.outdoors.fishStores?.[item.tackleId]).count))return fail('请先收竿并出售容器内的鱼，再移动空容器。');
 if(item.id==='metal-detector'&&game.detectorActive)return fail('请先关闭探测器，再移动。');
 if(transferQuantity(game,id,from)<count)return fail(item.category==='ammo'?'备用弹药不足，已装填弹药随武器保留。':'来源物品数量不足，请重新选择。');
 if(transferQuantity(game,id,to)+count>item.cap)return fail('目标库存数量已满，请减少数量。');
 const next=validateProgress(structuredClone(p));
 if(item.kind==='tent'){
  // 沿用露营套装位置字段，避免两种货格重复计重或重新购买。
  if(!loading&&next.shopStock?.[hull]?.[id])delete next.shopStock[hull][id];
  next.outdoors.tent=true;next.outdoors.tentHull=loading?hull:null;
 }else{changeQuantity(next,item,from,-count);changeQuantity(next,item,to,count);}
 if(item.kind==='rod'&&!loading)next.outdoors.selectedRod=item.tackleId;
 const snapshot=Object.assign(Object.create(game),{progress:next}),bag=catLoad(snapshot),car=vehicleLoad(snapshot,hull,{driver:false});
 if(loading?car.overloaded:bag.overloaded)return {...fail(loading?'载具剩余载荷不足，请减少数量或更换载具。':'背包剩余容量不足，请减少数量或先整理背包。'),bag,car};
 return {ok:true,next,bag,car,message:`${item.name} ×${count} 已${loading?'移到载具':'移到背包'}。`};
}
// 提交只保存一份完整候选进度；失败时源、目标和运行弹匣都保持原状。
export function transferInventoryItem(game,id,hull,count,direction){
 const result=previewInventoryTransfer(game,id,hull,count,direction);return result.ok?commitCargo(game,result.next,result.message):result;
}
