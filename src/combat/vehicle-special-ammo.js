import {terrainLineClear} from '../physics/terrain-navigation.js';
// 主炮增强弹的消耗、范围命中与持续区域；只作用于真实敌人，原炮弹与后坐保留。
import {SPECIAL_AMMO} from '../config/vehicle-special-ammo.js';
import {ammoKind} from '../config/supplies.js';
import {finiteSupply,supplyAmmoCount,takeSupplyAmmo} from './supply-ammo.js';
import {advanceReload,consumeRound} from './magazine.js';
import {worldDistance,nearest} from '../world/coordinates.js';
// 只有标准/重型主炮使用增强装填，机枪、水炮及活动借用弹药不消耗永久特种弹。
export function enhancedVehicleShot(game,weapon,override){
 const s=game.progress.supplies,key=override??s.selectedSpecial?.[game.vehicle.index],rule=SPECIAL_AMMO[key];
 if(!finiteSupply(game)||!['shell','heavy'].includes(ammoKind(weapon))||!rule||key==='flare'||!(s.vehicles[game.vehicle.index]?.[key]>0))return weapon;
 s.vehicles[game.vehicle.index][key]--;return {...weapon,specialAmmo:key,color:rule.color,hitRadius:Math.max(6,weapon.hitRadius||0)};
}
const combatShells=Object.keys(SPECIAL_AMMO).filter(key=>key!=='flare');
// 普通弹匣和对应口径的备用弹都空后，从本车库存优先选用指定增强弹。
export function fallbackShell(game,weapon,mag){
 if(mag?.ammo!==0||!finiteSupply(game)||!['shell','heavy'].includes(ammoKind(weapon)))return null;
 const h=game.vehicle.index,s=game.progress.supplies,stock=s.vehicles[h];
 if(stock[ammoKind(weapon)]>0)return null;
 const selected=s.selectedSpecial?.[h];
 if(combatShells.includes(selected)&&stock[selected]>0)return selected;
 return combatShells.find(key=>stock[key]>0)||null;
}
// 备用增强弹留在原库存直至开火，换装与存档不会将其还原为普通炮弹。
export function advanceMainGunReload(game,w,mag,dt){
 const h=game.vehicle.index;
 if(!fallbackShell(game,w,mag))return advanceReload(mag,w,dt,game.onEvent,n=>takeSupplyAmmo(game,w,n,h),supplyAmmoCount(game,w,h));
 const used=Math.min(dt,mag.remaining);mag.remaining-=used;
 return dt-used;
}
// 弹匣正常时沿用增强射击；弹匣已空时直接发射一枚可用增强弹并开始下次装填。
export function takeMainGunShot(game,w,mag){
 if(consumeRound(mag,w))return enhancedVehicleShot(game,w);
 const key=fallbackShell(game,w,mag);
 if(!key||mag.remaining>0)return null;
 mag.remaining=w.reloadTime;
 return enhancedVehicleShot(game,w,key);
}
// 同一枚穿甲炮弹只触发一次增强爆炸；伤害快照不随中途换装变化。
export function detonateSpecialAmmo(game,b){
 const r=SPECIAL_AMMO[b.specialAmmo];if(!r||b.specialDetonated)return;b.specialDetonated=true;
 const targets=[...game.enemies,...(game.boss?[game.boss]:[])].filter(t=>t.hp>0&&worldDistance(t,b)<=r.radius&&specialLineClear(game,b,t)).sort((a,c)=>worldDistance(a,b)-worldDistance(c,b));
 const impact={weaponIndex:b.weaponIndex,statisticsSource:b.statisticsSource,kind:b.specialAmmo,impulse:r===SPECIAL_AMMO.seismic?420:90,chillDuration:b.specialAmmo==='frost'?4:b.specialAmmo==='seismic'?2:0,chillFactor:b.specialAmmo==='frost'?.25:.5};
 for(const t of targets.slice(0,b.specialAmmo==='arcShell'?5:targets.length)){const p=nearest(t,b),d=Math.hypot(p.x-b.x,p.y-b.y)||1;game.hit(t,Math.round(b.initialAmount*r.power),false,{...impact,x:p.x,y:p.y,direction:{x:(p.x-b.x)/d,y:(p.y-b.y)/d}});if(b.specialAmmo==='arcShell')game.shots.push({kind:'arc-link',seed:t.id||1,x:b.x,y:b.y,ex:p.x,ey:p.y,life:.28,lifetime:.28,laser:true});}
 const zones=game.specialAmmoZones??=[];
 zones.push({x:b.x,y:b.y,key:b.specialAmmo,radius:r.radius,life:r.duration||.65,lifetime:r.duration||.65,tick:0,amount:b.initialAmount*(b.specialAmmo==='gas'?.18:.22),weaponIndex:b.weaponIndex,statisticsSource:b.statisticsSource,mapId:game.mapId});
 if(zones.length>8)zones.splice(0,zones.length-8);
 game.onEvent('explosion');
 game.fx.add('blast',b.x,b.y,.45,{size:r.radius*.6,color:r.color});game.fx.add('ring',b.x,b.y,.65,{size:r.radius,color:r.color});
}
// 区域逐秒结算，暂停/离线不推进；穿越地图与进入室内清除地表战斗残留。
export function updateSpecialAmmo(game,dt){
 if(game.state!=='playing')return;
 game.specialAmmoZones=(game.specialAmmoZones||[]).filter(z=>z.mapId===game.mapId&&(!game.cottage||game.trees?.mineScene)&&z.life>0);
 for(const z of game.specialAmmoZones){const step=Math.min(dt,z.life);z.life-=step;z.tick+=step;if(!['gas','flame'].includes(z.key))continue;while(z.tick>=1){z.tick--;for(const t of [...game.enemies,...(game.boss?[game.boss]:[])])if(t.hp>0&&worldDistance(t,z)<=z.radius&&specialLineClear(game,z,t))game.hit(t,Math.round(z.amount),false,{weaponIndex:z.weaponIndex,statisticsSource:z.statisticsSource,kind:z.key});}}
}

// 地下场景交给正式墙体射线，地表沿用山水几何遮挡。
function specialLineClear(game,a,b){return game.combatLineClear?game.combatLineClear(a,b):terrainLineClear(a,nearest(b,a),0);}
