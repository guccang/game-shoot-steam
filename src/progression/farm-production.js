// 生产存档只存事实、设施、保留策略和补给余量；恢复时不发奖励。
import {taskResourceStock} from './task-resources.js';
import {FARM_CROPS} from '../config/farm.js';
import {PRODUCTION as P,productionCrop,SPRINKLER_OFFSETS} from '../config/farm-production.js';
import {worldDistance} from '../world/coordinates.js';
// 有界整数用于数量，浮点余量另行校验以保留真实行驶时间。
function integer(n,max=999999){return Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;}
// 设施仅接受正常世界坐标，不从损坏存档创建离屏实体。
function site(s){return s&&['forest','jiuzhaigou'].includes(s.mapId)&&Number.isFinite(s.x)&&Number.isFinite(s.y)&&s.x>=0&&s.x<10800&&s.y>=0&&s.y<8400?{mapId:s.mapId,x:s.x,y:s.y}:null;}
// 首次迁移只把现存矿石计入资格，不推算历史消费或赠送材料。
export function normalizeProduction(raw,mining){
 const s=raw||{},sprinklers=[];
 for(const item of (Array.isArray(s.sprinklers)?s.sprinklers:[]).slice(0,P.maxSprinklers)){const point=site(item);if(point&&!sprinklers.some(p=>p.mapId===point.mapId&&worldDistance(p,point)<40))sprinklers.push({...point,id:sprinklers.length+1});}
 return {version:1,minedOre:integer(s.minedOre??mining?.ore),returned:s.returned===true,wateredHarvest:s.wateredHarvest===true,seedGift:s.seedGift===true,mealDigs:integer(s.mealDigs),rodeCart:s.rodeCart===true,bench:site(s.bench),sprinklers,keep:FARM_CROPS.map((_,i)=>integer(s.keep?.[i],P.keepMax)),stock:Object.fromEntries(['meal','juice','oil'].map(k=>[k,integer(s.stock?.[k],P.maxStock)])),effects:{meal:integer(s.effects?.meal,P.mealDigs),juice:Number.isFinite(s.effects?.juice)?Math.max(0,Math.min(P.juiceSeconds,s.effects.juice)):0}};
}
// 建筑和配方依据实际行为开放，果饮和植物油还需对应种子权限。
export function productionUnlocked(progress,kind){
 const s=progress.production;if(!s)return false;
 if(kind==='sprinkler')return s.returned&&s.minedOre>=P.oreGoal;
 // 加工台无作物或教学前置，建造事务单独校验矿石与木材。
 if(kind==='bench')return true;
 if(kind==='meal')return !!s.bench;
 if(kind==='juice')return !!s.bench&&FARM_CROPS.some((c,i)=>c.category==='fruit'&&progress.farm.unlocked[i]);
 if(kind==='oil')return !!s.bench&&s.rodeCart&&progress.farm.unlocked[productionCrop('corn')];
 return false;
}
// 供应链引导只展示下一步，读档或查看界面不推进阶段。
export function productionGoal(p){const s=p.production;if(!s.bench)return '准备8矿石＋20仓库木材，即可建造农产加工台';if(s.mealDigs<P.lessonDigs)return `制作并使用便当，完成20次加速开掘（${s.mealDigs}/20）`;return '准备矿车和玉米可制作植物油，发现水果可制作果饮';}
// 加工展示与扣料共用真实所有权口径，未拥有车体的残留货物不计入。
export function productionCropStock(progress,crop){return taskResourceStock(progress,'crop:'+crop);}
// 在候选存档内优先扣背包，再按车型顺序扣已拥有载具；调用前须校验全部配方原料。
export function consumeProductionCrop(progress,crop,count){
 const stores=[progress.farm.inventory,...progress.logistics.builds.filter((_,i)=>progress.vehicleHulls[i]).map(b=>b.cargo)];
 for(const stock of stores){const used=Math.min(stock[crop]||0,count);stock[crop]-=used;count-=used;if(!count)break;}
}
// 同茬只有真正被设备首次加速才记为设备照料；手浇和雨水优先时不抢功。
export function sprinklerCovers(s,plot){return s.mapId===plot.mapId&&SPRINKLER_OFFSETS.some(([x,y])=>worldDistance({x:s.x+x,y:s.y+y},plot)<5);}
// 所有出售入口共用一份保留配额，按背包、在场货舱顺序保护原料。
export function productionSalePlan(progress,stocks){
 const remaining=[...(progress.production?.keep||FARM_CROPS.map(()=>0))];
 return stocks.map(stock=>stock.map((count,i)=>{const held=Math.min(count,remaining[i]||0);remaining[i]-=held;return count-held;}));
}
// 料理固定消耗两种作物；果饮由玩家选定一种已发现的水果。
export function productionIngredients(kind,fruit){if(kind==='meal')return [[productionCrop('wheat'),1],[productionCrop('carrot'),1]];if(kind==='oil')return [[productionCrop('corn'),1]];if(kind==='juice'&&Number.isInteger(fruit)&&FARM_CROPS[fruit]?.category==='fruit')return [[fruit,1]];return null;}
