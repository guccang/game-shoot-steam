// 小地图和快捷上下车只读取正式位置、碰撞与车况，不复制玩法状态。
import test from 'node:test';
import assert from 'node:assert/strict';
import {localMinimapBounds,localMinimapPoint,drawLocalMinimap} from '../src/rendering/local-minimap.js';
import {WORLD} from '../src/world/coordinates.js';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {nearbyBoardingVehicle,activateVehicleShortcut} from '../src/ui/vehicle-controls.js';

test('小地图始终以猫猫居中、宽高各覆盖当前视野两倍，缩放后跟随变化',()=>{
 const player={x:3000,y:4000};for(const view of [{w:300,h:700},{w:600,h:1400}]){const b=localMinimapBounds(player,view);assert.equal(b.w,view.w*2);assert.equal(b.h,view.h*2);assert.deepEqual(localMinimapPoint(player,player,b),{x:.5,y:.5});assert.deepEqual(localMinimapPoint({x:player.x+view.w,y:player.y+view.h},player,b),{x:1,y:1});}
 const p={x:WORLD.width-10,y:WORLD.height-10},b=localMinimapBounds(p,{w:300,h:600}),point=localMinimapPoint({x:10,y:10},p,b);assert.ok(point.x>.5&&point.x<.6);assert.ok(point.y>.5&&point.y<.6);
});
test('森林和湖谷昼夜示意图坐标有效，不改变世界与存档，固定单画布预算',()=>{
 const context=new Proxy({}, {get:(o,key)=>o[key]??((...args)=>{for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),key);}),set:(o,key,v)=>{o[key]=v;return true;}});
 for(const mapId of ['forest','jiuzhaigou'])for(const night of [false,true]){const g={mapId,progress:freshProgress(),player:{x:1400,y:1200,angle:0},trees:[],enemies:[],boss:null},before=JSON.stringify(g),stats=drawLocalMinimap(context,g,{w:500,h:900},night);assert.equal(JSON.stringify(g),before);assert.equal(stats.bytes,208*208*4);}
});
// 在自由森林使用真实自有车辆与停驻记录，避开剧情和城镇入口。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[5]=1;const g=new Game(p);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;Object.assign(g.player,{x:3320,y:3000,vx:0,vy:0});g.progress.campParking.owned=[{hull:5,mapId:'forest',spot:null,x:3340,y:3000,hp:1,ammo:0,wheel:0,track:0,reload:0}];return g;}
test('车旁主动点击立即上车，再点击安全下车，保留原按钮语义和停驻记录',()=>{
 const g=scene();assert.equal(nearbyBoardingVehicle(g)?.hull,5);assert.equal(activateVehicleShortcut(g),true);assert.equal(g.vehicle.index,5);assert.equal(g.vehicle.active,true);assert.equal(activateVehicleShortcut(g),true);assert.equal(g.vehicle.active,false);assert.ok(g.progress.campParking.owned.some(s=>s.hull===5));
});
test('远处点击只定位，损坏车不能被快捷上车绕过维修规则',()=>{
 const g=scene();g.player.x-=1000;const before={x:g.player.x,y:g.player.y};assert.equal(nearbyBoardingVehicle(g),null);activateVehicleShortcut(g);assert.equal(g.vehicle.active,false);assert.deepEqual({x:g.player.x,y:g.player.y},before);
 const h=scene();h.vehicles[5].hp=0;assert.equal(nearbyBoardingVehicle(h),null);activateVehicleShortcut(h);assert.equal(h.vehicle.active,false);
});
