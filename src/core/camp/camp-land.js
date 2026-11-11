import {relocateRetiredGateSpots} from '../../progression/vehicles/camp-parking.js';
import {activateCampLayout} from '../../world/camp-layout-bindings.js';
import {clearGateParkingTrees} from '../../world/forest-clearings.js';
import {grantDefaultCampDecor} from '../../progression/camp/default-decor.js';
// 买地独立于施工，保存成功后才扣款和显示新的建设位置。
import {CAMP_PLOTS,ownsCampPlot,availableCampPlots} from '../../config/camp-land.js';
import {worldDistance} from '../../world/coordinates.js';
import {canInspectBuilding} from './building-entry.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
import {recordEconomy} from '../../progression/economy/economy-ledger.js';
import {capturePatrol} from '../battle/patrol-session.js';
// 距离、余额、相邻关系和当前活动共同决定可购买状态。
export function campLandStatus(game,id){const plot=CAMP_PLOTS.find(p=>p.id===id);if(!plot)return null;const owned=ownsCampPlot(game.progress,id),adjacent=availableCampPlots(game.progress).some(p=>p.id===id),near=!!plot.sign&&worldDistance(game.player,plot.sign)<=150;return {plot,owned,adjacent,near,enough:game.progress.coins>=plot.coins,canBuy:!owned&&adjacent&&near&&game.progress.coins>=plot.coins&&canInspectBuilding(game)&&['playing','paused'].includes(game.state)&&!game.progress.restoration?.build};}
// 金币和地契写入同一候选存档，写入失败保持原状态。
export function purchaseCampLand(game,id,persist=game.restorationPersist){
 const s=campLandStatus(game,id);if(!s?.canBuy)return {ok:false,message:s?.owned?'这块土地已经属于营地。':!s?.adjacent?'请先购买相邻土地。':!s.near?'请走到地界木牌旁购买。':!s.enough?'金币不足，外出采集或巡林后再来。':'请先结束当前活动或施工。'};
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));next.campLand.owned.push(id);relocateRetiredGateSpots(next);grantDefaultCampDecor(next,id);next.coins-=s.plot.coins;recordEconomy(next,'expense','camp:land:'+id,{coins:s.plot.coins});const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 try{if(persist?.(next)!==true)return {ok:false,message:'地契未保存，金币未扣除，请重试。'};}catch{return {ok:false,message:'地契未保存，金币未扣除，请重试。'};}
 game.progress=next;activateCampLayout(next);clearGateParkingTrees(game);return {ok:true,message:'已购入'+s.plot.name+'！新地基已开放，选择设施投入木材即可建设。'};
}
