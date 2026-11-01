// 木材采集后直接飞入实物库存；装不下时不收取、不落地，也不播放飞行动画。
import {WOOD_ITEM} from '../config/wood-storage.js';
import {RESOURCE_CAP} from '../config/resource-limits.js';
import {catLoad,vehicleLoad} from '../progression/load-weight.js';
import {bindEconomy,economyFor} from '../config/economy.js';
import {recordEconomy} from '../progression/economy-ledger.js';
import {personalFleet} from './vehicle-repair.js';
import {collectWood} from './wood-storage.js';
import {recordArrivalWood} from './ranger-arrival.js';
import {recordRestorationWood} from './town-restoration.js';
import {capturePatrol} from './patrol-session.js';
import {createResourceDrop} from '../combat/resource-pickup.js';
// 达到上限会停驶，因此接收后必须严格低于上限，驾驶时包含驾驶员背包。
export function woodPickupCapacity(game){
 const driving=personalFleet(game)&&game.vehicle.active&&game.progress.vehicleHulls[game.vehicle.index],load=driving?vehicleLoad(game):catLoad(game),weight=driving?load.payload:load.weight;
 const stock=driving?game.progress.logistics.builds[game.vehicle.index].wood:game.progress.logistics.bagWood;
 return Math.max(0,Math.min(RESOURCE_CAP-(stock||0),Math.floor((load.capacity-weight-1e-6)/WOOD_ITEM.mass)));
}
// 同步检查整笔重量并保存；动画只表达已到账数量，不在飞行结束时再次增加库存。
export function collectAutomaticWood(game,target,amount,impact){
 const count=Math.max(0,Math.min(RESOURCE_CAP,Math.floor(Number(amount)||0)));
 if(!count||!personalFleet(game)||game.cottage||game.player.hp<=0||game.state!=='playing'||count>woodPickupCapacity(game))return false;
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress)),snapshot=Object.create(game);snapshot.progress=next;
 const collected=collectWood(snapshot,count);recordEconomy(next,'income','forest:'+target.type,{wood:collected.count});
 if(target.type==='tree'){recordArrivalWood(snapshot,collected.count,impact);recordRestorationWood(snapshot,collected.count);}
 next.patrol=capturePatrol(snapshot);
 try{if((game.livingPersist?.(next)??true)!==true)return false;}catch{return false;}
 game.progress=next;game.drops.push(createResourceDrop(target,0,collected.count));game.float(target.x,target.y-40,`木头 +${collected.count} → ${collected.destination}`,'#e2f3ce');return true;
}
