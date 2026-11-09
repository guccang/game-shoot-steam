// 检查真实层边界、连续几何与施工事务，不以截图颜色代替物理规则。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {freshMining,openBasement,normalizeMining} from '../src/progression/mining/mining.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MINING as M,mineCell,mineKey,minePoint} from '../src/config/mining.js';
import {freshMineLayer} from '../src/progression/mining/mine-layers.js';
import {mineCellArea} from '../src/config/mine-ecology.js';
import {mineSurfaceAt,buildMineSurface} from '../src/world/mine-surface.js';
import {mineOccupancy} from '../src/physics/mine-motion.js';
import {enterMine,updateMining,buildMine,rideMineCart,toggleMineCart,selectMineTool} from '../src/core/mining/mining.js';
import {buildMineBridge} from '../src/core/mining/mine-ecology.js';
import {railExits} from '../src/config/mine-rail-routes.js';
// 非整格边界覆盖真实部分边缘格，内部清出可用通道但不能打开外围岩层。
function layer(){const m=freshMining();openBasement(m);m.seed=1847;m.bounds={left:M.home.x-101.25,top:M.home.y-109.5,right:M.home.x+101.25,bottom:M.home.y+109.5};for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++)m.dug[mineKey({x,y})]=true;return m;}
// 正式游戏夹具使用隔离存档，不触碰玩家本地数据。
function game(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;p.mining=layer();p.mining.ore=100;p.wood=100;const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.livingPersist=()=>true;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:M.home};Object.assign(g.player,M.hatch.goal);enterMine(g);g.progress.mining=layer();g.progress.mining.ore=100;g.cottage.scanWait=999;return g;}
// 射线检查真实几何填充，避免复制连续地形公式。
function contains(poly,x,y){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
// 通过正式固定步长执行移动与开采。
function tick(g,input,n=50){for(let i=0;i<n;i++)updateMining(g,.05,input);}
test('四边四角地面与水域都被岩层封住，画面与零半径碰撞逐点一致',()=>{
 const m=layer(),b=m.bounds,r={x:b.left-80,y:b.top-80,w:b.right-b.left+160,h:b.bottom-b.top+160},mesh=buildMineSurface(m,r),g={progress:{mining:m},cottage:{depth:1},vehicle:{active:false},player:{}};
 for(let y=r.y+.17;y<r.y+r.h;y+=11.3)for(let x=r.x+.19;x<r.x+r.w;x+=13.7){const s=mineSurfaceAt(m,x,y),open=mesh.open.some(p=>contains(p,x,y)),water=mesh.water.some(p=>contains(p,x,y));assert.deepEqual(s,{open,water});assert.equal(mineOccupancy(g,x,y,0,true),open);}
 for(const kind of ['open','water'])for(const poly of mesh[kind])for(const p of poly)assert.ok(p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom);
 assert.ok(mesh.walls.some(([a,c])=>a.x===b.left&&c.x===b.left));assert.ok(mesh.nodes<2000);
});
test('步行、两栖与重型车都不能穿过固定外围，内部边沿仍能站立',()=>{
 const g=game(),b=g.progress.mining.bounds,points=[[b.left+10,M.home.y],[b.right-10,M.home.y],[M.home.x,b.top+10],[M.home.x,b.bottom-10]];
 for(const [x,y] of points)assert.ok(mineOccupancy(g,x,y,10,true));
 for(const radius of [0,10,26,35])for(const [x,y] of [[b.left+radius-.1,M.home.y],[b.right-radius+.1,M.home.y],[M.home.x,b.top+radius-.1],[M.home.x,b.bottom-radius+.1]])assert.equal(mineOccupancy(g,x,y,radius,true),false);
 Object.assign(g.player,minePoint({x:1,y:0}));tick(g,{x:1,y:0});assert.ok(g.player.x<=b.right-10);assert.ok(g.player.x>M.home.x+64);
});
test('边界部分格不可开采或铺轨，失败无矿石木材或补给消耗',()=>{
 const g=game(),m=g.progress.mining;Object.assign(g.player,minePoint({x:1,y:0}));g.cottage.direction=1;delete m.dug['2,0'];assert.ok(mineCellArea({x:2,y:0},m)>0);
 g.progress.production.effects.meal=10;const ore=m.ore,wood=g.progress.wood;selectMineTool(g,'pick');tick(g,{x:1,y:0});
 assert.equal(g.progress.mining.dug['2,0'],undefined);assert.equal(g.progress.mining.ore,ore);assert.equal(g.progress.production.effects.meal,10);assert.match(g.cottage.notice,/坚硬岩层/);
 assert.equal(buildMine(g,'rail',true).ok,false);assert.equal(buildMineBridge(g,true).ok,false);assert.equal(g.progress.wood,wood);
});
test('旧轨道和预存行驶目标也不能带矿车穿出外围岩层',()=>{
 const g=game(),m=g.progress.mining;for(const key of ['0,0','1,0','2,0'])m.rails[key]=true;
 assert.deepEqual(railExits(m,'1,0').map(e=>e.key),['0,0']);
 m.carts=[{id:1,...minePoint({x:1,y:0}),heading:1,from:'1,0',target:'2,0',wheel:0}];Object.assign(g.player,m.carts[0]);rideMineCart(g);toggleMineCart(g);tick(g,{x:0,y:0},1);
 assert.equal(g.cottage.running,false);assert.equal(g.progress.mining.carts[0].target,null);assert.equal(g.player.x,M.home.x+64);
});
test('缩放地图或切层不沿用旧边界缓存，读档不改层面积和内部地貌',()=>{
 const m=layer(),old=structuredClone(m.bounds),p=minePoint({x:1,y:0});assert.ok(mineSurfaceAt(m,p.x,p.y).open);m.bounds={...m.bounds,right:M.home.x+40};assert.equal(mineSurfaceAt(m,p.x,p.y).open,false);
 const actual=freshMining();openBasement(actual);actual.layers[2]=freshMineLayer(2,{x:8,y:4},()=>.31);const bounds=structuredClone(actual.bounds),deep=structuredClone(actual.layers[2].bounds);
 const restored=normalizeMining(actual);assert.deepEqual(restored.bounds,bounds);assert.deepEqual(restored.layers[2].bounds,deep);assert.deepEqual(mineSurfaceAt(actual,M.home.x,M.home.y),mineSurfaceAt(restored,M.home.x,M.home.y));
 const point=minePoint(mineCell({x:deep.right+96,y:(deep.top+deep.bottom)/2}));actual.dug[mineKey(mineCell(point))]=true;assert.ok(mineSurfaceAt(actual,point.x,point.y).open);assert.equal(mineSurfaceAt(actual.layers[2],point.x,point.y).open,false);
});
