// 红狼钥匙入口回归：室内可标记真实门口，实际入室后才可接受传承。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {legendaryVisible,legendaryNavigationReason,travelLegendary,commitLegendary} from '../src/core/legendary-workshop.js';
import {worldNavigationDiagnostics,worldNavigationObjective} from '../src/core/world-navigation.js';
import {updateCottage,leaveCottage} from '../src/core/cottage.js';
import {blocked} from '../src/physics/motion.js';
import {commitWorkshop} from '../src/core/workshop.js';
import {workshopUpgrade} from '../src/progression/workshop.js';

// 使用正式新档与完成入职的自由探索状态，不依赖用户存档。
function scene(){const p=freshProgress();p.arrival=null;p.mainline.completed=MAINLINE_IDS.slice();p.mainline.phase='complete';p.vehicleHulls[6]=1;const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;return g;}

test('载具工坊室内允许标记传奇路线，但不移动角色、不远程解锁',()=>{
 const g=scene(),room=WORKSHOP_INTERIORS.vehicle;g.cottage={kind:'vehicle',outside:room.outside};Object.assign(g.player,room.spawn);g.state='paused';
 const before=structuredClone(g.player),progress=structuredClone(g.progress);assert.equal(legendaryNavigationReason(g),'');assert.equal(legendaryVisible(g),false);
 assert.deepEqual(travelLegendary(g),{ok:true,exitFirst:true});assert.deepEqual(g.player,before);assert.deepEqual(g.progress,progress);assert.equal(g.state,'paused');assert.equal(commitLegendary(g,{type:'unlock'},()=>true).ok,false);
 g.state='playing';assert.ok(leaveCottage(g));const goal=worldNavigationObjective(g);assert.equal(goal.site.id,'legendary-workshop-door');assert.equal(goal.site.x,WORKSHOP_INTERIORS.legendary.door.x);assert.equal(goal.site.y,WORKSHOP_INTERIORS.legendary.door.y);
});
test('持有红狼步行也能找到工坊，真实门口可通行且候停能入室解锁',()=>{
 const g=scene(),room=WORKSHOP_INTERIORS.legendary;assert.ok(legendaryVisible(g));assert.ok(travelLegendary(g).ok);
 assert.equal(blocked(room.door.x,room.door.y,14,g.trees,{...g.player,mapId:'forest',legendaryBuilding:true,livingCollision:true}),false);
 Object.assign(g.player,room.door,{vx:0,vy:0});for(let i=0;i<22&&!g.cottage;i++)updateCottage(g,.05,{x:0,y:0});assert.equal(g.cottage?.kind,'legendary');
 assert.equal(commitLegendary(g,{type:'unlock'},()=>false).ok,false);assert.equal(g.progress.legendaryWorkshop.unlocked,false);assert.ok(commitLegendary(g,{type:'unlock'},()=>true).ok);assert.equal(g.progress.legendaryWorkshop.unlocked,true);
});
test('室外标记恢复手动关闭的寻路，保留主线进度和车辆，不消费钥匙',()=>{
 const g=scene();g.progress.mainline.navigationEnabled=false;const completed=[...g.progress.mainline.completed],before=structuredClone(g.vehicle),player=structuredClone(g.player);assert.ok(travelLegendary(g).ok);assert.ok(worldNavigationDiagnostics(g).enabled);assert.deepEqual(g.progress.mainline.completed,completed);assert.deepEqual(g.vehicle,before);assert.deepEqual(g.player,player);assert.equal(g.progress.vehicleHulls[6],1);
});
test('未取得红狼、其他活动或其他地图拒绝标记，不生成错误路线',()=>{
 for(const change of [g=>g.progress.vehicleHulls[6]=0,g=>g.story={},g=>g.realm={},g=>g.cottage={kind:'weapons'},g=>g.state='dead',g=>g.mapId='jiuzhaigou']){
  const g=scene();change(g);assert.ok(legendaryNavigationReason(g));assert.equal(travelLegendary(g).ok,false);assert.equal(worldNavigationDiagnostics(g).intent,null);
 }
});
test('传奇锻造仅在持有红狼并解锁的传奇室内开放，不放行车体整备',()=>{
 const g=scene();g.cottage={kind:'legendary',outside:WORKSHOP_INTERIORS.legendary.outside};g.progress.coins=g.progress.wood=100000;g.progress.weapons[0]=20;
 const plan=workshopUpgrade(g.progress,'weapons',0,'damage'),before=structuredClone(g.progress);
 assert.equal(commitWorkshop(g,plan,()=>true).ok,false);assert.deepEqual(g.progress,before);
 g.progress.legendaryWorkshop.unlocked=true;g.progress.vehicleHulls[6]=0;assert.equal(commitWorkshop(g,plan,()=>true).ok,false);
 g.progress.vehicleHulls[6]=1;assert.equal(commitWorkshop(g,workshopUpgrade(g.progress,'vehicle',0,'armor'),()=>true).ok,false);
 const ready=structuredClone(g.progress);assert.equal(commitWorkshop(g,plan,()=>false).ok,false);assert.deepEqual(g.progress,ready);
 assert.ok(commitWorkshop(g,plan,()=>true).ok);assert.equal(g.progress.weapons[0],21);
});
