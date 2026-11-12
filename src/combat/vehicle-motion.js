import {MECH_HULL,MECH_STEP,mechFoot} from '../config/biped-mech.js';
import horse from '../../assets/vehicle-eras/horse.json' with {type:'json'};
import {eraVehicle} from '../config/vehicle-eras.js';
// 轮式载具按真实位移滚动，避免撞墙空转和停车重置轮姿。
import { nearest } from '../world/coordinates.js';

// 步态只按实走距离前进；停步时把悬空脚收至地面，每次接触只生成一簇尘土。
function advanceMechStep(v,previous,dx,dy,distance,dt,fx){
 const half=Math.PI,cycle=2*half,start=((v.wheelPhase||0)%cycle+cycle)%cycle;
 if(distance>120){v.wheelPhase=0;return;}
 const moving=distance>1e-6;
 if(moving){
  // 转弯或倒车时逐渐调整迈步方向，避免两脚瞬间换位。
  const blend=v.strideX===undefined?1:Math.min(1,distance/12);
  v.strideX=(v.strideX||0)*(1-blend)+dx/distance*blend;
  v.strideY=(v.strideY||0)*(1-blend)+dy/distance*blend;
 }
 const next=(Math.floor(start/half)+1)*half;
 if(!moving&&(start%half===0||dt<=0))return;
 const advanced=moving?start+distance/MECH_STEP*half:Math.min(next,start+dt*18);
 const boundary=Math.round(advanced/half)*half;
 const end=Math.abs(advanced-boundary)<1e-9?boundary:advanced;
 for(let contact=next;contact<=end;contact+=half){
  const side=contact%cycle===0?-1:1;
  const foot=mechFoot(side,MECH_STEP/2,v.strideX||0,v.strideY||0);
  const fraction=(contact-start)/(end-start);
  const x=previous.x+dx*fraction+foot.x,y=previous.y+dy*fraction+foot.y+1;
  for(const drift of [-1,1])fx?.add('step-dust',x+drift*4,y,.32,{vx:drift*28,vy:-9,size:4,color:'#c7ae87'});
 }
 v.wheelPhase=end%cycle;
}

// 在正式移动完成后累计有界轮角；反向驾驶反转，暂停及下车保留姿态。
export function advanceVehicleWheels(vehicle, player, previous, dt=0, fx=null) {
  if (!vehicle.active || vehicle.index!==MECH_HULL && !eraVehicle(vehicle.index) && ![0,4,5,6,7,8,9,10].includes(vehicle.index)) return;
  const point = nearest(player, previous), dx = point.x - previous.x, dy = point.y - previous.y;
  const distance = Math.hypot(dx, dy);
  if(vehicle.index===MECH_HULL){advanceMechStep(vehicle,previous,dx,dy,distance,dt,fx);return;}
  if(eraVehicle(vehicle.index)?.horse){
    const mode=distance>.02?'walk':'idle';
    if(mode!==vehicle.horseMode){
      vehicle.horseCursor=horse.transitions[mode][vehicle.horseFrame??0];
      vehicle.horseMode=mode;
    }
    const sequence=horse[mode];
    vehicle.horseCursor=(vehicle.horseCursor+(mode==='walk'?distance/7:dt*horse.fps))%sequence.length;
    vehicle.horseFrame=sequence[Math.floor(vehicle.horseCursor)];
  }
  if (distance < 1e-8) return;
  const direction = Math.sign(Math.abs(dy) >= Math.abs(dx) ? dy : dx);
  const cycle = Math.PI * 2;
  vehicle.wheelPhase = ((vehicle.wheelPhase || 0) + direction * distance / 12) % cycle;
}
