import {recordLogisticsLesson} from '../progression/mainline-logistics.js';
import {catLoad,vehicleLoad} from '../progression/load-weight.js';
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
// 隔离库存和运行弹匣，多个物品减重也只保存一次。
function cleanupSnapshot(game){
 const snapshot=Object.create(game);snapshot.progress=validateProgress(structuredClone(game.progress));
 snapshot.magazines=game.magazines.map(m=>({...m}));snapshot.vehicles=game.vehicles.map(v=>({...v,module:v.module?{...v.module,magazine:{...v.module.magazine}}:null}));snapshot.vehicle=snapshot.vehicles[game.vehicle.index];return snapshot;
}
// 每项都重查访问范围、数量和保护规则，计划过期不会多扣或清空物品。
function removeEntry(snapshot,{hull=null,id,count}={}){
 if(!cleanupAvailable(snapshot,hull))return {ok:false,message:hull===null?'当前无法清理背包。':'请靠近这辆载具后清理货舱。'};
 const item=cleanupEntries(snapshot,hull).find(r=>r.id===id);
 if(!item||!Number.isSafeInteger(count)||count<1||count>item.count)return {ok:false,message:'物品不可清理或数量已变化，请重新选择。'};
 const next=snapshot.progress;
 if(id==='material:wood'){if(hull===null)next.logistics.bagWood-=count;else next.logistics.builds[hull].wood-=count;}
 else if(item.category==='crop')(hull===null?next.farm.inventory:next.logistics.builds[hull].cargo)[item.index]-=count;
 else if(item.category==='seed')next.farm.seeds[item.index]-=count;
 else if(item.category==='supply')next.supplies.items[item.key]-=count;
 else if(id.startsWith('ammo:'))removeAmmo(snapshot,item.key,count,hull);
 else if(item.category==='weapon'){
  const key=ammoKind(WEAPONS[item.index]);if(key){next.supplies.hand[key]+=snapshot.magazines[item.index].ammo||0;if(normalizeSupplies(next.supplies,next).hand[key]!==next.supplies.hand[key])return {ok:false,message:'备用弹药库存已满，请先清理弹药，再丢弃武器。'};}
  snapshot.magazines[item.index].ammo=0;next.weapons[item.index]=0;
 }
 return {ok:true,item};
}
// 正式事务与预览共用重量；车旁整理也预留驾驶员及随身包的载重。
export function cleanupLoad(game,hull=null){const load=hull===null?catLoad(game):vehicleLoad(game,hull,{driver:true});return {weight:load.weight??load.payload,capacity:load.capacity};}
// 原子提交候选快照，任何失败均保持库存和弹匣原状。
function commitCleanup(game,snapshot,message){
 const next=snapshot.progress;next.patrol=capturePatrol(snapshot);let saved=false;try{saved=game.livingPersist?.(next)===true;}catch{}
 if(!saved)return {ok:false,message:'保存失败，物品没有丢弃，请重试。'};
 game.progress=next;game.magazines.forEach((m,i)=>{m.ammo=snapshot.magazines[i].ammo;});game.vehicles.forEach((v,i)=>{if(v.module)v.module.magazine.ammo=snapshot.vehicles[i].module.magazine.ammo;});return {ok:true,message};
}
// 丢弃枪械会同时移走其空弹匣，子弹仍保留，因此预览要包含空弹匣重量。
export function cleanupUnitMass(item){return item.mass+(item.category==='weapon'&&ammoKind(WEAPONS[item.index])?itemDefinition('magazine').mass:0);}
// 手动滑条丢弃仍保留原有保护、弹药退回和持久化语义。
export function discardLoad(game,change={}){const snapshot=cleanupSnapshot(game),result=removeEntry(snapshot,change);if(result.ok)recordLogisticsLesson(snapshot.progress,change.hull==null?'bagCleaned':'cargoCleaned');return result.ok?commitCleanup(game,snapshot,`已丢弃${result.item.name} ×${change.count}，载荷已更新。`):result;}
// 先木头、作物，再种子、弹药和补给；自动清理不选择武器及固定装备。
export function planLoadCleanup(game,hull=null){
 const targetHull=hull??(game.vehicle.active?game.vehicle.index:null),load=cleanupLoad(game,targetHull),base={targetHull,...load,changes:[]};
 if(!cleanupAvailable(game,targetHull))return {...base,ok:false,message:'请靠近载具后整理货舱。'};
 if(load.weight<load.capacity)return {...base,ok:false,message:'当前载荷未满，无需清理。'};
 const priority={material:0,crop:1,seed:2,ammo:3,supply:4},sources=targetHull===null?[null]:[targetHull,null];
 const rows=sources.flatMap(source=>cleanupEntries(game,source).filter(r=>r.mass>0&&r.category in priority).map(r=>({...r,hull:source}))).sort((a,b)=>priority[a.category]-priority[b.category]);
 let weight=load.weight;const changes=[];
 for(const r of rows){if(weight<load.capacity-.009999)break;const count=Math.min(r.count,Math.max(1,Math.ceil((weight-load.capacity+.01-1e-9)/r.mass)));changes.push({hull:r.hull,id:r.id,count,name:r.name,mass:r.mass});weight-=count*r.mass;}
 if(weight>=load.capacity)return {...base,ok:false,message:'可清理物品不足以降至限重内，请在工坊调整装甲或主炮，或手动整理武器。'};
 return {...base,ok:true,changes,after:weight,message:'优先清理木头与作物，仅丢弃恢复载重所需数量。'};
}
// 提交玩家确认的原清单，不自动更换物品；过期计划不足以减重时完整取消。
export function discardForMobility(game,plan){
 if(!plan?.ok||!Array.isArray(plan.changes)||!plan.changes.length||!cleanupAvailable(game,plan.targetHull))return {ok:false,message:'清理方案已失效，请重新预览。'};
 const snapshot=cleanupSnapshot(game);
 for(const change of plan.changes){if(change.hull!==null&&change.hull!==plan.targetHull)return {ok:false,message:'清理来源已变化，请重新预览。'};const r=removeEntry(snapshot,change);if(!r.ok)return r;}
 const load=cleanupLoad(snapshot,plan.targetHull);if(load.weight>=load.capacity)return {ok:false,message:'载荷已变化，原方案无法降至限重内，请重新预览。'};
 for(const change of plan.changes)recordLogisticsLesson(snapshot.progress,change.hull==null?'bagCleaned':'cargoCleaned');
 return commitCleanup(game,snapshot,'已清理至限重内，负重限制已解除。');
}
