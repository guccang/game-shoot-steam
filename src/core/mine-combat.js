import {MINING} from '../config/mining.js';
import {mineRockTargets,hitMineRock} from './mine-rocks.js';
// 地下战斗适配正式武器；弹道与特效属于当前层，弹药和装备读取真实库存。
import {GAMEPLAY_VALUES} from '../config/gameplay-values.js';
import {mineAnimalStats} from '../config/mine-ecology.js';
import {currentMineLayer} from './mine-layers.js';
import {mineOccupancy,mineLineClear} from '../physics/mine-motion.js';
import {miningCommit,mineNotice} from './mine-transactions.js';
import {CombatFX} from '../combat/effects.js';
import {emitWeaponAttack} from '../combat/weapon-fire.js';
import {updateBallistics} from '../combat/ballistics.js';
import {shotSolution} from '../combat/aim.js';
import {turnWeapon,weaponTurnRate} from '../combat/weapon-turn.js';
import {triggerRecoil,updateRecoil} from '../combat/recoil.js';
import {advanceReload,consumeRound} from '../combat/magazine.js';
import {supplyAmmoCount,takeSupplyAmmo,syncSupplyAmmo} from '../combat/supply-ammo.js';
import {advancePulse,createPulseState,kickHolder,updateHolderKick} from '../combat/pulse.js';
import {createWeaponCycle,advanceGrenadeCharge,launchGrenade} from '../combat/grenades.js';
import {updateFunnel,resetFunnelFormation} from '../combat/funnel.js';
import {updateMechanical,resetMechanicalFormation} from '../combat/mechanical.js';
import {updateSpider,resetSpiderFormation} from '../combat/spider.js';
import {updateGravityFields} from '../combat/gravity-field.js';

// 当前存档实体结算：事务更换进度后仍不会重复击杀或漏掉第二颗子弹。
export function hitMineAnimal(game,animal,damage,impact={}){
 const a=currentMineLayer(game).animals[animal.key];if(!a||a.hp<=0||!(damage>0))return false;
 if(a.hp>damage){a.hp-=damage;a.flash=.18;}
 else{
  const reward=mineAnimalStats(a.kind,game.cottage.depth).reward;
  const result=miningCommit(game,(m,p,l)=>{Object.assign(l.animals[a.key],{hp:0,death:.6,phase:'dead',respawn:l.age+180});m.ore+=reward;},`击退${mineAnimalStats(a.kind).name}，获得 ${reward} 矿石。`);
  if(!result.ok){a.hp=1;return false;}a.hp=0;return true;
 }
 if(impact.water)a.wet=2;
 if(impact.chillFactor){a.chill=impact.chillDuration||1;a.chillFactor=impact.chillFactor;}
 if(impact.direction&&impact.impulse){const step=Math.min(18,impact.pushLimit||18,impact.impulse*.025),n=Math.max(1,Math.ceil(step/3));for(let i=0;i<n;i++){const x=a.x+impact.direction.x*step/n,y=a.y+impact.direction.y*step/n;if(!mineOccupancy(game,x,y,9,a.kind==='bat'))break;a.x=x;a.y=y;}}
 return true;
}
// 连续小步和二分定位岩壁，射线、飞行弹、爆炸及连锁共用同一阻挡。
export function clipMineCombatLine(game,start,end){
 const distance=Math.hypot(end.x-start.x,end.y-start.y),steps=Math.max(1,Math.ceil(distance/6));let previous=0;
 for(let i=0;i<=steps;i++){const t=i/steps,x=start.x+(end.x-start.x)*t,y=start.y+(end.y-start.y)*t;
  if(!mineOccupancy(game,x,y,0,true)){let lo=previous,hi=t;for(let j=0;j<8;j++){const mid=(lo+hi)/2;if(mineOccupancy(game,start.x+(end.x-start.x)*mid,start.y+(end.y-start.y)*mid,0,true))lo=mid;else hi=mid;}return {x:start.x+(end.x-start.x)*lo,y:start.y+(end.y-start.y)*lo,blocked:true};}previous=t;
 }
 return {...end,blocked:false};
}
// 把目标连同边缘余量一起检测，提前收住而不是穿墙后再回退一段距离。
export function projectMineFlyingPoint(game,point){
 const p=game.player,length=Math.hypot(point.x,point.y);
 if(length<.0001)return {x:point.x,y:point.y};
 const extended=(length+MINING.flyingMargin)/length;
 const hit=clipMineCombatLine(game,p,{x:p.x+point.x*extended,y:p.y+point.y*extended});
 if(!hit.blocked)return {x:point.x,y:point.y};
 const safe=Math.max(0,Math.hypot(hit.x-p.x,hit.y-p.y)-MINING.flyingMargin),ratio=Math.min(1,safe/length);
 return {x:point.x*ratio,y:point.y*ratio};
}
// 弱引用只记录运行时位置，不进入存档，也不延长炮体生命周期。
const mineFlyingAnchors=new WeakMap();
// 已在安全区内的炮体按上一帧位置扫掠，拐角处也不会被径向投影突然拉回。
export function constrainMineFlyingNode(game,node){
 const p=game.player,f=node.flight,anchor=mineFlyingAnchors.get(node);
 // 容差仅吸收射线二分的误差，不允许肉眼可见的越界。
 const valid=point=>{const safe=projectMineFlyingPoint(game,point);return Math.hypot(point.x-safe.x,point.y-safe.y)<.04;};
 const prior=anchor&&anchor.flight===f&&anchor.room===game.cottage&&anchor.depth===(game.cottage.depth||1)?{x:anchor.x-p.x,y:anchor.y-p.y}:null;
 const desired={x:node.x,y:node.y};
 let safe;
 // 传送或大幅换位直接恢复局部锚点，避免沿旧位置扫掠整条矿道。
 if(prior&&Math.hypot(prior.x-desired.x,prior.y-desired.y)<=MINING.tile*2&&valid(prior)){
  // 逐段扫掠防止跨过狭小岩角；只在遇阻后做二分，不重置飞行相位。
  const sweep=(from,to)=>{
   const length=Math.hypot(to.x-from.x,to.y-from.y),steps=Math.max(1,Math.ceil(length/4));let lo=0;
   for(let i=1;i<=steps;i++){const t=i/steps,q={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t};if(!valid(q)){let hi=t;for(let j=0;j<8;j++){const mid=(lo+hi)/2;if(valid({x:from.x+(to.x-from.x)*mid,y:from.y+(to.y-from.y)*mid}))lo=mid;else hi=mid;}return {x:from.x+(to.x-from.x)*lo,y:from.y+(to.y-from.y)*lo};}lo=t;}
   return to;
  };
  safe=sweep(prior,desired);
  if(Math.hypot(safe.x-desired.x,safe.y-desired.y)>.04){
   // 允许沿墙滑行，只拦住受阻分量，不把切向运动一并归零。
   safe=sweep(safe,{x:desired.x,y:safe.y});safe=sweep(safe,{x:safe.x,y:desired.y});
  }
  if(f){if(Math.abs(safe.x-desired.x)>.04)f.vx=0;if(Math.abs(safe.y-desired.y)>.04)f.vy=0;}
 }else{
  // 首次展开、切层或玩家传送后从当前可见空间恢复，旧层锚点不参与插值。
  safe=projectMineFlyingPoint(game,desired);
  const dx=desired.x-safe.x,dy=desired.y-safe.y,distance=Math.hypot(dx,dy);
  if(f&&distance>.0001){const outward=(f.vx*dx+f.vy*dy)/distance;if(outward>0){f.vx-=outward*dx/distance;f.vy-=outward*dy/distance;}}
 }
 node.x=safe.x;node.y=safe.y;
 mineFlyingAnchors.set(node,{x:p.x+node.x,y:p.y+node.y,flight:f,room:game.cottage,depth:game.cottage.depth||1});
}
// 只回收编队位置和场内特效，保留供给、装填、伙伴生命与冷却。
export function resetMineCombat(game){
 resetFunnelFormation(game.funnel);resetFunnelFormation(game.drone);resetMechanicalFormation(game.mechanical);resetSpiderFormation(game.spider);
 if(game.cottage?.kind==='mine')game.cottage.combat=null;
}
// 放下施工工具恢复持枪；不改变所装备武器，也不补弹。
export function readyMineWeapon(game){
 const r=game.cottage;if(r?.kind!=='mine'||game.state!=='playing'||game.vehicle.active)return false;
 Object.assign(r,{tool:null,autoDig:false,dig:null,shaftWork:0,strike:0});
 mineNotice(game,'已拿起武器，发现敌人自动迎战；弹药与地表共用。');return true;
}
// 活实体代理始终查询当前存档，供弹道索引在一次多目标击杀中继续使用。
function mineTargetProxy(game,key,id){
 const t={key,id,type:'enemy',radius:16};
 for(const field of ['hp','x','y','wet','chill','chillFactor'])Object.defineProperty(t,field,{enumerable:true,get:()=>currentMineLayer(game).animals[key]?.[field]||0,set:value=>{const a=currentMineLayer(game).animals[key];if(a)a[field]=value;}});
 return t;
}
// 场景适配只持有当前层短期数据，不把地表敌人、飞弹或掉落移入矿洞。
function combatContext(game){
 const room=game.cottage;if(room.combat)return room.combat;
 resetMineCombat(game);
 const b=Object.create(game);Object.defineProperty(b,'progress',{get:()=>game.progress,set:p=>{game.progress=p;}});
 Object.assign(b,{trees:[],enemies:[],boss:null,projectiles:[],shots:[],gravityFields:[],fx:new CombatFX(),particles:[],numbers:[],drops:[],pulse:createPulseState(),weaponCycle:createWeaponCycle(),attackTimer:0,aimLock:null,statisticsExcluded:true});
 b.combatLineClear=(a,z)=>mineLineClear(game,a,z);b.clipCombatLine=(a,z)=>clipMineCombatLine(game,a,z);
 b.combatWalkClear=(a,z,r=0)=>{const n=Math.max(1,Math.ceil(Math.hypot(z.x-a.x,z.y-a.y)/6));for(let i=0;i<=n;i++)if(!mineOccupancy(game,a.x+(z.x-a.x)*i/n,a.y+(z.y-a.y)*i/n,r,false))return false;return true;};
 b.trees.mineScene={walkable:(x,y,r,fly)=>mineOccupancy(game,x,y,r,fly)};
 // 飞行炮体不能藏进岩壁或跨墙展开，水面上方仍可悬停。
 b.projectFlyingPoint=point=>projectMineFlyingPoint(game,point);
 b.constrainFlyingNode=node=>constrainMineFlyingNode(game,node);
 b.hit=(target,amount,critical,impact)=>target.mineRock?hitMineRock(game,target,amount):hitMineAnimal(game,target,amount,impact);
 b.findAttackTarget=()=>[...b.enemies,...(b.weapon().targetTrees===false?[]:b.trees)].filter(a=>a.hp>0&&Math.hypot(a.x-b.player.x,a.y-b.player.y)<Math.min(420,b.weapon().range+a.radius)&&b.combatLineClear(b.player,a)).sort((a,z)=>Number(!!a.mineRock)-Number(!!z.mineRock)||Math.hypot(a.x-b.player.x,a.y-b.player.y)-Math.hypot(z.x-b.player.x,z.y-b.player.y))[0]||null;
 b.recordStoryEvent=()=>{};room.combat=b;return b;
}
// 作业保留近身矿镐；普通行走和乘矿车使用真实装备，暂停由地下循环冻结。
export function updateMineCombat(game,dt){
 const room=game.cottage,b=combatContext(game),w=game.weapon(),index=game.loadout.weapon,mag=game.magazines[index];
 b.enemies=Object.keys(currentMineLayer(game).animals).filter(key=>{const a=currentMineLayer(game).animals[key];return a.hp>0&&Math.hypot(a.x-game.player.x,a.y-game.player.y)<650;}).map(key=>mineTargetProxy(game,key,Number(key.split(',')[0])*10000+Number(key.split(',')[1])+10000000));
 b.trees.splice(0,b.trees.length,...mineRockTargets(game));
 const armed=!game.fishing&&!game.vehicle.active&&!room.tool&&!room.autoDig&&!room.shaftWork;
 room.weaponReady=armed;room.weaponTarget=null;
 b.fx.update(dt);for(const n of b.numbers){n.life-=dt;n.y-=dt*35;}b.numbers=b.numbers.filter(n=>n.life>0);for(const s of b.shots)s.life-=dt;b.shots=b.shots.filter(s=>s.life>0);
 updateRecoil(game.player.recoil,index,dt);
 if(b.weaponIndex!==index){b.weaponIndex=index;b.pulse=createPulseState();b.weaponCycle=createWeaponCycle();b.attackTimer=0;}
 const fireTime=advanceReload(mag,w,dt,game.onEvent,n=>takeSupplyAmmo(game,w,n),supplyAmmoCount(game,w));
 if(armed){
  const target=b.findAttackTarget();room.weaponTarget=target?.key||null;
  if(w.controller){if(['funnel','drone'].includes(w.controller))updateFunnel(b,dt);else if(w.controller==='mechanical')updateMechanical(b,dt);else if(w.controller==='spider')updateSpider(b,dt);}
  else if(w.attackKind!=='defense'){
   const shot=target?shotSolution({...game.player,y:game.player.y-(room.ride?8:0)},target,index):null;
   const aligned=shot&&turnWeapon(game.player,shot.angle,dt,weaponTurnRate(w));
   b.attackTimer=Math.max(-fireTime,b.attackTimer-fireTime);
   const charged=w.chargeTime?advancePulse(b.pulse,w,fireTime,!!target):true;
   for(let burst=0;burst<8&&target?.hp>0&&aligned&&charged&&b.attackTimer<=1e-8&&mag.remaining===0&&mag.ammo>0;burst++){
    // 枪口伸进岩壁时不扣弹；贴身目标仍由共用枪口碰撞处理。
    if(b.combatLineClear({x:game.player.x,y:game.player.y-8},shot.muzzle)){
     const critical=game.random()<GAMEPLAY_VALUES.combat.criticalChance,amount=Math.round(game.damage()*(critical?GAMEPLAY_VALUES.combat.criticalMultiplier:1));
     consumeRound(mag,w);emitWeaponAttack(b,w,shot.muzzle,shot.direction,amount,critical,false,mag);triggerRecoil(game.player.recoil,index);
     b.attackTimer+=w.interval;b.weaponCycle.firing=mag.remaining===0;game.onEvent('shot',{kind:w.id,laser:w.id==='laser'});
     if(w.chargeTime){b.pulse.charge=0;b.pulse.cooldown=w.cooldown;kickHolder(game.player,shot.direction,w.selfImpulse);break;}
    }
   }
   if(w.grenade&&advanceGrenadeCharge(b.weaponCycle,w,fireTime,!!target&&aligned&&mag.remaining===0))launchGrenade(b,w,shot.muzzle,target,game.damage());
  }
 }else{b.pulse.charge=0;b.weaponCycle=createWeaponCycle();}
 updateBallistics(b,dt);updateGravityFields(b,dt);if(!room.ride&&!game.vehicle.active)updateHolderKick(game.player,dt,b.trees);
 syncSupplyAmmo(game);
}
