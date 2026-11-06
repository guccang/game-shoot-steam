// 用正式钱包、货舱、击杀和道路验证订单交接与护送读档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {TRADE_BOARD,TRADE_STATIONS} from '../src/config/camp-trade.js';
import {FARM_CROPS} from '../src/config/farm.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {RESOURCE_CAP} from '../src/config/resource-limits.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {backpackEntries} from '../src/progression/backpack.js';
import {tradeAction,tradeStock,updateTradeEscort} from '../src/core/camp-trade.js';
import {planQuestRoute} from '../src/physics/quest-route.js';
import {worldDistance} from '../src/world/coordinates.js';
import {WAREHOUSE} from '../src/config/warehouse.js';
import {updateWarehouseHarvest} from '../src/core/warehouse-harvest.js';

// 用同一份地图恢复现场，保留真实森林碰撞和可交互的车辆。
function scene(raw){
 const p=raw||freshProgress();
 p.arrival={version:3,phase:'complete',keys:true};p.mainline.phase='complete';p.mainline.completed=[...MAINLINE_IDS];
 p.vehicleHulls[0]=1;
 const g=new Game(p,()=>.5);g.state='playing';g.mainlineSpeech=null;g.vehicle.active=false;
 g.livingPersist=()=>true;locate(g,TRADE_BOARD);return g;
}
// 只移动脚底坐标，避免覆盖玩家身份和地图状态。
function locate(g,{x,y}){Object.assign(g.player,{x,y});}
// 通过正式战斗死亡入口收集委托物。
function defeat(g,enemy=g.spawnEnemy(0,90,{x:1350,y:1300},{ambient:true,ordinaryDumpling:true})){
 g.hit(enemy,enemy.hp+1000,false);
}

test('订单预留三份，按原价加三成，保存失败和重复提交均不会重复结算',()=>{
 const g=scene(),crop=FARM_CROPS[0];g.progress.farm.inventory[0]=2;g.progress.logistics.builds[0].cargo[0]=3;
 g.progress.campParking.owned=[{hull:0,mapId:'forest',x:g.player.x+25,y:g.player.y,spot:null,hp:1,ammo:0}];
 assert.equal(tradeAction(g,'take-crop').ok,true);
 assert.equal(tradeStock(g,TRADE_BOARD)[0].sell,2);
 const initial=g.progress.coins;
 assert.equal(tradeAction(g,'sell',crop.id).ok,true);assert.equal(g.progress.coins,initial+crop.value*2);
 const before=structuredClone(g.progress);g.livingPersist=()=>false;
 assert.equal(tradeAction(g,'give-crop').ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;assert.equal(tradeAction(g,'give-crop').ok,true);
 assert.equal(g.progress.coins,initial+crop.value*2+Math.round(crop.value*3*1.3));
 assert.equal(tradeAction(g,'give-crop').ok,false);assert.equal(tradeStock(g,TRADE_BOARD)[0].count,0);
});

test('留货可经过仓库，到站才能按当地价格出售，余额已满保留作物',()=>{
 for(const site of [TRADE_BOARD,...TRADE_STATIONS]){
  const g=scene(),crop=FARM_CROPS[0];g.progress.farm.inventory[0]=4;tradeAction(g,'keep');
  locate(g,{x:WAREHOUSE.x,y:WAREHOUSE.y+105});updateWarehouseHarvest(g,.05);assert.equal(g.progress.farm.inventory[0],4);
  assert.equal(tradeAction(g,'sell',crop.id).ok,false);locate(g,site);
  g.progress.coins=RESOURCE_CAP;assert.equal(tradeAction(g,'sell',crop.id).ok,false);assert.equal(g.progress.farm.inventory[0],4);
  g.progress.coins=0;assert.equal(tradeAction(g,'sell',crop.id).ok,true);assert.equal(g.progress.coins,Math.round(4*crop.value*(site.percent||100)/100));
 }
});

test('货签只在接单后由森林地面怪掉落，背包与交还数量一致',()=>{
 const g=scene(),tags=()=>backpackEntries(g).find(e=>e.id==='trade:cargo-tag')?.count||0;
 defeat(g);assert.equal(tags(),0);assert.equal(tradeAction(g,'take-relic').ok,true);
 g.progress.living.patrolActive=true;for(let i=0;i<4;i++)defeat(g);assert.equal(tags(),3);g.progress.living.patrolActive=false;
 const before=g.progress.coins;assert.equal(tradeAction(g,'give-relic').ok,true);assert.equal(g.progress.coins,before+90);
 defeat(g);assert.equal(tags(),0);assert.equal(tradeAction(g,'give-relic').ok,false);
});

for(const station of TRADE_STATIONS)test(station.name+'按既定路线护送、读档再到站且只领一次佣金',()=>{
 let g=scene();assert.equal(tradeAction(g,'escort',station.id).ok,true);
 const path=planQuestRoute({...g.player,mapId:'forest',livingCollision:true},station,g.trees);assert.equal(path.reachable,true);
 const start={...g.progress.trade.escort};locate(g,station);updateTradeEscort(g,.05);
 assert.equal(worldDistance(g.progress.trade.escort,start),0);assert.equal(tradeAction(g,'finish-escort').ok,false);locate(g,start);
 let reloaded=false;
 for(const point of path.points){
  while(worldDistance(g.player,point)>.01){
   const dx=point.x-g.player.x,dy=point.y-g.player.y,k=Math.min(1,3/Math.hypot(dx,dy));
   g.player.x+=dx*k;g.player.y+=dy*k;updateTradeEscort(g,.05);
   let enemy=g.enemies.find(e=>e.tradeGuard&&e.hp>0);
   if(!reloaded&&(enemy||!station.guards&&worldDistance(g.player,start)>200)){const player={...g.player};g=scene(validateProgress(JSON.parse(JSON.stringify(g.progress))));locate(g,player);updateTradeEscort(g,.05);enemy=g.enemies.find(e=>e.tradeGuard&&e.hp>0);reloaded=true;}
   if(enemy)defeat(g,enemy);
  }
 }
 for(let i=0;i<100;i++)updateTradeEscort(g,.05);
 assert.equal(reloaded,true);assert.equal(g.progress.trade.escort.cleared,station.guards);
 const before=g.progress.coins;assert.equal(tradeAction(g,'finish-escort').ok,true,JSON.stringify(g.progress.trade.escort));
 assert.equal(g.progress.coins,before+station.commission);assert.equal(tradeAction(g,'finish-escort').ok,false);
});

// 只在路障现场累计损伤，失败不会发放佣金，重新接单也不会把旧怪算入新单。
test('护送失败后返回营地可重新接单',()=>{
 const g=scene(),station=TRADE_STATIONS[1];tradeAction(g,'escort',station.id);
 const e=g.progress.trade.escort;e.x=station.x-250;e.y=station.y;e.ambush=true;e.hp=.1;
 locate(g,e);const enemy=g.spawnEnemy(0,0,{x:e.x+10,y:e.y},{ambient:true,ordinaryDumpling:true});
 enemy.tradeGuard=station.id;const coins=g.progress.coins;updateTradeEscort(g,.05);
 assert.equal(g.progress.trade.escort,null);assert.equal(g.progress.coins,coins);
 locate(g,TRADE_BOARD);assert.equal(tradeAction(g,'escort',station.id).ok,true);
 defeat(g,enemy);assert.equal(g.progress.trade.escort.cleared,0);
});
