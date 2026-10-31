import {VEHICLE_COOLDOWN} from '../config/vehicles.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 世界火警单独保存，不冒用秘境检查点；严格白名单防止损坏坐标或状态进入运行时。
import {FIRE_RESCUE as C,FIRE_TRANSIT_PHASES,FIRE_TRANSFER} from '../config/fire-rescue.js';
// 将存档数值约束在实际规则范围内。
const finite=(n,min,max,fallback)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
// 只恢复有效树坐标和已发生的火情，离线不传播、不补水、不发奖。
export function validateFireProgress(raw){
 const value={next:finite(raw?.next,0,600,C.randomMin),run:null,garage:raw?.garage?.parked?{parked:true,truckHp:finite(raw.garage.truckHp,0,1,1)}:null};const r=raw?.run;
 if(!r||!['offered','active','returning','won','lost',...FIRE_TRANSIT_PHASES].includes(r.phase)||!Array.isArray(r.fires)||r.fires.length<GAMEPLAY_VALUES.fire.treesPerGroup||r.fires.length>Math.max(10,GAMEPLAY_VALUES.fire.groupCount*GAMEPLAY_VALUES.fire.treesPerGroup))return value;
 const point=p=>p&&Number.isFinite(p.x)&&p.x>0&&p.x<3600&&Number.isFinite(p.y)&&p.y>0&&p.y<2800;
 if(!r.fires.every(f=>point(f)&&point(f.stop)))return value;
 const transit=FIRE_TRANSIT_PHASES.includes(r.phase);
 if(transit&&(!Array.isArray(r.transit?.path)||!r.transit.path.length||r.transit.path.length>500||!r.transit.path.every(point)))return value;
 value.run={phase:r.phase,rainExtinguished:r.rainExtinguished===true,townApproach:!!r.townApproach,source:r.source==='random'?'random':'manual',offerRemaining:finite(r.offerRemaining,0,C.offerSeconds,C.offerSeconds),water:finite(r.water,0,C.water,C.initialWater),remaining:finite(r.remaining,0,C.duration,C.duration),spread:finite(r.spread,0,C.spreadInterval,C.spreadInterval),refills:finite(r.refills,0,99,0),kills:finite(r.kills,0,99,0),waterGuide:!!r.waterGuide,filling:!!r.filling,groupsAwake:Array.isArray(r.groupsAwake)?r.groupsAwake.filter(n=>Number.isInteger(n)&&n>=0&&n<GAMEPLAY_VALUES.fire.groupCount):[],
  fires:r.fires.map(f=>({x:f.x,y:f.y,stop:{x:f.stop.x,y:f.stop.y},group:Number.isInteger(f.group)&&f.group>=0&&f.group<GAMEPLAY_VALUES.fire.groupCount?f.group:0,hp:finite(f.hp,0,C.fireHp,C.fireHp),lit:!!f.lit,ever:!!f.ever})),position:point(r.position)?{x:r.position.x,y:r.position.y}:null,
  enemies:(Array.isArray(r.enemies)?r.enemies:[]).filter(point).slice(0,GAMEPLAY_VALUES.fire.groupCount*2).map(e=>({x:e.x,y:e.y,hp:finite(e.hp,1,GAMEPLAY_VALUES.fire.emberHealth,GAMEPLAY_VALUES.fire.emberHealth)})),truckHp:finite(r.truckHp,0,1,1),truckCooldown:finite(r.truckCooldown,0,VEHICLE_COOLDOWN,0),wheelPhase:finite(r.wheelPhase,-Math.PI*2,Math.PI*2,0),truckAngle:finite(r.truckAngle,-Math.PI*2,Math.PI*2,0),bodyMotion:r.bodyMotion?{idleTime:finite(r.bodyMotion.idleTime,0,1e9,0),moveTime:finite(r.bodyMotion.moveTime,0,1e9,0),moveWeight:finite(r.bodyMotion.moveWeight,0,1,0)}:null,
  transit:transit?{path:r.transit.path.map(p=>({x:p.x,y:p.y})),step:Math.floor(finite(r.transit.step,0,r.transit.path.length,0)),speed:finite(r.transit.speed,0,C.walkSpeed,0),wait:finite(r.transit.wait,0,1,0)}:null,
  driving:transit?['departing','parking'].includes(r.phase):r.phase==='won'?false:r.driving!==false};
 // 转场检查点仅保存进度与一次换位标记，不重播已完成的回镇动作。
 if(r.phase==='transferring')Object.assign(value.run.transit,{transferElapsed:finite(r.transit.transferElapsed,0,FIRE_TRANSFER.duration,0),transferred:!!r.transit.transferred});
 // 旧版已交接存档迁移为车库待命，不重新发奖。
 if(r.phase==='won'&&!value.garage)value.garage={parked:true,truckHp:finite(r.truckHp,0,1,1)};return value;
}
