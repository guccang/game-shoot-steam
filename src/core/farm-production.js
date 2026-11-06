import {HORSE_PRICE} from '../config/vehicle-eras.js';
// 农矿配合事务：设施、配方和补给只在保存成功后生效。
import {PASTURE,PEN_OX,PEN_GATE,oxFoot} from '../config/pasture.js';
import {PRODUCTION as P,PRODUCTION_BUILDINGS,PRODUCTION_RECIPES,productionCrop,SPRINKLER} from '../config/farm-production.js';
import {productionUnlocked,productionIngredients,sprinklerCovers,productionCropStock,consumeProductionCrop} from '../progression/farm-production.js';
import {FARM_CROPS,FARM_WATER} from '../config/farm.js';
import {sprinklerHitDelay,sameSprinklerPlot} from '../progression/sprinkler-sweep.js';
import {grantSeedReward} from '../progression/seed-reward.js';
import {farmGrowth,wetFarmPlot} from '../progression/farm.js';
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
// 在地面改造随身水壶，扣矿与所有权使用同一次存档提交。
export function upgradeWateringCan(game){
 if(!productionAvailable(game)||game.cottage||game.vehicle.active)return {ok:false,message:'请回到地面下车改造。'};
 if(game.progress.farm.doubleCan)return {ok:false,message:'双格水壶已改造。'};
 if(game.progress.mining.ore<FARM_WATER.upgradeOre)return {ok:false,message:'矿石不足，请到地下开掘岩壁。'};
 const next=candidate(game);
 next.mining.ore-=FARM_WATER.upgradeOre;
 next.farm.doubleCan=true;
 return commit(game,next,'双格水壶已装好，回到田边点击左边的作物即可。');
}
// 在栏门现场领养或喂养，金币和动物归属一起保存。
export function tendPasture(game,action,crop){
 if(!productionAvailable(game)||game.mapId!=='forest'||game.cottage||game.vehicle.active||worldDistance(game.player,PEN_GATE)>145)return {ok:false,message:'请先走到营地牧栏门口。'};
 const next=candidate(game),farm=next.farm;
 if(action==='adopt-horse'){
  if(next.materials.draftHorse)return {ok:false,message:'已有一匹挽马在等候套车。'};
  if(next.coins<HORSE_PRICE)return {ok:false,message:'领养挽马需要 '+HORSE_PRICE+' 金币。'};
  next.coins-=HORSE_PRICE;next.materials.draftHorse=1;
  return commit(game,next,'已领养挽马，打造木马车时工坊会来套车。');
 }
 if(action==='adopt-ox'){
  if(farm.oxPlow)return {ok:false,message:'你已经有一头耕牛了。'};
  if(next.coins<PASTURE.oxPrice)return {ok:false,message:'领养耕牛需要 '+PASTURE.oxPrice+' 金币。'};
  next.coins-=PASTURE.oxPrice;
  farm.oxPlow=true;
  farm.oxSite={...PEN_OX};
  return commit(game,next,'耕牛已住进牧栏。走近点它，就能牵去犁地。');
 }
 if(action==='adopt'){
  if(farm.sheep||next.coins<PASTURE.sheepPrice)return {ok:false,message:'请确认金币足够且羊栏空闲。'};
  next.coins-=PASTURE.sheepPrice;farm.sheep=true;
  return commit(game,next,'绵羊已住进牧栏。');
 }
 if(!['ox','sheep'].includes(action)||!(action==='ox'?farm.oxPlow:farm.sheep))return {ok:false,message:'请先领养这只动物。'};
 if(action==='ox'&&(farm.oxSite?.mapId!=='forest'||worldDistance(oxFoot(farm.oxSite),PASTURE)>140))return {ok:false,message:'请先把耕牛牵回牧栏。'};
 if(action==='ox'&&crop==='forage'){
  if(!farm.forage)return {ok:false,message:'背包里没有甜穗草。'};
  farm.forage--;farm.oxFeeds++;return commit(game,next,'耕牛吃下了一束甜穗草。');
 }
 if(!FARM_CROPS[crop]||FARM_CROPS[crop].category==='ornamental'||!farm.inventory[crop])return {ok:false,message:'请带一份可食用的收成到牧栏。'};
 farm.inventory[crop]--;farm[action==='ox'?'oxFeeds':'sheepFeeds']++;
 return commit(game,next,(action==='ox'?'耕牛':'绵羊')+'吃下了'+FARM_CROPS[crop].name+'。');
}
// 搬移状态仅保存在运行时；原存档位置保留，取消或刷新不会丢失设备。
export function carriedSprinkler(game){
 const carry=game.productionCarry;if(!carry||!productionAvailable(game)||game.cottage||game.vehicle.active||carry.mapId!==game.mapId)return null;
 return game.progress.production.sprinklers.find(p=>p.id===carry.id&&p.mapId===carry.mapId&&p.x===carry.x&&p.y===carry.y)||null;
}
// 必须先在原设备旁拿起，此后放下只检查玩家与目标的距离。
export function pickupSprinkler(game,id){
 if(!productionAvailable(game)||game.state!=='playing'||game.cottage||game.vehicle.active)return {ok:false,message:'请在地面下车后拿起洒水器。'};
 const item=game.progress.production.sprinklers.find(p=>p.id===id);
 if(!item||item.mapId!==game.mapId||worldDistance(item,game.player)>130)return {ok:false,message:'请先走到洒水器旁。'};
 if(game.productionCarry)return {ok:false,message:'请先放下或取消当前搬移。'};
 game.productionCarry={...item};return {ok:true,message:'已拿起洒水器，点击目标位置后放下。'};
}
// 设备选址与农田使用同一地形规则；排除原设备后可原地调整。
export function productionPlacement(game,point,kind,moving=null){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return {point:null,reason:'请选择有效地面位置。'};
 if(!PRODUCTION_BUILDINGS[kind])return {point:null,reason:'请选择有效设施。'};
 const s=game.progress.production,devices=[...s.sprinklers,...(s.bench?[{...s.bench,id:'bench'}]:[])];
 const reference=game.progress.farm.plots.filter(p=>p.mapId===game.mapId).sort((a,b)=>worldDistance(a,point)-worldDistance(b,point))[0];
 const target=snapFarmPoint(point,game.mapId,reference&&worldDistance(reference,point)<300?reference:null);
 const old=moving==='bench'?s.bench:s.sprinklers.find(p=>p.id===moving),exclude=devices.filter(p=>!(moving==='bench'?p.id==='bench':kind==='sprinkler'&&p.id===moving));
 if(moving!==null&&(!old||old.mapId!==game.mapId||worldDistance(old,game.player)>130&&!(kind==='sprinkler'&&carriedSprinkler(game)?.id===moving)))return {point:target,reason:'请靠近要移动的设施。'};
 const context=Object.assign(Object.create(game),{productionPlacementIgnore:moving});
 let reason=farmLandReason(context,target);
 if(!reason&&exclude.some(p=>p.mapId===target.mapId&&Math.abs(delta(p.x-target.x,WORLD.width))<52&&Math.abs(delta(p.y-target.y,WORLD.height))<46))reason='这里已有生产设施。';
 if(!reason&&worldDistance(game.player,target)>150)reason='请再靠近这块空地，然后放置设施。';
 return {point:target,reason};
}
// 放置和移动共用校验；移动不退款、不扣料且不重发教学种子。
export function placeProduction(game,kind,point,moving=null,fromBag=false){
 if(!productionAvailable(game)||game.state!=='playing'||game.cottage||game.vehicle.active||!['forest','jiuzhaigou'].includes(game.mapId))return {ok:false,message:'请在地面下车后布置设施。'};
 if(fromBag&&(kind!=='sprinkler'||moving!==null||!(game.progress.production.sprinklerInventory>0)))return {ok:false,message:'背包中没有可放置的洒水器。'};
 const check=productionPlacement(game,point,kind,moving);if(check.reason)return {ok:false,message:check.reason};
 const s=game.progress.production,price=PRODUCTION_BUILDINGS[kind];
 if(!fromBag&&!productionUnlocked(game.progress,kind))return {ok:false,message:'请先完成当前生产目标。'};
 if(moving===null&&(kind==='bench'?!!s.bench:s.sprinklers.length+(fromBag?0:s.sprinklerInventory||0)>=P.maxSprinklers))return {ok:false,message:'设施数量已达上限，请移动已有设施。'};
 if(moving===null&&!fromBag&&(game.progress.mining.ore<price.ore||game.progress.wood<price.wood))return {ok:false,message:`需要${price.ore}矿石、${price.wood}仓库木材。`};
 const next=candidate(game),n=next.production;
 if(fromBag)n.sprinklerInventory--;else if(moving===null){next.mining.ore-=price.ore;next.wood-=price.wood;}
 if(kind==='bench')n.bench=check.point;
 else if(moving!==null)Object.assign(n.sprinklers.find(p=>p.id===moving),check.point);
 else n.sprinklers.push({...check.point,id:Math.max(0,...n.sprinklers.map(p=>p.id))+1});
 const gifts=[];
 if(kind==='bench'&&!n.seedGift){
  for(const id of ['wheat','carrot']){
   const reward=grantSeedReward(game,next,productionCrop(id),2);
   if(reward.count!==2)return {ok:false,message:'请先为教学种子腾出库存。'};
   gifts.push(reward.message);
  }
  n.seedGift=true;
 }
 const result=commit(game,next,`${price.name}已${fromBag?'从背包放置':moving===null?'建好':kind==='sprinkler'?'放下':'移动'}。${gifts.join('；')}`);
 if(result.ok&&kind==='sprinkler'&&game.productionCarry?.id===moving)game.productionCarry=null;return result;
}
// 拆除只删除指定设施，保留种子领取记录、补给和原料；保存失败不丢设备。
export function removeProduction(game,kind,id){
 if(!productionAvailable(game)||game.cottage||game.vehicle.active)return {ok:false,message:'请在地面下车后移除设施。'};
 if(!PRODUCTION_BUILDINGS[kind]||kind==='bench'&&id!=='bench')return {ok:false,message:'请选择有效设施。'};
 const s=game.progress.production,item=kind==='bench'?s.bench:s.sprinklers.find(p=>p.id===id);
 if(!item||item.mapId!==game.mapId||worldDistance(item,game.player)>130)return {ok:false,message:'请先走到要移除的设施旁。'};
 const next=candidate(game);if(kind==='bench')next.production.bench=null;else next.production.sprinklers=next.production.sprinklers.filter(p=>p.id!==id);
 const result=commit(game,next,`${PRODUCTION_BUILDINGS[kind].name}已移除，建造材料不返还。`);
 if(result.ok&&kind==='sprinkler'&&game.productionCarry?.id===id)game.productionCarry=null;return result;
}
// 近处设备原子收回背包，保留已浇作物；保存成功才撤去场景设施与该台水流。
export function storeSprinkler(game,id){
 if(!productionAvailable(game)||game.cottage||game.vehicle.active||!['forest','jiuzhaigou'].includes(game.mapId))return {ok:false,message:'请在地面下车后收回洒水器。'};
 const item=game.progress.production.sprinklers.find(p=>p.id===id);
 // 已合法拿起的设备跟随玩家，走离原位置后仍可收纳；未拿起时保留距离限制。
 if(!item||item.mapId!==game.mapId||worldDistance(item,game.player)>130&&carriedSprinkler(game)?.id!==id)return {ok:false,message:'请先走到要收回的洒水器旁。'};
 const next=candidate(game);next.production.sprinklers=next.production.sprinklers.filter(p=>p.id!==id);next.production.sprinklerInventory++;
 const result=commit(game,next,'洒水器已收回背包，可在随身物品或农矿生产中重新放置。');
 if(result.ok){
  if(game.productionSpray){game.productionSpray.devices=game.productionSpray.devices?.filter(d=>d.id!==id);game.productionSpray.sprinklers=game.productionSpray.sprinklers?.filter(n=>n!==id);}
  if(game.productionCarry?.id===id)game.productionCarry=null;
 }
 return result;
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
// 仅在喷嘴扫过目标时提交湿度；扫描队列只存在运行时，未扫田块不会提前写入存档。
export function updateProduction(game,now=Date.now()){
 if(game.state!=='playing')return false;
 if(!productionAvailable(game)||game.cottage||!['forest','jiuzhaigou'].includes(game.mapId)){if(game.productionSpray){game.productionSpray.devices=[];game.productionSpray.sprinklers=[];}return false;}
 if(now<(retries.get(game)||0))return false;
 const s=game.progress.production,held=carriedSprinkler(game),sprinklers=s.sprinklers.filter(p=>p.id!==held?.id&&p.mapId===game.mapId),returning=!s.returned&&s.minedOre>=P.oreGoal;
 // 没有在场设备时立即停止扫描，不为全地图空田逐帧分配待办。
 if(!sprinklers.length&&!returning){if(game.productionSpray){game.productionSpray.devices=[];game.productionSpray.sprinklers=[];}return false;}
 const dry=game.progress.farm.plots.filter(p=>!p.wild&&p.mapId===game.mapId&&!p.watered&&(p.crop===null||farmGrowth(p,now)<1));
 const old=game.productionSpray,wetPlots=(old?.wetPlots||[]).filter(p=>game.time>=p.time&&game.time-p.time<SPRINKLER.wetFadeSeconds);
 // 失效设备立即取消待扫目标；低帧率跨过轮末时仍结算该轮实际扫过的田块。
 const devices=(old?.devices||[]).filter(d=>game.time>=d.time&&sprinklers.some(p=>p.id===d.id&&p.mapId===d.mapId&&worldDistance(p,d)<.1)&&(game.time-d.time<SPRINKLER.spraySeconds||d.targets?.some(t=>dry.some(p=>sameSprinklerPlot(t,p)))));
 for(const d of sprinklers){
  if(devices.some(p=>p.id===d.id))continue;
  const targets=dry.filter(p=>sprinklerCovers(d,p)).map(p=>({...p,at:sprinklerHitDelay(d,p)}));
  if(targets.length)devices.push({...d,time:game.time,targets});
 }
 game.productionSpray={time:old?.time??game.time,plots:old?.plots||[],sprinklers:devices.map(d=>d.id),devices,wetPlots};
 const targets=dry.filter(p=>devices.some(d=>d.targets?.some(t=>sameSprinklerPlot(t,p)&&game.time-d.time>=t.at)));
 if(!returning&&!targets.length)return false;
 const next=candidate(game);if(returning)next.production.returned=true;
 for(const plot of next.farm.plots.filter(p=>targets.some(t=>t.id===p.id))){wetFarmPlot(next.farm,plot,now);plot.sprinklerWatered=true;if(plot.crop!==null)recordGardeningAction(next,'water',{crop:plot.crop,plot:plot.id});}
 const result=commit(game,next,returning?'矿石已带回地面，可以建造简易洒水器。':`洒水器扫过${targets.length}块田，土壤逐渐湿润。`);
 if(!result.ok){
  // 保存失败不改变土色或加速，停止本轮后限频重试，让下轮水流重新扫到干田。
  retries.set(game,now+1000);game.productionSpray.devices=[];game.productionSpray.sprinklers=[];
 }else{
  retries.delete(game);game.productionSpray.plots=targets.map(p=>p.id);
  game.productionSpray.wetPlots.push(...next.farm.plots.filter(p=>targets.some(t=>t.id===p.id)).map(p=>({...p,time:game.time})));
 }
 return result.ok;
}
