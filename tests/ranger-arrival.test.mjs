import {availableWood,storeWood} from '../src/core/wood-storage.js';
import {CAMP_WAREHOUSE} from '../src/config/wood-storage.js';
import {terrainLineClear} from '../src/physics/terrain-navigation.js';
import {commitWorkshop} from '../src/core/workshop.js';
import {RESTORATION_FLIGHT} from '../src/config/town-restoration.js';
// 首次入职专项：真实战斗结算、恢复、保存失败和无武器车型边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {parkedVehicleObjects} from '../src/rendering/parked-vehicles.js';
import {RANGER,RANGER_STAGES} from '../src/config/ranger-arrival.js';
import {advanceArrival,arrivalWorkReady,completeArrivalLetter} from '../src/core/ranger-arrival.js';
import {quoteWorkshop,previewWorkshop} from '../src/progression/workshop.js';
import {createVehicle,configureVehicle} from '../src/combat/vehicle.js';
import {WORKSHOP,VEHICLE_WORKSHOP,workshopAt} from '../src/world/workshop.js';
// 固定步长推进正式更新，避免大时间步跳过动作或保护逻辑。
function tick(game,seconds){for(let i=0;i<Math.ceil(seconds/.05);i++)game.update(.05);}
// 新档真实读完对白并完成交接。
function arrive(){const g=new Game(freshRangerProgress(),()=>.5);g.start();for(let i=0;i<2400&&g.progress.arrival.phase!=='letter';i++)g.update(.05);assert.equal(g.progress.arrival.phase,'letter');assert.equal(completeArrivalLetter(g),true);board(g);g.dismountVehicle();return g;}
// 先完成赠车上车教学；各旧专项可自行选择步行或骑车继续。
function board(g){Object.assign(g.player,{x:RANGER.parking.x+90,y:RANGER.parking.y+18});assert.ok(g.summonVehicle());g.update(.05);}
// 只通过正式电锯攻击采集，不直接增加余额或阶段。
function chop(g){const tree=g.trees.find(t=>t.hp>0);Object.assign(g.player,{x:tree.x-55,y:tree.y});g.player.angle=0;for(let i=0;i<60&&tree.hp>0;i++)g.update(.05);if(g.progress.wood+availableWood(g)>=RANGER.repairWood){Object.assign(g.player,CAMP_WAREHOUSE);g.livingPersist=()=>true;assert.ok(storeWood(g).ok);}}

test('首次档无手枪战车，旧档不强制播放',()=>{const g=new Game(freshRangerProgress());assert.equal(g.weapon().id,'chainsaw');assert.equal(g.progress.weapons[0],0);assert.ok(g.progress.vehicleHulls.every(level=>level===0));const old=new Game(freshProgress());assert.equal(old.arrivalPending,false);assert.equal(old.progress.weapons[0],1);});
test('短剧暂停和刷新续接同一检查点，威胁不推进',()=>{const g=new Game(freshRangerProgress());g.start();tick(g,4);const a=structuredClone(g.progress.arrival),pos={x:g.player.x,y:g.player.y};g.pause();tick(g,10);assert.deepEqual(g.progress.arrival,a);const restored=new Game(JSON.parse(JSON.stringify(g.progress)));assert.equal(restored.player.x,pos.x);assert.equal(restored.player.y,pos.y);restored.start();tick(restored,5);assert.equal(restored.progress.arrival.phase,'letter');assert.equal(restored.wave,1);assert.equal(restored.enemies.length,0);assert.equal(restored.startFireRescue(),false);assert.equal(restored.enterRealm('tower'),false);assert.equal(restored.enterStory('first-patrol'),false);});
test('交接只得电锯钥匙和北广场电动车，老人骑自己的车离开',()=>{const g=arrive();assert.equal(g.progress.arrival.keys,true);assert.equal(g.progress.weapons[14],1);assert.equal(g.progress.weapons[0],0);assert.ok(g.progress.vehicleHulls.every((level,index)=>level===(index===RANGER.scooter?1:0)));assert.equal(g.vehicle.weaponIndex,null);assert.equal(g.enemies.length,0);assert.equal(g.progress.wood,0);});
test('保存失败不发赠品，重试后只提交一次',()=>{const g=new Game(freshRangerProgress());g.start();tick(g,6.6);assert.equal(g.progress.arrival.phase,'handover');g.arrivalPersist=()=>false;tick(g,1);assert.equal(g.progress.arrival.phase,'handover');assert.equal(g.progress.weapons[14],0);assert.equal(g.arrivalError,true);g.arrivalPersist=()=>true;g.advanceArrival();tick(g,.05);assert.equal(g.progress.arrival.phase,'leave');assert.equal(g.progress.weapons[14],1);tick(g,3);assert.equal(g.progress.weapons[14],1);});
test('骑车可用手持武器伐木，电动车无挂载槽',()=>{const g=arrive();g.progress.vehicleWeapons[0]=1;assert.equal(configureVehicle(g,0,5),false);assert.equal(quoteWorkshop(freshProgress(),{kind:'vehicle',index:5,action:'mount',choice:0,original:null}).ok,false);g.progress.vehicleLoadouts[5]=0;assert.equal(createVehicle(g.progress,g.maxHp(),5).module,null);assert.equal(validateProgress(g.progress).vehicleLoadouts[5],null);assert.equal(previewWorkshop(g.progress,'vehicle',5,0).weapon,null);Object.assign(g.player,{x:RANGER.parking.x+90,y:RANGER.parking.y+18});assert.equal(g.summonVehicle(),true);const tree=g.trees[0];Object.assign(g.player,{x:tree.x-55,y:tree.y});tick(g,3);assert.ok(tree.hp<55);assert.ok(g.progress.arrival.wood>0);});
test('伐木、修复、造枪按序扣料，完成前无波次',()=>{const g=arrive();for(let i=0;i<50&&g.progress.arrival.phase==='gather';i++)chop(g);assert.equal(g.progress.arrival.phase,'repair');assert.ok(g.progress.wood>=RANGER.repairWood);assert.equal(g.transact('weapons',0,'buy'),false);assert.equal(quoteWorkshop(g.progress,{kind:'weapons',index:0,action:'buy'}).ok,false);while(g.progress.wood<RANGER.repairWood+RANGER.pistolWood)chop(g);Object.assign(g.player,{x:WORKSHOP.x,y:WORKSHOP.y+25});assert.equal(arrivalWorkReady(g),true);const before=g.progress.wood;assert.equal(g.advanceArrival(),true);tick(g,RANGER.rebuildSeconds+RESTORATION_FLIGHT+.1);assert.equal(g.progress.arrival.phase,'craft');assert.equal(g.progress.wood,before-RANGER.repairWood+RANGER.pistolWood);assert.equal(g.enemies.length,0);assert.equal(g.advanceArrival(),false);assert.equal(commitWorkshop(g,{kind:'weapons',index:0,action:'buy'},()=>true).ok,true);assert.equal(g.progress.arrival.phase,'complete');assert.equal(g.progress.wood,before-RANGER.repairWood);assert.equal(g.progress.weapons[0],1);assert.equal(g.progress.weapon,0);assert.equal(g.advanceArrival(),false);tick(g,4);assert.equal(g.enemies.length,0);assert.equal(g.progress.living.patrolActive,false);const restored=new Game(JSON.parse(JSON.stringify(g.progress)));assert.equal(restored.arrivalPending,false);assert.equal(restored.arrivalScene,null);});
test('施工中重载不重复扣料；距离与钥匙都必须满足',()=>{const g=arrive();for(let i=0;i<50&&g.progress.arrival.phase==='gather';i++)chop(g);Object.assign(g.player,{x:1800,y:1800});assert.equal(g.advanceArrival(),false);Object.assign(g.player,{x:WORKSHOP.x,y:WORKSHOP.y+25});g.advanceArrival();tick(g,1);const before=g.progress.wood;const restored=new Game(JSON.parse(JSON.stringify(g.progress)));restored.start();tick(restored,RANGER.rebuildSeconds+RESTORATION_FLIGHT-1+.1);assert.equal(restored.progress.arrival.phase,'craft');assert.equal(restored.progress.wood,before+RANGER.pistolWood);tick(restored,10);assert.equal(restored.progress.wood,before+RANGER.pistolWood);});

// 两处工作台在同一营地中可辨、可达，入口不与秘境相交。
test('武器与载具工坊独立命中并给人物和车体留通路',async()=>{
 const {REALM_ENTRANCES}=await import('../src/world/realm-entrances.js');
 const {terrainBlocked}=await import('../src/physics/terrain-navigation.js');
 const {forestLayout}=await import('../src/world/biomes.js');const trees=forestLayout();
 for(const site of [WORKSHOP,VEHICLE_WORKSHOP]){
  assert.equal(workshopAt({x:site.x,y:site.y-30},site),true);
  for(const other of [...REALM_ENTRANCES,...[WORKSHOP,VEHICLE_WORKSHOP].filter(s=>s!==site)])assert.ok(Math.abs(site.x-other.x)>(site.width+other.width)/2+35||site.y+85<other.y-other.height||other.y+85<site.y-site.height);
  for(const dx of [-65,0,65])for(const dy of [0,40,85])assert.equal(terrainBlocked(site.x+dx,site.y+dy,24),false);
  assert.ok(!trees.some(t=>t.x+56>site.x-site.width/2&&t.x-56<site.x+site.width/2&&t.y+12>site.y-site.height&&t.y-140<site.y+60));
 }
 assert.equal(workshopAt({x:VEHICLE_WORKSHOP.x,y:VEHICLE_WORKSHOP.y-30},WORKSHOP),false);
});

// 九秒必须呈现三场景和一秒落地等待；北广场赠车与老人专车互不替代。
test('公交下车站定一秒，急速接送到北门，老人骑走后持信交回操控',async()=>{
 const {arrivalSpeech}=await import('../src/core/ranger-arrival.js');const {arrivalObjects}=await import('../src/rendering/ranger-arrival.js');
 const g=new Game(freshRangerProgress());g.start();let elapsed=0,previous='',seen=[],wait=0,watchPosition=null;
 while(g.progress.arrival.phase!=='letter'&&elapsed<10){
  const a=g.progress.arrival,s=g.arrivalScene;
  if(a.phase!==previous){seen.push(a.phase);previous=a.phase;}
  if(a.phase==='bus')assert.ok(arrivalObjects(g).some(o=>o.type==='arrival-bus'));
  if(a.phase==='wait'){assert.equal(g.player.x,RANGER.waiting.x);assert.equal(g.player.y,RANGER.waiting.y);assert.equal(arrivalSpeech(g).speaker,'我');wait+=.05;}
  if(a.phase==='pickup'){assert.ok(s.busVisible);assert.ok(s.bus.y>RANGER.bus.y);assert.equal(s.riding,false);assert.equal(s.elderRiding,true);}
  if(a.phase==='ride'){assert.equal(s.riding,true);assert.equal(s.elderRiding,true);}
  if(a.phase==='handover')assert.equal(a.keys,false);
  if(['leave','watch'].includes(a.phase)){
   watchPosition||={x:g.player.x,y:g.player.y};assert.equal(g.player.x,watchPosition.x);assert.equal(g.player.y,watchPosition.y);
   assert.ok(arrivalObjects(g).some(o=>o.type==='arrival-letter'));
   assert.equal(s.elderRiding,a.phase==='leave');
  }
  assert.equal(g.enemies.length,0);g.update(.05,{x:1,y:1});elapsed+=.05;
 }
 assert.ok(Math.abs(wait-1)<1e-8);assert.ok(Math.abs(elapsed-9)<1e-8);assert.deepEqual(seen,Object.keys(RANGER_STAGES));
 assert.ok(Math.hypot(g.player.x-RANGER.doorstep.x,g.player.y-RANGER.doorstep.y)<10);assert.equal(g.arrivalCinematic,false);
 const parked=parkedVehicleObjects(g).find(o=>o.owner&&o.hull===RANGER.scooter);assert.equal(parked.x,RANGER.parking.x);assert.equal(parked.y,RANGER.parking.y);
});
// 每个短节拍在中途恢复相同演员和车轮，旧导览迁移而不再播放长对白。
test('全阶段刷新续接与两代旧入职存档兼容',()=>{
 const g=new Game(freshRangerProgress());g.start();const seen=new Set();
 for(let i=0;i<200&&g.progress.arrival.phase!=='letter';i++){
  g.update(.05);const a=g.progress.arrival;if(a.elapsed<.1||seen.has(a.phase))continue;seen.add(a.phase);
  const restored=new Game(JSON.parse(JSON.stringify(g.progress)));assert.equal(restored.player.x,g.player.x);assert.equal(restored.player.y,g.player.y);
  assert.equal(restored.arrivalScene.elder.x,g.arrivalScene.elder.x);assert.equal(restored.arrivalScene.elder.y,g.arrivalScene.elder.y);assert.deepEqual(restored.arrivalScene.scooter,g.arrivalScene.scooter);assert.equal(restored.arrivalScene.wheelPhase,g.arrivalScene.wheelPhase);
 }
 assert.equal(seen.size,Object.keys(RANGER_STAGES).length);
 for(const version of [1,2])for(const phase of ['ride','dialogue','cottage','weapons','vehicle','dismount','parking','handover','leave','watch']){
  const p=freshRangerProgress();Object.assign(p.arrival,{version,phase,elapsed:8});
  assert.equal(validateProgress(p).arrival.phase,'handover');assert.equal(validateProgress(p).arrival.elapsed,0);
  p.arrival.keys=true;assert.equal(validateProgress(p).arrival.phase,'gather');
 }
 const p=freshRangerProgress();p.arrival.phase='complete';assert.equal(new Game(p).arrivalPending,false);
});
// 真实地形和植被检查：公交站前、接送和导览路线不穿树干、不驶进湖中。
test('公交站与接送路线留白且可通行',async()=>{
 const {worldDistance}=await import('../src/world/coordinates.js');const {terrainBlocked}=await import('../src/physics/terrain-navigation.js');const {forestLayout}=await import('../src/world/biomes.js');const {sampleArrivalRoute}=await import('../src/core/ranger-arrival.js');const trees=forestLayout();
 for(const stage of [...Object.values(RANGER_STAGES),{route:RANGER.leaveRoute}]){if(!stage.route)continue;for(let i=0;i<=80;i++){const p=sampleArrivalRoute(stage.route,i/80);assert.equal(terrainBlocked(p.x,p.y,24),false);assert.ok(!trees.some(t=>worldDistance(t,p)<30));}}
 const {nearest}=await import('../src/world/coordinates.js');const b=RANGER.busStop;assert.ok(!trees.some(tree=>{const t=nearest(tree,b);return t.x+56>b.x-60&&t.x-56<b.x+75&&t.y+12>b.y-105&&t.y-140<b.y+35;}));
});

// 无对白阶段跳句也不能产生非数值时间或越过任务。
test('空白节拍不能跳句，暂停冻结同一时钟，跳过演出仍不赠枪和木材',async()=>{
 const {nextArrivalSpeech,skipArrivalJourney}=await import('../src/core/ranger-arrival.js');
 const g=new Game(freshRangerProgress());g.start();assert.equal(nextArrivalSpeech(g),false);
 tick(g,1.4);const elapsed=g.progress.arrival.elapsed,x=g.player.x;
 g.arrivalSpeechPaused=true;tick(g,2);assert.equal(g.progress.arrival.elapsed,elapsed);assert.equal(g.player.x,x);
 assert.equal(nextArrivalSpeech(g),true);assert.equal(g.arrivalSpeechPaused,false);
 assert.equal(skipArrivalJourney(g),true);assert.equal(g.progress.arrival.phase,'letter');
 assert.equal(g.progress.weapons[0],0);assert.equal(g.progress.arrival.keys,true);assert.equal(g.progress.wood,0);
});

// 营地空旷横向通道放置采集树，排除自动测试直走穿墙的旧夹具问题；使用真实电锯与负重。
test('建造武器工坊采集80木料即可，初始两秒仍展示采集过程',async()=>{
 const {skipArrivalJourney}=await import('../src/core/ranger-arrival.js');
 const {worldDistance,nearest}=await import('../src/world/coordinates.js');
 const g=new Game(freshRangerProgress(),()=>.5);g.start();skipArrivalJourney(g);completeArrivalLetter(g);board(g);g.dismountVehicle();
 g.trees=[];for(let i=0;i<10;i++)g.addTree(-250+i*100,820);
 let target=g.trees.find(t=>t.hp>0),seconds=0;Object.assign(g.player,{x:target.x-55,y:target.y});
 while(g.progress.wood+availableWood(g)<RANGER.repairWood&&seconds<40){
  if(target.hp<=0)target=g.trees.filter(t=>t.hp>0&&terrainLineClear(g.player,t)).sort((a,b)=>worldDistance(a,g.player)-worldDistance(b,g.player))[0];
  const p=nearest(target,g.player),dx=p.x-g.player.x,dy=p.y-g.player.y,d=Math.hypot(dx,dy);
  g.player.angle=Math.atan2(dy,dx);g.update(.05,d>55?{x:dx/d,y:dy/d}:{x:0,y:0});seconds+=.05;
  if(seconds<=2)assert.equal(g.progress.arrival.phase,'gather');
 }
 assert.ok(availableWood(g)>=RANGER.repairWood,`采集超时：${availableWood(g)}份，${seconds}秒`);assert.equal(g.progress.arrival.phase,'gather');assert.equal(g.progress.wood,0);Object.assign(g.player,CAMP_WAREHOUSE);g.livingPersist=()=>true;assert.ok(storeWood(g).ok);
 assert.equal(g.progress.arrival.phase,'repair');assert.ok(seconds>2&&seconds<40,`实际采集${seconds.toFixed(2)}秒`);
 assert.equal(g.progress.wood,RANGER.repairWood);
});
// 新施工档已预付木料，刷新后只续接动画，不再结算历史费用。
test('自动投料后刷新继续施工，只扣一次修复木头',()=>{
 const p=freshRangerProgress();Object.assign(p.arrival,{phase:'repair',keys:true,wood:RANGER.repairWood+RANGER.pistolWood,x:WORKSHOP.x,y:WORKSHOP.y+25});p.wood=RANGER.repairWood+RANGER.pistolWood;
 const g=new Game(p);g.start();g.attackTimer=999;g.update(.01);assert.equal(g.progress.arrival.phase,'repairing');assert.equal(g.progress.wood,8);
 tick(g,1);const restored=new Game(structuredClone(g.progress));restored.start();restored.attackTimer=999;
 tick(restored,RANGER.rebuildSeconds+RESTORATION_FLIGHT);assert.equal(restored.progress.arrival.phase,'craft');assert.equal(restored.progress.wood,16);
});

// 尚未开工时按当前余额补差额，历史采集量不决定修复资格。
test('待修复余额不足时返回采集，补齐余额后返回工坊',()=>{
 const p=freshRangerProgress();Object.assign(p.arrival,{phase:'repair',keys:true,wood:24});p.wood=24;
 const g=new Game(p);g.start();g.update(.01);assert.equal(g.progress.arrival.phase,'gather');assert.equal(g.progress.arrival.wood,24);assert.equal(g.progress.wood,24);
 for(let i=0;i<50&&g.progress.arrival.phase==='gather';i++)chop(g);
 assert.equal(g.progress.arrival.phase,'repair');assert.ok(g.progress.wood>=RANGER.repairWood);
 Object.assign(g.player,{x:WORKSHOP.x,y:WORKSHOP.y+25});assert.ok(g.advanceArrival());assert.equal(g.progress.arrival.workWood,80);
});

// 新门槛边界与旧施工档分别验证，避免调低费用后重新扣除已支付木料。
test('首次采木79不足、80可开工，旧280木料施工档不重复扣费',()=>{
 const p=freshRangerProgress();Object.assign(p.arrival,{phase:'gather',keys:true,x:WORKSHOP.x,y:WORKSHOP.y+25});p.wood=79;
 const g=new Game(p);g.start();g.attackTimer=999;assert.equal(advanceArrival(g),false);
 g.progress.wood=80;assert.equal(advanceArrival(g),true);assert.equal(g.progress.wood,0);assert.equal(g.progress.arrival.workWood,80);
 const old=structuredClone(g.progress);old.arrival.workWood=280;old.wood=8;
 const restored=new Game(old);restored.start();restored.attackTimer=999;tick(restored,RANGER.rebuildSeconds+RESTORATION_FLIGHT+.1);
 assert.equal(restored.progress.arrival.phase,'craft');assert.equal(restored.progress.wood,16);
});
