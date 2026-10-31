import {nearbyInteraction} from '../src/core/nearby-interaction.js';
// 展品候停和桥岸衔接专项：正式陈列、计时闩锁、完整移动碰撞及循环地图。
import test from 'node:test';
import assert from 'node:assert/strict';
import {WORKSHOP_INTERIORS,interiorWorkshopTargets,WORKSHOP_DISPLAY_ENTRY as C,VEHICLE_BAY} from '../src/config/workshop-interiors.js';
import {updateWorkshopDisplayEntry,latchWorkshopDisplayEntry} from '../src/core/workshop-display-entry.js';
import {playerActionCountdown} from '../src/rendering/player-action-countdown.js';
import {BRIDGE,isWaterBlocked,riverXAt} from '../src/world/river-geometry.js';
import {WORLD} from '../src/world/coordinates.js';
import {moveBody,blocked} from '../src/physics/motion.js';
import {RIVER_BRIDGE_BARRIERS} from '../src/config/river-crossing.js';
// 使用真实展品数据，把角色放到底座前沿外，符合室内实体碰撞约束。
function setup(kind='weapons'){
 const game={state:'playing',cottage:{kind,exitElapsed:0},progress:{campParking:{owned:[{spot:'garage',hull:4}]}},player:{vx:0,vy:0}};
 const target=interiorWorkshopTargets(game)[0];Object.assign(game.player,{x:target.x,y:target.y+target.height/2+20});return {game,target};
}
// 按固定帧长收集唯一打开意图，不使用墙钟补跑暂停时间。
function step(game,seconds,input={x:0,y:0},context={}){const events=[];for(let i=0;i<Math.round(seconds/.05);i++){const event=updateWorkshopDisplayEntry(game,.05,input,context);if(event)events.push(event);}return events;}
test('所有展品停留不打开，附近提示选中对应装备，空维修位无入口',()=>{
 for(const kind of ['weapons','vehicle'])for(const item of interiorWorkshopTargets(setup(kind).game)){
  const {game}=setup(kind);Object.assign(game.player,{x:item.x,y:item.y+item.height/2+20});
  assert.equal(step(game,10).length,0);assert.equal(playerActionCountdown(game),null);
  const entry=nearbyInteraction(game);assert.equal(entry.type,'display');assert.equal(entry.index,item.index);
  latchWorkshopDisplayEntry(game,item);assert.equal(nearbyInteraction(game).index,item.index);
 }
 const {game}=setup('vehicle');game.progress.campParking.owned=[];Object.assign(game.player,{x:VEHICLE_BAY.x,y:VEHICLE_BAY.y+85});assert.equal(nearbyInteraction(game),null);
});
test('暂停隐藏提示，目标变化按当前维修车辆选择，不继承旧目标',()=>{
 const {game}=setup('vehicle');Object.assign(game.player,{x:VEHICLE_BAY.x,y:VEHICLE_BAY.y+85});
 game.state='paused';assert.equal(nearbyInteraction(game),null);game.state='playing';
 game.progress.campParking.owned[0].hull=0;assert.equal(nearbyInteraction(game).index,0);
 for(const kind of ['weapons','vehicle']){const {game}=setup(kind);Object.assign(game.player,WORKSHOP_INTERIORS[kind].spawn);assert.equal(step(game,10).length,0);assert.equal(nearbyInteraction(game),null);}
});
test('桥面上下木板内沿与岸边双向连通，含斜走和循环镜像',()=>{
 for(const [ox,oy] of [[0,0],[WORLD.width,-WORLD.height],[-WORLD.width,WORLD.height]])for(const y of [BRIDGE.y+4,BRIDGE.y+8,BRIDGE.y+39,BRIDGE.y+BRIDGE.height-8,BRIDGE.y+BRIDGE.height-4])for(const sign of [-1,1]){
  const b={x:(sign===1?BRIDGE.x-32:BRIDGE.x+BRIDGE.width+32)+ox,y:y+oy,mapId:'forest'};
  for(let i=0;i<80;i++)moveBody(b,sign*4,0,null,12,[]);
  assert.ok(sign===1?b.x>BRIDGE.x+BRIDGE.width+ox:b.x<BRIDGE.x+ox,'桥板边缘仍卡住 '+y);
 }
 for(const sign of [-1,1]){const b={x:sign===1?BRIDGE.x-25:BRIDGE.x+BRIDGE.width+25,y:BRIDGE.y+8,mapId:'forest'};for(let i=0;i<70;i++)moveBody(b,sign*4,.7,null,12,[]);assert.ok(sign===1?b.x>BRIDGE.x+BRIDGE.width:b.x<BRIDGE.x);}
});
test('桥外水面与瀑布仍阻挡，不能从桥侧掉入河中，剧情封桥不可绕过',()=>{
 for(const y of [BRIDGE.y-1,BRIDGE.y+BRIDGE.height+1,610,810,1000,1540])assert.equal(isWaterBlocked(riverXAt(y),y,12),true);
 assert.equal(isWaterBlocked(1220,500,12),true);
 for(const sign of [-1,1]){const b={x:riverXAt(BRIDGE.y+39),y:BRIDGE.y+39,mapId:'forest'};moveBody(b,0,sign*200,null,12,[]);assert.ok(b.y>=BRIDGE.y+4&&b.y<=BRIDGE.y+BRIDGE.height-4);}
 for(const amphibious of [false,true]){const b={x:BRIDGE.x-35,y:BRIDGE.y+8,mapId:'forest',amphibious,worldBarriers:RIVER_BRIDGE_BARRIERS};moveBody(b,350,0,null,12,[]);assert.ok(b.x<BRIDGE.x-18);}
 assert.equal(blocked(riverXAt(1000),1000,12,[],{amphibious:true}),false);
});
