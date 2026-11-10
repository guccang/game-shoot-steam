// 失败与放弃共用事务；订单立即结束，离场马车只保留短暂表现状态。
import {TRADE_SITES,TRADE_BOARD} from '../../config/camp-trade.js';
import {validateProgress} from '../../progression/progress.js';
import {commitCargo} from '../inventory/cargo.js';
import {clearWorldNavigation} from '../navigation/world-navigation.js';
import {stopWaystationTravel} from '../navigation/waystations.js';
import {nearest,worldDistance} from '../../world/coordinates.js';
import {followTradeCart} from './trade-follow.js';
import {blocked} from '../../physics/motion.js';
import {treeGrid} from '../../world/spatial-grid.js';
import {advanceVehicleWheels} from '../../combat/vehicle-motion.js';
// 扣掉的定金不再扣第二次，保存失败时保留订单供下次重试。
export function retireTradeEscort(g,message){
 const e=g.progress.trade?.escort;if(!e)return {ok:false,message:'当前没有在途护送订单。'};
 const next=validateProgress(structuredClone(g.progress));next.trade.escort=null;next.trade.failed=[...new Set([...next.trade.failed,e.station])];
 const result=commitCargo(g,next,message);if(!result.ok)return result;
 (g.tradeDepartures??=[]).push({...e,departing:true,camped:false,travel:0,motion:{index:14,active:true,path:[]}});
 g.tradeRest=null;g.tradeMotion=null;clearWorldNavigation(g);g.sceneApproach=null;g.player.vx=g.player.vy=0;
 if(g.waystationTravel)stopWaystationTravel(g,message);
 for(const enemy of g.enemies)if(enemy.tradeGuard===e.station){delete enemy.tradeGuard;delete enemy.tradeSlot;}
 g.float?.(e.x,e.y-70,message,'#ffe4a2');return result;
}
// 离场沿出发站方向分段寻路；整辆车离开真实视口后回收，不瞬移回站。
export function updateDepartingTradeCarts(g,dt){
 if(!g.tradeDepartures?.length)return;
 g.tradeDepartures=g.tradeDepartures.filter(e=>{
  const origin=TRADE_SITES.find(s=>s.id===e.origin)||TRADE_BOARD,home=nearest(origin,e),d=worldDistance(e,home),before={x:e.x,y:e.y};
  // 分段终点先避开树、水与建筑；无路时换侧向落点，仍由正式A*验证整段。
  const motion=e.motion;
  if(motion.departureTarget&&worldDistance(e,motion.departureTarget)<=45){motion.path=[];motion.search=null;motion.departureAttempt=0;}
  if(!motion.path.length&&!motion.search&&!(motion.retry>0)){
   const base=Math.atan2(home.y-e.y,home.x-e.x),attempt=motion.departureAttempt||0,grid=treeGrid(g.trees);
   for(let i=0;i<16;i++){const n=(attempt+i)%16,a=base+(n===0?0:(n%2?1:-1)*Math.ceil(n/2)*.22),r=Math.min(d,350),p={x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r};
    if(!blocked(p.x,p.y,10,grid,{mapId:'forest',livingCollision:true,campProgress:g.progress})){motion.departureTarget=p;motion.departureAttempt=n+1;break;}}
  }
  const target=motion.departureTarget||home;
  followTradeCart(g,e,e.motion,dt,target);e.travel+=worldDistance(e,before);advanceVehicleWheels(e.motion,e,before,dt);
  const v=g.tradeViewport,p=v&&nearest(e,{x:v.x+v.w/2,y:v.y+v.h/2});
  const outside=v?(p.x+120<v.x||p.x-120>v.x+v.w||p.y+120<v.y||p.y-160>v.y+v.h):worldDistance(e,g.player)>1600;
  return !(outside&&(e.travel>0||d<50));
 });
}
