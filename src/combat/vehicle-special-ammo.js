import {terrainLineClear} from '../physics/terrain-navigation.js';
// 主炮增强弹的消耗、范围命中与持续区域；只作用于真实敌人，原炮弹与后坐保留。
import {SPECIAL_AMMO} from '../config/vehicle-special-ammo.js';
import {ammoKind} from '../config/supplies.js';
import {finiteSupply} from './supply-ammo.js';
import {worldDistance,nearest} from '../world/coordinates.js';
// 只有标准/重型主炮使用增强装填，机枪、水炮及活动借用弹药不消耗永久特种弹。
export function enhancedVehicleShot(game,weapon){
 const s=game.progress.supplies,key=s.selectedSpecial?.[game.vehicle.index],rule=SPECIAL_AMMO[key];
 if(!finiteSupply(game)||!['shell','heavy'].includes(ammoKind(weapon))||!rule||key==='flare'||!(s.vehicles[game.vehicle.index]?.[key]>0))return weapon;
 s.vehicles[game.vehicle.index][key]--;return {...weapon,specialAmmo:key,color:rule.color,hitRadius:Math.max(6,weapon.hitRadius||0)};
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
 game.specialAmmoZones=(game.specialAmmoZones||[]).filter(z=>z.mapId===game.mapId&&!game.cottage&&z.life>0);
 for(const z of game.specialAmmoZones){const step=Math.min(dt,z.life);z.life-=step;z.tick+=step;if(!['gas','flame'].includes(z.key))continue;while(z.tick>=1){z.tick--;for(const t of [...game.enemies,...(game.boss?[game.boss]:[])])if(t.hp>0&&worldDistance(t,z)<=z.radius&&specialLineClear(game,z,t))game.hit(t,Math.round(z.amount),false,{weaponIndex:z.weaponIndex,statisticsSource:z.statisticsSource,kind:z.key});}}
}

// 地下场景交给正式墙体射线，地表沿用山水几何遮挡。
function specialLineClear(game,a,b){return game.combatLineClear?game.combatLineClear(a,b):terrainLineClear(a,nearest(b,a),0);}
