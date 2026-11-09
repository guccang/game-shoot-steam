import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
// 地下入口、视野光源与真实碰撞寻路专项，不运行全量玩法测试。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {openBasement} from '../src/progression/mining/mining.js';
import {minePoint,mineKey} from '../src/config/mining.js';
import {enterMine,updateMining,updateMinePortal,updateMineEntrance} from '../src/core/mining/mining.js';
import {approachMinePortal,approachWarehouseMine,updateSceneApproach} from '../src/core/navigation/scene-approach.js';
import {travelMineLayer,currentMineLayer} from '../src/core/mining/mine-layers.js';
import {minePortals} from '../src/world/mine-portals.js';
import {MINE_VISION,mineGlow,mineLightSources,minePointLit} from '../src/world/mine-vision.js';
// 固定种子、共享矿层和真实存档事务，准备可走通道而不替换移动器。
function setup(){const p=freshProgress();p.homeDecor.basement=true;openBasement(p.mining);p.mining.seed=1847;p.mining.shafts=['7,3'];p.mining.ore=10000;p.wood=10000;p.coins=100000;for(let x=4;x<=9;x++)for(let y=1;y<=5;y++){p.mining.dug[`${x},${y}`]=true;p.mining.bridges[`${x},${y}`]=true;}const g=new Game(p);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.trees=[];g.livingPersist=()=>true;Object.assign(g.player,minePoint({x:7,y:3}),{vx:0,vy:0});assert.ok(enterMine(g,'7,3'));return g;}

test('地下点击真实走近，抵达前不传送，候停1秒后返回并防止立即回弹',()=>{
 const g=setup();Object.assign(g.player,minePoint({x:5,y:3}));assert.ok(approachMinePortal(g,'shaft:7,3'));const start=g.player.x;
 let sawWait=false;
 for(let i=0;i<250&&g.cottage?.kind==='mine';i++){const input=updateSceneApproach(g,.04,{x:0,y:0});updateMining(g,.04,input);if(g.cottage?.portalWait){sawWait=true;assert.ok(g.player.x>start+80);}}
 assert.ok(sawWait);assert.equal(g.cottage,null);assert.equal(g.mineEntranceLatch,'7,3');
});
test('进入地下不自动离开，明确再点击可返回；移动清零，暂停冻结',()=>{
 const g=setup();for(let i=0;i<50;i++)updateMinePortal(g,.04);assert.equal(g.cottage.portalWait,null);
 approachMinePortal(g,'shaft:7,3');g.sceneApproach=null;for(let i=0;i<10;i++)updateMinePortal(g,.04);assert.ok(g.cottage.portalWait.elapsed>.3);
 updateSceneApproach(g,.04,{x:1,y:0});updateMinePortal(g,.04,{x:1,y:0});assert.equal(g.cottage.portalWait,null);updateMinePortal(g,.04);const elapsed=g.cottage.portalWait.elapsed;g.state='paused';updateMinePortal(g,20);assert.equal(g.cottage.portalWait.elapsed,elapsed);
});
test('已建上下层入口共享目录，切层锁住落点，矿车上不能进入',()=>{
 const g=setup();Object.assign(g.player,minePoint({x:5,y:3}));assert.ok(travelMineLayer(g,1).ok);assert.equal(g.cottage.depth,2);for(let i=0;i<40;i++)updateMinePortal(g,.04);assert.equal(g.cottage.depth,2);
 assert.ok(approachMinePortal(g,'up'));g.sceneApproach=null;for(let i=0;i<26;i++)updateMinePortal(g,.04);assert.equal(g.cottage.depth,1);assert.ok(minePortals(currentMineLayer(g),1).some(p=>p.id==='down'));g.cottage.ride=1;assert.equal(approachMinePortal(g,'down'),false);
});
test('矿灯和荧菇局部照明，采集及设施覆盖会熄灭，光源和画布预算有界',()=>{
 const g=setup(),l=currentMineLayer(g),p=g.player;l.decor['8,3']='lamp';let cell;
 for(let y=2;y<50&&!cell;y++)for(let x=2;x<50;x++)if(mineGlow({x,y},l)){cell={x,y};break;}
 assert.ok(cell);const glow=mineGlow(cell,l);l.harvested[mineKey(cell)]=l.age+10;assert.equal(mineGlow(cell,l),null);l.age+=11;assert.ok(mineGlow(cell,l));l.rails[mineKey(cell)]=true;assert.equal(mineGlow(cell,l),null);
 const lights=mineLightSources(g,l,{x:p.x-300,y:p.y-400,w:600,h:800});assert.ok(lights.some(p=>p.kind==='lamp'));assert.ok(lights.length<=MINE_VISION.maxLights);assert.ok(minePointLit(p,lights));assert.equal(minePointLit({x:p.x+1000,y:p.y+1000},lights),false);assert.ok(glow.radius<MINE_VISION.lamp);
});

// 仓库界面提交的同一意图也先候停，拒绝远程直接进入矿区。
test('仓库升井走近后候停，移动取消且重置不会留下旧请求',()=>{
 const g=setup();g.cottage=null;Object.assign(g.player,WORKSHOP_INTERIORS.warehouse.door,{vx:0,vy:0});
 assert.ok(approachWarehouseMine(g));g.sceneApproach=null;for(let i=0;i<20;i++)updateMineEntrance(g,.04,{x:0,y:0});assert.equal(g.cottage,null);assert.ok(g.mineEntranceWait>.7);
 for(let i=0;i<6;i++)updateMineEntrance(g,.04,{x:0,y:0});assert.equal(g.cottage?.kind,'mine');assert.ok(g.cottage.warehouse);
 g.cottage=null;approachWarehouseMine(g);g.sceneApproach=null;updateMineEntrance(g,.04,{x:1,y:0});assert.equal(g.mineWarehouseIntent,false);g.reset();assert.equal(g.mineWarehouseIntent,false);
});
