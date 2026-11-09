// 建筑公司以真实Game验证施工、持久化、无限层号、交通和阳台几何，避免只验证按钮文案。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {COTTAGE,COTTAGE_STAIRS} from '../src/config/cottage.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {HOME_BUILD_PRICES,HOME_DIRECTIONS,HOME_ELEVATOR,HOME_BALCONY,homeElevatorPlan,hasHomeElevator,homeStairRoutes} from '../src/config/home-construction.js';
import {buildHome,travelHomeFloor,enterHomeBalcony,leaveHomeBalcony} from '../src/core/home/home-construction.js';
import {enterWorkshop,updateCottage,cottageBlocked,leaveCottage,sleepInCottage} from '../src/core/home/cottage.js';
import {buyDecor,moveDecor} from '../src/core/home/home-decor.js';
import {accessibleWeaponRack} from '../src/core/inventory/weapon-storage.js';
import {homeBalconyView,balconySceneGame,balconyProject,balconyObjectVisible,balconyWorldTransform,balconyUpright} from '../src/rendering/home-balcony.js';
import {playerActionCountdown} from '../src/rendering/player-action-countdown.js';
import {normalizeHome} from '../src/progression/home/home-decor.js';
import {worldDistance} from '../src/world/coordinates.js';
import {WORLD} from '../src/world/coordinates.js';
import {RANGER_COTTAGE} from '../src/world/workshop.js';
import {PARKING_SPOTS} from '../src/config/parking.js';
import {planQuestRoute} from '../src/physics/quest-route.js';
import {blocked} from '../src/physics/motion.js';

// 门口实际进入公司，保留真实树、碰撞、扣款和快照流程。
function setup(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.coins=100000;p.wood=10000;Object.assign(p.materials,{stone:1000,iron:1000,copper:1000});const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;Object.assign(g.player,WORKSHOP_INTERIORS.construction.door);assert.ok(enterWorkshop(g,'construction'));g.livingPersist=()=>true;return g;}
// 等待使用正式固定步长，阳台触发和解除闩锁均经过控制器。
function tick(g,n,input={x:0,y:0}){for(let i=0;i<n;i++)updateCottage(g,.05,input);}

// 真实事务验证矿物身份、精确扣款、旧资产和保存失败，不以报价快照替代消费结果。
test('加盖与电梯准确扣仓库成品，原石和原矿不能抵扣，拆除不退矿',()=>{
 const g=setup();Object.assign(g.progress.materials,{stone:80,iron:20,copper:4});g.progress.mining.ore=1000;g.progress.industry.raw.iron=1000;
 assert.ok(buildHome(g,'floor').ok);assert.equal(g.progress.materials.stone,0);assert.equal(g.progress.materials.iron,12);
 assert.ok(buildHome(g,'elevator').ok);assert.equal(g.progress.materials.iron,0);assert.equal(g.progress.materials.copper,0);
 assert.equal(g.progress.mining.ore,1000);assert.equal(g.progress.industry.raw.iron,1000);
 const reloaded=validateProgress(g.progress);assert.deepEqual(reloaded.materials,g.progress.materials);assert.deepEqual(reloaded.homeDecor,g.progress.homeDecor);
 const before=structuredClone(g.progress);const result=buildHome(g,'floor');assert.equal(result.ok,false);assert.match(result.message,/石块 80、铁块 8/);assert.deepEqual(g.progress,before);
 assert.ok(buildHome(g,'remove-elevator').ok);assert.deepEqual(g.progress.materials,before.materials);
 assert.equal(buildHome(g,'elevator').ok,false);assert.deepEqual(g.progress.materials,before.materials);
});
test('每种矿物单独不足及保存异常均不扣任何费用',()=>{
 for(const [kind,keys] of [['floor',['stone','iron']],['elevator',['iron','copper']]]){
  for(const key of keys){const g=setup();g.progress.materials[key]=HOME_BUILD_PRICES[kind][key]-1;const before=structuredClone(g.progress);assert.equal(buildHome(g,kind).ok,false);assert.deepEqual(g.progress,before);}
  for(const persist of [()=>false,()=>{throw Error('保存中断');}]){const g=setup();g.livingPersist=persist;const before=structuredClone(g.progress);assert.equal(buildHome(g,kind).ok,false);assert.deepEqual(g.progress,before);}
 }
});
test('旧档缺矿物字段不补扣已建设施，地下室与阳台仍只收币木',()=>{
 const g=setup();g.progress.homeDecor.floors=4;g.progress.homeDecor.elevators=[0];delete g.progress.materials.stone;delete g.progress.materials.iron;delete g.progress.materials.copper;
 g.progress=validateProgress(g.progress);assert.equal(g.progress.homeDecor.floors,4);assert.deepEqual(g.progress.homeDecor.elevators,[0]);
 assert.equal(buildHome(g,'floor').ok,false);assert.equal(buildHome(g,'elevator').ok,false);assert.ok(buildHome(g,'basement').ok);assert.ok(buildHome(g,'balcony').ok);
 assert.equal(g.progress.materials.stone,0);assert.equal(g.progress.materials.iron,0);assert.equal(g.progress.materials.copper,0);
});

test('施工仅限公司，扣料一次，设施重复购买不扣款，重载保留',()=>{
 const g=setup(),before={coins:g.progress.coins,wood:g.progress.wood};
 for(const kind of ['floor','elevator','balcony'])assert.ok(buildHome(g,kind,{floor:2,side:'east'}).ok);
 assert.equal(g.progress.homeDecor.floors,3);assert.equal(g.progress.coins,before.coins-10500);assert.equal(g.progress.wood,before.wood-1400);
 const home=structuredClone(g.progress.homeDecor),coins=g.progress.coins;
 assert.equal(buildHome(g,'elevator',{floor:2}).ok,false);assert.equal(buildHome(g,'balcony',{floor:2,side:'east'}).ok,false);assert.equal(g.progress.coins,coins);
 assert.deepEqual(validateProgress(g.progress).homeDecor,home);
 g.cottage.kind='cottage';assert.equal(buildHome(g,'floor').ok,false);
});
test('低余额、非法楼层、朝向与保存异常都原子回滚',()=>{
 const g=setup();for(const persist of [()=>false,()=>{throw Error('磁盘故障');}]){g.livingPersist=persist;const before=structuredClone(g.progress);for(const kind of ['floor','elevator','balcony'])assert.equal(buildHome(g,kind).ok,false);assert.deepEqual(g.progress,before);}
 g.livingPersist=()=>true;for(const floor of [-1,2,1.5,NaN,Infinity])assert.equal(buildHome(g,'balcony',{floor}).ok,false);
 assert.equal(buildHome(g,'toString').ok,false);assert.equal(buildHome(g,'balcony',{floor:0,side:'toString'}).ok,false);g.progress.wood=HOME_BUILD_PRICES.floor.wood-1;const coins=g.progress.coins;assert.equal(buildHome(g,'floor').ok,false);assert.equal(g.progress.coins,coins);
});
test('百万楼层继续加盖，存档只记录实际家具，新增层保留楼梯且已装层电梯可直达',()=>{
 const g=setup();g.progress.homeDecor.floors=1000000;assert.ok(buildHome(g,'floor').ok);assert.ok(buildHome(g,'elevator').ok);
 g.cottage.kind='furniture';const item=buyDecor(g,'weapon-rack');assert.ok(item.ok);g.cottage.kind='cottage';Object.assign(g.player,HOME_ELEVATOR.landing);
 assert.ok(travelHomeFloor(g,1000000,'elevator'));assert.ok(moveDecor(g,item.uid,180,288).ok);
 const reloaded=validateProgress(g.progress).homeDecor;assert.equal(reloaded.floors,1000001);assert.equal(reloaded.items.find(i=>i.uid===item.uid).floor,1000000);assert.equal(reloaded.items.length,5);assert.ok(JSON.stringify(reloaded).length<1500);
});
test('楼梯只能相邻切层，电梯须安装且靠近，不可越层或在阳台远程乘梯',()=>{
 const g=setup();buildHome(g,'floor');g.cottage.kind='cottage';Object.assign(g.player,COTTAGE.spawn);assert.equal(travelHomeFloor(g,1),false);
 Object.assign(g.player,COTTAGE_STAIRS.landing);assert.equal(travelHomeFloor(g,2),false);assert.ok(travelHomeFloor(g,1));Object.assign(g.player,COTTAGE_STAIRS.landing);assert.ok(travelHomeFloor(g,2));assert.equal(leaveCottage(g),false);assert.ok(travelHomeFloor(g,1));
 Object.assign(g.player,HOME_ELEVATOR.landing);assert.equal(travelHomeFloor(g,0,'elevator'),false);g.progress.homeDecor.elevators=[1];assert.ok(travelHomeFloor(g,0,'elevator'));assert.equal(travelHomeFloor(g,3,'elevator'),false);g.cottage.balcony='north';assert.equal(travelHomeFloor(g,1,'elevator'),false);
});
test('三层楼梯分别走上行与下行入口，落地不会连续跳层',()=>{
 const g=setup();buildHome(g,'floor');g.cottage.kind='cottage';Object.assign(g.player,COTTAGE_STAIRS.landing);tick(g,21);assert.equal(g.cottage.floor,1);tick(g,60);assert.equal(g.cottage.floor,1);
 for(const target of [2,1]){Object.assign(g.player,{x:320,y:490});tick(g,1);Object.assign(g.player,target>g.cottage.floor?COTTAGE_STAIRS.landing:COTTAGE_STAIRS.downLanding);tick(g,1);assert.equal(playerActionCountdown(g).icon,target===2?'stairs-up':'stairs-down');tick(g,20);assert.equal(g.cottage.floor,target);}
});
test('四向阳台门均可走到并进出，行走受栏杆限制，返回同一层',()=>{
 for(const side of Object.keys(HOME_DIRECTIONS)){
  const g=setup();assert.ok(buildHome(g,'balcony',{floor:1,side}).ok);g.cottage.kind='cottage';g.cottage.floor=1;
  const outside={...g.cottage.outside};Object.assign(g.player,COTTAGE.spawn);assert.equal(enterHomeBalcony(g,side),false);
  Object.assign(g.player,HOME_DIRECTIONS[side].door);assert.equal(cottageBlocked(g.player.x,g.player.y,g),false);tick(g,21);assert.equal(g.cottage.balcony,side);
  assert.equal(leaveCottage(g),false);assert.equal(sleepInCottage(g),false);assert.equal(leaveHomeBalcony(g),false);
  assert.equal(cottageBlocked(12,150,g),true);assert.equal(cottageBlocked(240,40,g),true);assert.equal(cottageBlocked(240,120,g),false);
  const x=g.player.x;tick(g,6,{x:1,y:0});assert.ok(g.player.x>x);assert.equal(g.cottage.balcony,side);
  Object.assign(g.player,HOME_BALCONY.exit);tick(g,21);assert.equal(g.cottage.balcony,null);assert.equal(g.cottage.floor,1);assert.deepEqual(g.cottage.outside,outside);tick(g,60);assert.equal(g.cottage.balcony,null);
 }
});
test('阳台暂停冻结、走开取消，一楼阳台不能调用室外出口或家具服务',()=>{
 const g=setup();buildHome(g,'balcony',{floor:0,side:'south'});g.cottage.kind='cottage';Object.assign(g.player,HOME_DIRECTIONS.south.door);tick(g,10);g.state='paused';tick(g,30);assert.equal(g.cottage.balcony,undefined);g.state='playing';tick(g,1,{x:-1,y:0});assert.equal(g.cottage.balconyElapsed,0);Object.assign(g.player,HOME_DIRECTIONS.south.door);tick(g,21);assert.equal(g.cottage.balcony,'south');assert.equal(leaveCottage(g),false);assert.equal(moveDecor(g,1,180,228).ok,false);assert.equal(accessibleWeaponRack(g,1),null);
});
test('真实营地取景方向和高度单调一致，观察代理不改变玩家和世界对象',()=>{
 const g=setup();g.cottage.kind='cottage';g.cottage.outside={x:RANGER_COTTAGE.x+50,y:RANGER_COTTAGE.y+30};
 for(const [side,d] of Object.entries(HOME_DIRECTIONS)){g.cottage.balcony=side;g.cottage.floor=1;const low=homeBalconyView(g.cottage,390,844);g.cottage.floor=50;const high=homeBalconyView(g.cottage,390,844);assert.ok(high.zoom<low.zoom);assert.ok(high.w>low.w);assert.equal(worldDistance(high.anchor,RANGER_COTTAGE),0);assert.equal(Math.sign(high.center.x-high.anchor.x),d.dx);assert.equal(Math.sign(high.center.y-high.anchor.y),d.dy);const scene=balconySceneGame(g,high);scene.player.x+=100;assert.notEqual(scene.player.x,g.player.x);assert.equal(scene.trees,g.trees);assert.equal(scene.progress,g.progress);assert.equal(scene.cottage,null);assert.ok(g.cottage);}
 const corrupt=normalizeHome({floors:5000,elevator:true,balconies:{4999:['north','north','missing'],5000:['south'],x:['east']},items:[]},{});assert.deepEqual(corrupt.balconies,{4999:['north']});
});
test('建筑公司候停点及外侧道路不被实体与树封堵',()=>{
 const g=setup(),door=WORKSHOP_INTERIORS.construction.door;g.cottage=null;
 for(const point of [door,{x:door.x,y:door.y+35},{x:door.x-105,y:door.y+35}])assert.equal(blocked(point.x,point.y,10,g.trees,{...g.player,livingCollision:true}),false,JSON.stringify(point));
});

// 眺望时居民真实推进，战斗、主线与屋内局部位置保持隔离，暂停不走动。
test('阳台居民继续日常且不推进主线或战斗',()=>{
 const g=setup();buildHome(g,'balcony',{floor:0,side:'south'});g.cottage.kind='cottage';Object.assign(g.player,HOME_DIRECTIONS.south.door);assert.ok(enterHomeBalcony(g,'south'));
 const player={x:g.player.x,y:g.player.y},mainline=structuredClone(g.progress.mainline),wave=g.wave;g.update(.05);const clock=[...g.campActors.values()][0].clock;g.update(.05);assert.ok([...g.campActors.values()][0].clock>clock);assert.deepEqual(g.progress.mainline,mainline);assert.equal(g.wave,wave);assert.deepEqual({x:g.player.x,y:g.player.y},player);
 g.state='paused';const paused=[...g.campActors.values()][0].clock;g.update(.05);assert.equal([...g.campActors.values()][0].clock,paused);
});

// 建筑主体不得挤占原有小屋倒车路线，真实路径仍能从营内抵达公司和停车入口。
test('公司与小屋停车位的倒车入口分离',()=>{
 const g=setup(),spot=PARKING_SPOTS.find(s=>s.id==='cottage'),body={mapId:'forest',livingCollision:true};g.cottage=null;
 for(let y=spot.y;y<=spot.approachY+25;y+=10)assert.equal(blocked(spot.x,y,32,g.trees,body),false,`小屋倒车 ${spot.x},${y}`);
 assert.ok(planQuestRoute({...body,x:390,y:729},WORKSHOP_INTERIORS.construction.door,g.trees,24000).reachable);
 assert.ok(planQuestRoute({...body,navigationRadius:32,x:390,y:729},{x:spot.x,y:spot.approachY},g.trees,24000).reachable);
 assert.equal(blocked(680,545,12,g.trees,body),false,'青芽原岗位仍可站立');
});

// 按层计价、拆除、重装及回滚必须同时约束存档和钱包。
test('电梯逐层收费，拆除只恢复本层楼梯且不退款，失败不改变任何设施',()=>{
 const g=setup(),before=g.progress.coins;buildHome(g,'floor');
 assert.ok(buildHome(g,'elevator',{floor:0}).ok);assert.ok(buildHome(g,'elevator',{floor:2}).ok);
 assert.equal(g.progress.coins,before-HOME_BUILD_PRICES.floor.coins-HOME_BUILD_PRICES.elevator.coins*2);
 assert.deepEqual(g.progress.homeDecor.elevators,[0,2]);assert.equal(hasHomeElevator(g.progress.homeDecor,1),false);
 const saved=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(buildHome(g,'remove-elevator',{floor:2}).ok,false);assert.deepEqual(g.progress,saved);
 g.livingPersist=()=>true;assert.ok(buildHome(g,'remove-elevator',{floor:2}).ok);assert.equal(g.progress.coins,saved.coins);assert.deepEqual(g.progress.homeDecor.elevators,[0]);
 assert.equal(buildHome(g,'remove-elevator',{floor:2}).ok,false);assert.ok(buildHome(g,'elevator',{floor:2}).ok);assert.equal(g.progress.coins,saved.coins-HOME_BUILD_PRICES.elevator.coins);
 assert.deepEqual(validateProgress(g.progress).homeDecor.elevators,[0,2]);
 for(const floor of [-1,3,1.5,NaN,Infinity])for(const kind of ['elevator','remove-elevator'])assert.equal(buildHome(g,kind,{floor}).ok,false);
});
// 旧档一次购买只对应一楼；新档显式空数组不能再次被旧布尔值恢复。
test('电梯旧档迁移、坏数据清洗与百万层稀疏保存',()=>{
 const legacy=normalizeHome({floors:1000001,elevator:true,items:[]},{});assert.deepEqual(legacy.elevators,[0]);assert.ok(JSON.stringify(legacy).length<200);
 const home=normalizeHome({floors:1000001,elevator:true,elevators:[0,3,3,1000000,-1,1.5,1000001,'2',null],items:[]},{});
 assert.deepEqual(home.elevators,[0,3,1000000]);assert.deepEqual(normalizeHome({...home,elevator:true,elevators:[]},{}).elevators,[]);
});
// 同一梯位只提供一种交通，已付费的出发层可到未付费的目标层，再用楼梯返回。
test('电梯与楼梯同位置互斥，乘梯落到未付费层后可下楼返回',()=>{
 const g=setup();g.progress.homeDecor.floors=4;buildHome(g,'elevator',{floor:0});g.cottage.kind='cottage';Object.assign(g.player,HOME_ELEVATOR.landing);
 assert.equal(homeStairRoutes(g.progress.homeDecor,0).length,0);assert.equal(travelHomeFloor(g,1,'stairs'),false);assert.ok(travelHomeFloor(g,3,'elevator'));
 assert.equal(cottageBlocked(g.player.x,g.player.y,g),false);assert.equal(travelHomeFloor(g,0,'elevator'),false);
 for(const target of [2,1,0]){Object.assign(g.player,COTTAGE_STAIRS.downLanding);assert.ok(travelHomeFloor(g,target));}
 assert.equal(g.cottage.floor,0);assert.deepEqual({x:g.player.x,y:g.player.y},HOME_ELEVATOR.landing);
});
// 候停电梯与楼梯使用相同的一秒规则，关闭乘梯页后不在原地反复打开。
test('走到电梯前候停请求选层，暂停冻结、移动取消、落地闩锁有效',()=>{
 const g=setup();buildHome(g,'elevator',{floor:0});g.cottage.kind='cottage';Object.assign(g.player,HOME_ELEVATOR.landing);
 tick(g,8);const elapsed=g.cottage.elevatorElapsed;g.state='paused';tick(g,30);assert.equal(g.cottage.elevatorElapsed,elapsed);g.state='playing';tick(g,1,{x:-1,y:0});assert.equal(g.cottage.elevatorElapsed,null);
 Object.assign(g.player,HOME_ELEVATOR.landing);tick(g,21);assert.equal(g.cottage.elevatorRequest,true);assert.equal(g.cottage.floor,0);
 g.cottage.elevatorRequest=false;tick(g,80);assert.equal(g.cottage.elevatorRequest,false);Object.assign(g.player,COTTAGE.spawn);tick(g,1);Object.assign(g.player,HOME_ELEVATOR.landing);tick(g,21);assert.equal(g.cottage.elevatorRequest,true);
});

// 四向投影必须从小屋朝外，左右关系、地图镜像与直立实体共用同一正交基。
test('阳台四向以前方为上，只看屋外且场景形体保持直立',()=>{
 for(const [side,d] of Object.entries(HOME_DIRECTIONS))for(const [width,height] of [[320,300],[390,550],[844,180]])for(const floor of [0,62,1000000]){
  const view=homeBalconyView({balcony:side,floor,outside:{x:RANGER_COTTAGE.x+WORLD.width,y:RANGER_COTTAGE.y-WORLD.height}},width,height);
  const a=view.anchor,front={x:a.x+d.dx*200,y:a.y+d.dy*200},far={x:a.x+d.dx*300,y:a.y+d.dy*300};
  assert.ok(balconyProject(view,far).y<balconyProject(view,front).y);
  assert.equal(balconyProject(view,front).x,width/2);
  const right={x:front.x-d.dy*100,y:front.y+d.dx*100};assert.ok(balconyProject(view,right).x>width/2);
  for(const point of [{x:view.x,y:view.y},{x:view.x+view.w,y:view.y+view.h}])assert.ok((point.x-a.x)*d.dx+(point.y-a.y)*d.dy>=view.near-1e-8);
  assert.equal(balconyObjectVisible(view,{...front,type:'scenery',kind:'cottage'}),false);
  assert.equal(balconyObjectVisible(view,{...front,type:'scenery',kind:'cottage',workshop:true}),true);
  assert.equal(balconyObjectVisible(view,a),false);assert.ok(view.w<WORLD.width&&view.h<WORLD.height);
  // 使用轻量矩阵记录器验证世界投影后抵消方向，实体的向上轴仍是屏幕向上。
  let matrix=[1,0,0,1,0,0];const c={
   // 组合Canvas同序矩阵，避免测试依赖浏览器DOMMatrix。
   transform(a,b,c,d,e,f){const [A,B,C,D,E,F]=matrix;matrix=[A*a+C*b,B*a+D*b,A*c+C*d,B*c+D*d,A*e+C*f+E,B*e+D*f+F];},
   // 平移不影响主体的直立方向。
   translate(x,y){this.transform(1,0,0,1,x,y);},
   // 世界倍率与主体尺寸使用同一个缩放。
   scale(x,y){this.transform(x,0,0,y,0,0);}
  };
  balconyWorldTransform(c,view);balconyUpright(c,view,front);assert.deepEqual(matrix.slice(0,4),[view.zoom,0,0,view.zoom]);
 }
});

// 矩形地块在90度和180度朝向下仍必须覆盖相邻边界，不能因零对角项漏画。
test('四向地块像素对齐保留有限正尺寸和连续接缝',async()=>{
 const {alignedTileRect}=await import('../src/rendering/tile-blit.js');
 for(const [a,b,c,d] of [[.58,0,0,.58],[0,-.58,.58,0],[-.58,0,0,-.58],[0,.58,-.58,0]]){
  const matrix={a,b,c,d,e:190.25,f:600.4},first=alignedTileRect(matrix,0,0,384,384),right=alignedTileRect(matrix,384,0,384,384),below=alignedTileRect(matrix,0,384,384,384);
  assert.ok(Object.values(first).every(Number.isFinite));assert.ok(first.w>0&&first.h>0);
  assert.ok(Math.abs(first.x+first.w-right.x)<1e-8);assert.ok(Math.abs(first.y+first.h-below.y)<1e-8);
 }
});

// 自动施工逐层向上，拆除逐层向下，边界不会再扣钱或越过已建楼层。
test('电梯默认从一楼逐层向上，最高层拆除后自动回退施工目标',()=>{const g=setup(),coins=g.progress.coins;assert.deepEqual(homeElevatorPlan(g.progress.homeDecor),{lifts:[],installFloor:0,removeFloor:null});assert.equal(buildHome(g,'remove-elevator').ok,false);for(let floor=0;floor<2;floor++){assert.ok(buildHome(g,'elevator').ok);assert.equal(homeElevatorPlan(g.progress.homeDecor).removeFloor,floor);}assert.equal(buildHome(g,'elevator').ok,false);assert.equal(g.progress.coins,coins-12000);assert.ok(buildHome(g,'floor').ok);assert.ok(buildHome(g,'elevator').ok);for(let floor=2;floor>=0;floor--){assert.equal(homeElevatorPlan(g.progress.homeDecor).removeFloor,floor);assert.ok(buildHome(g,'remove-elevator').ok);assert.equal(homeElevatorPlan(g.progress.homeDecor).installFloor,floor);}assert.equal(buildHome(g,'remove-elevator').ok,false);assert.ok(buildHome(g,'elevator').ok);assert.deepEqual(g.progress.homeDecor.elevators,[0]);});
// 保存失败不能推进自动施工或拆除的目标，也不能扣掉金币木材。
test('电梯自动层号保存失败原样保留，重试仍操作同一层',()=>{const g=setup();assert.ok(buildHome(g,'elevator').ok);for(const kind of ['elevator','remove-elevator']){const before=structuredClone(g.progress),plan=homeElevatorPlan(g.progress.homeDecor);g.livingPersist=()=>false;assert.equal(buildHome(g,kind).ok,false);assert.deepEqual(g.progress,before);assert.deepEqual(homeElevatorPlan(g.progress.homeDecor),plan);g.livingPersist=()=>true;assert.ok(buildHome(g,kind).ok);}assert.deepEqual(g.progress.homeDecor.elevators,[0]);});
// 旧版稀疏电梯从最高层接续，不按总楼层数生成数组或改写低层楼梯。
test('旧档稀疏电梯和百万层仅按已装记录计算施工顺序',()=>{assert.deepEqual(homeElevatorPlan({floors:1000000,elevators:[900000,0,5]}),{lifts:[0,5,900000],installFloor:900001,removeFloor:900000});assert.deepEqual(homeElevatorPlan({floors:4,elevator:true}),{lifts:[0],installFloor:1,removeFloor:0});assert.equal(homeElevatorPlan({floors:4,elevators:[3]}).installFloor,null);});
