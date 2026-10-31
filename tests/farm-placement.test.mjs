// 路边开垦与视野内最近田块对齐回归，实际事务不随镜头移动重新选址。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {farmLandReason,farmDigPoint,snapFarmPoint,farmApproach} from '../src/world/farm-land.js';
import {queueFarmWork,farmAction,setFarmTool,updateFarmWork} from '../src/core/farm.js';
import {JIUZHAIGOU_PATHS} from '../src/world/jiuzhaigou.js';

// 使用正式地图和角色，关闭额外示范田，避免把碰撞替换成测试专用实现。
function scene(){const p=freshProgress();p.arrival=null;p.farm.wildMaps=['forest','jiuzhaigou'];const g=new Game(p);g.state='playing';g.vehicle.active=false;g.trees=[];return g;}
// 固定数据仅用于验证镜头筛选与坐标算法。
function grid(plots,mapId='forest'){return {mapId,progress:{farm:{plots:plots.map(p=>({mapId:'forest',...p}))}}};}
// 点的浮点模运算允许极小误差，不容许半格偏移。
function same(actual,expected){assert.ok(Math.abs(actual.x-expected.x)<1e-8,JSON.stringify({actual,expected}));assert.ok(Math.abs(actual.y-expected.y)<1e-8);}
// 角色放在正式可达操作位后按正常动作时钟推进。
function finish(g){const j=g.farmWork.job||g.farmWork.queue[0];Object.assign(g.player,farmApproach(g,j.point));for(let i=0;i<30&&(g.farmWork.job||g.farmWork.queue.length);i++)updateFarmWork(g,.05,{x:0,y:0});}

test('无可见田时精确保留点击位置，远处旧田、另一地图田与未完成开垦不建立网格',()=>{
 const point={x:803.25,y:643.5},view={x:700,y:550,w:260,h:260};
 for(const plots of [[],[{id:0,x:100,y:100}],[{id:1,...point,mapId:'jiuzhaigou'}]]){
  const g=grid(plots);g.farmWork={queue:[{action:'dig',point:{x:781,y:620}}]};same(farmDigPoint(g,point,view),point);
 }
 same(snapFarmPoint(point),point);same(farmDigPoint(grid([]),point),point);
});

test('以离点击最近的可见田为基准，包含野外田，不固定首田或世界原点',()=>{
 const g=grid([{id:0,x:100.25,y:200.5},{id:1,x:231.75,y:209.25,wild:true}]),view={x:0,y:100,w:400,h:300};
 same(farmDigPoint(g,{x:298,y:265},view),{x:287.75,y:261.25});
 same(farmDigPoint(g,{x:151,y:251},view),{x:156.25,y:252.5});
 // 可见范围改变后，就近的离屏田也不参与对齐。
 same(farmDigPoint(g,{x:298,y:265},{x:300,y:300,w:100,h:100}),{x:298,y:265});
});

test('露出田埂的边缘田可对齐，完全离屏不对齐，地图接缝读取同一可见镜像',()=>{
 const view={x:100,y:100,w:200,h:200};
 same(farmDigPoint(grid([{id:0,x:76,y:150}]),{x:140,y:205},view),{x:132,y:202});
 same(farmDigPoint(grid([{id:0,x:74,y:150}]),{x:140,y:205},view),{x:140,y:205});
 same(farmDigPoint(grid([{id:0,x:150,y:81}]),{x:210,y:140},view),{x:210,y:140});
 same(farmDigPoint(grid([{id:0,x:10790,y:8390}]),{x:10850,y:8455},{x:10740,y:8330,w:200,h:200}),{x:46,y:42});
});

test('营地小田与主路两侧草地可入队和真正落锄',()=>{
 for(const [x,y] of [[803.25,643.5],[1800,774],[1800,684]]){
  const g=scene(),point={x,y,mapId:'forest'};Object.assign(g.player,point);
  assert.equal(farmLandReason(g,point),null);assert.equal(queueFarmWork(g,'dig',{point}).ok,true);
  assert.equal(g.progress.farm.plots.length,0);finish(g);
  assert.equal(g.progress.farm.plots.length,1);same(g.progress.farm.plots[0],point);
 }
});

test('点击预览、队列和完成坐标一致，走近时的镜头或新增邻田不改变目标',()=>{
 const g=scene(),view={x:700,y:550,w:300,h:300},origin={x:803.25,y:643.5,mapId:'forest'};
 Object.assign(g.player,origin);assert.ok(farmAction(g,'dig',{point:origin}).ok);
 const result=queueFarmWork(g,'dig',{point:{x:862,y:649},view});assert.ok(result.ok);same(result.point,{x:859.25,y:643.5});
 same(g.farmWork.queue[0].point,result.point);view.x=5000;
 g.progress.farm.plots.push({id:50,x:970,y:675,mapId:'forest',crop:null,plantedAt:0,readyAt:0,watered:false});
 finish(g);same(g.progress.farm.plots.find(p=>p.id===51),result.point);
});

test('取消和保存失败不留下首田；后续新田区仍使用重新选中的位置',()=>{
 const g=scene(),point={x:803.25,y:643.5};Object.assign(g.player,point);
 queueFarmWork(g,'dig',{point});setFarmTool(g,null);assert.equal(g.progress.farm.plots.length,0);
 g.livingPersist=()=>false;assert.equal(farmAction(g,'dig',{point:{...point,mapId:'forest'}}).ok,false);
 assert.equal(g.progress.farm.plots.length,0);g.livingPersist=()=>true;
 const next={x:815.5,y:650.75};assert.ok(queueFarmWork(g,'dig',{point:next,view:{x:700,y:550,w:300,h:300}}).ok);
 finish(g);same(g.progress.farm.plots[0],next);
});

test('恢复精确路面规则后仍拒绝已有田、活树与设施',()=>{
 const g=scene(),point={x:803.25,y:643.5,mapId:'forest'};Object.assign(g.player,point);
 g.trees=[{...point,id:1,hp:10,radius:14}];assert.match(farmLandReason(g,point),/树/);g.trees=[];
 assert.match(farmLandReason(g,{x:900,y:490,mapId:'forest'}),/建筑|设施/);
 assert.ok(farmAction(g,'dig',{point}).ok);assert.match(farmLandReason(g,point),/已有田块/);
});

test('旧档道路田读档与往返地图均保留原坐标和作物，既有不规则田不强制搬动',()=>{
 const p=freshProgress();p.arrival=null;
 const [x,y]=JIUZHAIGOU_PATHS[0][0];
 p.farm.plots=[{id:0,x:837.25,y:724.5,mapId:'forest',crop:1,plantedAt:1000,readyAt:121000,watered:true},{id:1,x,y,mapId:'jiuzhaigou',crop:null,plantedAt:0,readyAt:0,watered:false}];p.farm.nextId=2;
 const g=new Game(p),before=structuredClone(g.progress.farm.plots);assert.deepEqual(before,p.farm.plots);
 g.state='playing';g.progress.restoration.repaired.push('travel');assert.ok(g.switchMap('jiuzhaigou'));assert.deepEqual(g.progress.farm.plots,before);
 assert.ok(g.switchMap('forest'));assert.deepEqual(g.progress.farm.plots,before);
 assert.deepEqual(new Game(validateProgress(g.progress)).progress.farm.plots,before);
});
