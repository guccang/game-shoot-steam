import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 武器真实转向统一限速，最短弧跨越正负π；首次部署只初始化朝向。
export function turnWeapon(holder,desired,dt,rate=GAMEPLAY_VALUES.weaponTurn.defaultRate) {
  if(!holder.aimInitialized){holder.angle=desired;holder.aimInitialized=true;}
  const delta=Math.atan2(Math.sin(desired-holder.angle),Math.cos(desired-holder.angle));
  holder.angle+=Math.sign(delta)*Math.min(Math.abs(delta),Math.max(0,dt)*rate);
  return Math.abs(Math.atan2(Math.sin(desired-holder.angle),Math.cos(desired-holder.angle)))<GAMEPLAY_VALUES.weaponTurn.fireTolerance;
}

// 重型炮架比手持枪更沉；逻辑和显示共用同一角度，不绕过未完成转向。
export function weaponTurnRate(weapon,mounted=false) {
  return weapon.id==='tank-125'?GAMEPLAY_VALUES.weaponTurn.tankRate:mounted?GAMEPLAY_VALUES.weaponTurn.mountedRate:weapon.id==='gatling'?GAMEPLAY_VALUES.weaponTurn.gatlingRate:GAMEPLAY_VALUES.weaponTurn.handheldRate;
}
