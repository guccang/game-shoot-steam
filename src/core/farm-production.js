// 农矿配合事务：设施、配方和补给只在保存成功后生效。
import {PRODUCTION as P,PRODUCTION_BUILDINGS,PRODUCTION_RECIPES,productionCrop,SPRINKLER} from '../config/farm-production.js';
import {productionUnlocked,productionIngredients,sprinklerCovers,productionCropStock,consumeProductionCrop} from '../progression/farm-production.js';
import {FARM_CROPS,FARM_STOCK_CAP} from '../config/farm.js';
import {farmGrowth,wetFarmPlot,grantFarmSeeds} from '../progression/farm.js';
import {recordGardeningAction} from '../progression/mainline-gardening.js';
import {validateProgress} from '../progression/progress.js';
import {commitFarm} from './farm.js';
import {farmLandReason,snapFarmPoint} from '../world/farm-land.js';
import {worldDistance,delta,WORLD} from '../world/coordinates.js';
import {currentMineLayer} from './mine-layers.js';
// 页面允许暂停期间整理；实际设备建设仅在地面运行时提交。
export function productionAvailable(game){return ['playing','paused'].includes(game.state)&&game.player.hp>0&&!game.realm&&!game.story&&!game.workshopTrial&&!game.arrivalCinematic&&!game.mainlineSpeech&&!game.campDefense&&!game.fireActive;}
// 设施访问使用真实位置，跨地图、屋内及驾驶不能远程加工。
export function nearProductionBench(game){const b=game.progress.production.bench;return productionAvailable(game)&&!game.cottage&&!game.vehicle.active&&b?.mapId===game.mapId&&worldDistance(b,game.player)<=100;}
// 候选数据保持正在行驶矿车的精确位置，不用读档归一化把车吸回格心。
function candidate(game){const next=validateProgress(structuredClone(game.progress));next.mining=structuredClone(game.progress.mining);return next;}
// 生产反馈沿用正式农田事件与原子存档机制。
function commit(game,next,message){return commitFarm(game,next,{action:'production',message});}
// 设备选址与农田使用同一地形规则；排除原设备后可原地调整。
export function productionPlacement(game,point,kind,moving=null){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return {point:null,reason:'请选择有效地面位置。'};
 if(!PRODUCTION_BUILDINGS[kind])return {point:null,reason:'请选择有效设施。'};
 const s=game.progress.production,devices=[...s.sprinklers,...(s.bench?[{...s.bench,id:'bench'}]:[])];
 const reference=game.progress.farm.plots.filter(p=>p.mapId===game.mapId).sort((a,b)=>worldDistance(a,point)-worldDistance(b,point))[0];
 const target=snapFarmPoint(point,game.mapId,reference&&worldDistance(reference,point)<300?reference:null);
 const old=moving==='bench'?s.bench:s.sprinklers.find(p=>p.id===moving),exclude=devices.filter(p=>!(moving==='bench'?p.id==='bench':kind==='sprinkler'&&p.id===moving));
 if(moving!==null&&(!old||old.mapId!==game.mapId||worldDistance(old,game.player)>130))return {point:target,reason:'请靠近要移动的设施。'};
 const context=Object.assign(Object.create(game),{productionPlacementIgnore:moving});
 let reason=farmLandReason(context,target);
 if(!reason&&exclude.some(p=>p.mapId===target.mapId&&Math.abs(delta(p.x-target.x,WORLD.width))<52&&Math.abs(delta(p.y-target.y,WORLD.height))<46))reason='这里已有生产设施。';
 if(!reason&&worldDistance(game.player,target)>150)reason='请再靠近这块空地，然后放置设施。';
 return {point:target,reason};
}
// 放置和移动共用校验；移动不退款、不扣料且不重发教学种子。
export function placeProduction(game,kind,point,moving=null){
 if(!productionAvailable(game)||game.state!=='playing'||game.cottage||game.vehicle.active||!['forest','jiuzhaigou'].includes(game.mapId))return {ok:false,message:'请在地面下车后布置设施。'};
 const check=productionPlacement(game,point,kind,moving);if(check.reason)return {ok:false,message:check.reason};
 const s=game.progress.production,price=PRODUCTION_BUILDINGS[kind];
 if(!productionUnlocked(game.progress,kind))return {ok:false,message:'请先完成当前生产目标。'};
 if(moving===null&&(kind==='bench'?!!s.bench:s.sprinklers.length>=P.maxSprinklers))return {ok:false,message:'设施数量已达上限，请移动已有设施。'};
 if(moving===null&&(game.progress.mining.ore<price.ore||game.progress.wood<price.wood))return {ok:false,message:`需要${price.ore}矿石、${price.wood}仓库木材。`};
 const next=candidate(game),n=next.production;
 if(moving===null){next.mining.ore-=price.ore;next.wood-=price.wood;}
 if(kind==='bench')n.bench=check.point;
 else if(moving!==null)Object.assign(n.sprinklers.find(p=>p.id===moving),check.point);
 else n.sprinklers.push({...check.point,id:Math.max(0,...n.sprinklers.map(p=>p.id))+1});
 if(kind==='bench'&&!n.seedGift){
  for(const id of ['wheat','carrot'])if(next.farm.seeds[productionCrop(id)]>FARM_STOCK_CAP-2)return {ok:false,message:'请先为教学种子腾出库存。'};
  n.seedGift=true;for(const id of ['wheat','carrot'])grantFarmSeeds(next.farm,productionCrop(id),2);
 }
 return commit(game,next,`${price.name}已${moving===null?'建好':'移动'}。${kind==='bench'&&!s.seedGift?'获得小麦、胡萝卜种子各2粒；可在种子小屋继续购买。':''}`);
}
// 入门可选择出售或保留2份；完成便当教学后可自由设置0至20份。
export function setProductionKeep(game,crop,count){
 if(!productionAvailable(game)||!game.progress.production.bench||!Number.isInteger(crop)||!FARM_CROPS[crop]||!Number.isInteger(count)||count<0||count>P.keepMax)return {ok:false,message:'请先建好加工台，并选择有效保留数量。'};
 if(game.progress.production.mealDigs<P.lessonDigs&&![0,2].includes(count))return {ok:false,message:'入门可选出售或保留2份，完成20次便当开掘后可自定上限。'};
 const next=candidate(game);next.production.keep[crop]=count;return commit(game,next,count?`${FARM_CROPS[crop].name}保留${count}份，多余照常出售。`:`${FARM_CROPS[crop].name}恢复全部出售。`);
}
// 加工合计背包与已拥有载具的真实收成，校验与扣料同口径，保存失败不改原库存。
export function craftProduction(game,kind,fruit){
 if(!nearProductionBench(game))return {ok:false,message:'请下车走到农产加工台旁，原料可放在背包或载具仓库中。'};
 if(!productionUnlocked(game.progress,kind))return {ok:false,message:'配方尚未解锁，请查看生产目标。'};
 const ingredients=productionIngredients(kind,fruit),recipe=PRODUCTION_RECIPES[kind];
 if(!ingredients||ingredients.some(([i,n])=>!game.progress.farm.unlocked[i]||productionCropStock(game.progress,i).total<n))return {ok:false,message:'背包与载具仓库的原料合计不足，或尚未发现这个品种。'};
 if(game.progress.production.stock[kind]+recipe.count>P.maxStock)return {ok:false,message:'补给库存已满，请先使用。'};
 const next=candidate(game);for(const [i,n] of ingredients)consumeProductionCrop(next,i,n);next.production.stock[kind]+=recipe.count;
 return commit(game,next,`${recipe.name} +${recipe.count}，原料已消耗。`);
}
// 食物仅供地下步行使用，油只绑定当前层正在乘坐或身旁的矿车。
export function useProduction(game,kind){
 if(!productionAvailable(game)||game.cottage?.kind!=='mine'||game.vehicle.active||!PRODUCTION_RECIPES[kind])return {ok:false,message:'请在地下步行或乘矿车时使用补给。'};
 const s=game.progress.production;if(!s.stock[kind])return {ok:false,message:'没有这种补给，请到加工台制作。'};
 const layer=currentMineLayer(game),cart=kind==='oil'?layer.carts.find(c=>game.cottage.ride?c.id===game.cottage.ride:worldDistance(c,game.player)<=40):null;
 if(kind==='oil'&&!cart)return {ok:false,message:'请乘坐或靠近要润滑的矿车。'};
 if(kind==='oil'?cart.lubrication>0:s.effects[kind]>0)return {ok:false,message:'当前效果尚未用完，不会重复消耗补给。'};
 const next=candidate(game);next.production.stock[kind]--;
 if(kind==='oil'){const l=(game.cottage.depth||1)===1?next.mining:next.mining.layers[game.cottage.depth];l.carts.find(c=>c.id===cart.id).lubrication=P.oilSeconds;}
 else next.production.effects[kind]=kind==='meal'?P.mealDigs:P.juiceSeconds;
 return commit(game,next,`${PRODUCTION_RECIPES[kind].name}已使用，暂停和离线不消耗效果。`);
}
const retries=new WeakMap();
// 自动浇水只作用于当前地面在线未成熟作物；无待办不复制进度或写盘。
export function updateProduction(game,now=Date.now()){
 if(!productionAvailable(game)||game.state!=='playing'||game.cottage||!['forest','jiuzhaigou'].includes(game.mapId)||now<(retries.get(game)||0))return false;
 const s=game.progress.production,returning=!s.returned&&s.minedOre>=P.oreGoal;
 if(!returning&&!s.sprinklers.length)return false;
 const targets=game.progress.farm.plots.filter(p=>!p.wild&&p.mapId===game.mapId&&p.crop!==null&&!p.watered&&farmGrowth(p,now)<1&&s.sprinklers.some(d=>sprinklerCovers(d,p)));
 if(!returning&&!targets.length)return false;
 const next=candidate(game);if(returning)next.production.returned=true;
 for(const plot of next.farm.plots.filter(p=>targets.some(t=>t.id===p.id))){wetFarmPlot(next.farm,plot,now);plot.sprinklerWatered=true;recordGardeningAction(next,'water',{crop:plot.crop,plot:plot.id});}
 const result=commit(game,next,returning?'矿石已带回地面，可以建造简易洒水器。':`洒水器已浇灌${targets.length}块田。`);
 if(!result.ok)retries.set(game,now+1000);else{retries.delete(game);if(targets.length){
  // 每台保留本次旋转的起点，另一台后来浇水不截断正在播放的水流。
  const touched=s.sprinklers.filter(d=>targets.some(p=>sprinklerCovers(d,p)));
  const devices=(game.productionSpray?.devices||[]).filter(d=>game.time>=d.time&&game.time-d.time<SPRINKLER.spraySeconds&&s.sprinklers.some(n=>n.id===d.id&&n.mapId===d.mapId&&worldDistance(n,d)<.1));
  for(const d of touched)if(!devices.some(n=>n.id===d.id&&n.mapId===d.mapId))devices.push({...d,time:game.time});
  game.productionSpray={time:game.time,plots:targets.map(p=>p.id),sprinklers:devices.map(d=>d.id),devices};
 }}
 return result.ok;
}
