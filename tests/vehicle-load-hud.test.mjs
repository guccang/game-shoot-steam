// HUD与实际行驶共用载荷公式，边界、驾驶员与借用玩法使用真实Game验证。
import {WOOD_ITEM} from '../src/config/wood-storage.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {ownedPineProgress} from './helpers/owned-pine-progress.mjs';
import {vehicleLoad} from '../src/progression/inventory/load-weight.js';
import {vehicleLoadHudState,vehicleReloadHudState} from '../src/ui/vehicle-load-hud.js';
import {vehicleWeapon} from '../src/config/vehicles.js';
import {activateVehicleTransfer} from '../src/ui/vehicle-transfer.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
// 去掉剧情和初始库存，使测试明确控制真实负重。
function scene(){const p=ownedPineProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[0]=1;p.vehicleIndex=0;const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.progress.supplies.vehicles[0]={light:0,shell:0,heavy:0,water:0};g.vehicle.module.magazine.ammo=0;g.progress.logistics.builds[0].wood=0;return g;}
test('载荷填充读取真实货舱，上车后随身背包仍独立计重',()=>{const g=scene(),before=vehicleLoadHudState(g);assert.equal(before.weight,vehicleLoad(g).payload);g.progress.logistics.builds[0].wood=700;const half=vehicleLoadHudState(g);assert.equal(half.weight-before.weight,700*WOOD_ITEM.mass);assert.equal(half.fill,half.weight/half.capacity);g.vehicle.active=true;g.progress.logistics.bagWood=10;const mounted=vehicleLoadHudState(g);assert.equal(mounted.weight,vehicleLoad(g).payload);assert.equal(mounted.weight,half.weight);const hp=g.vehicle.hp;g.vehicle.hp=1;assert.deepEqual(vehicleLoadHudState(g),mounted);g.vehicle.hp=hp;});
test('恰好满载及超载填满并警示，未满载不能显示100%',()=>{const g=scene(),base=vehicleLoad(g);g.progress.logistics.builds[0].wood=(base.capacity-base.payload)/WOOD_ITEM.mass;const full=vehicleLoadHudState(g);assert.equal(full.fill,1);assert.equal(full.percent,100);assert.equal(full.tone,'full');g.progress.logistics.builds[0].wood-=1;assert.equal(vehicleLoadHudState(g).percent,99);assert.equal(vehicleLoadHudState(g).tone,'heavy');g.progress.logistics.builds[0].wood+=Math.ceil(base.capacity*.02/WOOD_ITEM.mass);const excess=vehicleLoadHudState(g);assert.equal(excess.fill,1);assert.ok(excess.percent>100);assert.equal(excess.tone,'full');});
test('切换车型按当前车计算，临时活动不展示永久货舱负重',()=>{const g=scene();g.progress.vehicleHulls[1]=1;g.vehicle=g.vehicles[1];g.progress.logistics.builds[1].wood=100;assert.equal(vehicleLoadHudState(g).weight,vehicleLoad(g,1).payload);g.realm={};assert.equal(vehicleLoadHudState(g).available,false);assert.equal(vehicleLoadHudState(g).fill,0);});
test('定位只保留路线，不再发送靠近一秒上车提示',()=>{const g=scene(),events=[];g.onEvent=(type,data)=>events.push({type,data});g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:900,y:800,hp:1,ammo:0,reload:0,wheel:0,track:0}];Object.assign(g.player,{x:1100,y:800});assert.equal(activateVehicleTransfer(g,0),true);assert.equal(events.some(e=>/靠近.*秒.*上车/.test(e.data?.text||'')),false);assert.equal(g.vehicle.active,false);});

// 外圈以正式武器装填时长计量，弹药余量、HP和内圆载荷不能改变其进度。
test('换弹外圈按真实剩余时间从零到满，并与仓库填充分离',()=>{
 const g=scene(),w=vehicleWeapon(g.loadout,g.vehicle.weaponIndex),m=g.vehicle.module.magazine;
 for(const fraction of [1,.5,.01,0]){m.remaining=w.reloadTime*fraction;const state=vehicleReloadHudState(m,w);assert.ok(Math.abs(state.fill-(1-fraction))<1e-8);assert.equal(state.state,fraction?'reloading':'ready');}
 m.remaining=w.reloadTime/2;const before=vehicleReloadHudState(m,w);g.progress.logistics.builds[0].wood=1000;g.vehicle.hp=1;m.ammo=1;assert.deepEqual(vehicleReloadHudState(m,w),before);
 g.state='paused';assert.deepEqual(vehicleReloadHudState(m,w),before);assert.equal(m.remaining,w.reloadTime/2);
});
// 无车载弹匣或独立补给模块只显示底环，不把其他计时当作统一换弹。
test('无武器和独立补给的外圈保持中性，异常超长剩余时间不能画出负进度',()=>{
 assert.equal(vehicleReloadHudState(null,null).state,'unavailable');assert.equal(vehicleReloadHudState({remaining:3},{independentSupply:true}).fill,0);
 assert.equal(vehicleReloadHudState({remaining:6},{reloadTime:3}).fill,0);assert.equal(vehicleReloadHudState({remaining:0,ammo:0},{reloadTime:3}).fill,1);
});
