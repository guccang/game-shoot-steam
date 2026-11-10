import {WORLD_UNITS_PER_METER} from '../../world/distance-units.js';
import {clearWorldNavigation} from '../navigation/world-navigation.js';
import {stopWaystationTravel} from '../navigation/waystations.js';
// 商队遭遇与夜宿状态机；只生成未完成名额，不修改清剿本身的波次。
import {TRADE_SITES,TRADE_BOARD} from '../../config/camp-trade.js';
import {TRADE_ESCORT,escortWaveDone} from '../../config/trade-escort.js';
import {calendarView} from '../../world/living-calendar.js';
import {worldDistance} from '../../world/coordinates.js';
import {livingSafePoint} from '../../world/living-spaces.js';
import {blocked} from '../../physics/motion.js';
import {cottageSleepTarget} from '../home/cottage.js';
import {validateProgress} from '../../progression/progress.js';
import {commitCargo} from '../inventory/cargo.js';
// 夜宿由正式历法判定，不受手动预览夜色影响。
export function escortNight(g){return calendarView(g.progress.living.calendar).id==='night';}
// 夜宿点离所有商路营地至少200米，使用商队实际位置而非累计路程。
export function escortCampAllowed(e){return !livingSafePoint(e)&&TRADE_SITES.every(site=>worldDistance(e,site)>=TRADE_ESCORT.campDistanceMeters*WORLD_UNITS_PER_METER);}
// 玩家必须在商队身边且附近没有敌人，休息不扣帐篷，也不赠送永久装备。
export function startEscortRest(g){const e=g.progress.trade?.escort;if(!e||!e.camped||!escortCampAllowed(e)||!escortNight(g)||worldDistance(g.player,e)>140)return {ok:false,message:'请在夜晚回到停驻的商队旁扎营。'};if(g.enemies.some(m=>m.hp>0&&worldDistance(m,g.player)<400))return {ok:false,message:'附近有怪物，请先清理后再休息。'};g.tradeRest={elapsed:0,hp:g.player.hp,origin:{x:g.player.x,y:g.player.y}};return {ok:true,message:'商队就地扎营，休息3秒后天亮。'};}
// 单次最多补齐八个安全出生点；失败名额保留，下帧重试，不刷进墙体或营地。
export function updateEscortEncounter(g,dt){
 const e=g.progress.trade.escort,night=escortNight(g),camped=night&&escortCampAllowed(e);if(camped&&!e.camped){clearWorldNavigation(g);g.sceneApproach=null;if(g.waystationTravel)stopWaystationTravel(g,'夜晚到了，商队就地扎营。');g.float(e.x,e.y-60,'夜晚到了，商队扎营等待天亮','#ffe4a2');}e.camped=camped;
 if(g.tradeRest){const r=g.tradeRest;if(!camped||g.player.hp<r.hp||worldDistance(g.player,r.origin)>24||g.enemies.some(m=>m.hp>0&&worldDistance(m,g.player)<400)){g.tradeRest=null;g.float(g.player.x,g.player.y-60,'休息已中断','#ffe4a2');}
 else{r.elapsed+=dt;if(r.elapsed>=TRADE_ESCORT.restSeconds){const next=validateProgress(structuredClone(g.progress));next.living.calendar=cottageSleepTarget(next.living.calendar,'morning');next.trade.escort.camped=false;const result=commitCargo(g,next,'天亮了，商队可以继续出发。');g.tradeRest=null;g.float(g.player.x,g.player.y-60,result.message,'#ffe4a2');}return true;}}
 const alive=g.enemies.filter(m=>m.hp>0&&m.tradeGuard===e.station),done=escortWaveDone(e);
 // 营地附近的夜间商队继续跟随，不提前切断导航，也不在营地附近刷新遭遇。
 if(night)return camped;
 if(done>=TRADE_ESCORT.waves)return false;
 const origin=TRADE_SITES.find(s=>s.id===e.origin)||TRADE_BOARD,dest=TRADE_SITES.find(s=>s.id===e.station),length=worldDistance(origin,dest);
 const due=e.travel>=length*[.2,.5,.8][done]||worldDistance(e,dest)<150;
 if(e.wave<=done&&(!due||livingSafePoint(e)||livingSafePoint(g.player)))return false;
 if(worldDistance(g.player,e)>300)return true;
 if(e.wave<=done){e.wave=done+1;g.float(g.player.x,g.player.y-70,'商队遭遇 · 第'+e.wave+'/3波','#ffe4a2');}
 for(let n=0;n<TRADE_ESCORT.batch;n++){const slot=(e.wave-1)*TRADE_ESCORT.batch+n;if(e.defeated.includes(slot)||alive.some(m=>m.tradeSlot===slot))continue;
 let spot=null;for(let i=0;i<24;i++){const a=(n*3+i)*Math.PI/12,p={x:g.player.x+Math.cos(a)*230,y:g.player.y+Math.sin(a)*230};if(!livingSafePoint(p)&&!blocked(p.x,p.y,25,g.trees,{mapId:g.mapId,livingCollision:true})){spot=p;break;}}
 if(!spot)continue;const m=g.spawnEnemy(0,0,spot,{ambient:true,escortWave:e.wave,escortRounds:e.rounds,escortOrdinal:n+1});if(m){m.tradeGuard=e.station;m.tradeSlot=slot;}
 }
 return true;
}
