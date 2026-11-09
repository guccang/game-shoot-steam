// 巡护体验只记正式森林中当前任务的真实战斗，不改变伤害、波次或资源。
import {currentMainlineTask} from '../../config/mainline.js';
import {nativeVehicleWeapon} from '../../config/vehicle-armaments.js';
import {arrivalPending} from '../../config/ranger-arrival.js';

// 专属主炮按命中来源核验；伙伴、借用装备、试射和未接任务均不能代做。
export function recordMainlineExperience(game,event,target=null,impact=null){
 const run=game.progress?.mainline,spec=run&&currentMainlineTask(run)?.experience;
 if(!spec||run.phase!=='doing'||game.state!=='playing'||game.mapId!=='forest'||
  game.story||game.realm||game.fireActive||game.workshopTrial||arrivalPending(game.progress)||
  !game.vehicle?.active||game.vehicle.index!==spec.vehicle||!game.progress.vehicleHulls[spec.vehicle])return;
 const native=nativeVehicleWeapon(spec.vehicle)?.weaponIndex;
 let key;
 if(event==='enemy-defeat'){
  if(target?.type!=='enemy'||target.hp>0||target.realm||target.livingRequest||target.fireEvent||target.football||
   impact?.weaponIndex!==native||impact?.audioSource!=='primary')return;
  key=spec.kills;
 }else if(['wave-clear','boss-ready'].includes(event)&&game.vehicle.weaponIndex===native)key=spec.waves;
 if(key)run.seen[key]=Math.min(1e7,(run.seen[key]||0)+1);
}
