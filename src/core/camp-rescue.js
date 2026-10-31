// 援军代理复用正式装备与弹道，只在本局按敌群强度匹配火力与分批出场。
import {CAMP_DEFENSE} from '../config/camp-defense.js';
import {GAMEPLAY_VALUES} from '../config/gameplay-values.js';
import {freshProgress} from '../progression/progress.js';
import {nativeVehicleWeapon} from '../config/vehicle-armaments.js';
import {vehicleDamage,vehicleWeapon} from '../config/vehicles.js';
import {createVehicle,updateVehicle} from '../combat/vehicle.js';
import {createMagazines,advanceReload} from '../combat/magazine.js';
import {createRecoil,updateRecoil} from '../combat/recoil.js';
import {createCatMotion,updateCatMotion} from './cat-motion.js';
import {advanceVehicleWheels} from '../combat/vehicle-motion.js';
import {createWeaponCycle} from '../combat/grenades.js';
import {createPulseState} from '../combat/pulse.js';
import {shotSolution} from '../combat/aim.js';
import {worldDistance,nearest} from '../world/coordinates.js';

// 估算含装填的持续火力，散射和链式攻击按有效命中折算，避免顶级面板直接秒杀。
function sustainedDamage(weapon,damage){
 const cycle=weapon.interval+(weapon.reloadTime||0)/Math.max(1,weapon.magazineSize||1);
 const coverage=weapon.chain?1.8:weapon.id==='hover-tide'?2:Math.min(2,weapon.pellets||1);
 return damage*coverage/Math.max(.1,cycle);
}
// 按本次剩余生命与单体威胁计算援军配置，随机幅度受限且只影响临时代理。
export function campRescuePower(game){
 const enemies=[...game.enemies,...(game.boss?[game.boss]:[])].filter(e=>e.hp>0),n=Math.max(1,enemies.length);
 const health=enemies.reduce((s,e)=>s+e.hp,0),average=enemies.reduce((s,e)=>s+e.maxHp,0)/n||18;
 const damage=enemies.reduce((s,e)=>s+(e.damage||0),0)/n;
 const roll=game.campDefense.rescueRoll??=.9+game.random()*.2;
 return {level:Math.min(GAMEPLAY_VALUES.progress.maxEquipmentLevel,Math.max(1,Math.round(Math.log2(2+average/25+damage/6)))),
  dps:Math.max(average*.5,health/(CAMP_DEFENSE.rescue.combatSeconds+Math.sqrt(n)*.5))*roll,
  hitCap:Math.max(2,average*.45),roll};
}
// 求援抽取不同伙伴；出营时间表与火力仅写入临时会话，不赠送或升级玩家装备。
export function prepareCampAllies(game){
 const r=game.campDefense,cfg=CAMP_DEFENSE.rescue;
 if(!r.allies.length){const pool=CAMP_DEFENSE.allies.map((_,i)=>i);while(r.allies.length<2)r.allies.push(pool.splice(Math.min(pool.length-1,Math.floor(game.random()*pool.length)),1)[0]);}
 r.rescuePower=campRescuePower(game);
 r.helpers=r.allies.map((index,i)=>{
  const spec=CAMP_DEFENSE.allies[index],p=freshProgress();p.hero=spec.hero;p.weapon=spec.weapon;
  p.weapons.fill(r.rescuePower.level);p.heroes.fill(r.rescuePower.level);p.vehicleHulls.fill(r.rescuePower.level);p.vehicleWeapons.fill(r.rescuePower.level);
  p.vehicleIndex=spec.vehicle;p.vehicleLoadouts[spec.vehicle]=nativeVehicleWeapon(spec.vehicle).weaponIndex;
  const local=Object.create(game);local.statisticsExcluded=true;local.progress=p;local.player={...game.player,x:r.gate.x-r.gate.nx*(cfg.inside+i*cfg.queueGap),y:r.gate.y-r.gate.ny*(cfg.inside+i*cfg.queueGap),angle:Math.atan2(r.gate.ny,r.gate.nx),recoil:createRecoil(),bodyAnimation:createCatMotion(),walkPhase:0};
  local.vehicle=createVehicle(p,game.maxHp(),spec.vehicle);local.vehicle.active=true;local.vehicle.angle=local.player.angle;local.vehicles=[local.vehicle];local.magazines=createMagazines(p);
  // 伙伴采用背景音层与短击退，近身即时命中和在途弹丸都不把敌人抛离战场。
  local.hit=(target,amount,critical,impact)=>game.hit(target,amount,critical,{...impact,impulse:Math.min(40,impact?.impulse||0),pushLimit:50,audioSource:'companion'});
  local.onEvent=(type,data)=>game.onEvent(type,{...data,source:'companion'});local.float=game.float.bind(game);local.trees=[];local.attackTimer=0;local.aimLock=null;local.weaponCycle=createWeaponCycle();local.pulse=createPulseState();local.summonViewOrigin=game.player;
  return {spec,local,entered:false,outside:false,ready:false,flank:(i?1:-1)*cfg.spread,enterAt:cfg.firstDelay+i*cfg.stagger};
 });
 const raw=r.helpers.map(({local})=>{const turret=local.vehicle.weaponIndex;return {hand:local.damage(),turret:vehicleDamage(local.progress,turret),dps:sustainedDamage(local.weapon(),local.damage())+sustainedDamage(vehicleWeapon(local.progress,turret),vehicleDamage(local.progress,turret))};});
 const scale=r.rescuePower.dps/raw.reduce((s,w)=>s+w.dps,0);
 r.helpers.forEach(({local},i)=>{local.progress.storyDamage=Math.min(scale,r.rescuePower.hitCap/raw[i].hand);local.progress.storyTurretDamage=Math.min(scale,r.rescuePower.hitCap/raw[i].turret);});
 game.player.hp=Math.max(1,game.player.hp);game.player.invincible=999;
}
// 每位伙伴穿过门洞后才开火；等待者既不绘制也不提前攻击，结束以真实击杀为准。
export function updateCampAllies(game,dt){
 const r=game.campDefense,cfg=CAMP_DEFENSE.rescue;r.rescueTime+=dt;
 for(const helper of r.helpers){
  if(r.rescueTime<helper.enterAt)continue;helper.entered=true;
  const {local}=helper,p=local.player,previous={x:p.x,y:p.y};
  local.enemies=game.enemies;local.boss=game.boss;
  const targets=[...game.enemies,...(game.boss?[game.boss]:[])].filter(e=>e.hp>0),target=targets.sort((a,b)=>worldDistance(a,p)-worldDistance(b,p))[0];
  const exit={x:r.barrier.x+r.gate.nx*cfg.outside,y:r.barrier.y+r.gate.ny*cfg.outside};
  // 先沿门洞中心驶出，再分到两侧，避免车辆在同一射击点叠成一团。
  const rally={x:exit.x-r.gate.ny*helper.flank,y:exit.y+r.gate.nx*helper.flank};
  const deployment=helper.outside?rally:exit;
  const goal=!helper.ready?nearest(deployment,p):target&&nearest(target,p),distance=goal?Math.hypot(goal.x-p.x,goal.y-p.y):0;
  const stop=helper.ready?cfg.attackDistance:0;
  if(distance>stop){const step=Math.min(distance-stop,cfg.speed*dt);p.x+=(goal.x-p.x)/distance*step;p.y+=(goal.y-p.y)/distance*step;}
  if(!helper.outside&&worldDistance(p,exit)<2)helper.outside=true;
  if(helper.outside&&!helper.ready&&worldDistance(p,rally)<2)helper.ready=true;
  const movement=worldDistance(p,previous);advanceVehicleWheels(local.vehicle,p,previous);p.walkPhase+=movement/12;updateCatMotion(p.bodyAnimation,dt,movement/Math.max(.001,dt),false);
  p.flash=Math.max(0,(p.flash||0)-dt);updateRecoil(p.recoil,local.progress.weapon,dt);
  if(!helper.ready){local.enemies=[];local.boss=null;updateVehicle(local,dt);continue;}
  if(target)p.angle=shotSolution(p,target,local.progress.weapon,local.aimLock).angle;
  const firstBullet=game.projectiles.length,w=local.weapon();advanceReload(local.magazines[local.progress.weapon],w,dt,()=>{});local.attackTimer-=dt;local.updateWeaponAbility(dt);
  if(target&&local.attackTimer<=0&&local.attack())local.attackTimer=w.interval;
  updateVehicle(local,dt);
  for(let i=firstBullet;i<game.projectiles.length;i++){const b=game.projectiles[i];b.impulse=Math.min(40,b.impulse||0);b.pushLimit=50;b.audioSource='companion';}
 }
 return r.helpers.every(h=>h.ready)&&!game.boss&&!game.enemies.some(e=>e.hp>0);
}
