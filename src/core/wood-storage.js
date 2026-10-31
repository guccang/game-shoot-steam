// 木材先形成实物，再由营地入库事务转成可消费建材，装卸和入库不会凭空增殖。
import {CAMP_WAREHOUSE} from '../config/wood-storage.js';
import {RESOURCE_CAP} from '../config/resource-limits.js';
import {RANGER} from '../config/ranger-arrival.js';
import {nearest} from '../world/coordinates.js';
import {personalFleet} from './vehicle-repair.js';
import {cargoAccessible,commitCargo} from './cargo.js';
import {validateProgress} from '../progression/progress.js';
import {recordResourceGain} from '../progression/game-statistics.js';
import {sendMail} from '../progression/mailbox.js';
// 采集使用实际驾驶的自有载具；步行以及借用载具均不会把货物塞入远处车舱。
export function collectWood(game,amount){
 const p=game.progress,vehicle=personalFleet(game)&&game.vehicle.active&&p.vehicleHulls[game.vehicle.index],store=vehicle?p.logistics.builds[game.vehicle.index]:p.logistics,key=vehicle?'wood':'bagWood',before=store[key]||0,count=Math.max(0,Math.min(RESOURCE_CAP-before,Math.floor(Number(amount)||0)));
 store[key]=before+count;recordResourceGain(p,'wood',count);return {count,destination:vehicle?'载具货舱':'背包'};
}
// 可提交货物只包含背包和当前真正能接近的车辆；远处停车、救援中车辆不算在场。
export function availableWood(game){return (game.progress.logistics.bagWood||0)+game.progress.logistics.builds.reduce((sum,b,i)=>sum+(cargoAccessible(game,i)?b.wood||0:0),0);}
// 营地仓库无需先修复建筑，初始电动车的第一批木材也能交付。
export function canStoreWood(game){
 if(!personalFleet(game)||!['playing','paused'].includes(game.state)||game.mapId!=='forest'||game.player.hp<=0)return false;
 const b=CAMP_WAREHOUSE.bounds,origin=game.cottage?.outside||game.player,p=nearest(origin,{x:(b.left+b.right)/2,y:(b.top+b.bottom)/2});return p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom;
}
// 背包和车辆木材使用同一保存事务，允许卸出超载货物。
export function transferWood(game,index,count,direction){
 if(!cargoAccessible(game,index))return {ok:false,message:'请靠近这辆载具后装卸木头。'};
 if(!Number.isSafeInteger(count)||count<=0||!['load','unload'].includes(direction))return {ok:false,message:'装卸数量无效。'};
 const next=validateProgress(structuredClone(game.progress)),bag=next.logistics,car=bag.builds[index],from=direction==='load'?bag:car,to=direction==='load'?car:bag,fromKey=direction==='load'?'bagWood':'wood',toKey=direction==='load'?'wood':'bagWood';
 if(from[fromKey]<count||to[toKey]+count>RESOURCE_CAP)return {ok:false,message:'木头不足或目标库存已满。'};
 from[fromKey]-=count;to[toKey]+=count;return commitCargo(game,next,`木头 ×${count} 已${direction==='load'?'装入货舱':'取回背包'}。`);
}
// 仅在营地把随身与在场车辆的木材存入仓库；满仓余量留在原货物中。
export function storeWood(game){
 if(!canStoreWood(game))return {ok:false,message:'请带上木头返回营地，再存入仓库。'};
 const next=validateProgress(structuredClone(game.progress)),stores=[[next.logistics,'bagWood'],...next.logistics.builds.flatMap((b,i)=>cargoAccessible(game,i)?[[b,'wood']]:[])];let count=0;
 for(const [stock,key] of stores){const n=Math.min(stock[key]||0,RESOURCE_CAP-next.wood);stock[key]-=n;next.wood+=n;count+=n;}
 if(!count)return {ok:false,message:'没有可入库的木头，或营地仓库已满。'};
 if(next.arrival?.phase==='gather'&&next.wood>=RANGER.repairWood)next.arrival.phase='repair';
 sendMail(next,{sender:'营地仓库',title:'木材入库回执',body:`木头 ${count} 份已从背包及在场载具存入仓库，当前库存 ${next.wood} 份，可用于建设和制作。`});
 return commitCargo(game,next,`木头 ${count} 份已入库，仓库存量 ${next.wood} 份。`);
}
