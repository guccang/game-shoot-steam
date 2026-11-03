// 点击行走专项：正式入口、家具碰撞、暂停、手动接管和切层防重复。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {CLICK_BUILDINGS,approachBuilding,buildingContains,approachCottageTarget,updateSceneApproach} from '../src/core/scene-approach.js';
import {enterCottage,updateCottage,cottageBlocked} from '../src/core/cottage.js';
import {COTTAGE,COTTAGE_STAIRS} from '../src/config/cottage.js';
import {driveBody} from '../src/physics/motion.js';
import {WORLD} from '../src/world/coordinates.js';

// 使用正式进度和房间，隔离战斗生成以验证本次移动职责。
function scene(inside=false){const progress=freshProgress();progress.arrival={version:3,phase:'complete',keys:true,parked:false};progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);progress.vehicleHulls[6]=1;progress.homeDecor.floors=2;const game=new Game(progress,()=>.5);game.state='playing';game.vehicle.active=false;game.mainlineSpeech=null;game.trees=[];game.player.livingCollision=true;Object.assign(game.player,COTTAGE.door);if(inside)assert.ok(enterCottage(game));return game;}
// 方向必须通过正式室内或室外运动器，不直接修改坐标完成目标。
function step(game,input={x:0,y:0}){const vector=updateSceneApproach(game,.04,input);if(updateCottage(game,.04,vector))return;if(game.state==='playing')driveBody(game.player,vector,115,.04,WORLD,game.trees);}
// 有界等待直到业务条件满足，失败打印真实位置便于定位卡路。
function until(game,predicate,max=1200){for(let i=0;i<max&&!predicate();i++)step(game);assert.ok(predicate(),JSON.stringify({position:[game.player.x,game.player.y],walk:game.sceneApproach?.id,room:game.cottage?.kind}));}

test('全部营业建筑本体和门前可点，真实步行抵达后进屋或打开仓库',()=>{
 for(const building of CLICK_BUILDINGS){const game=scene();let warehouse=false;game.onEvent=type=>{if(type==='scene-warehouse')warehouse=true;};Object.assign(game.player,{x:building.door.x,y:building.door.y+100,vx:0,vy:0});
  assert.ok(buildingContains(building,{x:building.site.x,y:building.site.y-building.site.height/2}));assert.ok(buildingContains(building,{x:building.door.x+30,y:building.door.y+35}));
  assert.ok(approachBuilding(game,building.id),building.id);assert.equal(game.cottage,null);until(game,()=>building.id==='warehouse'?warehouse:game.cottage?.kind===building.id);
 }
});
test('点击楼梯走到落脚点再上楼，停留不往返，明确再点可以下楼',()=>{const game=scene(true),start=game.player.x;assert.ok(approachCottageTarget(game,'stairs'));step(game);assert.equal(game.cottage.floor,0);until(game,()=>game.player.x>start);until(game,()=>game.cottage.floor===1);for(let i=0;i<80;i++)step(game);assert.equal(game.cottage.floor,1);assert.ok(approachCottageTarget(game,'stairs'));until(game,()=>game.cottage.floor===0);});
test('床点击绕过家具后候停睡觉，保存回血且醒来不重复',()=>{const game=scene(true);game.player.hp=20;game.livingPersist=()=>true;Object.assign(game.player,{x:355,y:180});game.progress.homeDecor.items.push({uid:98,type:'weapon-rack',x:230,y:160,floor:0,weapons:[]});const day=game.progress.living.calendar.day;assert.ok(approachCottageTarget(game,'bed'));for(let i=0;i<1200&&!game.cottage.sleep;i++){step(game);assert.equal(cottageBlocked(game.player.x,game.player.y,game),false);}assert.ok(game.cottage.sleep);until(game,()=>!game.cottage.sleep);assert.equal(game.player.hp,game.maxHp());assert.equal(game.progress.living.calendar.day,day+1);for(let i=0;i<80;i++)step(game);assert.equal(game.progress.living.calendar.day,day+1);});
test('暂停冻结点击行走，手动方向接管取消，换层或重置清理旧意图',()=>{const game=scene(true);approachCottageTarget(game,'bed');game.state='paused';const before={x:game.player.x,y:game.player.y};for(let i=0;i<50;i++)step(game);assert.equal(game.sceneApproach.elapsed,0);assert.deepEqual({x:game.player.x,y:game.player.y},before);game.state='playing';step(game,{x:-1,y:0});assert.equal(game.sceneApproach,null);approachCottageTarget(game,'stairs');game.cottage.floor=1;step(game);assert.equal(game.sceneApproach,null);approachCottageTarget(game,'stairs');game.player={...game.player};step(game);assert.equal(game.sceneApproach,null);});
test('未修复、楼上无床、睡眠和活动期间拒绝错误点击',()=>{const game=scene();game.progress.restoration.repaired=[];assert.equal(approachBuilding(game,'cottage'),false);game.progress.restoration.repaired=['cottage'];enterCottage(game);game.cottage.floor=1;assert.equal(approachCottageTarget(game,'bed'),false);game.cottage.sleep={elapsed:0};assert.equal(approachCottageTarget(game,'stairs'),false);game.cottage=null;game.story={};assert.equal(approachBuilding(game,'weapons'),false);});
test('家具堵住目标时不穿透也不传送到楼梯',()=>{const game=scene(true);game.progress.homeDecor.items.push({uid:99,type:'weapon-rack',x:COTTAGE_STAIRS.landing.x,y:COTTAGE_STAIRS.landing.y,floor:0,weapons:[]});const start=game.player.x;assert.ok(approachCottageTarget(game,'stairs'));for(let i=0;i<100;i++)step(game);assert.equal(game.cottage.floor,0);assert.equal(game.player.x,start);assert.equal(game.sceneApproach,null);});
