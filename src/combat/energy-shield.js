import {energyShieldPoint,hasEnergyShield} from './energy-shield-surface.js';

// 两种护盾共用命中记录，四个角度分别随罩体移动。
export function recordShieldImpact(state,point){
 state.shieldImpacts=[...(state.shieldImpacts||[]).slice(-3),{angle:point.angle,life:.42}];
}
// 按有效游玩时间淡出每次命中的光环。
export function advanceShieldImpacts(state,dt){
 if(state.shieldImpacts?.length)state.shieldImpacts=state.shieldImpacts.map(hit=>({...hit,life:hit.life-dt})).filter(hit=>hit.life>0);
}
// 局部涟漪最多保留四处，沿盾面保存角度，移动后仍贴住罩体。
export function markEnergyShieldImpact(game,source){
 if(!hasEnergyShield(game))return null;
 const m=game.magazines[game.loadout.weapon],point=energyShieldPoint(game,source);
 recordShieldImpact(m,point);
 m.shieldFlash=.22;
 return point;
}

// 护盾沿用当前武器供给槽保存容量与恢复计时，切枪、上下车不会重新充满。
export function absorbEnergyShield(game, amount, source=null) {
 const weapon=game.weapon();
 if(weapon.attackKind!=='defense'||amount<=0)return amount;
 const magazine=game.magazines[game.loadout.weapon];
 const absorbed=Math.min(Math.max(0,magazine.ammo),weapon.magazineSize,amount);
 if(absorbed<=0)return amount;
 const point=markEnergyShieldImpact(game,source);
 magazine.ammo=Math.max(0,magazine.ammo-absorbed);
 magazine.remaining=magazine.ammo>0?weapon.reloadTime:weapon.shieldBreakDelay;
 magazine.shieldFlash=.22;
 game.float(point.x,point.y,`护盾 −${Math.ceil(absorbed)}`,'#b7efe0');
 return amount-absorbed;
}

// 有效游玩时间内等待后逐点充能；跨越延迟边界的一帧只恢复剩余时间。
export function advanceEnergyShield(magazine, weapon, dt) {
 magazine.ammo=Math.max(0,Math.min(weapon.magazineSize,magazine.ammo));
 magazine.shieldFlash=Math.max(0,(magazine.shieldFlash||0)-dt);
 advanceShieldImpacts(magazine,dt);
 const wait=Math.min(dt,Math.max(0,magazine.remaining));
 magazine.remaining=Math.max(0,magazine.remaining-wait);
 magazine.ammo=Math.min(weapon.magazineSize,magazine.ammo+weapon.shieldRegen*(dt-wait));
}
