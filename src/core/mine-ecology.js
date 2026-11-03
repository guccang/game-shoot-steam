import {updateMineCombat,hitMineAnimal} from './mine-combat.js';
import {absorbEnergyShield} from '../combat/energy-shield.js';
// 地下生态只推进当前层的可见时间，采集再生、独立怪物和防卫不污染地表敌人。
import {mineCell,mineKey,minePoint} from '../config/mining.js';
import {MINE_ANIMALS as A,MINE_ECOLOGY as E,mineAnimalStats,mineThreatLimit,mineTerrain,mineCellOpen,mineInsideBounds} from '../config/mine-ecology.js';
import {mineEntrancePlatform} from '../world/mine-entrances.js';
import {currentMineLayer} from './mine-layers.js';
import {miningCommit,mineNotice} from './mine-transactions.js';
import {mineOccupancy,mineLineClear} from '../physics/mine-motion.js';
import {vehicleWeapon,vehicleDamage} from '../config/vehicles.js';
import {consumeRound,advanceReload} from '../combat/magazine.js';
import {takeSupplyAmmo,supplyAmmoCount} from '../combat/supply-ammo.js';
import {triggerRecoil,updateRecoil} from '../combat/recoil.js';
// 天然水面无需挖掘即可铺桥，脚下和前方均可施工，桥面支持轨道与战车。
export function buildMineBridge(game,ahead=true){
 if(game.cottage?.kind!=='mine'||game.state!=='playing'||game.cottage.ride)return mineNotice(game,'请停稳下矿车后建桥。');
 const cell=mineCell(game.player),d=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}][game.cottage.direction];if(ahead){cell.x+=d.x;cell.y+=d.y;}
 const key=mineKey(cell),l=currentMineLayer(game);if(!mineInsideBounds(l,minePoint(cell).x,minePoint(cell).y))return mineNotice(game,'外围是坚硬岩层，无法建桥。');if(!mineCellOpen(cell,l)||!mineTerrain(cell,l).water||l.bridges[key])return mineNotice(game,'请选择附近的无桥水面。');
 if(game.progress.mining.ore<E.bridge.ore||game.progress.wood<E.bridge.wood)return mineNotice(game,'桥面需要 2 矿石、4 木材。');
 return miningCommit(game,(m,p,layer)=>{m.ore-=E.bridge.ore;p.wood-=E.bridge.wood;layer.dug[key]=true;layer.bridges[key]=true;},'桥面已铺好，可以通行和铺轨。');
}
// 林木、晶簇、遗迹和草甸采用同一再生时钟；暂停与离开本层都不会刷取奖励。
export function harvestMine(game){
 if(game.cottage?.kind!=='mine'||game.state!=='playing'||game.cottage.ride)return mineNotice(game,'请下矿车后采集。');
 const l=currentMineLayer(game),cell=mineCell(game.player),key=mineKey(cell),t=mineTerrain(cell,l),b=t.biome;
 if(mineEntrancePlatform(cell,l)||!mineCellOpen(cell,l)||!b.resource||t.safe||t.water||!t.prop)return mineNotice(game,'请站到有菌木、晶簇、草药或化石的地块采集。');
 if((l.harvested[key]||0)>l.age)return mineNotice(game,`这里正在恢复，约 ${Math.ceil(l.harvested[key]-l.age)} 秒后可再次采集。`);
 const r=miningCommit(game,(m,p,layer)=>{layer.dug[key]=true;layer.harvested[key]=layer.age+b.regrow;if(b.resource==='wood')p.wood+=b.yield;else if(b.resource==='ore')m.ore+=b.yield;},b.resource==='heal'?`采集恢复草药，恢复 ${b.yield} 生命。`:`采集${b.name}，获得 ${b.yield} ${b.resource==='wood'?'木材':'矿石'}。`);
 if(r.ok&&b.resource==='heal')game.player.hp=Math.min(game.maxHp(),game.player.hp+b.yield);return r;
}
// 扫描附近天然洞厅与已开掘区域，天然生物无需先挖出景观才出现。
function discoverAnimals(game,l){
 const center=mineCell(game.player);let count=Object.values(l.animals).filter(a=>a.hp>0&&Math.hypot(a.x-game.player.x,a.y-game.player.y)<520).length;
 for(let y=-E.scanRadius;y<=E.scanRadius;y++)for(let x=-E.scanRadius;x<=E.scanRadius;x++){
  if(count>=E.maxNearby)return;const cell={x:center.x+x,y:center.y+y},key=mineKey(cell),t=mineTerrain(cell,l),entry=minePoint(Object.fromEntries(l.entry.split(',').map((v,i)=>[i?'y':'x',Number(v)]))),p=minePoint(cell);
  if(!mineCellOpen(cell,l)||t.safe||t.water||t.hash%37!==0||Math.hypot(p.x-entry.x,p.y-entry.y)<240||Math.hypot(p.x-game.player.x,p.y-game.player.y)<180)continue;
  const old=l.animals[key];if(old&&(old.hp>0||old.respawn>l.age))continue;
  l.animals[key]={key,kind:t.biome.animal,...p,hp:mineAnimalStats(t.biome.animal,game.cottage.depth).hp,maxHp:mineAnimalStats(t.biome.animal,game.cottage.depth).hp,respawn:0,clock:0,phase:'roam',timer:0,flash:0,death:0};count++;
 }
}
// 地下受击绕开地表安全区；濒危时退回本层入口，战车保留一格装甲并停止自动开掘。
function hurtExplorer(game,damage){
 const room=game.cottage,l=currentMineLayer(game),[ex,ey]=l.entry.split(',').map(Number),entry=minePoint({x:ex,y:ey});if(room.hurtWait>0||Math.hypot(game.player.x-entry.x,game.player.y-entry.y)<135)return;room.hurtWait=.8;
 if(!game.vehicle.active&&!room.tool&&!room.autoDig&&!room.shaftWork)damage=absorbEnergyShield(room.combat||Object.assign(Object.create(game),{numbers:[]}),damage);
 if(game.vehicle.active)game.vehicle.hp=Math.max(0,game.vehicle.hp-damage);else game.player.hp=Math.max(0,game.player.hp-damage);
 if(game.player.hp>0&&(!game.vehicle.active||game.vehicle.hp>0))return;
 const [x,y]=l.entry.split(',').map(Number);Object.assign(game.player,minePoint({x,y}),{vx:0,vy:0});game.player.hp=Math.max(game.player.hp,Math.ceil(game.maxHp()*.4));if(game.vehicle.active)game.vehicle.hp=1;
 room.autoDig=false;room.tool=null;room.ride=null;room.running=false;room.hurtWait=4;room.bolts=[];if(room.combat){room.combat.projectiles=[];room.combat.shots=[];room.combat.gravityFields=[];}mineNotice(game,'紧急撤回本层入口。生命恢复到四成；受损战车请尽快返回维修。');
}
// 独立投射物与真实岩壁碰撞，孢子蓄力后瞄准固定位置，玩家可以走位躲避。
function advanceBolts(game,dt){
 const room=game.cottage;room.bolts??=[];
 room.bolts=room.bolts.filter(b=>{const next={x:b.x+b.vx*dt,y:b.y+b.vy*dt};b.life-=dt;if(b.life<=0||!mineLineClear(game,b,next))return false;Object.assign(b,next);
  if(b.enemy){if(Math.hypot(b.x-game.player.x,b.y-game.player.y)<(game.vehicle.active?32:15)){hurtExplorer(game,b.damage);return false;}}
  else{const a=Object.values(currentMineLayer(game).animals).find(a=>a.hp>0&&Math.hypot(b.x-a.x,b.y-a.y)<20);if(a){hitMineAnimal(game,a,b.damage);return false;}}return true;});
}
// 矿锄自动近身防卫，战车使用实际主炮伤害、余弹、装填和独立后坐，未开掘岩壁阻断索敌。
function defendExplorer(game,dt,actors){
 const room=game.cottage,p=game.player,v=game.vehicle;room.attackWait=Math.max(0,(room.attackWait||0)-dt);room.strike=Math.max(0,(room.strike||0)-dt);
 const weapon=v.active?vehicleWeapon(game.progress,v.weaponIndex):null,module=v.module;
 if(v.active&&weapon&&module){advanceReload(module.magazine,weapon,dt,game.onEvent,n=>takeSupplyAmmo(game,weapon,n,v.index),supplyAmmoCount(game,weapon,v.index));updateRecoil(v.recoil,v.weaponIndex,dt);}
 const range=v.active?Math.min(340,weapon?.range||260):64,target=actors.filter(a=>a.hp>0&&Math.hypot(a.x-p.x,a.y-p.y)<range&&mineLineClear(game,p,a)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 if(weapon?.id==='vehicle-vulcan'){v.rotorSpeed+=((target&&module?.magazine.ammo>0?38:0)-v.rotorSpeed)*Math.min(1,dt*7);v.rotor=(v.rotor+v.rotorSpeed*dt)%(Math.PI*2);}
 if(!target){room.charge=0;return;}if(room.attackWait>0)return;
 if(!v.active){const w=game.weapon(),mag=game.magazines[game.loadout.weapon];if(room.weaponReady&&(w.controller||w.attackKind==='defense'||mag.ammo>0||mag.remaining>0||supplyAmmoCount(game,w)>0))return;room.strike=.3;room.attackWait=.65;hitMineAnimal(game,target,24);return;}
 if(!weapon||!module||weapon.crew||module.magazine.modules||weapon.attackKind==='defense')return;
 room.charge=(room.charge||0)+dt;if(room.charge<(weapon.chargeTime||0))return;
 v.angle=Math.atan2(target.y-p.y,target.x-p.x);if(!consumeRound(module.magazine,weapon))return;
 room.charge=0;room.attackWait=Math.max(.12,weapon.interval||.65);triggerRecoil(v.recoil,v.weaponIndex);v.recoil.tankAngle=v.angle;
 const dx=target.x-p.x,dy=target.y-p.y,n=Math.max(1,Math.hypot(dx,dy));room.bolts.push({x:p.x,y:p.y,vx:dx/n*420,vy:dy/n*420,life:1.2,damage:vehicleDamage(game.progress,v.weaponIndex),enemy:false});
}
// 六足步态、独立翼拍和菌伞步行分别使用自己的连续时钟，蓄力、恢复、受击和死亡可见。
export function updateMineEcology(game,dt){
 const room=game.cottage,l=currentMineLayer(game);l.age+=dt;room.hurtWait=Math.max(0,(room.hurtWait||0)-dt);room.scanWait=(room.scanWait||0)-dt;
 if(room.scanWait<=0){room.scanWait=.6;discoverAnimals(game,l);}room.bolts??=[];
 const actors=Object.values(l.animals).filter(a=>Math.hypot(a.x-game.player.x,a.y-game.player.y)<560);room.ecologyActors=actors;
 const engaged=new Set(actors.filter(a=>a.hp>0&&mineLineClear(game,a,game.player)).sort((a,b)=>Number(b.phase==='windup')-Number(a.phase==='windup')||Math.hypot(a.x-game.player.x,a.y-game.player.y)-Math.hypot(b.x-game.player.x,b.y-game.player.y)).slice(0,mineThreatLimit(room.depth)).map(a=>a.key));
 for(const a of actors){a.clock=(a.clock||0)+dt;a.flash=Math.max(0,(a.flash||0)-dt);if(a.hp<=0){a.death=Math.max(0,(a.death||0)-dt);continue;}
  const spec=mineAnimalStats(a.kind,room.depth),dx=game.player.x-a.x,dy=game.player.y-a.y,distance=Math.hypot(dx,dy),[hx,hy]=a.key.split(',').map(Number),home=minePoint({x:hx,y:hy}),visible=mineLineClear(game,a,game.player),nearEntry=Math.hypot(game.player.x-minePoint(Object.fromEntries(l.entry.split(',').map((v,i)=>[i?'y':'x',Number(v)]))).x,game.player.y-minePoint(Object.fromEntries(l.entry.split(',').map((v,i)=>[i?'y':'x',Number(v)]))).y)<135;
  a.maxHp=spec.hp;a.wet=Math.max(0,(a.wet||0)-dt);a.chill=Math.max(0,(a.chill||0)-dt);
  a.timer=Math.max(0,(a.timer||0)-dt);
  if(a.phase==='windup'&&(!engaged.has(a.key)||nearEntry)){a.phase='roam';a.timer=0;}
  if(a.phase==='windup'){if(a.timer<=0){if(a.kind==='spore'){const n=Math.max(1,Math.hypot(a.aimX-a.x,a.aimY-a.y));room.bolts.push({x:a.x,y:a.y,vx:(a.aimX-a.x)/n*145,vy:(a.aimY-a.y)/n*145,life:2,damage:spec.damage,enemy:true});}else if(distance<spec.range+12&&visible&&!nearEntry)hurtExplorer(game,spec.damage);a.phase='recover';a.timer=spec.recover;}continue;}
  if(a.phase==='recover'&&a.timer>0)continue;
  if(engaged.has(a.key)&&!nearEntry&&visible&&distance<spec.range){a.phase='windup';a.timer=spec.windup;a.aimX=game.player.x;a.aimY=game.player.y;continue;}
  const chase=engaged.has(a.key)&&!nearEntry&&visible&&distance<290&&Math.hypot(a.x-home.x,a.y-home.y)<150,tx=chase?game.player.x:home.x+Math.sin(a.clock*.5)*26,ty=chase?game.player.y:home.y+Math.cos(a.clock*.4)*20,n=Math.max(1,Math.hypot(tx-a.x,ty-a.y)),speed=spec.speed*(chase?1:.25)*(a.chill>0?a.chillFactor||.65:1),nx=a.x+(tx-a.x)/n*speed*dt,ny=a.y+(ty-a.y)/n*speed*dt;
  a.phase='roam';a.moving=false;if(mineOccupancy(game,nx,a.y,9,a.kind==='bat')){a.moving=Math.abs(nx-a.x)>.01;a.x=nx;}if(mineOccupancy(game,a.x,ny,9,a.kind==='bat')){a.moving||=Math.abs(ny-a.y)>.01;a.y=ny;}if(a.moving)a.walk=(a.walk||0)+dt*10;
 }
 updateMineCombat(game,dt);advanceBolts(game,dt);defendExplorer(game,dt,Object.values(currentMineLayer(game).animals).filter(a=>Math.hypot(a.x-game.player.x,a.y-game.player.y)<400));
 room.ecologyActors=Object.values(currentMineLayer(game).animals).filter(a=>Math.hypot(a.x-game.player.x,a.y-game.player.y)<560);
}
