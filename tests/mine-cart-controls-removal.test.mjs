import {coupleMineCart} from '../src/core/mining/mine-train.js';
// 验证停车直接输入、拆轨及回收的正式事务，覆盖占用与保存失败。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MINING as M,minePoint,mineKey} from '../src/config/mining.js';
import {freshMining,normalizeMining,openBasement} from '../src/progression/mining/mining.js';
import {railExits,nextCartExit} from '../src/config/mine-rail-routes.js';
import {enterMine,rideMineCart,toggleMineCart,updateMining} from '../src/core/mining/mining.js';
import {nearbyJunction,setMineCartDirection,setMineJunctionDirection,stoppedCartChoices} from '../src/core/mining/mine-cart-directions.js';
import {mineRemovalChoices,removeMineFacility} from '../src/core/mining/mine-demolition.js';
// 构造隔离十字轨道，外部进度完成入职，不改用户存档。
function setup(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;openBasement(p.mining);
 for(let i=-4;i<=4;i++)for(const cell of [{x:i,y:0},{x:0,y:i}]){const k=mineKey(cell);p.mining.dug[k]=true;p.mining.bridges[k]=true;p.mining.rails[k]=true;}
 p.mining.carts=[{id:1,...M.home,heading:1,departure:null,previous:null,wheel:0}];
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;g.cottage={kind:'cottage',floor:0,outside:M.home};Object.assign(g.player,M.hatch.goal);assert.ok(enterMine(g));g.cottage.scanWait=999;return g;
}
// 固定步长经过正式循环，距离与轮毂相位由游戏计算。
function tick(g,n){for(let i=0;i<n;i++)updateMining(g,.05,{x:0,y:0});}
// 获取事务后替换的新车对象，避免断言引用旧存档。
function cart(g){return g.progress.mining.carts[0];}

test('方向输入直接启动矿车，长按只保存一次，急停后同方向需松手再起步',()=>{
 const g=setup();rideMineCart(g);let saves=0;g.livingPersist=()=>{saves++;return true;};
 for(let i=0;i<10;i++)updateMining(g,.05,{x:1,y:0});
 assert.equal(saves,1);assert.equal(g.cottage.running,true);assert.ok(cart(g).x>M.home.x+64);
 toggleMineCart(g);const x=cart(g).x,count=saves;for(let i=0;i<4;i++)updateMining(g,.05,{x:1,y:0});assert.equal(cart(g).x,x);assert.equal(saves,count);assert.equal(g.cottage.running,false);
 updateMining(g,.05,{x:0,y:0});updateMining(g,.05,{x:1,y:0});assert.equal(saves,count+1);assert.ok(g.cottage.running);assert.ok(cart(g).x>x);
});
test('摇杆死区、轨段中途输入和暂停不会误改向或反复写档',()=>{
 const g=setup();rideMineCart(g);let saves=0;g.livingPersist=()=>{saves++;return true;};
 updateMining(g,.05,{x:.1,y:.1});assert.equal(saves,0);toggleMineCart(g);tick(g,1);
 updateMining(g,.05,{x:-1,y:0});assert.equal(cart(g).heading,1);assert.equal(saves,0);
 toggleMineCart(g);g.state='paused';const before=structuredClone(g.progress);updateMining(g,.05,{x:0,y:-1});assert.deepEqual(g.progress,before);
});
test('半途方向启动沿原轨段移动，无轨及保存失败保持停车，松手可重试',()=>{
 const g=setup();rideMineCart(g);toggleMineCart(g);tick(g,3);toggleMineCart(g);
 const x=cart(g).x;updateMining(g,.05,{x:0,y:1});assert.equal(cart(g).x,x);assert.equal(g.cottage.running,false);
 g.livingPersist=()=>false;updateMining(g,.05,{x:-1,y:0});assert.equal(cart(g).x,x);assert.equal(g.cottage.running,false);
 updateMining(g,.05,{x:0,y:0});g.livingPersist=()=>true;updateMining(g,.05,{x:-1,y:0});assert.equal(cart(g).heading,3);assert.ok(g.cottage.running);assert.ok(Math.abs(cart(g).x-(x-M.cartSpeed*.05))<.001);
});
test('拆除空铁轨返还原价，保留桥梁与探索，停止自动铺轨',()=>{
 const g=setup();g.cottage.direction=1;g.cottage.tool='rail';g.cottage.autoDig=true;
 const ore=g.progress.mining.ore,wood=g.progress.wood;
 assert.equal(mineRemovalChoices(g)[1].key,'1,0');assert.ok(removeMineFacility(g,{kind:'rail',key:'1,0'}).ok);
 assert.equal(g.progress.mining.rails['1,0'],undefined);assert.equal(g.progress.mining.dug['1,0'],true);assert.equal(g.progress.mining.bridges['1,0'],true);
 assert.equal(g.progress.mining.ore,ore+M.prices.rail.ore);assert.equal(g.progress.wood,wood+M.prices.rail.wood);assert.equal(g.cottage.tool,null);assert.equal(g.cottage.autoDig,false);
 assert.equal(removeMineFacility(g,{kind:'rail',key:'1,0'}).ok,false);assert.equal(g.progress.mining.ore,ore+1);
});
test('拆轨清除失效路口与起步出口，保留其他合法规则',()=>{
 const g=setup(),l=g.progress.mining;l.junctions['0,0']=1;cart(g).departure=1;cart(g).previous='1,0';
 assert.ok(removeMineFacility(g,{kind:'rail',key:'1,0'}).ok);assert.equal(g.progress.mining.junctions['0,0'],undefined);assert.equal(cart(g).departure,null);assert.equal(cart(g).previous,null);
 const h=setup();h.progress.mining.junctions['0,0']=0;assert.ok(removeMineFacility(h,{kind:'rail',key:'1,0'}).ok);assert.equal(h.progress.mining.junctions['0,0'],0);
 assert.ok(removeMineFacility(h,{kind:'rail',key:'-1,0'}).ok);assert.equal(h.progress.mining.junctions['0,0'],undefined);
});
test('空车占据格心及轨段两端都禁止拆轨，保护跨过半格后的车',()=>{
 for(const n of [0,2,5]){
  const g=setup();rideMineCart(g);toggleMineCart(g);tick(g,n);rideMineCart(g);
  assert.equal(removeMineFacility(g,{kind:'rail',key:'0,0'}).ok,false);
  if(n)assert.equal(removeMineFacility(g,{kind:'rail',key:'1,0'}).ok,false);
 }
});
test('乘车中不能拆除，停车下车回收指定空车并保留铁轨',()=>{
 const g=setup();rideMineCart(g);assert.equal(removeMineFacility(g,{kind:'cart',id:1}).ok,false);
 toggleMineCart(g);tick(g,2);assert.equal(removeMineFacility(g,{kind:'rail',key:'1,0'}).ok,false);rideMineCart(g);
 const before={ore:g.progress.mining.ore,wood:g.progress.wood};g.progress.mining.carts.push({id:2,...minePoint({x:2,y:0}),heading:1});
 assert.ok(removeMineFacility(g,{kind:'cart',id:1}).ok);assert.deepEqual(g.progress.mining.carts.map(c=>c.id),[2]);assert.ok(g.progress.mining.rails['0,0']);assert.equal(g.progress.mining.ore,before.ore+8);assert.equal(g.progress.wood,before.wood+12);
 assert.equal(removeMineFacility(g,{kind:'cart',id:1}).ok,false);
});
test('回收保存失败无损，确认目标远离、暂停、死亡和非矿区均拒绝',()=>{
 for(const kind of ['rail','cart']){
  const g=setup(),target=kind==='rail'?{kind,key:'1,0'}:{kind,id:1},before=structuredClone(g.progress);
  g.livingPersist=()=>false;assert.equal(removeMineFacility(g,target).ok,false);assert.deepEqual(g.progress,before);
  g.livingPersist=()=>{throw Error('失败');};assert.equal(removeMineFacility(g,target).ok,false);assert.deepEqual(g.progress,before);
  g.livingPersist=()=>true;g.state='paused';assert.equal(removeMineFacility(g,target).ok,false);g.state='playing';g.player.hp=0;assert.equal(removeMineFacility(g,target).ok,false);g.player.hp=100;
  Object.assign(g.player,minePoint({x:9,y:0}));assert.equal(removeMineFacility(g,target).ok,false);
  g.cottage=null;assert.equal(removeMineFacility(g,target).ok,false);
 }
});
test('深层回收隔离且重读后不复活设施，稳定编号不复用',()=>{
 const g=setup();g.progress.mining.layers[2]={...structuredClone(g.progress.mining),layers:{}};g.cottage.depth=2;
 const next=g.progress.mining.nextCart;assert.ok(removeMineFacility(g,{kind:'cart',id:1}).ok);assert.ok(removeMineFacility(g,{kind:'rail',key:'0,0'}).ok);
 assert.equal(g.progress.mining.carts.length,1);assert.ok(g.progress.mining.rails['0,0']);assert.equal(g.progress.mining.nextCart,next);
 const restored=normalizeMining(g.progress.mining);assert.equal(restored.layers[2].carts.length,0);assert.equal(restored.layers[2].rails['0,0'],undefined);
});

test('两车靠近自动停车后可以直接挂钩，保存失败可重试，挂接后能驶离',()=>{
 const g=setup(),second={id:2,...minePoint({x:1,y:0}),heading:3,wheel:0,cargo:{iron:5}};
 g.progress.mining.carts.push(second);assert.ok(rideMineCart(g));toggleMineCart(g);tick(g,9);
 assert.equal(g.cottage.running,false);assert.equal(cart(g).target,'1,0');assert.ok(cart(g).x>M.home.x);
 const before=structuredClone(g.progress.mining.carts);g.livingPersist=()=>false;
 assert.equal(coupleMineCart(g).ok,false);assert.deepEqual(g.progress.mining.carts,before);
 g.livingPersist=()=>true;assert.ok(coupleMineCart(g).ok);assert.equal(g.progress.mining.carts[1].leader,1);
 assert.deepEqual(g.progress.mining.carts[1].cargo,{iron:5});assert.equal(cart(g).target,null);
 toggleMineCart(g);tick(g,10);assert.ok(cart(g).x<M.home.x-64);
 assert.ok(Math.abs(g.progress.mining.carts[1].x-cart(g).x-64)<.001,JSON.stringify(g.progress.mining.carts));
 assert.equal(normalizeMining(g.progress.mining).carts[1].leader,1);
});

test('两辆车都停在半途可以对齐，隔断的轨道不能加挂',()=>{
 const g=setup();cart(g).x+=37;Object.assign(cart(g),{from:'0,0',target:'1,0'});
 const other={id:2,...minePoint({x:1,y:0}),from:'1,0',target:'2,0',heading:1,wheel:0};other.x+=30;
 g.progress.mining.carts.push(other);Object.assign(g.player,{x:cart(g).x});rideMineCart(g);
 assert.ok(coupleMineCart(g).ok);const [a,b]=g.progress.mining.carts;
 assert.equal(Math.abs(a.x-b.x),64);assert.equal(b.leader,a.id);
 const h=setup();delete h.progress.mining.rails['1,0'];h.progress.mining.carts.push({id:2,...minePoint({x:2,y:0}),wheel:0});
 rideMineCart(h);assert.equal(coupleMineCart(h).ok,false);
});

test('首车在站外、尾车停在升井相邻轨段时整列卸货，失败重试只入库一次',()=>{
 const g=setup(),m=g.progress.mining,base=minePoint({x:6,y:0});
 for(let x=3;x<=6;x++){const key=x+',0';m.dug[key]=m.rails[key]=true;m.bridges[key]=true;}
 m.carts=[{id:1,x:base.x-152,y:base.y,from:'3,0',target:'4,0',cargo:{iron:4},wheel:0},
  {id:2,leader:1,x:base.x-88,y:base.y,from:'4,0',target:'5,0',cargo:{copper:2},wheel:0}];
 g.cottage.ride=1;g.livingPersist=()=>false;tick(g,1);
 assert.equal(g.progress.mining.ore,0);assert.equal(g.progress.mining.carts[1].cargo.copper,2);
 g.livingPersist=()=>true;tick(g,48);assert.equal(g.progress.mining.ore,0);
 // 卸货只入原矿库，精炼材料由后续加工产出。
 assert.equal(g.progress.industry.raw.iron,4);assert.equal(g.progress.industry.raw.copper,2);assert.equal(g.progress.materials.iron,0);assert.equal(g.progress.materials.copper,0);
 assert.deepEqual(g.progress.mining.carts.map(c=>c.cargo),[{},{}]);tick(g,3);assert.equal(g.progress.mining.ore,0);
});

test('人在井旁卸下停放矿车，背包自动装车后随车入库，远车保留',()=>{
 const g=setup(),m=g.progress.mining,station=minePoint({x:6,y:0});Object.assign(g.player,{x:station.x-64,y:station.y});
 m.bagOre={copper:3};m.carts=[{id:1,...minePoint({x:5,y:0}),cargo:{iron:2}},{id:2,...minePoint({x:6,y:-1}),cargo:{copper:5}},{id:3,...M.home,cargo:{rareMetal:1}}];
 tick(g,2);assert.equal(g.progress.mining.ore,0);assert.equal(g.progress.industry.raw.iron,2);assert.equal(g.progress.industry.raw.copper,8);assert.deepEqual(g.progress.mining.bagOre,{});
 assert.equal(g.progress.mining.carts[2].cargo.rareMetal,1);
});
