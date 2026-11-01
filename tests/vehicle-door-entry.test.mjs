// 驾驶门前候停复用真实游戏、下车停车事务与室内控制器。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {ownedPineProgress} from './helpers/owned-pine-progress.mjs';
import {validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {WORKSHOP_INTERIORS,interiorLayout} from '../src/config/workshop-interiors.js';
import {updateCottage,enterCottage,enterWorkshop,leaveCottage} from '../src/core/cottage.js';
import {vehicleParkingSite} from '../src/core/camp-parking.js';
import {capturePatrol} from '../src/core/patrol-session.js';
import {canonical,WORLD,worldDistance} from '../src/world/coordinates.js';
import {playerActionCountdown} from '../src/rendering/player-action-countdown.js';

// 开放营地建筑，驾驶车辆停在真实门外，保留车辆与角色原有状态。
function scene(kind='cottage',hull=0,shift=0){
 const p=ownedPineProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(s=>s.id);p.vehicleHulls[hull]=1;p.vehicleHulls[6]=1;p.vehicleIndex=hull;
 const g=new Game(p,()=>.5),layout=interiorLayout({kind}),events=[];
 g.onEvent=(type,data)=>events.push({type,data});g.state='playing';g.mainlineSpeech=null;g.spawnTimer=g.fireClock=g.mainlineTalkDelay=999;g.enemies=[];g.parkingVisitors=[];g.progress.campParking.owned=[];
 Object.assign(g.player,{x:layout.door.x+shift,y:layout.door.y+12,vx:0,vy:0});assert.ok(g.summonVehicle());g.vehicle.hp*=.65;
 return {g,layout,events};
}
// 候停由正式控制器逐帧推进，便于精确验证不足一秒及暂停边界。
function wait(g,seconds,input={x:0,y:0}){for(let i=0;i<Math.round(seconds/.05);i++)updateCottage(g,.05,input);}

test('可进入房屋与九种载具在门口候停一秒后入屋，车辆唯一停在门口',()=>{
 for(const kind of ['cottage',...Object.keys(WORKSHOP_INTERIORS).filter(kind=>kind!=='warehouse')])for(let hull=0;hull<9;hull++){
  const {g,layout,events}=scene(kind,hull),position=canonical(g.player),hp=g.vehicle.hp,ammo=g.vehicle.module?.magazine.ammo||0;
  g.vehicle.wheelPhase=2.5;if(g.vehicle.module)g.vehicle.module.magazine.remaining=.4;
  wait(g,.95);assert.equal(g.cottage,null,kind+'/'+hull);assert.equal(g.vehicle.active,true);assert.equal(playerActionCountdown(g).icon,'home');assert.equal(g.progress.campParking.owned.length,0);
  wait(g,.05);assert.equal(g.cottage?.kind,kind);assert.equal(g.vehicle.active,false);assert.equal(g.player.flying,false);assert.equal(g.player.amphibious,false);assert.equal(g.player.treePass,false);assert.deepEqual({x:g.player.x,y:g.player.y},layout.spawn);
  const [record]=g.progress.campParking.owned;assert.equal(g.progress.campParking.owned.length,1);assert.equal(record.spot,null);assert.equal(record.hull,hull);assert.ok(worldDistance(record,position)<=96);assert.equal(record.mapId,'forest');assert.equal(g.vehicle.hp,hp);assert.equal(record.ammo,ammo);assert.equal(record.wheel,2.5);assert.equal(record.reload,g.vehicle.module?.magazine.remaining||0);
  wait(g,2);assert.equal(events.filter(e=>e.type==='vehicle-dismount').length,1);assert.equal(events.filter(e=>e.type==='cottage-change').length,1);
 }
});

test('驾驶移动或离开门口清零，暂停冻结，回到门口重新等待',()=>{
 const {g,layout}=scene('ammo');wait(g,.5);const elapsed=g.cottageEntry;g.state='paused';wait(g,2);assert.equal(g.cottageEntry,elapsed);assert.equal(g.vehicle.active,true);g.state='playing';wait(g,.05,{x:1,y:0});assert.equal(g.cottageEntry,null);
 wait(g,.5);g.player.x+=150;wait(g,.05);assert.equal(g.cottageEntry,null);Object.assign(g.player,layout.door);wait(g,.95);assert.equal(g.cottage,null);wait(g,.05);assert.equal(g.cottage.kind,'ammo');
});

test('未开放、事件战斗、自动倒车及显式入口调用不能抢先让驾驶员入屋',()=>{
 for(const mutate of [g=>g.progress.restoration.repaired=[],g=>g.mainlineSpeech={},g=>g.progress.restoration.build={},g=>g.progress.arrival.phase='driving',g=>g.fireRescue={phase:'active'},...['realm','story','campDefense','boss','livingBattle','workshopTrial'].map(key=>g=>g[key]={}),g=>g.parking={phase:'align'},g=>g.parking={phase:'reverse'}]){
  const {g}=scene();mutate(g);wait(g,2);assert.equal(g.cottage,null);assert.equal(g.vehicle.active,true);assert.equal(g.progress.campParking.owned.length,0);
 }
 const {g}=scene();assert.equal(enterCottage(g),false);const {g:h}=scene('repair');assert.equal(enterWorkshop(h,'repair'),false);
});

test('正式游戏帧完成入屋，保存与读档保留门口车辆位置和步行状态',()=>{
 for(const shift of [0,WORLD.width]){
  const {g,layout}=scene('furniture',0,shift),position=canonical(g.player);for(let i=0;i<20;i++)g.update(.05);assert.equal(g.cottage?.kind,'furniture');
  const parked={...vehicleParkingSite(g,0)};assert.ok(worldDistance(parked,position)<=96);capturePatrol(g);const p=validateProgress(structuredClone(g.progress)),restored=new Game(p);assert.equal(restored.vehicle.active,false);assert.ok(worldDistance(vehicleParkingSite(restored,0),parked)<.001);
  assert.ok(leaveCottage(g));assert.ok(worldDistance(g.player,layout.outside)<.001);assert.equal(g.vehicle.active,false);assert.equal(g.progress.campParking.owned.filter(r=>r.hull===0).length,1);
 }
});

test('特殊通行车没有安全落地点时不丢车、不进入室内',()=>{
 const {g}=scene('cottage',2);g.trees=[{x:g.player.x,y:g.player.y,radius:100000,hp:1}];wait(g,1);assert.equal(g.cottage,null);assert.equal(g.vehicle.active,true);assert.equal(g.progress.campParking.owned.length,0);
});

// 仓库作为室外服务入口，所有车型停在门前都保持骑乘且没有进屋倒计时。
test('九种载具在仓库门前停留不会进屋或下车',()=>{for(let hull=0;hull<9;hull++){const {g}=scene('warehouse',hull),position={x:g.player.x,y:g.player.y};wait(g,1.5);assert.equal(g.cottage,null);assert.equal(g.cottageEntry,null);assert.equal(g.vehicle.active,true);assert.deepEqual({x:g.player.x,y:g.player.y},position);assert.equal(g.progress.campParking.owned.length,0);}});
