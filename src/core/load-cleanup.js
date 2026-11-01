import {carriedWeapon} from '../progression/weapon-storage.js';
// 背包与货舱清理使用真实库存；选择数量后由界面确认，保存失败不丢物品。
import {backpackEntries} from '../progression/backpack.js';
import {itemDefinition} from '../config/items.js';
import {AMMO_TYPES,ammoKind} from '../config/supplies.js';
import {WEAPONS} from '../config/weapons.js';
import {VEHICLE_WEAPONS} from '../config/vehicle-armaments.js';
import {RANGER} from '../config/ranger-arrival.js';
import {validateProgress} from '../progression/progress.js';
import {normalizeSupplies} from '../progression/supplies.js';
import {cargoAccessible} from './cargo.js';
import {personalFleet} from './vehicle-repair.js';
import {capturePatrol} from './patrol-session.js';

// 当前装备、教学电锯和已装入控制器的武器不允许丢弃，其他随身武器可清理。
function disposableWeapon(game,index){const p=game.progress;return index!==p.weapon&&index!==RANGER.saw&&!p.funnelLoadout?.includes(index)&&p.spiderLoadout!==index;}
// 背包随身可整理；货舱只能操作身边车辆，活动借用装备和死亡状态不参与。
export function cleanupAvailable(game,hull=null){return personalFleet(game)&&['playing','paused'].includes(game.state)&&(hull===null||Number.isInteger(hull)&&cargoAccessible(game,hull));}
// 弹药清理包括备用与已装填数量，空弹匣、农具及重要物品不会出现在丢弃列表。
export function cleanupEntries(game,hull=null){
 if(!cleanupAvailable(game,hull))return [];
 if(hull===null)return backpackEntries(game).filter(r=>['material','supply','crop','seed'].includes(r.category)||r.id.startsWith('ammo:')||r.category==='weapon'&&disposableWeapon(game,r.index));
 const p=game.progress,b=p.logistics.builds[hull],v=game.vehicles[hull],key=ammoKind(VEHICLE_WEAPONS[v.weaponIndex]),rows=[];
 // 统一目录提供图标、名称和重量，清理页不自行定义另一套物品。
 function add(id,count){const item=itemDefinition(id);if(item&&count>0)rows.push({...item,count,weight:item.mass*count});}
 add('material:wood',b.wood||0);b.cargo.forEach((count,i)=>add('crop:'+i,count));
 for(const kind of Object.keys(AMMO_TYPES))add('ammo:'+kind,p.supplies.vehicles[hull][kind]+(key===kind?v.module?.magazine.ammo||0:0));
 return rows;
}
// 扣减备用弹药后再扣弹匣，快照和运行时同时提交，防止读档恢复被清理的子弹。
function removeAmmo(snapshot,key,count,hull){
 const stock=hull===null?snapshot.progress.supplies.hand:snapshot.progress.supplies.vehicles[hull],reserve=Math.min(stock[key],count);stock[key]-=reserve;let remaining=count-reserve;
 const mags=hull===null?snapshot.magazines.filter((_,i)=>carriedWeapon(snapshot.progress,i)&&ammoKind(WEAPONS[i])===key):[snapshot.vehicles[hull].module?.magazine].filter(Boolean);
 for(const mag of mags){const n=Math.min(mag.ammo,remaining);mag.ammo-=n;remaining-=n;if(!remaining)break;}
 if(hull!==null){const record=snapshot.progress.campParking.owned.find(r=>r.hull===hull);if(record)record.ammo=snapshot.vehicles[hull].module?.magazine.ammo||0;}
}
// 提交时重新验证范围、持有数量和保护规则；不回收金币，不产生邮件或虚构地面掉落。
export function discardLoad(game,{hull=null,id,count}={}){
 if(!cleanupAvailable(game,hull))return {ok:false,message:hull===null?'当前无法清理背包。':'请靠近这辆载具后清理货舱。'};
 const item=cleanupEntries(game,hull).find(r=>r.id===id);
 if(!item||!Number.isSafeInteger(count)||count<1||count>item.count)return {ok:false,message:'物品不可清理或数量已变化，请重新选择。'};
 const next=validateProgress(structuredClone(game.progress)),snapshot=Object.create(game);snapshot.progress=next;
 snapshot.magazines=game.magazines.map(m=>({...m}));snapshot.vehicles=game.vehicles.map(v=>({...v,module:v.module?{...v.module,magazine:{...v.module.magazine}}:null}));snapshot.vehicle=snapshot.vehicles[game.vehicle.index];
 if(id==='material:wood'){if(hull===null)next.logistics.bagWood-=count;else next.logistics.builds[hull].wood-=count;}
 else if(item.category==='crop')(hull===null?next.farm.inventory:next.logistics.builds[hull].cargo)[item.index]-=count;
 else if(item.category==='seed')next.farm.seeds[item.index]-=count;
 else if(item.category==='supply')next.supplies.items[item.key]-=count;
 else if(id.startsWith('ammo:'))removeAmmo(snapshot,item.key,count,hull);
 else if(item.category==='weapon'){
  const key=ammoKind(WEAPONS[item.index]);if(key){next.supplies.hand[key]+=snapshot.magazines[item.index].ammo||0;if(normalizeSupplies(next.supplies,next).hand[key]!==next.supplies.hand[key])return {ok:false,message:'备用弹药库存已满，请先清理弹药，再丢弃武器。'};}
  snapshot.magazines[item.index].ammo=0;next.weapons[item.index]=0;
 }
 next.patrol=capturePatrol(snapshot);let saved=false;try{saved=game.livingPersist?.(next)===true;}catch{}
 if(!saved)return {ok:false,message:'保存失败，物品没有丢弃，请重试。'};
 game.progress=next;game.magazines.forEach((m,i)=>{m.ammo=snapshot.magazines[i].ammo;});game.vehicles.forEach((v,i)=>{if(v.module)v.module.magazine.ammo=snapshot.vehicles[i].module.magazine.ammo;});
 return {ok:true,message:`已丢弃${item.name} ×${count}，载荷已更新。`};
}
