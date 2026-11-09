// 木材采集后直接飞入实物库存；装不下时不收取、不落地，也不播放飞行动画。
import {WOOD_ITEM} from '../../config/wood-storage.js';
import {RESOURCE_CAP} from '../../config/resource-limits.js';
import {catLoad,vehicleLoad} from '../../progression/inventory/load-weight.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
import {recordEconomy} from '../../progression/economy/economy-ledger.js';
import {personalFleet} from '../vehicles/vehicle-repair.js';
import {floatVehicleLoadNotice} from './load-warning.js';
import {collectWood} from './wood-storage.js';
import {recordArrivalWood} from '../camp/ranger-arrival.js';
import {recordRestorationWood} from '../camp/town-restoration.js';
import {capturePatrol} from '../battle/patrol-session.js';
import {createResourceDrop} from '../../combat/resource-pickup.js';
// 达到上限会停驶，因此接收后必须严格低于上限，驾驶时检查收货的车舱。
export function woodPickupCapacity(game){
 const driving=personalFleet(game)&&game.vehicle.active&&game.progress.vehicleHulls[game.vehicle.index],load=driving?vehicleLoad(game):catLoad(game),weight=driving?load.payload:load.weight;
 const stock=driving?game.progress.logistics.builds[game.vehicle.index].wood:game.progress.logistics.bagWood;
 return Math.max(0,Math.min(RESOURCE_CAP-(stock||0),Math.floor((load.capacity-weight-1e-6)/WOOD_ITEM.mass)));
}
// 同步检查整笔重量并保存；动画只表达已到账数量，不在飞行结束时再次增加库存。
export function collectAutomaticWood(game,target,amount,impact){
 const count=Math.max(0,Math.min(RESOURCE_CAP,Math.floor(Number(amount)||0)));
 if(!count||!personalFleet(game)||game.cottage||game.player.hp<=0||game.state!=='playing')return false;
 if(count>woodPickupCapacity(game)){
  // 还有余量但整批放不下时单独提示；真正满载由通用载荷提示处理。
  const hull=game.vehicle.index,last=game.woodPickupWarning;
  if(game.vehicle.active&&game.progress.vehicleHulls[hull]&&(!last||last.hull!==hull||game.time-last.time>=4)&&!vehicleLoad(game,hull,{driver:false}).overloaded){
   floatVehicleLoadNotice(game,'货舱装不下这批木材');
   game.woodPickupWarning={hull,time:game.time};
  }
  return false;
 }
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress)),snapshot=Object.create(game);snapshot.progress=next;
 const collected=collectWood(snapshot,count);recordEconomy(next,'income','forest:'+target.type,{wood:collected.count});
 if(target.type==='tree'){recordArrivalWood(snapshot,collected.count,impact);recordRestorationWood(snapshot,collected.count);}
 next.patrol=capturePatrol(snapshot);
 try{if((game.livingPersist?.(next)??true)!==true)return false;}catch{return false;}
 // 采集结果通过木材飞行和库存数字反馈，不再弹出入库文字。
 game.progress=next;game.woodPickupWarning=null;game.drops.push(createResourceDrop(target,0,collected.count));return true;
}
