import {awardCampXp} from '../../progression/camp/camp-level.js';
import {ammoSoldAt} from '../../config/vehicle-special-ammo.js';
// 地区营地的任务、补给、采购、维修和招募统一先保存候选存档，再更新现场。
import {REGIONAL_CAMPS,regionalParcel} from '../../config/regional-camps.js';
import {regionalCampAvailable,regionalCampHere} from './regional-camp-access.js';
import {validateProgress} from '../../progression/progress.js';
import {capturePatrol} from '../battle/patrol-session.js';
import {worldDistance} from '../../world/coordinates.js';
import {AMMO_TYPES} from '../../config/supplies.js';
import {FARM_CROPS,FARM_STOCK_CAP} from '../../config/farm.js';
import {VEHICLE_ENGINES} from '../../config/vehicle-load.js';
import {VEHICLE_WEAPONS} from '../../config/vehicle-armaments.js';
import {eraVehicle} from '../../config/vehicle-eras.js';
import {catLoad,vehicleLoad} from '../../progression/inventory/load-weight.js';
import {supplyVehicleNearby} from '../vehicles/supplies.js';
import {vehicleRepairQuote} from '../vehicles/vehicle-repair.js';
import {vehicleLocations} from '../vehicles/vehicle-location.js';
import {transactProgress} from '../../progression/economy/transactions.js';
import {recordEconomy} from '../../progression/economy/economy-ledger.js';
// 候选快照同步真实弹匣和耐久；后续修改不反向污染当前运行态。
function candidate(g){const next=validateProgress(structuredClone(g.progress)),snapshot=Object.create(g);snapshot.progress=next;next.patrol=capturePatrol(snapshot);return next;}
// 只在存储确认成功时交付，重复点击与磁盘失败不会复制奖励。
function commit(g,next,message){let saved=false;try{saved=g.livingPersist?.(next)===true;}catch{}if(!saved)return {ok:false,message:'保存失败，本次费用和物品未改变，请重试。'};g.progress=next;return {ok:true,message};}
// 任务物不占背包，无出售价值；必须接任务后到实物箱旁亲自领取。
export function recoverRegionalParcel(g,id){const c=REGIONAL_CAMPS.find(c=>c.id===id);if(!c||!regionalCampAvailable(g)||worldDistance(g.player,regionalParcel(c))>95||g.progress.regionalCamps[c.id].stage!==1)return {ok:false,message:'请先接取委托，再到任务箱旁寻找。'};const next=candidate(g);next.regionalCamps[c.id].stage=2;return commit(g,next,'找到'+c.parcel+'，请返回'+c.name+'交给'+c.npc+'。');}
// 每次交易重新验证现场、商品归属和实际容量，按钮禁用仅作为提示。
export function regionalCampAction(g,id,action,{hull=g.vehicle.index,key,target='hand',batches=1}={}){
 const c=regionalCampHere(g,id);if(!c)return {ok:false,message:'请到对应营地居民或服务屋前办理。'};
 if(!Number.isSafeInteger(batches)||batches<1||batches>100000||batches!==1&&!['seed','ammo'].includes(action))return {ok:false,message:'请选择有效数量。'};
 const next=candidate(g),stage=next.regionalCamps[c.id].stage;let cost=0,message='',repair=false;
 const nearby=Number.isInteger(hull)&&next.vehicleHulls[hull]&&supplyVehicleNearby(g,hull);
 if(action==='story'){
  if(stage===0){next.regionalCamps[c.id].stage=1;message=c.intro;}
  else if(stage===2){next.regionalCamps[c.id].stage=3;awardCampXp(next,'living',null,c.story,c.id);next.coins+=300;recordEconomy(next,'income','regional:'+id,{coins:300});message=c.ending+' 获得300金币，当地装备与招募已开放。';}
  else return {ok:false,message:stage===1?'请到营地东边寻找'+c.parcel+'。':'这段故事已经完成。'};
 }else if(action==='clue'){
  if(stage!==3)return {ok:false,message:'完成当地委托后，居民愿意分享寻宝线索。'};
  if(next.treasure.clues.includes(c.clue))return {ok:false,message:'这条线索已经记在手机寻宝页。'};
  next.treasure.clues.push(c.clue);message='线索已记入手机「寻宝」页，可随时查看地点与描述。';
 }else if(action==='ammo'){
  const rule=AMMO_TYPES[key];if(!rule||!ammoSoldAt(key,id)||!['hand','vehicle'].includes(target)||!rule.targets.includes(target))return {ok:false,message:'请选择适合背包或载具的弹药。'};
  if(target==='vehicle'&&!nearby)return {ok:false,message:'请把载具开到身边240单位内再补给。'};
  const stock=target==='hand'?next.supplies.hand:next.supplies.vehicles[hull];if(stock[key]+rule.pack*batches>100000)return {ok:false,message:'弹药库存已满。'};
  stock[key]+=rule.pack*batches;cost=rule.coins*batches;
  const view=Object.assign(Object.create(g),{progress:next}),load=target==='hand'?catLoad(view):vehicleLoad(g,hull,{progress:next,driver:true});
  if(load.overloaded||load.weight>=load.capacity)return {ok:false,message:'装入这包弹药会满载，请先卸货。'};
  message=rule.name+'已补充'+(rule.pack*batches)+'发，存入'+(target==='hand'?'随身背包。':'附近载具。');
 }else if(action==='seed'){
  if(!Number.isInteger(key)||!c.seeds.includes(key))return {ok:false,message:'此营地不出售这种种子。'};
  if(next.farm.seeds[key]+batches>FARM_STOCK_CAP)return {ok:false,message:'种子库存已满。'};
  next.farm.seeds[key]+=batches;next.farm.unlocked[key]=true;cost=FARM_CROPS[key].cost*batches;
  const load=catLoad(Object.assign(Object.create(g),{progress:next}));if(load.weight>=load.capacity)return {ok:false,message:'背包没有足够空间。'};
  message='购得'+FARM_CROPS[key].name+'种子，已解锁后续购买。';
 }else if(action==='engine'){
  if(stage!==3)return {ok:false,message:'先完成当地委托，才能购买特色装备。'};
  if(!nearby||eraVehicle(hull)||next.logistics.tow)return {ok:false,message:'请将可改装载具开到身边并解除牵引。'};
  const b=next.logistics.builds[hull];if(b.engines.includes(c.engine))return {ok:false,message:'这辆载具已经拥有该引擎，可免费换装。'};
  b.engines.push(c.engine);cost=VEHICLE_ENGINES[c.engine].cost;message='引擎已为当前车辆购入，点击换装即可安装；旧引擎保留。';
 }else if(action==='gun'){
  if(stage!==3)return {ok:false,message:'先完成当地委托，才能购买特色装备。'};
  if(next.vehicleWeapons[c.gun])return {ok:false,message:'已经拥有这门主炮，无需重复购买。'};
  next.vehicleWeapons[c.gun]=1;cost=VEHICLE_WEAPONS[c.gun].cost;message='特色主炮已存入工坊装备库，可在营地为附近车辆安装。';
 }else if(action==='repair'){
  const service=next.vehicleService[hull],site=vehicleLocations(g).find(v=>v.hull===hull),wreck=service?.phase==='wrecked'&&site?.mapId===g.mapId&&worldDistance(g.cottage?.outside||g.player,site)<=240;
  if(!nearby&&!wreck)return {ok:false,message:'请把车辆开到身边，或将残骸牵引到营地，再现场维修。'};
  if(next.logistics.tow&&next.logistics.tow.target!==hull)return {ok:false,message:'请先解除其他车辆的牵引。'};
  cost=vehicleRepairQuote(g,hull);if(!cost)return {ok:false,message:'这辆车状态良好，无需维修。'};
  next.vehicleService[hull]={...service,hp:1,phase:null};next.supplies.engineFaults[hull]=0;const gun=next.vehicleLoadouts[hull];if(gun!==null)next.supplies.gunFaults[gun]=0;
  const parked=next.campParking.owned.find(p=>p.hull===hull);if(parked)parked.hp=1;
  if(wreck){next.logistics.tow=null;next.campParking.owned=next.campParking.owned.filter(p=>p.hull!==hull);next.campParking.owned.push({hull,spot:null,mapId:'forest',x:site.x,y:site.y,hp:1,ammo:g.vehicles[hull].module?.magazine.ammo||0,reload:g.vehicles[hull].module?.magazine.remaining||0,wheel:g.vehicles[hull].wheelPhase||0,track:0});}
  repair=true;message='现场检修完成：车体、引擎和主炮已修好，车辆留在原位。';
 }else if(action==='recruit'){
  if(stage!==3)return {ok:false,message:'请先完成当地委托，赢得猫猫信任。'};
  if(next.heroes[c.hero])return {ok:false,message:'这只猫猫已经加入你的营地。'};
  if(!transactProgress(next,'heroes',c.hero,'buy',{catHome:true,camp:c.id}))return {ok:false,message:'招募需要足够金币、木头和一间空余住屋；请先扩建家园。'};
  next.heroXp[c.hero]=0;message=c.ending+' 已加入你的营地，可回家与住户对话换班。';
 }else return {ok:false,message:'无效的营地服务。'};
 if(next.coins<cost)return {ok:false,message:'金币不足，需要'+cost+'金币。'};
 next.coins-=cost;if(cost)recordEconomy(next,'expense','regional:'+id+':'+action,{coins:cost});
 const result=commit(g,next,message);if(result.ok&&repair){const v=g.vehicles[hull];v.hp=v.maxHp;v.cooldown=0;}return result;
}
