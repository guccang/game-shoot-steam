// 俯视拖车的装载锚点和绘制分层回归，禁止转弯时货物翻侧或重复生成残骸。
import test from 'node:test';
import assert from 'node:assert/strict';
import {TOW_TRUCK,towLoadPoint,VEHICLE_REPAIR} from '../src/config/vehicle-repair.js';
import {vehicleServiceObjects} from '../src/rendering/vehicle-repair.js';

test('紧凑拖车固定正面装载点，左右上下行驶不镜像货物',()=>{
 assert.ok(TOW_TRUCK.width<=110);assert.ok(TOW_TRUCK.height<=145);assert.equal(TOW_TRUCK.loadX,0);assert.ok(TOW_TRUCK.loadY<0);
 for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2])assert.deepEqual(towLoadPoint({truck:{x:200,y:300},angle}),{x:200,y:250});
});

test('挂钩和装载只由拖车内部合成一次，去程仍独立显示原地残骸',()=>{
 const order={phase:'outbound',truck:{x:200,y:300},position:{x:100,y:400},mapId:'forest',timer:0};
 const game={mapId:'forest',progress:{vehicleService:[order]}};
 assert.equal(vehicleServiceObjects(game).filter(o=>o.type==='repair-wreck').length,1);
 for(const phase of ['hooking','towing'])for(const timer of [0,VEHICLE_REPAIR.hookSeconds]){Object.assign(order,{phase,timer});const items=vehicleServiceObjects(game);assert.equal(items.filter(o=>o.type==='repair-tow').length,1);assert.equal(items.filter(o=>o.type==='repair-wreck').length,0);}
});
