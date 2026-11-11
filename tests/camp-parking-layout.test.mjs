// 北门停车场布局事务回归，验证真实车位、导航和保存恢复。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {CAMP_PLOTS} from '../src/config/camp-land.js';
import {CAMP_BUILDINGS} from '../src/config/camp-layout.js';
import {NORTH_PARKING,PARKING_SPOTS} from '../src/config/parking.js';
import {MAINLINE_SITES} from '../src/config/mainline.js';
import {saveCampLayout,checkCampPlacement} from '../src/core/camp/camp-layout.js';
import {activateCampLayout} from '../src/world/camp-layout-bindings.js';
import {parkingRecordSite} from '../src/progression/vehicles/roadside-parking.js';
// 使用已购土地及清理后的空地，避免引导与野树影响布局事务。
function setup(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.campLand.owned=CAMP_PLOTS.map(p=>p.id);const g=new Game(p);g.state='playing';g.mainlineSpeech=null;g.parking=null;g.vehicle.active=false;g.trees=[];g.progress.campParking.owned=[];return g;}
test('停车场整体迁移、保存失败回滚、读档与切档不累积位移',()=>{const g=setup(),base=CAMP_BUILDINGS.find(b=>b.id==='north'),old={...NORTH_PARKING},entrance={...NORTH_PARKING.entrance},spots=PARKING_SPOTS.filter(s=>s.building==='north').map(s=>({...s})),draft={positions:{north:{x:-880,y:1280}}};const record={hull:0,spot:spots[0].id,hp:1,ammo:0,reload:0};g.progress.vehicleHulls[0]=1;g.progress.campParking.owned=[record];assert.equal(checkCampPlacement(g,draft,'north'),'');assert.equal(saveCampLayout(g,draft,()=>false).ok,false);assert.equal(NORTH_PARKING.x,old.x);assert.equal(saveCampLayout(g,draft,()=>true).ok,true);const dx=-880-base.x,dy=1280-base.y;assert.equal(NORTH_PARKING.x,old.x+dx);assert.deepEqual(NORTH_PARKING.entrance,{x:entrance.x+dx,y:entrance.y+dy});assert.equal(MAINLINE_SITES.northParking.x,entrance.x+dx);for(const s of spots){const at=PARKING_SPOTS.find(p=>p.id===s.id);assert.equal(at.x,s.x+dx);assert.equal(at.approachY,s.approachY+dy);}assert.equal(parkingRecordSite(record).x,spots[0].x+dx);const reloaded=validateProgress(structuredClone(g.progress));activateCampLayout(freshProgress());activateCampLayout(reloaded);assert.equal(NORTH_PARKING.x,old.x+dx);activateCampLayout(freshProgress());assert.equal(NORTH_PARKING.x,old.x);});
test('停车场拒绝未购土地、建筑重叠、树木和地面车辆',()=>{const g=setup(),draft={positions:{north:{x:-880,y:1280}}};g.progress.campLand.owned=['core'];assert.match(checkCampPlacement(g,draft,'north'),/已购土地/);g.progress.campLand.owned=CAMP_PLOTS.map(p=>p.id);assert.match(checkCampPlacement(g,{positions:{north:{x:250,y:400}}},'north'),/重叠/);g.trees=[{x:-880,y:1100,hp:1}];assert.match(checkCampPlacement(g,draft,'north'),/树木/);g.trees=[{x:-600,y:1070,hp:1}];assert.match(checkCampPlacement(g,draft,'north'),/树木/);g.trees=[];g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:-880,y:1100}];assert.match(checkCampPlacement(g,draft,'north'),/载具/);activateCampLayout(freshProgress());});

// 验证完整车队的实际泊位数量、存档归属、冲突拒绝和原有车辆状态。
test('北场十二位与扩建车位可设置，整队读档不重叠',async()=>{
 const {assignParkingSpot}=await import('../src/core/vehicles/camp-parking.js');
 const {parkingSpotsFor}=await import('../src/config/parking.js');
 const g=setup(),p=g.progress;
 p.vehicleHulls.fill(1);
 assert.equal(parkingSpotsFor(p).filter(s=>s.number).length,12);
 const {campExpansionSite}=await import('../src/world/camp-expansion-site.js');
 const {campPlots}=await import('../src/config/camp-land.js');
 p.campLand.baseTops=Object.fromEntries(campPlots(p).map(r=>[r.id,r.top]));
 for(let i=0;i<4;i++){
  const {site,reason}=campExpansionSite(p,'north');assert.ok(site,reason);
  p.campLand.additions.push(site);p.campLand.expansions++;
 }
 activateCampLayout(p);
 const all=parkingSpotsFor(p).filter(s=>s.number);
 assert.equal(all.length,24);
 p.campParking.owned=[{hull:0,spot:all[0].id,hp:.4,ammo:3,reload:0,wheel:0,track:0}];
 const before=structuredClone(p.campParking);
 assert.equal(assignParkingSpot(g,0,all[23].id,()=>false),false);
 assert.deepEqual(p.campParking,before);
 assert.equal(assignParkingSpot(g,0,all[23].id,()=>true),true);
 assert.equal(assignParkingSpot(g,1,all[23].id,()=>true),false);
 p.campParking.owned.push({hull:1,spot:all[1].id,hp:.7});
 assert.ok(assignParkingSpot(g,1,all[23].id,()=>true));
 assert.equal(p.campParking.owned.find(r=>r.hull===0).spot,all[1].id);
 const restored=validateProgress(structuredClone(p));
 assert.equal(restored.campParking.preferred[0],all[1].id);
 assert.equal(restored.campParking.owned.find(r=>r.hull===0).hp,.4);
 const parked=restored.campParking.owned;
 for(const [h,owned] of restored.vehicleHulls.entries())if(owned&&h!==restored.vehicleIndex&&!(h===4&&restored.fireDispatch.garage?.parked))assert.ok(parked.some(r=>r.hull===h));
 assert.equal(new Set(parked.map(r=>r.spot)).size,parked.length);
 activateCampLayout(freshProgress());
 assert.equal(PARKING_SPOTS.filter(s=>s.number).length,12);
});
