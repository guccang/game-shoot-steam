// 洒水器半径、事务和正式动画姿态的专项回归，不执行全量测试。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {SPRINKLER,SPRINKLER_OFFSETS} from '../src/config/farm-production.js';
import {sprinklerCovers} from '../src/progression/farm-production.js';
import {updateProduction} from '../src/core/farm-production.js';
import {sprinklerPose} from '../src/rendering/farm-production.js';
import {WORLD} from '../src/world/coordinates.js';
// 隔离真实进度，田块处于自种未成熟状态；不使用用户存档。
function setup(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;
 g.progress.production.returned=true;g.progress.production.sprinklers=[{id:1,mapId:'forest',x:1000,y:1200}];g.progress.farm.plots=[];return g;
}
// 同一格心规则构造田块，成熟时间便于确认只应用一次减时。
function plot(id,device,dx,dy){return {id,mapId:device.mapId,x:device.x+dx,y:device.y+dy,crop:1,plantedAt:1,readyAt:100000,watered:false};}
test('圆形半径2格包含12个周围格，不包含远对角或三格外',()=>{
 const d={mapId:'forest',x:1000,y:1200};assert.equal(SPRINKLER_OFFSETS.length,12);
 for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++)assert.equal(sprinklerCovers(d,plot(1,d,x*56,y*52)),x*x+y*y<=4,x+','+y);
 assert.equal(sprinklerCovers(d,plot(1,d,112.1,0)),false);
 assert.equal(sprinklerCovers(d,plot(1,d,70,30)),true);
});
test('覆盖使用世界最近镜像，不给另一张地图浇水',()=>{
 const d={id:1,mapId:'forest',x:20,y:30},p={mapId:'forest',x:WORLD.width-36,y:WORLD.height-22};
 assert.ok(sprinklerCovers(d,p));assert.equal(sprinklerCovers(d,{...p,mapId:'jiuzhaigou'}),false);
});
test('实际照料圆内12格，只减时一次，保存后仍保持湿润',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0];
 g.progress.farm.plots=SPRINKLER_OFFSETS.map(([x,y],i)=>plot(i+1,d,x,y));
 g.progress.farm.plots.push(plot(13,d,112,52),plot(14,d,112,104));g.progress.farm.nextId=15;
 assert.ok(updateProduction(g,1000));
 assert.ok(g.progress.farm.plots.slice(0,12).every(p=>p.watered&&p.sprinklerWatered&&p.readyAt===70000));
 assert.ok(g.progress.farm.plots.slice(12).every(p=>!p.watered));
 const before=structuredClone(g.progress);assert.equal(updateProduction(g,1001),false);assert.deepEqual(g.progress,before);
 assert.ok(validateProgress(g.progress).farm.plots.slice(0,12).every(p=>p.sprinklerWatered));
});
test('失败不喷水不改湿土，暂停不处理，重试成功后才记录动画',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0];g.progress.farm.plots=[plot(1,d,112,0)];
 g.state='paused';assert.equal(updateProduction(g,1000),false);g.state='playing';g.livingPersist=()=>false;
 assert.equal(updateProduction(g,1000),false);assert.equal(g.productionSpray,undefined);assert.equal(g.progress.farm.plots[0].watered,false);
 g.livingPersist=()=>true;assert.equal(updateProduction(g,1500),false);assert.ok(updateProduction(g,2001));assert.ok(sprinklerPose(d,g.time,g.productionSpray).active);
});
test('喷头以游戏时钟转动完整一圈，暂停采样相同，低动态与空闲保持静止',()=>{
 const d={id:1,mapId:'forest',x:1000,y:1200},event={devices:[{...d,time:10}]};
 const poses=[0,.6,1.2,1.8,2.399].map(t=>sprinklerPose(d,10+t,event));
 assert.ok(poses.every(p=>p.active));assert.ok(poses.every((p,i)=>!i||p.angle>poses[i-1].angle));
 assert.ok(Math.abs(poses[4].angle-Math.PI*2)<.001);assert.equal(sprinklerPose(d,12.4,event).active,false);
 assert.deepEqual(sprinklerPose(d,11,event),sprinklerPose(d,11,event));
 assert.equal(sprinklerPose(d,11,event,true).angle,0);assert.equal(sprinklerPose(d,11,null).active,false);
 assert.equal(sprinklerPose({...d,id:2},11,event).active,false);
 assert.equal(sprinklerPose({...d,mapId:'jiuzhaigou'},11,event).active,false);
 assert.equal(sprinklerPose({...d,x:d.x+56},11,event).active,false);
});
test('多台设备先后照料不截断原动画，同一台重复照料不重置喷头',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0],d2={...d,id:2,x:1500};g.progress.production.sprinklers.push(d2);
 g.progress.farm.plots=[plot(1,d,56,0)];g.time=1;assert.ok(updateProduction(g,1000));
 g.time=1.5;g.progress.farm.plots.push(plot(2,d2,56,0));assert.ok(updateProduction(g,1001));
 assert.equal(g.productionSpray.devices.length,2);assert.equal(g.productionSpray.devices[0].time,1);
 g.time=1.8;g.progress.farm.plots.push(plot(3,d,0,104));assert.ok(updateProduction(g,1002));assert.equal(g.productionSpray.devices[0].time,1);
 assert.ok(sprinklerPose(d,2,g.productionSpray).active);assert.ok(sprinklerPose(d2,2,g.productionSpray).active);
});
test('多台重叠覆盖同一田不会叠加加速，已成熟野田和手浇田不触发喷头',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0];g.progress.production.sprinklers.push({...d,id:2,x:d.x+112});
 g.progress.farm.plots=[plot(1,d,56,0),{...plot(2,d,0,52),wild:true},{...plot(3,d,0,-52),watered:true},{...plot(4,d,-56,0),readyAt:100}];
 assert.ok(updateProduction(g,1000));assert.equal(g.progress.farm.plots[0].readyAt,70000);
 assert.deepEqual(g.productionSpray.plots,[1]);assert.equal(g.productionSpray.devices.length,2);
});

test('场景时钟重置后不沿用未来的喷头起点，新作物仍播放本轮动画',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0];g.time=50;g.progress.farm.plots=[plot(1,d,56,0)];assert.ok(updateProduction(g,1000));
 g.time=0;g.progress.farm.plots.push(plot(2,d,0,52));assert.ok(updateProduction(g,1001));
 assert.equal(g.productionSpray.devices[0].time,0);assert.ok(sprinklerPose(d,0,g.productionSpray).active);
});
