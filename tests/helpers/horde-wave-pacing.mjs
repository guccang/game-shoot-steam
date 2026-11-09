// 首次兽潮配装与真实战斗采样；仅准备主线装备，伤害和生命均由正式游戏推进。
import {Game,freshProgress} from '../../src/game.js';
import {CAMP_GATES} from '../../src/config/camp-defense.js';
import {startCampDefense} from '../../src/core/camp/camp-defense.js';
import {grantVehicleArmament} from '../../src/config/vehicle-armaments.js';
import {MAINLINE_IDS} from '../../src/config/mainline.js';
import {vehicleParkingSite} from '../../src/core/vehicles/camp-parking.js';
// 固定随机种子便于前后比较，不修改命中或暴击。
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
// 还原抵达西门时的基础战车、专属主炮、三级手枪和二级栗子。
export function hordeGame(seed=42,gateId='left'){
 const p=freshProgress();p.restoration.repaired=['clearing','cottage','story','garage','defense'];p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('pine-patrol'));p.mainline.phase='doing';p.weapon=0;p.weapons[0]=3;p.heroes[0]=2;p.vehicleIndex=0;p.vehicleHulls[0]=1;grantVehicleArmament(p,0);
 const g=new Game(p,random(seed));g.start();g.mainlineTalkDelay=99999;Object.assign(g.player,vehicleParkingSite(g,0));if(!g.summonVehicle())throw Error('无法驾驶任务战车');Object.assign(g.player,CAMP_GATES.find(gate=>gate.id===gateId));if(!startCampDefense(g,gateId))throw Error('无法开始兽潮');return g;
}
// 守在拒马前，领主蓄力时横移；不瞬移、不自动补血、不跳波。
export function hordeInput(g){
 const r=g.campDefense,b=g.boss,p=g.player;
 if(b&&['windup','cast'].includes(b.ai.phase)){const angle=b.ai.angle??Math.atan2(p.y-b.y,p.x-b.x);return {x:-Math.sin(angle),y:Math.cos(angle)};}
 const target={x:r.barrier.x+r.gate.nx*115,y:r.barrier.y+r.gate.ny*115},dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);
 return d>15?{x:dx/d,y:dy/d}:{x:0,y:0};
}
// 记录每一波的真实清场时间和剩余防线，直到结算或达到有界时间。
export function measureHorde(seed=42,gateId='left'){
 const g=hordeGame(seed,gateId),waves=[];let last='',elapsed=0,bossStart=null;
 while(elapsed<600&&g.campDefense.phase!=='result'){
  const r=g.campDefense,key=r.phase+':'+r.wave;
  if(key!==last){waves.push({phase:r.phase,wave:r.wave,seconds:+elapsed.toFixed(2),gateHp:+r.gateHp.toFixed(1),vehicleHp:g.vehicle.hp,playerHp:g.player.hp});last=key;if(r.phase==='boss')bossStart=elapsed;}
  g.update(1/30,hordeInput(g));elapsed+=1/30;
 }
 const r=g.campDefense;return {seed,gateId,seconds:+elapsed.toFixed(2),bossSeconds:bossStart===null?null:+(elapsed-bossStart).toFixed(2),won:r.bossDefeated&&!r.reason,phase:r.phase,reason:r.reason,kills:r.kills,gateHp:+r.gateHp.toFixed(1),vehicleHp:g.vehicle.hp,playerHp:g.player.hp,waves};
}
