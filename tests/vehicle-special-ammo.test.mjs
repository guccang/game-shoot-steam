// 主炮增强弹与三域照明的正式库存、事务、弹道和视野回归。
import test from 'node:test';import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {grantVehicleArmament,VEHICLE_WEAPONS} from '../src/config/vehicle-armaments.js';
import {REGIONAL_CAMPS,regionalNpc} from '../src/config/regional-camps.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {SPECIAL_AMMO} from '../src/config/vehicle-special-ammo.js';
import {regionalCampAction} from '../src/core/camp/regional-camps.js';
import {configureSpecialAmmo,tradeSupply} from '../src/core/vehicles/supplies.js';
import {enhancedVehicleShot,detonateSpecialAmmo,updateSpecialAmmo} from '../src/combat/vehicle-special-ammo.js';
import {updateVehicleFlares,vehicleFlareLights} from '../src/world/vehicle-flares.js';
import {surfaceAttackRange,surfaceTargetVisible} from '../src/world/surface-vision.js';
import {fireBallistics,updateBallistics} from '../src/combat/ballistics.js';
// 独立车队与空旷靶位，不绕过购买、存档和命中结算。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[1]=1;grantVehicleArmament(p,1);p.vehicleIndex=1;p.coins=10000;const g=new Game(p,()=>.5);g.state='playing';g.mainlineSpeech=null;g.trees=[];g.enemies=[];g.boss=null;g.vehicle.active=true;g.livingPersist=()=>true;g.progress.campParking.owned=[];Object.assign(g.player,{x:9000,y:9000});return g;}
// 高生命靶体保证不会以死亡奖励掩盖伤害来源。
function enemy(g,id,x=100){return {id,type:'enemy',x:g.player.x+x,y:g.player.y,hp:10000,maxHp:10000,radius:17,mass:1,speed:0};}
test('旧档默认照明开启，库存与关闭开关及剩余光照保存',()=>{const g=scene();assert.equal(g.progress.supplies.autoFlare,true);g.progress.supplies.autoFlare=false;g.progress.supplies.vehicles[1].frost=12;g.progress.supplies.selectedSpecial[1]='frost';const p=validateProgress(g.progress);assert.equal(p.supplies.autoFlare,false);assert.equal(p.supplies.vehicles[1].frost,12);assert.equal(p.supplies.selectedSpecial[1],'frost');});
test('各营地专售弹与通售照明，越权、金币不足及保存失败不扣库存',()=>{for(const c of REGIONAL_CAMPS){const g=scene();Object.assign(g.player,regionalNpc(c));const key=Object.keys(SPECIAL_AMMO).find(k=>SPECIAL_AMMO[k].camp===c.id);assert.equal(regionalCampAction(g,c.id,'ammo',{key,target:'vehicle',hull:1}).ok,true);assert.equal(g.progress.supplies.vehicles[1][key],12);assert.equal(regionalCampAction(g,c.id,'ammo',{key:'flare',target:'vehicle',hull:1}).ok,true);assert.equal(regionalCampAction(g,c.id,'ammo',{key:'he',target:'vehicle',hull:1}).ok,false);const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(regionalCampAction(g,c.id,'ammo',{key,target:'vehicle',hull:1}).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;g.progress.coins=0;assert.equal(regionalCampAction(g,c.id,'ammo',{key,target:'vehicle',hull:1}).ok,false);}});
test('主营不能异地购买或制作增强弹，设置保存失败回滚',()=>{const g=scene();g.cottage={kind:'ammo',outside:{...g.player}};assert.equal(tradeSupply(g,{kind:'ammo',id:'frost',target:'vehicle'}).ok,false);assert.equal(tradeSupply(g,{kind:'ammo',id:'he',target:'vehicle',craft:true}).ok,false);g.cottage=null;g.livingPersist=()=>false;assert.equal(configureSpecialAmmo(g,{key:'gas',autoFlare:false}).ok,false);assert.equal(g.progress.supplies.autoFlare,true);g.livingPersist=()=>true;assert.equal(configureSpecialAmmo(g,{key:'gas',autoFlare:false}).ok,true);});
test('增强装填单次消耗，耗尽回到普通弹；机枪与临时活动不扣永久库存',()=>{const g=scene(),s=g.progress.supplies;s.selectedSpecial[1]='frost';s.vehicles[1].frost=1;assert.equal(enhancedVehicleShot(g,VEHICLE_WEAPONS[17]).specialAmmo,undefined);assert.equal(s.vehicles[1].frost,1);const w=enhancedVehicleShot(g,VEHICLE_WEAPONS[18]);assert.equal(w.specialAmmo,'frost');assert.equal(s.vehicles[1].frost,0);assert.equal(enhancedVehicleShot(g,VEHICLE_WEAPONS[18]).specialAmmo,undefined);s.vehicles[1].frost=1;g.realm={};assert.equal(enhancedVehicleShot(g,VEHICLE_WEAPONS[18]).specialAmmo,undefined);assert.equal(s.vehicles[1].frost,1);});
test('六种弹真实命中、持续伤害和一次触发，区域数量有上限',()=>{for(const key of Object.keys(SPECIAL_AMMO).filter(k=>k!=='flare')){const g=scene(),e=enemy(g,1);g.enemies=[e];const b={x:e.x,y:e.y,initialAmount:100,specialAmmo:key,weaponIndex:18,statisticsSource:{kind:'vehicle',index:1}};detonateSpecialAmmo(g,b);assert.ok(e.hp<10000,key);const after=e.hp;detonateSpecialAmmo(g,b);assert.equal(e.hp,after);if(key==='frost'){assert.equal(e.chill,4);assert.equal(e.chillFactor,.25);}if(['flame','gas'].includes(key)){updateSpecialAmmo(g,2);assert.ok(e.hp<after);g.state='paused';const hp=e.hp;updateSpecialAmmo(g,3);assert.equal(e.hp,hp);}for(let i=0;i<12;i++)detonateSpecialAmmo(g,{...b,specialDetonated:false});assert.ok(g.specialAmmoZones.length<=8);}});
test('真实炮弹携带增强效果，穿透不重复爆破',()=>{const g=scene();g.enemies=[enemy(g,1,120),enemy(g,2,180)];fireBallistics(g,{...VEHICLE_WEAPONS[18],specialAmmo:'frost'},g.player,{x:1,y:0},230,false,true);for(let i=0;i<30;i++)updateBallistics(g,.02);assert.ok(g.enemies.every(e=>e.hp<10000&&e.chill>0));assert.equal(g.specialAmmoZones.length,1);});
test('照明仅夜间驾驶触发，单枚空中光源不重复扣弹，过期/走远补发',()=>{const g=scene(),s=g.progress.supplies;s.vehicles[1].flare=8;g.surfaceNight=0;updateVehicleFlares(g,1);assert.equal(s.vehicles[1].flare,8);g.surfaceNight=1;updateVehicleFlares(g,.1);assert.equal(s.vehicles[1].flare,7);assert.equal(vehicleFlareLights(g).length,1);updateVehicleFlares(g,6);assert.equal(surfaceAttackRange(g,560),560);assert.equal(surfaceTargetVisible(g,enemy(g,2,400)),true);updateVehicleFlares(g,10);assert.equal(s.vehicles[1].flare,7);g.progress=validateProgress(g.progress);updateVehicleFlares(g,1);assert.equal(g.progress.supplies.vehicles[1].flare,7);updateVehicleFlares(g,28);assert.equal(g.progress.supplies.vehicles[1].flare,6);g.player.y+=700;updateVehicleFlares(g,.1);assert.equal(g.progress.supplies.vehicles[1].flare,5);g.progress.supplies.autoFlare=false;g.player.y+=700;updateVehicleFlares(g,46);assert.equal(g.progress.supplies.vehicles[1].flare,5);assert.equal(vehicleFlareLights(g).length,0);});
test('暂停、下车、白天与空库存不自动发射，坦克基础威力提升',()=>{const g=scene();g.surfaceNight=1;g.progress.supplies.vehicles[1].flare=2;g.state='paused';updateVehicleFlares(g,50);assert.equal(g.progress.supplies.vehicles[1].flare,2);g.state='playing';g.vehicle.active=false;updateVehicleFlares(g,1);assert.equal(g.progress.supplies.vehicles[1].flare,2);g.vehicle.active=true;g.progress.supplies.vehicles[1].flare=0;updateVehicleFlares(g,1);assert.equal(vehicleFlareLights(g).length,0);assert.equal(VEHICLE_WEAPONS[18].damage,230);assert.equal(VEHICLE_WEAPONS[18].reloadTime,1.8);assert.equal(VEHICLE_WEAPONS[18].blastRadius,90);});

// 固定与变步长验证实际车炮周期和后坐，使用当前有限弹药夹具。
test('坦克增强开火每发只扣一枚，1.8秒周期且保持真实后坐',async()=>{const {updateVehicle}=await import('../src/combat/vehicle.js');for(const steps of [[.01],[.017,.024,.013]]){const g=scene();g.enemies=[enemy(g,1,200)];g.progress.supplies.vehicles[1].shell=20;g.progress.supplies.vehicles[1].he=10;g.progress.supplies.selectedSpecial[1]='he';g.vehicle.module.magazine={ammo:1,remaining:0};let elapsed=0;const times=[];g.onEvent=(name)=>{if(name==='shot')times.push(elapsed);};for(let i=0;elapsed<8;i++){const dt=steps[i%steps.length];elapsed+=dt;updateVehicle(g,dt);}assert.equal(times.length,5);assert.equal(g.progress.supplies.vehicles[1].he,5);assert.ok(g.projectiles.every(b=>b.specialAmmo==='he'));for(let i=1;i<times.length;i++)assert.ok(Math.abs(times[i]-times[i-1]-1.8)<.05);assert.ok(Number.isFinite(g.vehicle.recoil.tankAge));}});

// 晴叶商店正向交易仍走正式库存路由，不只验证拒绝路径。
test('晴叶能购买高爆与照明，库存重量参与货舱校验',()=>{const g=scene();g.cottage={kind:'ammo',outside:{...g.player}};for(const id of ['he','flare']){const before=g.progress.coins,r=tradeSupply(g,{kind:'ammo',id,target:'vehicle'});assert.ok(r.ok,r.message);assert.equal(g.progress.supplies.vehicles[1][id],SPECIAL_AMMO[id].pack);assert.equal(g.progress.coins,before-SPECIAL_AMMO[id].coins);}});

// 行驶方向独立于炮塔，光圈随车速前移，存档恢复同一弹道。
test('倒车与斜行按实际速度提前照明，经过发射点外的光圈仍沿用原弹',()=>{
 const g=scene(),s=g.progress.supplies;
 g.surfaceNight=1;s.vehicles[1].flare=10;
 for(const [vx,vy] of [[-150,0],[50,50],[0,-60],[0,90],[40,0]]){
  Object.assign(g.player,{x:9000,y:9000,vx,vy});s.activeFlare=null;
  updateVehicleFlares(g,.01);
  const shot=s.activeFlare;
  assert.equal(shot.angle,Math.atan2(vy,vx));
  assert.equal(shot.travel,Math.min(280,85+2*Math.hypot(vx,vy)));
  updateVehicleFlares(g,6);
  const light=vehicleFlareLights(g)[0];
  assert.ok(Math.abs(light.x-shot.x-Math.cos(shot.angle)*shot.travel)<1e-6);
  assert.ok(Math.abs(light.y-shot.y-Math.sin(shot.angle)*shot.travel)<1e-6);
  assert.deepEqual(validateProgress(g.progress).supplies.activeFlare,shot);
  Object.assign(g.player,{x:shot.x+390*Math.cos(shot.angle),y:shot.y+390*Math.sin(shot.angle)});
  updateVehicleFlares(g,.01);assert.equal(s.activeFlare,shot);
 }
});

// 围栏内的整段停留及入营后的到期均不耗弹，离开安全区恢复夜间补发。
test('主营和五处小营地暂停发射，出营补发',()=>{
 const g=scene(),s=g.progress.supplies;
 g.surfaceNight=1;s.vehicles[1].flare=8;
 for(const p of [{x:390,y:729},...REGIONAL_CAMPS]){
  Object.assign(g.player,{x:p.x,y:p.y});updateVehicleFlares(g,46);
  assert.equal(s.activeFlare,null);assert.equal(s.vehicles[1].flare,8);
 }
 const camp=REGIONAL_CAMPS[0];
 Object.assign(g.player,{x:camp.x+450,y:camp.y});updateVehicleFlares(g,.1);
 assert.equal(s.activeFlare,null);
 g.player.x++;updateVehicleFlares(g,.1);assert.equal(s.vehicles[1].flare,7);
 g.player.x=camp.x;updateVehicleFlares(g,46);
 assert.equal(s.activeFlare,null);assert.equal(s.vehicles[1].flare,7);
});
