// SE 装置集成回归：存档、重量、事务、实际弹道与自动控制边界。
import test from 'node:test';import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {grantVehicleArmament} from '../src/config/vehicle-armaments.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {seBuild,normalizeVehicleSE,seMass} from '../src/config/vehicle-se.js';
import {configureVehicleSE} from '../src/core/vehicles/vehicle-se.js';
import {vehicleLoad} from '../src/progression/inventory/load-weight.js';
import {updateVehicleFlares} from '../src/world/vehicle-flares.js';
import {startSEControl,updateSEControl,updateSEDevices,absorbSEShield,seTargetAllowed} from '../src/combat/vehicle-se.js';
import {updateBallistics} from '../src/combat/ballistics.js';
import {requestWorldNavigation} from '../src/core/navigation/world-navigation.js';
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
  flare:90,autopilot:160,combat:240,rocket:475,shield:375
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
