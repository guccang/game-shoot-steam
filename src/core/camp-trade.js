// 商路交易只取随身作物和实际到站的自有货舱；护送不占用玩家货位。
import {TRADE_BOARD,TRADE_STATIONS,TRADE_RELIC} from '../config/camp-trade.js';
import {FARM_CROPS} from '../config/farm.js';
import {validateProgress} from '../progression/progress.js';
import {creditResource} from '../progression/resource-wallet.js';
import {RESOURCE_CAP} from '../config/resource-limits.js';
import {recordEconomy} from '../progression/economy-ledger.js';
import {productionSalePlan} from '../progression/farm-production.js';
import {livingForest,livingSafePoint} from '../world/living-spaces.js';
import {nearest,worldDistance,WORLD} from '../world/coordinates.js';
import {moveBody,blocked} from '../physics/motion.js';
import {parkedOwned} from './camp-parking.js';
import {commitCargo} from './cargo.js';
import {advanceVehicleWheels} from '../combat/vehicle-motion.js';
// 独立场景、房内和过场不能访问地面商队。
export function tradeField(game){return livingForest(game)&&!game.cottage&&!game.livingPreview&&!game.progress.living?.patrolActive;}
// 以脚下位置判断交接；导航和手机只能查看异地报价。
export function atTradeSite(game,site){return tradeField(game)&&worldDistance(game.player,site)<=110;}
// 作物委托按已发现品种轮换，接单后锁定所需品种。
export function tradeCrop(progress){
 const known=FARM_CROPS.filter((c,i)=>progress.farm.unlocked[i]||progress.farm.inventory[i]>0);
 return FARM_CROPS.find(c=>c.id===progress.trade.crop)||known[progress.trade.serial%known.length]||FARM_CROPS[0];
}
// 货款按整批四舍五入，避免小额商品逐份累积舍入误差。
export function tradePrice(crop,count,percent){return Math.round(crop.value*count*percent/100);}
// 现场车与实际停车记录合并去重，避免访问其他地图或在修车辆。
function tradeStocks(game,next,site){
 const hulls=new Set(parkedOwned(game).filter(s=>worldDistance(s,site)<=110&&worldDistance(s,game.player)<=130).map(s=>s.record.hull));
 if(game.vehicle.active)hulls.add(game.vehicle.index);
 return [next.farm.inventory,...[...hulls].filter(i=>next.vehicleHulls[i]&&!next.vehicleService?.[i]?.phase).map(i=>next.logistics.builds[i].cargo)];
}
// 预览和实际扣货使用同一份清单，只售玩家选定的作物。
export function tradeStock(game,site){
 const stocks=tradeStocks(game,game.progress,site),sale=productionSalePlan(game.progress,stocks);
 return FARM_CROPS.map((crop,i)=>({crop,count:stocks.reduce((n,row)=>n+row[i],0),sell:sale.reduce((n,row)=>n+row[i],0)}));
}
// 所有收款、扣货、委托清除在同一次存档写入完成。
export function tradeAction(game,action,id){
 const fail=message=>({ok:false,message});
 if(!tradeField(game)||!['playing','paused'].includes(game.state))return fail('请在森林自由巡游时办理。');
 const next=validateProgress(structuredClone(game.progress)),t=next.trade;
 const station=TRADE_STATIONS.find(s=>s.id===id),destination=TRADE_STATIONS.find(s=>s.id===t.escort?.station);
 const site=action==='sell'?([TRADE_BOARD,...TRADE_STATIONS].find(s=>atTradeSite(game,s))):action==='finish-escort'?destination:TRADE_BOARD;
 let coins=0,message='';
 if(action==='keep'){t.keep=!t.keep;message=t.keep?'已留货，经过仓库也会保留作物。':'已恢复仓库门前自动出售。';}
 else{
  if(!site||!atTradeSite(game,site))return fail('请先抵达交接地点。');
  if(action==='take-crop'&&!t.crop){t.crop=tradeCrop(next).id;message='已接邻居作物订单。';}
  else if(action==='give-crop'&&t.crop){
   const crop=tradeCrop(next),i=FARM_CROPS.indexOf(crop),stocks=tradeStocks(game,next,site);
   if(stocks.reduce((n,row)=>n+row[i],0)<3)return fail('请带齐三份指定作物。');
   let left=3;for(const row of stocks){const n=Math.min(row[i],left);row[i]-=n;left-=n;}
   coins=tradePrice(crop,3,130);t.serial++;t.crop=null;message='邻居已收到作物';
  }else if(action==='take-relic'&&t.relic===null){t.relic=0;message='已接寻物委托，击败森林地面怪物可找回货签。';}
  else if(action==='give-relic'&&t.relic===TRADE_RELIC.count){coins=TRADE_RELIC.coins;t.relic=null;message='货签已交还商队';}
  else if(action==='escort'&&station&&!t.escort){
   t.escort={station:id,x:game.player.x,y:game.player.y,hp:100,ambush:false,cleared:0};message=station.guards?'商队已出发，请带路并击退途中劫货的怪物。':'商队已出发，请沿营地道路带队去旧哨驿站。';
  }else if(action==='finish-escort'&&destination&&worldDistance(t.escort,destination)<=125&&t.escort.cleared===destination.guards){
   coins=destination.commission;t.escort=null;message='商队平安抵达';
  }else if(action==='sell'){
   const i=FARM_CROPS.findIndex(c=>c.id===id);if(i<0)return fail('请选择作物。');
   const stocks=tradeStocks(game,next,site),sale=productionSalePlan(next,stocks),count=sale.reduce((n,row)=>n+row[i],0);
   if(!count)return fail('现场没有可出售的这类作物。');
   coins=tradePrice(FARM_CROPS[i],count,site.percent||100);
   for(const [j,row] of stocks.entries()) row[i]-=sale[j][i];
   message='已售出'+count+'份'+FARM_CROPS[i].name;
  }else return fail('当前订单还不能这样办理。');
 }
 if(coins){if(coins>RESOURCE_CAP-next.coins)return fail('金币已满，请留出足够余额空间。');creditResource(next,'coins',coins);recordEconomy(next,'income','trade:'+action,{coins});message+='，金币 +'+coins+'。';}
 const result=commitCargo(game,next,message);
 if(result.ok&&action==='escort'){game.tradeMotion=null;for(const enemy of game.enemies)delete enemy.tradeGuard;}
 return result;
}
// 委托物随击败自动拾取，未接单、已集齐或训练目标不会产生物品。
export function tradeDefeat(game,target){
 const t=game.progress.trade;
 if(!t||!livingForest(game)||game.cottage||game.livingPreview||target.type!=='enemy'||target.bossSummon||target.workshopTarget||target.football)return;
 if(t.escort&&target.tradeGuard===t.escort.station)t.escort.cleared=Math.min(TRADE_STATIONS.find(s=>s.id===t.escort.station).guards,t.escort.cleared+1);
 if(t.relic!==null&&t.relic<TRADE_RELIC.count&&!target.flying){t.relic++;game.float(target.x,target.y-48,'拾得货签 '+t.relic+'/3','#ffe4a2');}
}
// 商队沿玩家实际走过的路前进，离队等待；阻击时停下，必须保住货车才能领赏。
export function updateTradeEscort(game,dt){
 const e=game.progress.trade?.escort;if(!e||!tradeField(game)||game.state!=='playing')return;
 const station=TRADE_STATIONS.find(s=>s.id===e.station),distance=worldDistance(e,game.player);
 const motion=game.tradeMotion??={index:14,active:true,path:[]};
 if(motion.station!==e.station||worldDistance(e,motion.last||e)>8){motion.path=[];motion.station=e.station;}
 motion.last={x:e.x,y:e.y};
 if(station.guards&&!e.ambush&&!livingSafePoint(e)&&!livingSafePoint(game.player)&&worldDistance(e,station)<worldDistance(TRADE_BOARD,station)*.52)e.ambush=true;
 const before={x:e.x,y:e.y};
 if(e.ambush&&e.cleared<station.guards){
  let guards=game.enemies.filter(v=>v.tradeGuard===e.station&&v.hp>0);
  if(distance<260&&!guards.length){
   // 优先在车旁空地出现，窄路回退到商队已走过的地面。
   const spot=Array.from({length:8},(_,i)=>({x:e.x+90*Math.cos(i*Math.PI/4),y:e.y+90*Math.sin(i*Math.PI/4)})).find(p=>!livingSafePoint(p)&&!blocked(p.x,p.y,14,game.trees,{mapId:'forest',livingCollision:true}))||e;
   const enemy=game.spawnEnemy(0,100,spot,{ambient:true,ordinaryDumpling:true});
   if(enemy){enemy.tradeGuard=e.station;guards=[enemy];game.float(e.x,e.y-60,'商队遇袭，请击退拦路怪！','#ffe4a2');}
  }
  if(guards.some(v=>worldDistance(v,e)<100)){e.hp-=dt*3;if(e.hp<=0){game.progress.trade.escort=null;game.tradeMotion=null;game.float(e.x,e.y-45,'商队撤回营地，护送失败','#ffd19c');return;}}
 }else if(distance<240){
  const path=motion.path,last=path.at(-1)||e;
  if(worldDistance(last,game.player)>12)path.push({x:game.player.x,y:game.player.y});
  if(path.length>100)path.splice(0,path.length-100);
  if(distance>40&&path.length){
   const point=nearest(path[0],e),dx=point.x-e.x,dy=point.y-e.y,len=Math.hypot(dx,dy),step=Math.min(len,dt*(115+Math.max(0,distance-70)));
   if(len>0){
    const body={x:e.x,y:e.y,mapId:'forest',livingCollision:true};
    moveBody(body,dx/len*step,dy/len*step,WORLD,10,game.trees);e.x=body.x;e.y=body.y;
   }
   if(worldDistance(e,point)<4||worldDistance(before,e)<.01)path.shift();
  }
 }
 advanceVehicleWheels(motion,e,before,dt);motion.last={x:e.x,y:e.y};
}
