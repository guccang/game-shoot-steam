// 快递站只补充已解锁种子，离线最多补到一封，不无限追发或解锁新品种。
import {validateProgress} from '../progression/progress.js';
import {FARM_CROPS,FARM_STOCK_CAP,FARM_DELIVERY,FARM_SENDERS} from '../config/farm.js';
import {canEnterFarm,farmInteractionBlocked,commitFarm} from './farm.js';
import {worldDistance} from '../world/coordinates.js';
import {grantFarmSeeds} from '../progression/farm.js';
// 快递柜是世界服务，不是农具动作；骑乘可查看领取，战斗和受限场景仍不可操作。
export function canUseFarmDelivery(game){return canEnterFarm(game)&&game.mapId===FARM_DELIVERY.mapId&&!farmInteractionBlocked(game);}
// 检查间隔只控制计算频率，包裹和下次寄送时间必须先保存成功。
export function updateFarmDelivery(game,now=Date.now()){
 if(!canEnterFarm(game)||!Number.isFinite(now)||now<(game.farmDeliveryCheck||0))return;
 game.farmDeliveryCheck=now+5000;const current=game.progress.farm.delivery;
 if(current.parcels.length>=5||current.nextAt>now)return;
 const next=validateProgress(structuredClone(game.progress)),d=next.farm.delivery;
 // 种子用完仍可收到已解锁品种；尚未解锁任何品种时暂停寄送。
 const crops=FARM_CROPS.map((_,i)=>i).filter(i=>next.farm.unlocked[i]);
 if(!crops.length)return;
 if(!d.nextAt){d.nextAt=now+30000;return commitFarm(game,next,{action:'delivery-scheduled',message:''});}
 const serial=d.serial+1,crop=crops[Math.floor((game.random?.()??Math.random())*crops.length)];
 d.serial=serial;d.parcels.push({id:serial,crop,count:2+serial%3,sender:(serial-1)%FARM_SENDERS.length,arrivedAt:now});
 d.nextAt=now+120000+Math.floor((game.random?.()??Math.random())*180000);
 return commitFarm(game,next,{action:'delivery-arrived',message:'收到邻居寄来的种子，请到快递站领取！'});
}
// 种子统一在快递站领取，一份包裹一次保存，库存放不下时完整保留。
export function claimFarmParcel(game,id){
 if(!canUseFarmDelivery(game)||worldDistance(game.player,FARM_DELIVERY)>115)return {ok:false,message:'请在非战斗状态靠近快递站柜台领取。'};
 const next=validateProgress(structuredClone(game.progress)),d=next.farm.delivery,index=d.parcels.findIndex(p=>p.id===id),p=d.parcels[index];
 if(!p)return {ok:false,message:'这份包裹已经领取。'};
 // 旧档已寄达的未解锁包裹保留，玩家通过战斗或任务解锁后才能领取。
 if(!next.farm.unlocked[p.crop])return {ok:false,message:'请先通过打怪或任务解锁'+FARM_CROPS[p.crop].name+'种子，这份旧包裹会继续保留。'};
 if(next.farm.seeds[p.crop]+p.count>FARM_STOCK_CAP)return {ok:false,message:'种子袋已满，包裹继续保留在快递站。'};
 grantFarmSeeds(next.farm,p.crop,p.count);d.parcels.splice(index,1);d.claimed++;
 return commitFarm(game,next,{action:'delivery-claimed',message:FARM_SENDERS[p.sender]+'寄来的'+FARM_CROPS[p.crop].name+'种子 +'+p.count});
}
