import {taskResourceStock,taskCropStock} from '../economy/task-resources.js';
// 主线整备预算与缺口共用正式报价，只估算目标所需资源，不替玩家购买或升级。
import {economyUpgradeCost,bindEconomy,economyFor} from '../../config/economy.js';
import {equipmentRecipe} from '../workshop/equipment-goals.js';
import {nativeVehicleWeapon,grantVehicleArmament} from '../../config/vehicle-armaments.js';
import {vehicleBuildPrice} from '../../core/vehicles/vehicle-build.js';
import {MOD_COST} from '../../config/weapon-mods.js';
import {HEROES} from '../../config/heroes.js';
import {campPurchasePrice} from '../camp/camp-level.js';
const hintCosts=new WeakMap();
const KEYS=['coins','wood','parts','crystal','core'];
// 候选成本副本保留经济方案，后续条件读取已经规划的等级以免重复计算。
function copy(progress){return bindEconomy(structuredClone(progress),economyFor(progress));}
// 所有预算只累加实际资源项，装备名称与任务条件不能当作货币。
function add(cost,price){for(const k of KEYS)cost[k]+=(price?.[k]||0);}
// 按连续升级逐级读取折扣和封顶；先购买再升级，共享实际配方与专属主炮。
function grow(p,cost,field,index,target,part){
 const kind={weapons:'weapons',heroes:'heroes',vehicleHulls:'vehicle',vehicleWeapons:'turret',weaponParts:'weapons',vehicleParts:'vehicle',turretParts:'turret'}[field];
 if(!kind||!p[field]||!Number.isInteger(index)||index<0||index>=p[field].length)return;
 if(!part&&!p[field][index]){
  const price=kind==='heroes'?campPurchasePrice(p,HEROES[index]):equipmentRecipe(kind,index,p);
  if(!price)return;add(cost,price);p[field][index]=1;if(kind==='vehicle')grantVehicleArmament(p,index);
 }
 // 角色通过经验达到目标等级，不列入收获金币和升级材料预算。
 if(kind==='heroes'){p.heroes[index]=Math.max(p.heroes[index],target);return;}
 let level=part?p[field][index]?.[part]||1:p[field][index];
 for(;level<Math.min(20,target);level++){add(cost,economyUpgradeCost(p,kind,index,level,part));if(part)p[field][index][part]=level+1;else p[field][index]=level+1;}
}
// 选择目标按最低可达成本规划，已有目标先算零费用；多个条件顺序共用同一副本。
function apply(p,condition,cost){
 if(condition.all){for(const c of condition.all)apply(p,c,cost);return;}
 if(condition.any){
  const options=condition.any.map(c=>{const next=copy(p),price=Object.fromEntries(KEYS.map(k=>[k,0]));apply(next,c,price);return {next,price};});
  options.sort((a,b)=>KEYS.reduce((n,k)=>n+a.price[k]-b.price[k],0));const best=options[0];if(best){Object.assign(p,best.next);add(cost,best.price);}return;
 }
 if(condition.controllerLevel){apply(p,{any:[12,15,16].map(i=>({path:'progress.weapons.'+i,min:condition.controllerLevel}))},cost);return;}
 if('nativeLevel' in condition){const hull=condition.nativeLevel;if(!p.vehicleHulls[hull])grow(p,cost,'vehicleHulls',hull,1);grow(p,cost,'vehicleWeapons',nativeVehicleWeapon(hull).weaponIndex,condition.min);return;}
 if(!condition.path||!condition.min)return;
 const [,field,raw,part]=condition.path.split('.'),index=Number(raw);
 if(field==='logistics'){const pieces=condition.path.split('.'),hull=Number(pieces[3]),key=pieces[4],b=p.logistics.builds[hull];if(!p.vehicleHulls[hull])grow(p,cost,'vehicleHulls',hull,1);if(key==='plates'){while(b.plates<condition.min){cost.coins+=vehicleBuildPrice(p,hull,'add-armor');b.plates++;if(b.spares)b.spares--;}}else if(key==='engine'&&b.engine<condition.min){cost.coins+=vehicleBuildPrice(p,hull,'engine',condition.min);b.engine=condition.min;if(!b.engines.includes(b.engine))b.engines.push(b.engine);}return;}
 if(field==='mods'){if(!p.mods[index]){add(cost,MOD_COST);p.mods[index]=1;}return;}
 grow(p,cost,field,index,condition.min,part);
}
// 返回当前目标的全部剩余整备成本，战斗/探索条件不会凭空产生费用。
export function mainlineConditionCost(progress,condition){const cost=Object.fromEntries(KEYS.map(k=>[k,0]));apply(copy(progress),condition,cost);return cost;}
// 等级未变时复用正式预算，HUD 每帧与收获任务共用缓存；钱包变化不影响成本。
export function cachedMainlineConditionCost(progress,condition){
 const signature=JSON.stringify([progress.logistics,progress.weapons,progress.heroes,progress.vehicleHulls,progress.vehicleWeapons,progress.weaponParts,progress.vehicleParts,progress.turretParts,progress.mods,progress.campLevel?.xp,progress.arrival?.phase]);
 let cached=hintCosts.get(progress);if(!cached||cached.signature!==signature||cached.economy!==economyFor(progress)){cached={signature,economy:economyFor(progress),costs:new Map()};hintCosts.set(progress,cached);}
 if(!cached.costs.has(condition))cached.costs.set(condition,mainlineConditionCost(progress,condition));
 return cached.costs.get(condition);
}
// 资源不足时明确指出缺什么和去哪获取，余额足够即自动恢复原操作提示。
export function mainlineResourceHint(progress,condition,cost=cachedMainlineConditionCost(progress,condition)){
 if(!KEYS.some(key=>cost[key]>0))return '';
 const names={coins:'金币',wood:'木头',parts:'机械零件',crystal:'能源晶体',core:'首领核心'};
 const missing=KEYS.filter(k=>cost[k]>taskResourceStock(progress,k).total),crops=taskCropStock(progress);
 const gaps=missing.map(k=>({key:k,count:Math.ceil(Math.max(0,cost[k]-taskResourceStock(progress,k).total-(k==='coins'?crops.value:0)))})).filter(g=>g.count>0).map(g=>names[g.key]+g.count);
 const messages=[];
 if(gaps.length)messages.push('还差'+gaps.join('、')+'。');
 if(cost.wood>progress.wood){const wood=taskResourceStock(progress,'wood');messages.push(`木材 ${Math.min(cost.wood,wood.total)}/${cost.wood}（仓库 ${wood.warehouse} · 背包 ${wood.bag} · 载具 ${wood.vehicles}），`+(wood.total>=cost.wood?'已采齐，请将背包和载具木材运回小屋仓库入库。':'装备电锯采树，靠近小屋仓库自动入库。'));}
 if(cost.coins>progress.coins){
  if(crops.total)messages.push(`作物 ${crops.total} 份（背包 ${crops.bag} · 载具 ${crops.vehicles}），可结算 ${crops.value} 金币，`+(progress.coins+crops.value>=cost.coins?'收成已够，请运回小屋仓库结算。':'先运回小屋仓库结算，再补齐收成。'));
  else messages.push('金币：种田收获后出售是主要来源，使用掉落种子播种；任务和玩法奖励照常，怪物不掉金币。');
 }
 if(missing.some(k=>!['coins','wood'].includes(k)))messages.push('材料：清缴怪潮与领主，或完成娱乐挑战。');
 return messages.join('');
}
