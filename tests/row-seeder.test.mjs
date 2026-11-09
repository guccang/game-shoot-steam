// 使用隔离存档验证条播选行、预留种子及命中时的结算。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {queueSeedRow,setFarmTool,updateFarmWork} from '../src/core/farming/farm.js';
import {driveBody} from '../src/physics/motion.js';
import {WORLD} from '../src/world/coordinates.js';

// 右侧和下一行各有一块独立田，第一行中间保留已有作物。
function scene(){
 const p=freshProgress();p.materials.seederKit=1;p.materials.reaperKit=1;p.arrival=null;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.lessonRewarded=true;p.farm.seeds[0]=2;
 p.farm.plots=[[700,2752],[756,2752],[812,2752],[868,2752],[1100,2752],[700,2804]].map(([x,y],id)=>({id,x,y,mapId:'forest',crop:id===1?1:null,plantedAt:id===1?1:0,readyAt:id===1?2:0,watered:false}));p.farm.nextId=6;
 const g=new Game(p,()=>.4);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.trees=[];g.livingPersist=()=>true;
 Object.assign(g.player,{x:900,y:2752});setFarmTool(g,'seeder');return g;
}
test('从较近的右端播种，跳过已有作物、远田和邻行，重复选行不占第二份种子',()=>{
 const g=scene(),w=g.farmWork;assert.ok(queueSeedRow(g,1,0).ok);assert.deepEqual(w.queue.map(j=>j.id),[3,2]);assert.equal(g.progress.farm.seeds[0],2);
 assert.equal(queueSeedRow(g,0,0).ok,false);assert.equal(queueSeedRow(g,5,0).ok,false);
 for(let i=0;i<400&&g.progress.farm.seeds[0]===2;i++){const input=updateFarmWork(g,.04,{x:0,y:0});driveBody(g.player,input,140,.04,WORLD,g.trees);}
 assert.equal(g.progress.farm.seeds[0],1);updateFarmWork(g,.04,{x:1,y:0});
 assert.deepEqual(g.progress.farm.plots.slice(0,6).map(p=>p.crop),[null,1,null,0,null,null]);assert.equal(w.queue.length,0);
});
test('存档失败后停止条播，当前种子和地块可以再次安排',()=>{
 const g=scene();g.livingPersist=()=>false;queueSeedRow(g,1,0);
 for(let i=0;i<400&&(g.farmWork.job||g.farmWork.queue.length);i++){const input=updateFarmWork(g,.04,{x:0,y:0});driveBody(g.player,input,140,.04,WORLD,g.trees);}
 assert.equal(g.farmWork.result.ok,false);assert.equal(g.progress.farm.seeds[0],2);assert.equal(g.progress.farm.plots[3].crop,null);assert.ok(queueSeedRow(g,1,0).ok);
});

// 按列选田时跳过邻列，种子仍由逐格事务扣除。
test('条播机按列排队，未取得成品无法启用',()=>{
 const g=scene();g.progress.farm.axis='column';
 assert.ok(queueSeedRow(g,0,0).ok);assert.deepEqual(g.farmWork.queue.map(j=>j.id),[0,5]);
 setFarmTool(g,null);g.progress.materials.seederKit=0;assert.equal(setFarmTool(g,'seeder'),false);assert.equal(g.farmWork,null);
});
