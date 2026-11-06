// 用正式农活事务和移动碰撞验证按住收割、换行及超载暂停。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {setFarmTool,updateFarmWork,resolveHarvestLoad} from '../src/core/farm.js';
import {engageReaper,releaseReaper} from '../src/core/row-reaper.js';
import {driveBody} from '../src/physics/motion.js';
import {WORLD} from '../src/world/coordinates.js';

// 第一行中间留一格未成熟作物，第二行全熟。
function scene(){
 const p=freshProgress();p.arrival=null;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 p.vehicleHulls.fill(0);p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.lessonRewarded=true;
 p.farm.plots=Array.from({length:6},(_,id)=>({id,mapId:'forest',x:700+56*(id%3),y:2752+52*Math.floor(id/3),crop:0,plantedAt:id===1?Date.now():1,readyAt:id===1?Date.now()+3600000:2,watered:false}));p.farm.nextId=6;
 const g=new Game(p,()=>.4);g.state='playing';g.vehicle.active=false;g.progress.campParking.owned=[];g.livingPersist=()=>true;
 g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.trees=[];Object.assign(g.player,{x:657,y:2762});
 setFarmTool(g,'reaper');return g;
}
// 每帧走正式物理，不把角色直接放到刀口。
function advance(g,done){
 for(let i=0;i<260;i++){
  const input=updateFarmWork(g,.04,{x:0,y:0});driveBody(g.player,input,140,.04,WORLD,g.trees);
  if(done())return;
 }
 assert.fail('未到达预期状态：'+JSON.stringify(g.farmWork.result));
}
test('对齐最近的行，松手停在原地，续收跳过生长期，反向只收另一行',()=>{
 const g=scene(),r=g.farmWork.reaper;
 engageReaper(g);advance(g,()=>g.progress.farm.harvested===1);releaseReaper(g);
 const x=g.player.x;advance(g,()=>true);assert.equal(g.player.x,x);
 engageReaper(g);advance(g,()=>!r.held);assert.equal(g.progress.farm.harvested,2);
 assert.equal(g.progress.farm.plots.find(p=>p.id===1).crop,0);
 Object.assign(g.player,{x:846,y:2800});r.facing=-1;engageReaper(g);
 advance(g,()=>!r.held);assert.equal(g.progress.farm.harvested,5);assert.ok(g.player.x<740);
});
test('超载停下，取消保留作物，确认只收当前一格',()=>{
 const g=scene();g.progress.supplies.hand.light=20000;engageReaper(g);
 advance(g,()=>!!g.farmWork.job?.loadRequest);assert.equal(g.farmWork.reaper.held,false);
 resolveHarvestLoad(g,g.farmWork.job,false);assert.equal(g.progress.farm.harvested,0);
 engageReaper(g);advance(g,()=>!!g.farmWork.job?.loadRequest);
 resolveHarvestLoad(g,g.farmWork.job,true);advance(g,()=>!g.farmWork.job);
 assert.equal(g.progress.farm.harvested,1);assert.equal(g.farmWork.reaper.held,false);
});
test('刀口碰到障碍或收获保存失败时停下并保留作物',()=>{
 for(const obstructed of [true,false]){
  const g=scene();
  if(obstructed)g.player.worldBarriers=[{x:694,y:2752,width:4,height:40}];
  else g.livingPersist=()=>false;
  engageReaper(g);advance(g,()=>!g.farmWork.reaper.held);
  assert.equal(g.farmWork.result.ok,false);assert.equal(g.progress.farm.harvested,0);
  assert.equal(g.progress.farm.plots[0].crop,0);
 }
});
