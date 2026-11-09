import {oreCount} from '../src/config/mine-freight.js';
import {mineTerrain,mineCellOpen,mineCellArea} from '../src/config/mine-ecology.js';
// 针对地下事务、世界坐标、持续开掘和轨道驾驶验证真实Game，不运行全量测试。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MINING as M,mineKey,mineCell,minePoint} from '../src/config/mining.js';
import {buildHome} from '../src/core/home/home-construction.js';
import {enterMine,leaveMine,updateMining,selectMineTool,toggleMineDig,buildMine,rideMineCart,toggleMineCart,faceMine,canOpenShaft,startMineShaft,updateMineEntrance,mineBlocked} from '../src/core/mining/mining.js';
import {updateCottage,leaveCottage} from '../src/core/home/cottage.js';
import {normalizeMining} from '../src/progression/mining/mining.js';
import {COTTAGE} from '../src/config/cottage.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';

// 使用已完成入职的隔离玩家，施工仍走正式建筑事务。
function setup(enter=true){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.coins=10000;p.wood=1000;const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;g.cottage={kind:'construction',outside:{x:900,y:580}};if(enter){assert.ok(buildHome(g,'basement').ok);g.cottage={kind:'cottage',floor:0,outside:{x:M.home.x+50,y:M.home.y+30}};Object.assign(g.player,M.hatch.goal);assert.ok(enterMine(g));g.progress.mining.seed=1847;}return g;}
// 正式固定步长推进，暂停测试也使用同一入口。
function tick(g,n,input={x:0,y:0}){for(let i=0;i<n;i++)updateMining(g,.05,input);}
// 为驾驶专项布置直线和弯道，资源和施工仍由正式操作消耗。
function rails(g,cells){g.progress.mining.ore=100;for(const cell of cells){const key=mineKey(cell);g.progress.mining.dug[key]=true;Object.assign(g.player,minePoint(cell));assert.ok(buildMine(g,'rail').ok);}}

// 天然洞厅不再当作岩壁，专项选择真实连续干燥岩层边缘验证阻挡与挖掘。
function wallScene(g){const l=g.progress.mining;l.seed=1847;g.cottage.scanWait=999;for(let y=3;y<60;y++)for(let x=3;x<60;x++){const wall={x,y};if(mineTerrain(wall,l).natural||!mineCellArea(wall,l))continue;if(Array.from({length:12},(_,i)=>({x:x-1+i,y})).some(c=>mineTerrain(c,l).water))continue;const start={x:x-1,y};l.dug[mineKey(start)]=true;Object.assign(g.player,minePoint(start));g.cottage.direction=1;return wall;}throw Error('缺少岩层夹具');}
test('地下室施工一次扣费，旧档兼容，刷新保留设施',()=>{const g=setup(false),coins=g.progress.coins,wood=g.progress.wood;assert.ok(buildHome(g,'basement').ok);assert.equal(g.progress.coins,coins-2400);assert.equal(g.progress.wood,wood-180);assert.equal(Object.keys(g.progress.mining.dug).length,9);assert.equal(buildHome(g,'basement').ok,false);const p=validateProgress(g.progress);assert.ok(p.homeDecor.basement);assert.deepEqual(p.mining,g.progress.mining);assert.ok(validateProgress({version:1}).mining.pickaxe);});
test('施工与挖掘保存失败不扣资源、不改地形，异常也可重试',()=>{const g=setup(false);g.livingPersist=()=>false;const before=structuredClone(g.progress);assert.equal(buildHome(g,'basement').ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;assert.ok(buildHome(g,'basement').ok);g.cottage={kind:'cottage',floor:0,outside:M.home};Object.assign(g.player,M.hatch.goal);enterMine(g);const wall=wallScene(g),key=mineKey(wall);g.livingPersist=()=>{throw Error('测试保存失败');};toggleMineDig(g);tick(g,20);assert.equal(g.progress.mining.dug[key],undefined);assert.equal(g.progress.mining.ore,0);assert.equal(g.cottage.autoDig,false);g.livingPersist=()=>true;toggleMineDig(g);tick(g,20);assert.ok(g.progress.mining.dug[key]);});
test('同地表位置入矿，不能远程进出，地下存档不污染室外落点',()=>{const g=setup();assert.deepEqual({x:g.player.x,y:g.player.y},M.home);assert.equal(leaveCottage(g),false);const outside={...g.cottage.outside};capturePatrol(g);assert.deepEqual(g.progress.living.position,outside);Object.assign(g.player,minePoint({x:1,y:0}));assert.equal(leaveMine(g).ok,false);Object.assign(g.player,M.home);assert.ok(leaveMine(g).ok);assert.equal(g.cottage.kind,'cottage');assert.deepEqual({x:g.player.x,y:g.player.y},M.hatch.goal);updateCottage(g,.05,{x:0,y:0});assert.equal(g.cottage.kind,'cottage');Object.assign(g.player,COTTAGE.spawn);assert.equal(enterMine(g),false);});
test('持续挖掘越过多格且不会重复产矿，暂停冻结，墙体不能穿透',()=>{const g=setup(),wall=wallScene(g),start=g.player.x;tick(g,100,{x:1,y:0});assert.ok(g.player.x<start+32);assert.ok(mineBlocked(g,minePoint(wall).x,minePoint(wall).y));toggleMineDig(g);tick(g,240,{x:1,y:0});assert.ok(mineCell(g.player).x>=wall.x+6);assert.ok(oreCount(g.progress.mining.bagOre)>0);const before=structuredClone(g.progress.mining),x=g.player.x;g.state='paused';tick(g,100,{x:1,y:0});assert.deepEqual(g.progress.mining,before);assert.equal(g.player.x,x);g.state='playing';toggleMineDig(g);tick(g,100);for(const key of Object.keys(g.progress.mining.dug)){const [x,y]=key.split(',').map(Number);if(!mineTerrain({x,y},before).natural)assert.ok(before.dug[key],key);}assert.equal(g.progress.mining.ore,before.ore);});
test('矿格负坐标和远距离仍与地表单位对齐，不预生成全图',()=>{for(const cell of [{x:-12345,y:100000},{x:0,y:0},{x:999999,y:-999999}])assert.deepEqual(mineCell(minePoint(cell)),cell);assert.equal(Object.keys(setup().progress.mining.dug).length,9);});
test('铺轨只在开放地块施工，重复设施、缺料和保存失败均不扣款',()=>{const g=setup();g.progress.mining.ore=20;const initial=g.progress.wood;assert.ok(buildMine(g,'rail').ok);assert.equal(g.progress.wood,initial-2);assert.equal(buildMine(g,'rail').ok,false);assert.ok(buildMine(g,'lamp').ok);assert.equal(buildMine(g,'sign').ok,false);wallScene(g);assert.equal(buildMine(g,'rail',true).ok,false);g.livingPersist=()=>false;const before=structuredClone(g.progress.mining),wood=g.progress.wood;assert.equal(buildMine(g,'rail').ok,false);assert.deepEqual(g.progress.mining,before);assert.equal(g.progress.wood,wood);g.livingPersist=()=>true;g.progress.mining.ore=0;assert.equal(buildMine(g,'cart').ok,false);});
test('真实矿车沿弯道连续行驶并折返，暂停、急停与下车立即冻结',()=>{const g=setup();rails(g,[{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:2,y:1},{x:2,y:2}]);Object.assign(g.player,M.home);assert.ok(buildMine(g,'cart').ok);assert.ok(rideMineCart(g));assert.ok(toggleMineCart(g));tick(g,27);assert.ok(g.player.y>M.home.y);const moving={x:g.player.x,y:g.player.y};g.state='paused';tick(g,100);assert.deepEqual({x:g.player.x,y:g.player.y},moving);g.state='playing';tick(g,90);assert.ok(g.cottage.running);toggleMineCart(g);const stop=structuredClone(g.progress.mining.carts[0]);tick(g,100);assert.deepEqual(g.progress.mining.carts[0],stop);toggleMineCart(g);tick(g,3);rideMineCart(g);const dismounted=structuredClone(g.progress.mining.carts[0]);tick(g,100);assert.deepEqual(g.progress.mining.carts[0],dismounted);assert.equal(g.cottage.ride,null);});
test('岔路选择与其他矿车阻挡均保持轨道范围',()=>{const g=setup();rails(g,[{x:0,y:0},{x:1,y:0},{x:0,y:1}]);Object.assign(g.player,M.home);buildMine(g,'cart');rideMineCart(g);faceMine(g,2);toggleMineCart(g);tick(g,4);assert.ok(g.player.y>M.home.y);assert.equal(g.player.x,M.home.x);rideMineCart(g);Object.assign(g.player,minePoint({x:1,y:0}));buildMine(g,'cart');Object.assign(g.player,M.home);rideMineCart(g);faceMine(g,1);toggleMineCart(g);tick(g,80);assert.ok(g.progress.mining.carts.every(c=>g.progress.mining.rails[mineKey(mineCell(c))]));});
test('向上开洞受地表碰撞与时间约束，可从地表往返，刷新保留',()=>{const g=setup();g.progress.mining.ore=100;assert.equal(canOpenShaft(g),false);let cell=null;for(let y=-12;y<12&&!cell;y++)for(let x=-12;x<12&&!cell;x++){Object.assign(g.player,minePoint({x,y}));if(canOpenShaft(g))cell={x,y};}assert.ok(cell);g.progress.mining.dug[mineKey(cell)]=true;assert.ok(startMineShaft(g).ok);tick(g,30);tick(g,1,{x:1,y:0});assert.equal(g.cottage.shaftWork,0);assert.equal(g.progress.mining.shafts.length,0);assert.ok(startMineShaft(g).ok);tick(g,90);assert.deepEqual(g.progress.mining.shafts,[mineKey(cell)]);assert.ok(leaveMine(g).ok);assert.equal(g.cottage,null);assert.equal(updateMineEntrance(g,2,{x:0,y:0}),false);Object.assign(g.player,minePoint({x:cell.x+1,y:cell.y}));updateMineEntrance(g,.05,{x:0,y:0});Object.assign(g.player,minePoint(cell));assert.ok(updateMineEntrance(g,1.1,{x:0,y:0}));assert.equal(g.cottage.kind,'mine');assert.deepEqual(validateProgress(g.progress).mining.shafts,[mineKey(cell)]);});
test('损坏存档过滤非法设施和重复车辆，不产生孤立轨道',()=>{const m=normalizeMining({version:1,ore:-5,dug:{'0,0':true,'NaN,0':true,'0.5,0':true},rails:{'0,0':true,'2,2':true},decor:{'0,0':'lamp','1,1':'sign'},shafts:['0,0','0,0'],carts:[{id:1,...M.home},{id:1,...M.home},{id:2,x:NaN,y:0}]});assert.equal(m.ore,0);assert.deepEqual(m.rails,{'0,0':true});assert.equal(m.carts.length,1);assert.equal(m.shafts.length,1);});

// 对角线邻近不等于可达，轨道边缘登乘必须遵守同一脚底碰撞。
test('隔岩壁不能登车，地下室施工不删除原家具',()=>{
 const g=setup(),wall=wallScene(g),m=g.progress.mining,p=minePoint(wall);m.dug[mineKey({x:wall.x+1,y:wall.y})]=true;m.rails[mineKey({x:wall.x+1,y:wall.y})]=true;m.carts=[{id:1,x:p.x+22,y:p.y,wheel:0}];Object.assign(g.player,{x:p.x-16,y:p.y});assert.equal(rideMineCart(g),false);
 const h=setup(false),item=h.progress.homeDecor.items.find(i=>i.type==='chair');Object.assign(item,{x:155,y:440});const uid=item.uid,count=h.progress.homeDecor.items.length;assert.ok(buildHome(h,'basement').ok);assert.equal(h.progress.homeDecor.items.length,count);assert.equal(h.progress.homeDecor.items.find(i=>i.uid===uid).x,null);
});

test('一层仓库与小屋可交叉进出，货物只在仓库升井卸下',()=>{
 const g=setup(),m=g.progress.mining,depot=minePoint({x:6,y:0});
 m.bagOre={iron:3};tick(g,1);assert.equal(g.progress.mining.ore,0);
 for(let x=0;x<=6;x++){
  const p=minePoint({x,y:-1});assert.equal(mineBlocked(g,p.x,p.y),false);
 }
 Object.assign(g.player,depot);tick(g,1);assert.equal(g.progress.mining.ore,0);
 assert.equal(g.progress.industry.raw.iron,3);assert.equal(g.progress.materials.iron,0);assert.ok(leaveMine(g).ok);assert.equal(g.cottage,null);
 assert.ok(enterMine(g,null,true));assert.deepEqual(mineCell(g.player),{x:6,y:0});
 Object.assign(g.player,M.home);assert.ok(leaveMine(g).ok);assert.equal(g.cottage.kind,'cottage');
 const old=structuredClone(m);delete old.depotRow;old.dug['6,0']=true;old.shafts=['6,0'];
 const restored=normalizeMining(old);assert.equal(restored.depotRow,1);assert.deepEqual(normalizeMining(restored).shafts,['6,0']);
});
test('铺轨合用库存与随身矿，保存失败、缺木和重复铺设均不扣背包',()=>{
 const g=setup(),wood=g.progress.wood;g.progress.mining.ore=1;g.progress.mining.bagOre={copper:1,iron:1,rareMetal:2};
 assert.ok(buildMine(g,'rail').ok);assert.equal(g.progress.mining.ore,0);assert.equal(g.progress.mining.bagOre.copper,1);
 g.livingPersist=()=>false;assert.equal(buildMine(g,'rail',true).ok,false);assert.equal(g.progress.mining.bagOre.copper,1);assert.equal(g.progress.wood,wood-2);
 g.livingPersist=()=>true;g.progress.wood=1;assert.equal(buildMine(g,'rail',true).ok,false);assert.equal(g.progress.mining.bagOre.copper,1);
 g.progress.wood=wood-2;assert.ok(buildMine(g,'rail',true).ok);assert.equal(buildMine(g,'rail',true).ok,false);
 assert.deepEqual(g.progress.mining.bagOre,{iron:1,rareMetal:2});assert.equal(g.progress.wood,wood-4);
});

test('移动铺轨能连续使用背包矿，装矿的车在一层升井卸货',()=>{
 const g=setup();Object.assign(g.player,minePoint({x:0,y:-1}));
 g.progress.mining.bagOre={copper:6,iron:3};const wood=g.progress.wood;
 selectMineTool(g,'rail');tick(g,35,{x:1,y:0});
 const count=Object.keys(g.progress.mining.rails).length;
 assert.ok(count>=3);assert.equal(oreCount(g.progress.mining.bagOre),9-count);
 assert.equal(g.progress.wood,wood-count*2);
 const depot=minePoint({x:6,y:0});
 g.progress.mining.carts.push({id:1,...depot,cargo:{rareMetal:4},leader:null});
 const carried={...g.progress.mining.bagOre};Object.assign(g.player,depot);
 tick(g,1);assert.equal(g.progress.mining.ore,0);assert.equal(g.progress.industry.raw.copper,carried.copper||0);assert.equal(g.progress.industry.raw.iron,carried.iron||0);assert.equal(g.progress.industry.raw.rareMetal,4);
 assert.equal(oreCount(g.progress.mining.carts[0].cargo),0);
 assert.equal(oreCount(g.progress.mining.bagOre),0);
});
