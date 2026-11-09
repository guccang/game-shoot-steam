// 洒水器半径、事务和正式动画姿态的专项回归，不执行全量测试。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {SPRINKLER,SPRINKLER_OFFSETS} from '../src/config/farm-production.js';
import {sprinklerCovers} from '../src/progression/farming/farm-production.js';
import {farmAction} from '../src/core/farming/farm.js';
import {updateProduction,storeSprinkler,pickupSprinkler} from '../src/core/farming/farm-production.js';
import {sprinklerPose} from '../src/rendering/farm-production.js';
import {sprinklerHitDelay,sprinklerSoilWetness} from '../src/progression/farming/sprinkler-sweep.js';
import {WORLD} from '../src/world/coordinates.js';
// 隔离真实进度，田块处于自种未成熟状态；不使用用户存档。
function setup(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;
 g.progress.production.returned=true;g.progress.production.sprinklers=[{id:1,mapId:'forest',x:1000,y:1200}];g.progress.farm.plots=[];return g;
}
// 同一格心规则构造田块，成熟时间便于确认只应用一次减时。
function plot(id,device,dx,dy){return {id,mapId:device.mapId,x:device.x+dx,y:device.y+dy,crop:1,plantedAt:1,readyAt:100000,watered:false};}
test('两层包含四角共24个周围格，不包含三格外',()=>{
 const d={mapId:'forest',x:1000,y:1200};assert.equal(SPRINKLER_OFFSETS.length,24);
 for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++)assert.equal(sprinklerCovers(d,plot(1,d,x*56,y*52)),Math.max(Math.abs(x),Math.abs(y))<=2,x+','+y);
 assert.equal(sprinklerCovers(d,plot(1,d,112.1,0)),false);
 assert.equal(sprinklerCovers(d,plot(1,d,70,30)),true);
});
test('覆盖使用世界最近镜像，不给另一张地图浇水',()=>{
 const d={id:1,mapId:'forest',x:20,y:30},p={mapId:'forest',x:WORLD.width-36,y:WORLD.height-22};
 assert.ok(sprinklerCovers(d,p));assert.equal(sprinklerCovers(d,{...p,mapId:'jiuzhaigou'}),false);
});
test('实际照料两层24格，只减时一次，保存后仍保持湿润',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0];
 g.progress.farm.plots=SPRINKLER_OFFSETS.map(([x,y],i)=>plot(i+1,d,x,y));
 g.progress.farm.plots.push(plot(25,d,168,52),plot(26,d,112,156));g.progress.farm.nextId=27;
 assert.ok(finishWatering(g,1000));
 assert.ok(g.progress.farm.plots.slice(0,24).every(p=>p.watered&&p.sprinklerWatered&&p.readyAt===70000));
 assert.ok(g.progress.farm.plots.slice(24).every(p=>!p.watered));
 const before=structuredClone(g.progress);assert.equal(finishWatering(g,1001),false);assert.deepEqual(g.progress,before);
 assert.ok(validateProgress(g.progress).farm.plots.slice(0,24).every(p=>p.sprinklerWatered));
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
test('多台重叠覆盖同一田不会叠加加速，已成熟野田和手浇田不触发喷头',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0];g.progress.production.sprinklers.push({...d,id:2,x:d.x+112});
 g.progress.farm.plots=[plot(1,d,56,0),{...plot(2,d,0,52),wild:true},{...plot(3,d,0,-52),watered:true},{...plot(4,d,-56,0),readyAt:100}];
 assert.ok(finishWatering(g,1000));assert.equal(g.progress.farm.plots[0].readyAt,70000);
 assert.deepEqual(g.productionSpray.plots,[1]);assert.equal(g.productionSpray.devices.length,2);
});

// 空田与作物共用覆盖边界，但空田润湿不虚增照料和任务奖励。
test('24块空田包含四角均可浇湿，范围外和异图不浇，重复扫描不写盘',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0];let saves=0;g.livingPersist=()=>{saves++;return true;};
 g.progress.farm.plots=SPRINKLER_OFFSETS.map(([x,y],i)=>({...plot(i+1,d,x,y),crop:null,plantedAt:0,readyAt:0}));
 g.progress.farm.plots.push({...plot(25,d,168,0),crop:null},{...plot(26,d,0,156),crop:null},{...plot(27,d,56,0),crop:null,mapId:'jiuzhaigou'});
 const lesson=structuredClone(g.progress.mainline.gardening);assert.ok(finishWatering(g,1000));
 assert.ok(g.progress.farm.plots.slice(0,24).every(p=>p.crop===null&&p.watered&&p.sprinklerWatered&&p.readyAt===0));
 assert.ok(g.progress.farm.plots.slice(24).every(p=>!p.watered));assert.equal(g.productionSpray.plots.length,24);
 assert.equal(g.progress.farm.watered,0);assert.equal(g.progress.farm.lessonRewarded,false);assert.equal(g.progress.production.wateredHarvest,false);assert.deepEqual(g.progress.mainline.gardening,lesson);
 g.progress=validateProgress(structuredClone(g.progress));assert.ok(g.progress.farm.plots.slice(0,24).every(p=>p.watered&&p.sprinklerWatered));
 assert.equal(finishWatering(g,2000),false);assert.equal(saves,1);
});
// 保存后收起设备再播种，验证水分属于田地且收获仍能记录设备照料。
test('空田湿度读档后保留，收回洒水器后播种只加速一次并保留收获归属',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0];g.progress.farm.plots=[{...plot(1,d,56,0),crop:null,plantedAt:0,readyAt:0}];g.progress.farm.seeds[1]=2;
 assert.ok(finishWatering(g,1000));g.progress=validateProgress(structuredClone(g.progress));Object.assign(g.player,d);assert.ok(storeSprinkler(g,1).ok);
 Object.assign(g.player,g.progress.farm.plots[0]);g.livingWeather='sun';
 const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(farmAction(g,'plant',{plot:1,crop:1,now:2000}).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;assert.ok(farmAction(g,'plant',{plot:1,crop:1,now:2000}).ok);
 const planted=g.progress.farm.plots[0];assert.equal(planted.readyAt,92000);assert.ok(planted.watered&&planted.sprinklerWatered);assert.equal(g.progress.farm.watered,1);
 assert.ok(farmAction(g,'water',{plot:1,now:3000}).ok);assert.equal(g.progress.farm.plots[0].readyAt,92000);assert.equal(g.progress.farm.watered,1);
 assert.ok(farmAction(g,'harvest',{plot:1,now:92000}).ok);assert.equal(g.progress.production.wateredHarvest,true);
 assert.ok(farmAction(g,'plant',{plot:1,crop:1,now:93000}).ok);assert.equal(g.progress.farm.plots[0].sprinklerWatered,false);assert.equal(g.progress.farm.plots[0].watered,false);
});

// 原覆盖与经济回归只等待一轮；逐帧、失败、取消由下方真实时钟用例验证。
function finishWatering(g,now){const first=updateProduction(g,now);if(g.state!=='playing')return first;g.time+=1.25;return updateProduction(g,now)||first;}
// 按指定模拟时刻执行正式自动浇水，墙钟固定以便比较单茬减时。
function scanAt(g,time,now=1000){g.time=time;return updateProduction(g,now);}
// 双喷嘴应先扫东/西，再扫对角及南/北，最终覆盖24格；土色在命中后渐深。
test('扫过前保持干燥，双喷口按方位逐格结算并渐变湿色',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0];g.progress.farm.plots=SPRINKLER_OFFSETS.map(([x,y],i)=>({...plot(i+1,d,x,y),crop:i%2?1:null,plantedAt:i%2?1:0,readyAt:i%2?100000:0}));
 assert.equal(scanAt(g,0),false);assert.ok(g.progress.farm.plots.every(p=>!p.watered));
 assert.equal(scanAt(g,.17),false);assert.ok(scanAt(g,.2));assert.equal(g.progress.farm.plots.filter(p=>p.watered).length,4);
 const east=g.progress.farm.plots.find(p=>p.x===d.x+56&&p.y===d.y);assert.equal(sprinklerSoilWetness(east,.2,g.productionSpray),0);assert.ok(Math.abs(sprinklerSoilWetness(east,.28,g.productionSpray)-.5)<1e-6);assert.equal(sprinklerSoilWetness(east,.4,g.productionSpray),1);
 assert.equal(sprinklerSoilWetness(east,.2,g.productionSpray,true),1);
 const counts=[];for(const t of [.45,.6,.8,1,1.25]){scanAt(g,t);counts.push(g.progress.farm.plots.filter(p=>p.watered).length);}
 assert.ok(new Set(counts).size>=3);assert.equal(counts.at(-1),24);
 for(const [x,y] of SPRINKLER_OFFSETS){const t=sprinklerHitDelay(d,plot(1,d,x,y));assert.ok(t>=.18&&t<=1.2);if(y!==0){const pose=sprinklerPose(d,t,{devices:[{...d,time:0}]});assert.ok(Math.abs(Math.sin(pose.angle-Math.atan2(y/52,x/56)))<1e-7);}}
});
// 暂停与恢复保持原角度；收回设备不代替尚未扫过的地块结算。
test('暂停冻结扫描，拿起或收回后只保留已湿地块，取消搬移重新扫描',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0];g.progress.farm.plots=[plot(1,d,56,0),plot(2,d,0,104)];Object.assign(g.player,d);
 scanAt(g,0);scanAt(g,.2);g.state='paused';const before=structuredClone(g.progress);assert.equal(scanAt(g,.2),false);assert.deepEqual(g.progress,before);
 g.state='playing';assert.ok(pickupSprinkler(g,1).ok);scanAt(g,.5);assert.equal(g.productionSpray.devices.length,0);assert.equal(g.progress.farm.plots[1].watered,false);
 g.productionCarry=null;scanAt(g,.5);assert.equal(g.productionSpray.devices[0].time,.5);assert.ok(storeSprinkler(g,1).ok);scanAt(g,2);assert.equal(g.progress.farm.plots[0].watered,true);assert.equal(g.progress.farm.plots[1].watered,false);
});
// 分批存档失败只能回滚该批，已扫格保留；重试必须重新有水流扫过。
test('落水保存失败不变湿，限频重试从新一圈开始并且不重复加速',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0];g.progress.farm.plots=[plot(1,d,56,0),plot(2,d,0,104)];scanAt(g,0);scanAt(g,.2);const before=structuredClone(g.progress);
 g.livingPersist=()=>false;assert.equal(scanAt(g,.9),false);assert.deepEqual(g.progress,before);assert.equal(g.productionSpray.devices.length,0);
 g.livingPersist=()=>true;assert.equal(scanAt(g,1,1500),false);assert.equal(scanAt(g,1.1,2001),false);assert.equal(g.progress.farm.plots[1].watered,false);
 assert.ok(scanAt(g,2,2002));assert.equal(g.progress.farm.plots[0].readyAt,70000);assert.equal(g.progress.farm.watered,2);
});
// 重读存档不把尚未扫过的格子补成湿土；低帧率跨过命中时刻也不会漏格。
test('中途读档保留已湿田，低帧率补齐实际扫过的格子，时钟重置重新起转',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0];g.progress.farm.plots=[plot(1,d,56,0),plot(2,d,0,104)];scanAt(g,0);scanAt(g,.2);
 const restored=setup();restored.progress=validateProgress(g.progress);assert.deepEqual(restored.progress.farm.plots.map(p=>p.watered),[true,false]);scanAt(restored,0);assert.ok(scanAt(restored,3));assert.ok(restored.progress.farm.plots.every(p=>p.watered));
 g.time=0;updateProduction(g,1001);assert.equal(g.productionSpray.devices[0].time,0);assert.equal(g.progress.farm.plots[1].watered,false);
});
// 同台中途新增农田等下一轮，其他设备独立起转，不截断当前喷嘴角度。
test('多台独立扫描，新田不跳过喷嘴，跨地图和地下取消未扫队列',()=>{
 const g=setup(),d=g.progress.production.sprinklers[0],d2={...d,id:2,x:1500};g.progress.production.sprinklers.push(d2);g.progress.farm.plots=[plot(1,d,56,0)];scanAt(g,0);scanAt(g,.2);
 g.progress.farm.plots.push(plot(2,d2,0,104),plot(3,d,0,104));scanAt(g,.4);assert.equal(g.productionSpray.devices[0].time,0);assert.equal(g.productionSpray.devices[1].time,.4);scanAt(g,1.3);assert.equal(g.progress.farm.plots[1].watered,true);assert.equal(g.progress.farm.plots[2].watered,false);
 g.cottage={kind:'mine'};scanAt(g,1.5);assert.equal(g.productionSpray.devices.length,0);g.cottage=null;scanAt(g,2);assert.equal(g.productionSpray.devices[0].time,2);
 g.mapId='jiuzhaigou';scanAt(g,2.5);assert.equal(g.productionSpray.devices.length,0);assert.equal(g.progress.farm.plots[2].watered,false);
});
