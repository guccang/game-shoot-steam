// 木材真正落地，接近半秒后才原子转入实物库存；会造成满载时整堆跳过。
import {WOOD_GROUND,WOOD_ITEM} from '../config/wood-storage.js';
import {RESOURCE_CAP} from '../config/resource-limits.js';
import {RANGER} from '../config/ranger-arrival.js';
import {canonical,worldDistance} from '../world/coordinates.js';
import {freshWoodDrops} from '../progression/wood-drops.js';
import {catLoad,vehicleLoad} from '../progression/load-weight.js';
import {bindEconomy,economyFor} from '../config/economy.js';
import {recordEconomy} from '../progression/economy-ledger.js';
import {personalFleet} from './vehicle-repair.js';
import {collectWood} from './wood-storage.js';
import {recordArrivalWood} from './ranger-arrival.js';
import {recordRestorationWood} from './town-restoration.js';
import {capturePatrol} from './patrol-session.js';
import {createResourceDrop} from '../combat/resource-pickup.js';
// 同一地点和同一采集来源合堆，不吸向玩家，也不改变到账数量。
export function dropGroundWood(game,target,amount,impact){
 let remaining=Math.max(0,Math.min(RESOURCE_CAP,Math.floor(Number(amount)||0)));if(!remaining)return;
 const data=game.progress.woodDrops??=freshWoodDrops(),point=canonical(target),source=target.type==='tree'?'tree':'enemy',saw=source==='tree'&&impact?.weaponIndex===RANGER.saw;
 const pile=data.piles.find(d=>d.mapId===game.mapId&&d.source===source&&d.saw===saw&&worldDistance(d,point)<=WOOD_GROUND.mergeRadius&&d.count+remaining<=WOOD_GROUND.mergeLimit);
 if(pile){const n=Math.min(remaining,RESOURCE_CAP-pile.count);pile.count+=n;remaining-=n;}
 if(remaining)data.piles.push({id:data.nextId++,mapId:game.mapId,...point,count:remaining,source,saw});
}
// 载荷达到上限会停驶，所以只接收拾取后仍低于上限的完整份数。
export function woodPickupCapacity(game){
 const driving=personalFleet(game)&&game.vehicle.active&&game.progress.vehicleHulls[game.vehicle.index],load=driving?vehicleLoad(game):catLoad(game),weight=driving?load.payload:load.weight;
 const stock=driving?game.progress.logistics.builds[game.vehicle.index].wood:game.progress.logistics.bagWood;
 return Math.max(0,Math.min(RESOURCE_CAP-(stock||0),Math.floor((load.capacity-weight-1e-6)/WOOD_ITEM.mass)));
}
// 导航可复用地面真实位置，不会把另一张地图的物品当成附近木材。
export function nearestGroundWood(game,fit=false){const capacity=fit?woodPickupCapacity(game):Infinity;return (game.progress.woodDrops?.piles||[]).filter(d=>d.mapId===game.mapId&&d.count>0&&d.count<=capacity).reduce((best,d)=>!best||worldDistance(d,game.player)<worldDistance(best,game.player)?d:best,null);}
// 保存成功后才发出入包与飞行反馈，失败保留原物品、负重和任务统计。
function collectPile(game,pile){
 const count=pile.count;if(count>woodPickupCapacity(game))return false;
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress)),snapshot=Object.create(game);snapshot.progress=next;
 const collected=collectWood(snapshot,count),item=next.woodDrops.piles.find(d=>d.id===pile.id);item.count-=collected.count;
 next.woodDrops.piles=next.woodDrops.piles.filter(d=>d.count>0);recordEconomy(next,'income','forest:'+pile.source,{wood:collected.count});
 if(pile.source==='tree'){recordArrivalWood(snapshot,collected.count,{weaponIndex:pile.saw?RANGER.saw:null});recordRestorationWood(snapshot,collected.count);}
 next.patrol=capturePatrol(snapshot);
 try{if((game.livingPersist?.(next)??true)!==true)return false;}catch{return false;}
 game.progress=next;game.drops.push(createResourceDrop(pile,0,collected.count));game.float(pile.x,pile.y-40,`木头 +${collected.count} → ${collected.destination}`,'#e2f3ce');return true;
}
// 连续靠近同一堆半秒才拾取；离开、换车和切换目标重置，暂停冻结。
export function updateWoodPickup(game,dt){
 const tick=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;
 game.woodPickupNotice=Math.max(0,(game.woodPickupNotice||0)-tick);
 if(!personalFleet(game)||game.cottage||game.player.hp<=0||game.mainlineSpeech||game.farmWork||game.progress.restoration?.build||game.vehicleBoarding||game.cottageEntry||!['playing','paused'].includes(game.state)){game.woodPickup=null;game.woodPickupSkipped=null;return;}
 const pile=nearestGroundWood(game),radius=game.vehicle.active?WOOD_GROUND.vehicleRadius:WOOD_GROUND.footRadius,carrier=game.vehicle.active?game.vehicle.index:'bag';
 if(!pile||worldDistance(pile,game.player)>radius){game.woodPickup=null;game.woodPickupSkipped=null;return;}
 const same=game.woodPickup?.id===pile.id&&game.woodPickup.carrier===carrier&&game.woodPickup.mapId===game.mapId;
 if(game.state!=='playing'){if(!same)game.woodPickup=null;return;}
 // 木材优先级低：整堆拾取会满载就跳过，不部分装入，也不为了木材把玩家卡住。
 if(woodPickupCapacity(game)<pile.count){
  game.woodPickup=null;const key=pile.mapId+':'+pile.id+':'+carrier;
  if(game.woodPickupSkipped!==key){game.woodPickupSkipped=key;game.onEvent('story-hint',{text:'拾取这堆木材会使载荷满，已跳过拾取。'});}return;
 }
 game.woodPickupSkipped=null;
 const state=game.woodPickup={id:pile.id,mapId:pile.mapId,carrier,x:pile.x,y:pile.y,elapsed:same?game.woodPickup.elapsed+tick:0};
 if(state.elapsed+1e-9<WOOD_GROUND.wait)return;
 if(collectPile(game,pile)){game.woodPickup=null;return;}
 // 保存失败后延迟重试，避免每帧刷提示和反复写入。
 state.elapsed=-1;if(!game.woodPickupNotice){game.woodPickupNotice=WOOD_GROUND.noticeSeconds;game.onEvent('story-hint',{text:'拾取未保存成功，木材仍在地面，请稍后重试。'});}
}
