// SE 装置集成回归：存档、重量、事务、实际弹道与自动控制边界。
import test from 'node:test';import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {vehicleDamage} from '../src/config/vehicles.js';
import {grantVehicleArmament} from '../src/config/vehicle-armaments.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {VEHICLE_SE,seActive,seBuild,normalizeVehicleSE,seMass} from '../src/config/vehicle-se.js';
import {configureVehicleSE} from '../src/core/vehicles/vehicle-se.js';
import {vehicleLoad} from '../src/progression/inventory/load-weight.js';
import {updateVehicleFlares} from '../src/world/vehicle-flares.js';
import {startSEControl,updateSEControl,updateSEDevices,absorbSEShield,seTargetAllowed} from '../src/combat/vehicle-se.js';
import {updateEnemyBolts} from '../src/combat/ranged-enemies.js';
import {updateBallistics} from '../src/combat/ballistics.js';
import {requestWorldNavigation} from '../src/core/navigation/world-navigation.js';
import {campDefensePost} from '../src/config/camp-defense.js';
import {startCampDefense,leaveCampDefense} from '../src/core/camp/camp-defense.js';
import {waystationMovementReason} from '../src/core/navigation/waystations.js';
// 建立真实游戏与已拥有重型坦克，避开新手剧情与房屋保护。
function scene(hull=1){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[hull]=1;grantVehicleArmament(p,hull);p.vehicleIndex=hull;p.coins=20000;const g=new Game(p,()=>.5);g.state='playing';g.mainlineSpeech=null;g.trees=[];g.enemies=[];g.boss=null;g.vehicle.active=true;g.livingPersist=()=>true;g.progress.campParking.owned=[];Object.assign(g.player,{x:9000,y:9000});return g;}
// 测试夹具安装只用于运行时场景，事务测试使用公开装配接口。
function equip(g,...keys){const b=seBuild(g.progress,g.vehicle.index);b.owned=[...new Set([...b.owned,...keys])];b.installed=[...b.owned];return b;}
// 敌人使用真实生命与碰撞半径，供正式弹道命中。
function enemy(g,id,x=120){return {id,type:'enemy',x:g.player.x+x,y:g.player.y,hp:10000,maxHp:10000,radius:17,mass:1,speed:0};}
test('重型坦克默认照明、旧档迁移、卸下不重装、白名单与计时限幅',()=>{const p=freshProgress();delete p.vehicleSE;const migrated=validateProgress(p);assert.deepEqual(seBuild(migrated,1).installed,['flare']);assert.equal(seMass(migrated,0),0);migrated.vehicleSE[1].installed=[];assert.deepEqual(validateProgress(migrated).vehicleSE[1].installed,[]);const b=normalizeVehicleSE([{owned:['shield','shield','bad'],installed:['shield','rocket'],shield:Infinity,rocketWait:99}],1)[0];assert.deepEqual(b.installed,['shield']);assert.equal(b.shield,0);assert.equal(b.rocketWait,8);});
test('安装按重量扣费，拆卸保管、免费重装；存盘失败与超重完整回滚',()=>{const g=scene();g.cottage={kind:'vehicle'};const before=vehicleLoad(g,1).payload;assert.equal(configureVehicleSE(g,1,'shield','install').ok,true);assert.equal(vehicleLoad(g,1).payload,before+375);assert.equal(g.progress.coins,17000);seBuild(g.progress,1).shield=40;assert.equal(configureVehicleSE(g,1,'shield','remove').ok,true);assert.equal(vehicleLoad(g,1).payload,before);assert.equal(configureVehicleSE(g,1,'shield','install').ok,true);assert.equal(g.progress.coins,17000);assert.equal(seBuild(g.progress,1).shield,40);g.livingPersist=()=>false;const snapshot=structuredClone(g.progress);assert.equal(configureVehicleSE(g,1,'rocket','install').ok,false);assert.deepEqual(g.progress,snapshot);g.livingPersist=()=>true;g.progress.logistics.builds[1].wood=1e9;assert.equal(configureVehicleSE(g,1,'rocket','install').ok,false);assert.equal(g.progress.coins,17000);});
test('照明器卸下或关闭不发射，原有空中弹继续燃烧，别车不共享',()=>{const g=scene();g.surfaceNight=1;g.progress.supplies.vehicles[1].flare=5;updateVehicleFlares(g,.1);assert.equal(g.progress.supplies.vehicles[1].flare,4);seBuild(g.progress,1).installed=[];updateVehicleFlares(g,46);assert.equal(g.progress.supplies.vehicles[1].flare,4);assert.equal(g.progress.supplies.activeFlare,null);equip(g,'flare').disabled=['flare'];updateVehicleFlares(g,1);assert.equal(g.progress.supplies.vehicles[1].flare,4);});
test('护盾承伤、溢出、等待与暂停恢复、切车隔离',()=>{const g=scene(),b=equip(g,'shield');b.shield=180;assert.equal(absorbSEShield(g,210),30);assert.equal(b.shield,0);updateSEDevices(g,8);assert.equal(b.shield,0);updateSEDevices(g,2);assert.equal(b.shield,36);g.state='paused';updateSEDevices(g,5);assert.equal(b.shield,36);g.progress=validateProgress(g.progress);assert.equal(seBuild(g.progress,1).shield,36);g.vehicle.active=false;assert.equal(absorbSEShield(g,10),10);});
test('双联火箭消耗、冷却、实际扫掠直击溅射与空弹停射',()=>{const g=scene(),b=equip(g,'rocket');g.progress.supplies.vehicles[1].heavy=4;g.enemies=[enemy(g,1),enemy(g,2,150)];updateSEDevices(g,.1);assert.equal(g.progress.supplies.vehicles[1].heavy,2);assert.equal(g.projectiles.length,2);updateSEDevices(g,1);assert.equal(g.projectiles.length,2);for(let i=0;i<20;i++)updateBallistics(g,.02);assert.ok(g.enemies.every(t=>t.hp<10000));g.state='paused';updateSEDevices(g,99);assert.equal(b.rocketWait,7);g.state='playing';updateSEDevices(g,7);assert.equal(g.progress.supplies.vehicles[1].heavy,0);updateSEDevices(g,9);assert.equal(g.progress.supplies.vehicles[1].heavy,0);});
test('巡战真实范围、手动接管、暂停、换图与下车取消',()=>{const g=scene();equip(g,'combat');assert.equal(startSEControl(g,'combat').ok,true);const s=g.seControl;assert.equal(seTargetAllowed(g,enemy(g,1,300)),false);assert.equal(seTargetAllowed(g,enemy(g,1,100)),true);g.state='paused';updateSEControl(g,5,{x:0,y:0});assert.equal(s.clock,0);g.state='playing';assert.deepEqual(updateSEControl(g,.1,{x:1,y:0}),{x:1,y:0});assert.equal(g.seControl,s);g.player.x+=300;updateSEControl(g,.1,{x:0,y:0});assert.equal(g.seControl,s);assert.equal(s.anchor.x,g.player.x);startSEControl(g,'combat');g.mapId='jiuzhaigou';updateSEControl(g,.1,{x:0,y:0});assert.equal(g.seControl,null);g.mapId='forest';startSEControl(g,'combat');g.vehicle.active=false;updateSEControl(g,.1,{x:0,y:0});assert.equal(g.seControl,null);});
test('来弹预测产生侧向避让，不能冲出巡战圈或穿树',()=>{const g=scene();equip(g,'combat');startSEControl(g,'combat');g.enemyBolts=[{x:g.player.x-130,y:g.player.y,dx:1,dy:0,speed:300,radius:8}];const v=updateSEControl(g,.05,{x:0,y:0});assert.ok(Math.abs(v.y)>.3);assert.ok(Math.hypot(v.x,v.y)<=1.001);g.player.x=g.seControl.anchor.x+260;assert.deepEqual(updateSEControl(g,.05,{x:0,y:0}),{x:0,y:0});assert.equal(g.seControl,null);});
test('自动驾驶要求装置与目标，正式寻路并到达停止，驿站同样检查装置',()=>{const g=scene();assert.equal(startSEControl(g,'autopilot').ok,false);assert.match(waystationMovementReason(g),/自动驾驶/);equip(g,'autopilot');assert.equal(startSEControl(g,'autopilot').ok,false);requestWorldNavigation(g,{x:9100,y:9000,mapId:'forest'},'测试目标',{direct:true});assert.equal(startSEControl(g,'autopilot').ok,true);let v;for(let i=0;i<10;i++)v=updateSEControl(g,.05,{x:0,y:0});assert.ok(v.x>0);Object.assign(g.player,{x:9090,y:9000});updateSEControl(g,.05,{x:0,y:0});assert.equal(g.seControl,null);});

test('五营地分别出售特色SE，购买仅入库，已购件可在异地按新重量反复装卸',async()=>{
 const {REGIONAL_CAMPS,regionalNpc}=await import('../src/config/regional-camps.js');
 const {VEHICLE_SE}=await import('../src/config/vehicle-se.js');
 const g=scene();
 const hull=0;
 g.progress.vehicleHulls[hull]=1;
 assert.deepEqual(Object.fromEntries(Object.entries(VEHICLE_SE).map(([id,d])=>[id,d.mass])),{
  flare:90,autopilot:160,combat:240,rocket:475,smoke:120,mine:260,protection:280,shield:375
 });
 assert.equal(seMass(validateProgress(g.progress),1),90);
 assert.equal(new Set(REGIONAL_CAMPS.map(c=>c.seDevice)).size,5);
 for(const [i,camp] of REGIONAL_CAMPS.entries()){
  const key=camp.seDevice;
  const nextCamp=REGIONAL_CAMPS[(i+1)%REGIONAL_CAMPS.length];
  const coins=g.progress.coins;
  Object.assign(g.player,regionalNpc(nextCamp));
  assert.equal(configureVehicleSE(g,hull,key,'buy').ok,false);
  assert.equal(configureVehicleSE(g,hull,key,'install').ok,false);
  Object.assign(g.player,regionalNpc(camp));
  const load=vehicleLoad(g,hull).payload;
  assert.equal(configureVehicleSE(g,hull,key,'buy').ok,true);
  assert.equal(configureVehicleSE(g,hull,key,'buy').ok,false);
  assert.equal(vehicleLoad(g,hull).payload,load);
  Object.assign(g.player,regionalNpc(nextCamp));
  assert.equal(configureVehicleSE(g,hull,key,'install').ok,true);
  assert.equal(vehicleLoad(g,hull).payload,load+VEHICLE_SE[key].mass);
  assert.equal(configureVehicleSE(g,hull,key,'remove').ok,true);
  assert.equal(vehicleLoad(g,hull).payload,load);
  assert.equal(g.progress.coins,coins-VEHICLE_SE[key].coins);
 }
});

test('自动驾驶沿主线和邻里正式任务路点行驶，到达任务交互范围后停车',async()=>{
 const {freshProgress}=await import('../src/progression/progress.js');
 const {worldNavigationObjective}=await import('../src/core/navigation/world-navigation.js');
 const {driveToTrackedTask}=await import('../src/combat/vehicle-se.js');
 const {LIVING_REQUESTS}=await import('../src/config/living-world.js');
 const {livingRequestTarget,updateLivingWorld}=await import('../src/core/camp/living-world.js');
 const {worldDistance}=await import('../src/world/coordinates.js');
 for(const neighbor of [false,true]){
  const g=scene();
  equip(g,'autopilot');
  g.progress.mainline=freshProgress().mainline;
  updateLivingWorld(g,.05);
  let target;
  if(neighbor){
   const request=LIVING_REQUESTS[0];
   g.progress.living.requests[request.id]={accepted:true,stage:0,completed:false};
   g.progress.taskTracking={kind:'living',id:request.id};
   target=livingRequestTarget(g,request);
  }else target=worldNavigationObjective(g).site;
  Object.assign(g.player,{x:target.x+225,y:target.y});
  driveToTrackedTask(g);
  assert.equal(g.seControl?.taskRoute,neighbor?'living':'mainline');
  for(let i=0;i<1000&&g.seControl;i++){
   g.time+=.05;
   const v=updateSEControl(g,.05,{x:0,y:0});
   g.player.x+=v.x*5;
   g.player.y+=v.y*5;
  }
  assert.equal(g.seControl,null);
  assert.ok(worldDistance(g.player,target)<=100);
 }
});

// 通过实际承伤入口确认未装备手盾时也能在盾面拦截，破盾涟漪会在暂停后继续消退。
test('车载盾在来袭侧显示命中，破盾余光与车体伤害分开结算',async()=>{
 const {traceEnergyShield,energyShieldShape}=await import('../src/combat/energy-shield-surface.js');
 const g=scene(),b=equip(g,'shield'),shape=energyShieldShape(g.player,true);
 b.shield=35;
 const source={x:shape.x-200,y:shape.y},hit=traceEnergyShield(g,source,shape);
 assert.ok(hit);assert.equal(hit.x,shape.x-shape.rx);
 const hp=g.vehicle.hp;g.hurt(15,hit);
 assert.equal(g.vehicle.hp,hp);assert.equal(b.shield,20);
 assert.ok(Math.abs(Math.abs(g.seShieldEffects.shieldImpacts[0].angle)-Math.PI)<1e-8);
 g.hurt(25,{x:shape.x+200,y:shape.y});
 assert.equal(b.shield,0);assert.ok(g.vehicle.hp<hp);assert.equal(traceEnergyShield(g,source,shape),null);
 assert.equal(g.seShieldEffects.shieldImpacts.at(-1).angle,0);
 g.state='paused';updateSEDevices(g,1);assert.equal(g.seShieldEffects.shieldImpacts.length,2);
 g.state='playing';updateSEDevices(g,.5);assert.equal(g.seShieldEffects.shieldImpacts.length,0);
});

// 两侧敌人以一像素交替领先，用正式惯性移动逐帧检查走位方向。
test('巡战遇到射程内等距敌群时保持停车并能立即避弹',async()=>{
 const {driveBody}=await import('../src/physics/motion.js');
 const {WORLD}=await import('../src/world/coordinates.js');
 for(const dt of [1/60,1/24]){
  const g=scene();equip(g,'combat');startSEControl(g,'combat');
  const origin=g.player.x,right=enemy(g,1,220),left=enemy(g,2,-220);
  g.enemies=[right,left];
  let moving=0;
  for(let i=0;i<Math.ceil(2/dt);i++){
   const center=i*dt<.25?g.player.x:origin;
   right.x=center+220+(i%2);left.x=center-221+(i%2);
   const v=updateSEControl(g,dt,{x:0,y:0});
   assert.ok(v.x>=0,'接敌过程中不应来回反向');
   if(v.x>0)moving++;
   driveBody(g.player,v,95,dt,WORLD,g.trees);
  }
  assert.equal(moving,0);assert.ok(Math.abs(g.player.vx)<1);
  g.enemyBolts=[{x:g.player.x-100,y:g.player.y,dx:1,dy:0,speed:320,radius:8}];
  assert.ok(Math.abs(updateSEControl(g,dt,{x:0,y:0}).y)>.3);
 }
});

// 圈外目标仍在主炮射程，使用真实发射与弹道验证树干先受击、后续炮弹能打到团子。
for(const hull of [1,6])test('巡战从圈内向树后的敌人开炮，超出射程时停火 · 车体 '+hull,async()=>{
 const {updateVehicle}=await import('../src/combat/vehicle.js');
 const g=scene(hull);equip(g,'combat');startSEControl(g,'combat');
 const target=enemy(g,81,440),tree={id:82,type:'tree',x:g.player.x+200,y:g.player.y,hp:1,maxHp:1,radius:22};
 g.enemies=[target];g.trees=[tree];g.progress.supplies.vehicles[hull][hull===6?'heavy':'shell']=8;
 g.vehicle.module.magazine.ammo=1;
 assert.equal(seTargetAllowed(g,target),false);
 updateVehicle(g,.05);
 assert.equal(g.vehicle.targetId,target.id);
 for(let i=0;i<240&&tree.hp>0;i++){updateVehicle(g,.025);updateBallistics(g,.025);}
 assert.ok(tree.hp<=0);assert.equal(target.hp,10000);
 for(let i=0;i<180;i++){updateVehicle(g,.025);updateBallistics(g,.025);}
 assert.ok(target.hp<10000);
 target.x=g.player.x+700;updateVehicle(g,.05);assert.equal(g.vehicle.targetId,null);
});

test('装置开关立即接管既有路点，途中接敌并在脱战后从当前位置续航',()=>{
 const g=scene(), idle={x:0,y:0};
 equip(g,'autopilot','combat').disabled=['autopilot','combat'];
 requestWorldNavigation(g,{x:9500,y:9000,mapId:'forest'},'既有路点',{direct:true});
 const toggle=key=>assert.equal(configureVehicleSE(g,1,key,'toggle').ok,true);
 toggle('combat');
 assert.equal(g.seControl.mode,'combat');
 toggle('autopilot');
 assert.equal(g.seControl.mode,'autopilot');
 let motion;for(let i=0;i<15;i++)motion=updateSEControl(g,.05,idle);
 assert.ok(motion.x>0);
 g.player.x+=80;
 g.enemies=[enemy(g,101)];
 updateSEControl(g,.1,idle);
 assert.equal(g.seControl.mode,'combat');
 assert.equal(g.seControl.anchor.x,g.player.x);
 toggle('combat');
 assert.equal(g.seControl.mode,'autopilot');
 toggle('combat');
 assert.equal(g.seControl.mode,'combat');
 g.player.y+=45;
 g.enemies[0].hp=0;
 updateSEControl(g,.1,idle);
 assert.equal(g.seControl.mode,'autopilot');
 assert.equal(g.seControl.anchor.y,g.player.y);
 assert.equal(g.seControl.goal.x,9500);
 g.player.x=9500;g.player.y=9000;
 updateSEControl(g,.1,idle);
 assert.equal(g.seControl.mode,'combat');
});

test('手机回小屋在停稳及手动接管后都能直接重新发车',async()=>{
 const {navigatePhone}=await import('../src/core/battle/patrol-phone.js');
 const {COTTAGE}=await import('../src/config/cottage.js');
 const g=scene(),door=COTTAGE.door;
 equip(g,'autopilot');
 Object.assign(g.player,{x:door.x,y:door.y+350});
 g.state='paused';
 const {PARKING_SPOTS}=await import('../src/config/parking.js');
 g.parking={phase:'parked',hull:g.vehicle.index,id:PARKING_SPOTS[0].id};
 assert.equal(navigatePhone(g,'home').ok,true);
 assert.equal(g.seControl?.mode,'autopilot');
 g.state='playing';
 updateSEControl(g,.05,{x:1,y:0});
 assert.equal(g.seControl,null);
 assert.equal(navigatePhone(g,'home').ok,true);
 const before=g.player.y;
 for(let i=0;i<180&&g.player.y>=before-5;i++)g.update(.035,{x:0,y:0});
 assert.ok(g.player.y<before-5);
 for(let i=0;i<600&&g.seControl;i++)g.update(.035,{x:0,y:0});
 assert.equal(g.seControl,null);
 assert.ok(Math.hypot(g.player.x-door.x,g.player.y-door.y)<=90);
});

test('改装工坊建成后可进门，旧盾等比例扩容，改装扣费和等级随车保存',async()=>{
 const {WORKSHOP_INTERIORS,interiorShopkeeper}=await import('../src/config/workshop-interiors.js');
 const {enterWorkshop}=await import('../src/core/home/cottage.js');
 const {seShieldMax}=await import('../src/config/vehicle-se.js');
 const g=scene(),room=WORKSHOP_INTERIORS.seWorkshop;
 g.vehicle.active=false;g.progress.campLand.owned.push('industry');
 Object.assign(g.player,room.door);
 assert.equal(enterWorkshop(g,'seWorkshop'),false);
 g.progress.restoration.repaired.push('seWorkshop');
 assert.equal(enterWorkshop(g,'seWorkshop'),true);
 assert.ok(interiorShopkeeper(g.cottage));
 const old=normalizeVehicleSE([{owned:['shield'],installed:['shield'],shield:90}],1)[0];
 assert.equal(old.shield,250);
 g.cottage={kind:'vehicle'};
 assert.ok(configureVehicleSE(g,1,'shield','install').ok);
 assert.equal(seBuild(g.progress,1).shield,500);
 assert.equal(configureVehicleSE(g,1,'shield','upgrade').ok,false);
 g.cottage={kind:'seWorkshop'};
 const coins=g.progress.coins;
 g.livingPersist=()=>false;
 assert.equal(configureVehicleSE(g,1,'shield','upgrade').ok,false);
 assert.equal(g.progress.coins,coins);
 g.livingPersist=()=>true;
 for(let n=1;n<=3;n++){
  assert.ok(configureVehicleSE(g,1,'shield','upgrade').ok);
  assert.equal(seShieldMax(seBuild(g.progress,1)),500+n*150);
 }
 assert.equal(g.progress.coins,coins-9000);
 assert.equal(configureVehicleSE(g,1,'shield','upgrade').ok,false);
 g.progress=validateProgress(g.progress);g.vehicle.active=true;g.cottage=null;
 updateSEDevices(g,60);
 assert.equal(seBuild(g.progress,1).shield,950);
 assert.equal(absorbSEShield(g,1000),50);
});

// 从射程边缘外接敌，并在进入真实炮程的第一步停止接近。
test('巡战在主炮射程边缘切换接近与驻车',async()=>{
 const {mountedWeapon}=await import('../src/combat/mounted-weapon.js');
 const g=scene(),build=equip(g,'combat');build.radius=400;
 startSEControl(g,'combat');const range=mountedWeapon(g).range;
 const t=enemy(g,101,range+1);g.enemies=[t];
 g.seControl.anchor.x=(t.x+g.player.x)/2;
 assert.ok(updateSEControl(g,.05,{x:0,y:0}).x>0);
 t.x-=1;
 assert.deepEqual(updateSEControl(g,.05,{x:0,y:0}),{x:0,y:0});
});

// 领主进入主炮射程时，实际炮塔锁定目标，车身保持驻车。
test('巡战驻车时主炮仍能锁定远处领主',async()=>{
 const {updateVehicle}=await import('../src/combat/vehicle.js');
 const g=scene();equip(g,'combat');startSEControl(g,'combat');
 g.boss=enemy(g,102,380);
 assert.deepEqual(updateSEControl(g,.05,{x:0,y:0}),{x:0,y:0});
 updateVehicle(g,.05);assert.equal(g.vehicle.targetId,g.boss.id);
});

// 使用实际镜头的世界坐标，在手机和横屏上检查拉远、接近与停稳。
for(const [width,height] of [[450,900],[900,450]])test('巡战按视口短边的二分之一调整距离 '+width+'×'+height,()=>{
 const g=scene();equip(g,'combat');startSEControl(g,'combat');
 g.arrivalView={left:-width/2,right:width/2,top:-height/2,bottom:height/2,width,height};
 const t=enemy(g,201,180);g.enemies=[t];
 const steer=()=>updateSEControl(g,.05,{x:0,y:0});
 assert.ok(steer().x<0,'近身时后撤');
 t.x=g.player.x+Math.min(width/2-12,225);assert.deepEqual(steer(),{x:0,y:0});
 t.x=g.player.x+width/2-1;g.player.vx=80;
 assert.deepEqual(steer(),{x:0,y:0},'已在视野和炮程内时原地开火');
 assert.equal(g.player.vx,0,'不沿接敌方向继续滑行');
});

// 在宽阔视野里由主炮射程封顶，进入射程后保持火力。
test('巡战视野二分之一超过射程时使用主炮射程',async()=>{
 const {mountedWeapon}=await import('../src/combat/mounted-weapon.js');
 const g=scene();equip(g,'combat').radius=400;startSEControl(g,'combat');
 g.arrivalView={left:-1500,right:1500,top:-1500,bottom:1500,width:3000,height:3000};
 const range=mountedWeapon(g).range,t=enemy(g,202,range);g.enemies=[t];
 g.seControl.anchor.x+=range/2;
 assert.deepEqual(updateSEControl(g,.05,{x:0,y:0}),{x:0,y:0});
 t.x-=60;assert.ok(updateSEControl(g,.05,{x:0,y:0}).x<0);
});

// 用实际移动、弹匣和炮塔验证后撤中开火，怪物在停稳边缘小幅移动时车辆保持原地。
test('巡战边退边打，拉开后稳住并仅在怪物再次逼近时后撤',async()=>{
 const {updateVehicle}=await import('../src/combat/vehicle.js');
 const {driveBody}=await import('../src/physics/motion.js');
 const {WORLD}=await import('../src/world/coordinates.js');
 const g=scene();equip(g,'combat');startSEControl(g,'combat');
 g.arrivalView={left:-300,right:300,top:-225,bottom:225,width:600,height:450};
 const t=enemy(g,204,125);g.enemies=[t];g.vehicle.module.magazine.ammo=1;
 g.vehicle.angle=0;g.vehicle.module.magazine.remaining=0;g.vehicle.module.cooldown=0;
 const idle={x:0,y:0},dt=1/30;
 let fired=false,stopped=false;
 for(let i=0;i<120;i++){
  const v=updateSEControl(g,dt,idle);
  updateVehicle(g,dt);
  if(!v.x&&!v.y){stopped=true;break;}
  assert.ok(v.x<0);
  if(g.projectiles.length)fired=true;
  driveBody(g.player,v,95,dt,WORLD,g.trees);
 }
 assert.ok(fired);assert.ok(stopped);assert.ok(t.x-g.player.x>=218&&t.x-g.player.x<=225);
 for(let i=0;i<60;i++){
  t.x=g.player.x+215+Math.sin(i)*7;
  assert.deepEqual(updateSEControl(g,dt,idle),idle);
 }
 t.x=g.player.x+178;assert.ok(updateSEControl(g,dt,idle).x<0);
});

// 从三个方向逼近时沿空侧突围；距离排序抖动不能让车身折返，炮塔仍可开火。
test('巡战沿夹击缺口带开追兵，敌群集中后驻车射击',async()=>{
 const {driveBody}=await import('../src/physics/motion.js'),{WORLD}=await import('../src/world/coordinates.js');
 const {updateVehicle}=await import('../src/combat/vehicle.js');
 const g=scene();equip(g,'combat').radius=400;startSEControl(g,'combat');
 g.arrivalView={left:-270,right:270,top:-250,bottom:250,width:540,height:500};
 const origin={...g.player},dt=1/30;
 g.enemies=[[122,0],[-122,0],[0,118],[55,107]].map(([x,y],i)=>({...enemy(g,300+i,x),y:origin.y+y}));
 g.vehicle.module.magazine.ammo=1;g.vehicle.module.magazine.remaining=0;g.vehicle.module.cooldown=0;
 let stationary=0,fired=false;
 for(let i=0;i<150;i++){
  // 两翼交替靠近，同时模拟敌群以低于车速的速度追车。
  for(const [j,e] of g.enemies.entries()){
   const dx=g.player.x-e.x,dy=g.player.y-e.y,d=Math.hypot(dx,dy);
   if(i<60){e.x+=dx/d*dt*18;e.y+=dy/d*dt*18;}
   if(j<2)e.x+=(i%2?1:-1);
  }
  const v=updateSEControl(g,dt,{x:0,y:0});
  if(i===0)assert.ok(v.y<-.9,'应向上方的空缺脱离');
  assert.ok(v.y<=.001,'不能因两翼敌人的细小位移折返');
  stationary=v.x===0&&v.y===0?stationary+1:0;
  updateVehicle(g,dt);if(g.projectiles.length)fired=true;
  driveBody(g.player,v,95,dt,WORLD,g.trees);
 }
 assert.ok(fired&&stationary>=30);
 assert.ok(g.enemies.every(e=>e.y>g.player.y),'敌群应处于车身同一侧');
 assert.ok(g.vehicle.targetId!=null);
});

// 对称包围中每帧交换左右威胁排序，检查几乎等价的缺口不会交替抢占。
test('四面包围时对称缺口保持同一脱离方向',()=>{
 const g=scene();equip(g,'combat');startSEControl(g,'combat');
 g.arrivalView={left:-240,right:240,top:-300,bottom:300,width:480,height:600};
 const offsets=[[125,0],[-125,0],[0,125],[0,-125]];
 g.enemies=offsets.map(([x,y],i)=>({...enemy(g,401+i,x),y:g.player.y+y}));
 let first;
 for(let i=0;i<90;i++){
  g.enemies[0].x=g.player.x+125+(i%2?2:-2);
  const v=updateSEControl(g,1/30,{x:0,y:0});first??=v;
  assert.ok(v.x*first.x+v.y*first.y>.9);
 }
});

// 两种专属主炮逐枚检查伤害快照，卸下主炮后检查弹药和冷却。
test('蜂巢每枚火箭造成当前主炮三倍直击伤害',()=>{
 for(const hull of [1,6]){
  const g=scene(hull),build=equip(g,'rocket'),stock=g.progress.supplies.vehicles[hull];
  stock.heavy=4;g.enemies=[enemy(g,1)];
  const expected=3*vehicleDamage(g.progress,g.vehicle.weaponIndex);
  assert.ok(expected>0);updateSEDevices(g,.1);
  assert.deepEqual(g.projectiles.map(shot=>shot.initialAmount),[expected,expected]);
  g.vehicle.weaponIndex=null;build.rocketWait=0;updateSEDevices(g,.1);
  assert.equal(stock.heavy,2);assert.equal(build.rocketWait,0);assert.equal(g.projectiles.length,2);
 }
});

// 在正式弹道更新中检查侧向掠过、迎面齐射、装置开关与溅射拦截。
test('主动防护只拦截威胁本车的敌弹，每次拦截进入独立冷却',()=>{
 const g=scene(),build=equip(g,'protection'),p=g.player;
 g.enemies=[enemy(g,17)];
 // 从右侧发射测试弹，纵向偏移决定弹道是否经过玩家。
 function bolt(offset,splash=0){return {owner:17,x:p.x+130,y:p.y+offset,dx:-1,dy:0,speed:200,radius:3,damage:20,age:0,remaining:130,splash};}
 const miss=bolt(60),second=bolt(0);g.enemyBolts=[miss,bolt(0),second];
 updateEnemyBolts(g,.1,p);
 assert.deepEqual(g.enemyBolts,[miss,second]);assert.equal(build.protectionWait,2);
 assert.equal(validateProgress(g.progress).vehicleSE[1].protectionWait,2);
 g.enemyBolts=[];updateEnemyBolts(g,2,p);assert.equal(build.protectionWait,0);
 const shell=bolt(40,60);g.enemyBolts=[shell];build.disabled.push('protection');
 updateEnemyBolts(g,.1,p);assert.equal(g.enemyBolts.length,1);
 build.disabled=[];build.levels.protection=2;updateEnemyBolts(g,.1,p);
 assert.equal(g.enemyBolts.length,0);assert.equal(build.protectionWait,1.2);
});

// 通过工坊逐件安装，覆盖超过五件时的交易、读档与拆装。
test('载重足够时可安装全部 SE，读档保留每件装置的开关和改装等级',()=>{
 const g=scene(),hull=g.vehicle.index;
 g.cottage={kind:'vehicle'};
 const keys=Object.keys(VEHICLE_SE);
 for(const key of keys){
  if(seBuild(g.progress,hull).installed.includes(key))continue;
  const result=configureVehicleSE(g,hull,key,'install');
  assert.ok(result.ok,result.message);
 }
 assert.deepEqual(seBuild(g.progress,hull).installed,keys);
 const last=keys.at(-1);
 assert.ok(configureVehicleSE(g,hull,last,'toggle').ok);
 seBuild(g.progress,hull).levels[last]=2;
 g.progress=validateProgress(JSON.parse(JSON.stringify(g.progress)));
 const restored=seBuild(g.progress,hull);
 assert.deepEqual(restored.installed,keys);
 assert.deepEqual(restored.disabled,[last]);
 assert.equal(restored.levels[last],2);
 const coins=g.progress.coins;
 assert.ok(configureVehicleSE(g,hull,last,'remove').ok);
 assert.ok(configureVehicleSE(g,hull,last,'install').ok);
 assert.equal(g.progress.coins,coins);
 assert.deepEqual(seBuild(g.progress,hull).installed,keys);
});
// 烟幕打断远程前摇；关闭装置后敌人可重新开始瞄准。
test('随车烟幕阻止锁定和释放，关闭后恢复',async()=>{
 const {updateRangedAttack}=await import('../src/combat/ranged-enemies.js');
 const {RANGED_ENEMIES}=await import('../src/config/ranged-enemies.js');
 const g=scene(),b=equip(g,'smoke'),e=enemy(g,81);
 Object.assign(e,{species:Object.keys(RANGED_ENEMIES)[0],arena:{},assault:{phase:'windup',elapsed:10}});
 g.enemies=[e];updateRangedAttack(g,e,g.player,.1);
 assert.equal(e.assault.phase,'chase');assert.equal(g.enemyBolts.length,0);
 updateRangedAttack(g,e,g.player,.1);assert.equal(e.assault.phase,'chase');
 b.disabled.push('smoke');updateRangedAttack(g,e,g.player,.1);assert.equal(e.assault.phase,'windup');
});
// 地雷部署后固定在地面，驾驶者驶离后仍会触发，并按爆炸范围筛选目标。
test('布雷器定点部署，暂停冻结，引爆一次并杀伤周边敌人',()=>{
 const g=scene();equip(g,'mine');g.combatLineClear=()=>true;
 const a=enemy(g,1,170),b=enemy(g,2,130),far=enemy(g,3,260);g.enemies=[a,b,far];
 updateSEDevices(g,.01);assert.equal(g.vehicleMines.length,1);
 const m=g.vehicleMines[0];g.player.x+=500;Object.assign(a,{x:m.x,y:m.y,hp:100});
 g.state='paused';updateSEDevices(g,4);assert.equal(m.life,25);
 g.state='playing';updateSEDevices(g,.6);
 assert.equal(g.vehicleMines.length,0);assert.ok(a.hp<=0);assert.ok(b.hp<10000);assert.equal(far.hp,10000);
 const hp=b.hp;updateSEDevices(g,.1);assert.equal(b.hp,hp);
});

// 从已开启巡战的森林入场，并验证兽潮读档和退出后的控制权。
test('兽潮暂停战术巡战，读档仍可手动走位，离场恢复原开关',()=>{
 const g=scene();
 equip(g,'combat');
 g.progress.restoration.repaired.push('defense');
 Object.assign(g.player,campDefensePost(g.progress,'left'));
 assert.ok(startSEControl(g,'combat').ok);
 assert.ok(startCampDefense(g,'left'));
 const restored=new Game(validateProgress(structuredClone(g.progress)),()=>.5);
 for(const game of [g,restored]){
  assert.ok(game.campDefense);
  game.enemies=[enemy(game,1,60)];
  assert.equal(startSEControl(game,'combat').ok,false);
  for(const input of [{x:0,y:0},{x:1,y:0},{x:0,y:0}]){
   assert.deepEqual(updateSEControl(game,.05,input),input);
   assert.equal(game.seControl,null);
  }
  assert.ok(leaveCampDefense(game));
  updateSEControl(game,.05,{x:0,y:0});
  assert.equal(game.seControl?.mode,'combat');
 }
});

test('自有坦克进入兽潮携带安装状态，消耗随车库存，关闭装置并刷新后仍一致',()=>{
 const g=scene(),hull=g.vehicle.index;
 g.progress.restoration.repaired.push('defense');
 const build=seBuild(g.progress,hull);
 Object.assign(build,{owned:['flare','rocket','shield','mine'],installed:['flare','rocket','shield'],disabled:['rocket'],levels:{shield:1,flare:2},shield:420});
 g.progress.supplies.vehicles[hull].flare=3;
 Object.assign(g.player,campDefensePost(g.progress,'left'));
 assert.ok(startCampDefense(g,'left'));
 assert.ok(g.vehicle.active);
 assert.ok(seActive(g,'shield'));
 assert.equal(seActive(g,'rocket'),false);
 assert.equal(seActive(g,'mine'),false);
 assert.equal(absorbSEShield(g,35),0);
 g.surfaceNight=1;
 updateVehicleFlares(g,.04);
 assert.equal(g.progress.supplies.vehicles[hull].flare,2);
 assert.equal(g.progress.supplies.activeFlare.level,2);
 let save;
 g.livingPersist=next=>{save=structuredClone(next);return true;};
 assert.ok(configureVehicleSE(g,hull,'shield','toggle').ok);
 const restored=new Game(validateProgress(save),()=>.5);
 assert.equal(restored.campDefense.gateId,'left');
 assert.ok(restored.vehicle.active);
 assert.equal(seActive(restored,'shield'),false);
 assert.equal(seBuild(restored.progress,hull).shield,385);
 assert.ok(leaveCampDefense(restored));
 assert.deepEqual(seBuild(restored.progress,hull).installed,['flare','rocket','shield']);
 assert.equal(restored.progress.supplies.vehicles[hull].flare,2);
});
