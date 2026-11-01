// HUD与实际行驶共用载荷公式，边界、驾驶员与借用玩法使用真实Game验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {ownedPineProgress} from './helpers/owned-pine-progress.mjs';
import {vehicleLoad} from '../src/progression/load-weight.js';
import {vehicleLoadHudState} from '../src/ui/vehicle-load-hud.js';
import {activateVehicleTransfer} from '../src/ui/vehicle-transfer.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
// 去掉剧情和初始库存，使测试明确控制真实负重。
function scene(){const p=ownedPineProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[0]=1;p.vehicleIndex=0;const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.progress.supplies.vehicles[0]={light:0,shell:0,heavy:0,water:0};g.vehicle.module.magazine.ammo=0;g.progress.logistics.builds[0].wood=0;return g;}
test('载荷填充读取真实货舱，驾驶员及背包只在上车后计入',()=>{const g=scene(),before=vehicleLoadHudState(g);assert.equal(before.weight,vehicleLoad(g).payload);g.progress.logistics.builds[0].wood=700;const half=vehicleLoadHudState(g);assert.equal(half.weight-before.weight,350);assert.equal(half.fill,half.weight/half.capacity);g.vehicle.active=true;g.progress.logistics.bagWood=10;const mounted=vehicleLoadHudState(g);assert.equal(mounted.weight,vehicleLoad(g).payload);assert.ok(mounted.weight>half.weight);const hp=g.vehicle.hp;g.vehicle.hp=1;assert.deepEqual(vehicleLoadHudState(g),mounted);g.vehicle.hp=hp;});
test('恰好满载及超载填满并警示，未满载不能显示100%',()=>{const g=scene(),base=vehicleLoad(g);g.progress.logistics.builds[0].wood=(base.capacity-base.payload)/.5;const full=vehicleLoadHudState(g);assert.equal(full.fill,1);assert.equal(full.percent,100);assert.equal(full.tone,'full');g.progress.logistics.builds[0].wood-=1;assert.equal(vehicleLoadHudState(g).percent,99);assert.equal(vehicleLoadHudState(g).tone,'heavy');g.progress.logistics.builds[0].wood+=100;const excess=vehicleLoadHudState(g);assert.equal(excess.fill,1);assert.ok(excess.percent>100);assert.equal(excess.tone,'full');});
test('切换车型按当前车计算，临时活动不展示永久货舱负重',()=>{const g=scene();g.progress.vehicleHulls[1]=1;g.vehicle=g.vehicles[1];g.progress.logistics.builds[1].wood=100;assert.equal(vehicleLoadHudState(g).weight,vehicleLoad(g,1).payload);g.realm={};assert.equal(vehicleLoadHudState(g).available,false);assert.equal(vehicleLoadHudState(g).fill,0);});
test('定位只保留路线，不再发送靠近一秒上车提示',()=>{const g=scene(),events=[];g.onEvent=(type,data)=>events.push({type,data});g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:900,y:800,hp:1,ammo:0,reload:0,wheel:0,track:0}];Object.assign(g.player,{x:1100,y:800});assert.equal(activateVehicleTransfer(g,0),true);assert.equal(events.some(e=>/靠近.*秒.*上车/.test(e.data?.text||'')),false);assert.equal(g.vehicle.active,false);});
