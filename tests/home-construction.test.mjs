// 建筑公司以真实Game验证施工、持久化、无限层号、交通和阳台几何，避免只验证按钮文案。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {COTTAGE,COTTAGE_STAIRS} from '../src/config/cottage.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {HOME_BUILD_PRICES,HOME_DIRECTIONS,HOME_ELEVATOR,HOME_BALCONY} from '../src/config/home-construction.js';
import {buildHome,travelHomeFloor,enterHomeBalcony,leaveHomeBalcony} from '../src/core/home-construction.js';
import {enterWorkshop,updateCottage,cottageBlocked,leaveCottage,sleepInCottage} from '../src/core/cottage.js';
import {buyDecor,moveDecor} from '../src/core/home-decor.js';
import {accessibleWeaponRack} from '../src/core/weapon-storage.js';
import {homeBalconyView,balconySceneGame} from '../src/rendering/home-balcony.js';
import {playerActionCountdown} from '../src/rendering/player-action-countdown.js';
import {normalizeHome} from '../src/progression/home-decor.js';
import {worldDistance} from '../src/world/coordinates.js';
import {RANGER_COTTAGE} from '../src/world/workshop.js';
import {PARKING_SPOTS} from '../src/config/parking.js';
import {planQuestRoute} from '../src/physics/quest-route.js';
import {blocked} from '../src/physics/motion.js';

// 门口实际进入公司，保留真实树、碰撞、扣款和快照流程。
function setup(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.coins=100000;p.wood=10000;const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;Object.assign(g.player,WORKSHOP_INTERIORS.construction.door);assert.ok(enterWorkshop(g,'construction'));g.livingPersist=()=>true;return g;}
// 等待使用正式固定步长，阳台触发和解除闩锁均经过控制器。
function tick(g,n,input={x:0,y:0}){for(let i=0;i<n;i++)updateCottage(g,.05,input);}

test('施工仅限公司，扣料一次，设施重复购买不扣款，重载保留',()=>{
 const g=setup(),before={coins:g.progress.coins,wood:g.progress.wood};
 for(const kind of ['floor','elevator','balcony'])assert.ok(buildHome(g,kind,{floor:2,side:'east'}).ok);
 assert.equal(g.progress.homeDecor.floors,3);assert.equal(g.progress.coins,before.coins-10500);assert.equal(g.progress.wood,before.wood-1400);
 const home=structuredClone(g.progress.homeDecor),coins=g.progress.coins;
 assert.equal(buildHome(g,'elevator').ok,false);assert.equal(buildHome(g,'balcony',{floor:2,side:'east'}).ok,false);assert.equal(g.progress.coins,coins);
 assert.deepEqual(validateProgress(g.progress).homeDecor,home);
 g.cottage.kind='cottage';assert.equal(buildHome(g,'floor').ok,false);
});
test('低余额、非法楼层、朝向与保存异常都原子回滚',()=>{
 const g=setup();for(const persist of [()=>false,()=>{throw Error('磁盘故障');}]){g.livingPersist=persist;const before=structuredClone(g.progress);for(const kind of ['floor','elevator','balcony'])assert.equal(buildHome(g,kind).ok,false);assert.deepEqual(g.progress,before);}
 g.livingPersist=()=>true;for(const floor of [-1,2,1.5,NaN,Infinity])assert.equal(buildHome(g,'balcony',{floor}).ok,false);
 assert.equal(buildHome(g,'toString').ok,false);assert.equal(buildHome(g,'balcony',{floor:0,side:'toString'}).ok,false);g.progress.wood=HOME_BUILD_PRICES.floor.wood-1;const coins=g.progress.coins;assert.equal(buildHome(g,'floor').ok,false);assert.equal(g.progress.coins,coins);
});
test('百万楼层继续加盖，存档只记录实际家具，新增层自动接通电梯',()=>{
 const g=setup();g.progress.homeDecor.floors=1000000;assert.ok(buildHome(g,'floor').ok);assert.ok(buildHome(g,'elevator').ok);
 g.cottage.kind='furniture';const item=buyDecor(g,'weapon-rack');assert.ok(item.ok);g.cottage.kind='cottage';Object.assign(g.player,HOME_ELEVATOR.landing);
 assert.ok(travelHomeFloor(g,1000000,'elevator'));assert.ok(moveDecor(g,item.uid,180,288).ok);
 const reloaded=validateProgress(g.progress).homeDecor;assert.equal(reloaded.floors,1000001);assert.equal(reloaded.items.find(i=>i.uid===item.uid).floor,1000000);assert.equal(reloaded.items.length,5);assert.ok(JSON.stringify(reloaded).length<1500);
});
test('楼梯只能相邻切层，电梯须安装且靠近，不可越层或在阳台远程乘梯',()=>{
 const g=setup();buildHome(g,'floor');g.cottage.kind='cottage';Object.assign(g.player,COTTAGE.spawn);assert.equal(travelHomeFloor(g,1),false);
 Object.assign(g.player,COTTAGE_STAIRS.landing);assert.equal(travelHomeFloor(g,2),false);assert.ok(travelHomeFloor(g,1));assert.ok(travelHomeFloor(g,2));assert.equal(leaveCottage(g),false);assert.ok(travelHomeFloor(g,1));
 Object.assign(g.player,HOME_ELEVATOR.landing);assert.equal(travelHomeFloor(g,0,'elevator'),false);g.progress.homeDecor.elevator=true;assert.ok(travelHomeFloor(g,0,'elevator'));assert.equal(travelHomeFloor(g,3,'elevator'),false);g.cottage.balcony='north';assert.equal(travelHomeFloor(g,1,'elevator'),false);
});
test('三层楼梯候停默认逐层向上，顶层下楼且不会连续跳层',()=>{
 const g=setup();buildHome(g,'floor');g.cottage.kind='cottage';Object.assign(g.player,COTTAGE_STAIRS.landing);tick(g,21);assert.equal(g.cottage.floor,1);tick(g,60);assert.equal(g.cottage.floor,1);
 for(const target of [2,1]){Object.assign(g.player,{x:320,y:490});tick(g,1);Object.assign(g.player,COTTAGE_STAIRS.landing);tick(g,1);assert.equal(playerActionCountdown(g).icon,target===2?'stairs-up':'stairs-down');tick(g,20);assert.equal(g.cottage.floor,target);}
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
