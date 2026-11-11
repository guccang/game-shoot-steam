import {relocateRetiredGateSpots} from '../../progression/vehicles/camp-parking.js';
import {activateCampLayout} from '../../world/camp-layout-bindings.js';
import {clearGateParkingTrees} from '../../world/forest-clearings.js';
import {grantDefaultCampDecor} from '../../progression/camp/default-decor.js';
// 购地与设施解锁在一次存档内结算。
import {CAMP_PLOTS,ownsCampPlot,availableCampPlots} from '../../config/camp-land.js';
import {TOWN_RESTORATIONS} from '../../config/town-restoration.js';
import {startRestoredTask} from '../../progression/camp/restoration-task.js';
import {canInspectBuilding} from './building-entry.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
import {workshopMaterialCount,spendWorkshopMaterials} from '../../progression/workshop/workshop-materials.js';
import {recordEconomy} from '../../progression/economy/economy-ledger.js';
import {capturePatrol} from '../battle/patrol-session.js';
// 现场、地图和管理页共用相同的购地条件。
export function campLandStatus(game,id){const plot=CAMP_PLOTS.find(p=>p.id===id);if(!plot)return null;const owned=ownsCampPlot(game.progress,id),adjacent=availableCampPlots(game.progress).some(p=>p.id===id);const cost={coins:plot.coins,wood:plot.wood||0},enough=Object.entries(cost).every(([k,n])=>workshopMaterialCount(game.progress,k)>=n);return {plot,owned,adjacent,cost,enough,canBuy:!owned&&adjacent&&enough&&canInspectBuilding(game)&&['playing','paused'].includes(game.state)&&!game.progress.restoration?.build};}
// 金币和地契写入同一候选存档，写入失败保持原状态。
export function purchaseCampLand(game,id,persist=game.restorationPersist){
 const s=campLandStatus(game,id);if(!s?.canBuy)return {ok:false,message:s?.owned?'这块土地已经属于营地。':!s?.adjacent?'请先购买相邻土地。':!s.enough?'金币或木材不足。':'请先结束当前活动或施工。'};
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));if(!spendWorkshopMaterials(next,s.cost))return {ok:false,message:'扩建资源不足。'};next.campLand.owned.push(id);
 // 以设施原始地块结算，玩家搬迁过建筑也不会重复获得或漏掉。
 const facilities=TOWN_RESTORATIONS.filter(f=>f.plotId===id);
 for(const f of facilities){
  if(!next.restoration.repaired.includes(f.id))next.restoration.repaired.push(f.id);
  if(next.taskTracking?.kind==='restoration'&&next.taskTracking.id===f.id)next.taskTracking=null;
 }
 for(const f of facilities)startRestoredTask(next,f.id);
 relocateRetiredGateSpots(next);grantDefaultCampDecor(next,id);recordEconomy(next,'expense','camp:land:'+id,s.cost);const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 try{if(persist?.(next)!==true)return {ok:false,message:'地契未保存，资源未扣除，请重试。'};}catch{return {ok:false,message:'地契未保存，资源未扣除，请重试。'};}
 game.progress=next;game.player.campProgress=next;activateCampLayout(next);clearGateParkingTrees(game);return {ok:true,message:'已购入'+s.plot.name+'，地块设施已开放。'};
}
