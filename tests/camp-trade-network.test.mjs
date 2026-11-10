import {escortQuote} from '../src/config/trade-escort.js';
// 用正式钱包、货舱、击杀和道路验证订单交接与护送读档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {TRADE_SITES,TRADE_BOARD,TRADE_STATIONS} from '../src/config/camp-trade.js';
import {FARM_CROPS} from '../src/config/farm.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {RESOURCE_CAP} from '../src/config/resource-limits.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {backpackEntries} from '../src/progression/inventory/backpack.js';
import {tradeAction,tradeStock,updateTradeEscort} from '../src/core/camp/camp-trade.js';
import {planQuestRoute} from '../src/physics/quest-route.js';
import {worldDistance} from '../src/world/coordinates.js';
import {WAREHOUSE} from '../src/config/warehouse.js';
import {updateWarehouseHarvest} from '../src/core/inventory/warehouse-harvest.js';

// 用同一份地图恢复现场，保留真实森林碰撞和可交互的车辆。
function scene(raw){
 const p=raw||freshProgress();if(!raw)p.coins=100000;
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


// 六站所有有向组合使用正式事务，跨站完成后可立即接返程。
test('六站三十条有向商路可接取读档交付，拒绝原地、错站和重复领奖',()=>{const g=scene();for(const origin of TRADE_SITES)for(const destination of TRADE_SITES){g.progress.trade.escort=null;locate(g,origin);const before=g.progress.coins,r=tradeAction(g,'escort',destination.id);if(origin===destination){assert.equal(r.ok,false);continue;}assert.equal(r.ok,true);g.progress=validateProgress(structuredClone(g.progress));assert.equal(g.progress.trade.escort.origin,origin.id);assert.equal(g.progress.trade.escort.station,destination.id);assert.equal(tradeAction(g,'finish-escort').ok,false);locate(g,destination);assert.equal(tradeAction(g,'finish-escort').ok,false);Object.assign(g.progress.trade.escort,{x:destination.x,y:destination.y,cleared:24,defeated:Array.from({length:24},(_,i)=>i),wave:3});assert.equal(tradeAction(g,'finish-escort').ok,true);assert.equal(g.progress.coins,before+escortQuote(origin,destination).coins);assert.equal(tradeAction(g,'finish-escort').ok,false);}});
test('各地接收跨站作物和货签，保存失败不扣货；旧护送默认主营地出发',()=>{const g=scene();for(let i=0;i<TRADE_SITES.length;i++){const a=TRADE_SITES[i],b=TRADE_SITES[(i+1)%TRADE_SITES.length];locate(g,a);assert.equal(tradeAction(g,'take-crop').ok,true);const index=FARM_CROPS.findIndex(c=>c.id===g.progress.trade.crop);g.progress.farm.inventory[index]=3;locate(g,b);g.livingPersist=()=>false;assert.equal(tradeAction(g,'give-crop').ok,false);assert.equal(g.progress.farm.inventory[index],3);g.livingPersist=()=>true;assert.equal(tradeAction(g,'give-crop').ok,true);assert.equal(tradeAction(g,'take-relic').ok,true);g.progress.trade.relic=3;locate(g,a);assert.equal(tradeAction(g,'give-relic').ok,true);}g.progress.trade.escort={station:TRADE_STATIONS[0].id,x:100,y:100,hp:90,cleared:0};assert.equal(validateProgress(g.progress).trade.escort.origin,TRADE_BOARD.id);locate(g,{x:15000,y:15000});assert.equal(tradeAction(g,'take-crop').ok,false);});
