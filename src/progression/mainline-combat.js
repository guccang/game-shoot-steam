// 主线复习只接受正式战斗结算，历史战绩和试射不代替接取后的挑战。
import {currentMainlineTask} from '../config/mainline.js';
import {nativeVehicleWeapon} from '../config/vehicle-armaments.js';
// 载具委托记录接取后亲自驾驶、使用专属主炮击败正式挑战敌人的事实。
export function recordMainlineVehiclePractice(game,target,impact){
 const run=game.progress?.mainline,task=currentMainlineTask(run);
 if(run?.phase!=='doing'||game.state!=='playing'||game.story||game.realm||game.workshopTrial||game.livingPreview||game.fireActive||!game.vehicle?.active)return;
 const op=task?.guide.steps.find(s=>s.operation?.kind==='vehicle'&&s.operation.record)?.operation;
 if(!op||game.vehicle.index!==op.index||!game.progress.vehicleHulls[op.index]||!['enemy','boss'].includes(target.type)||target.hp>0||target.workshopTarget||target.livingRequest||target.football||target.fireEvent)return;
 if(impact?.audioSource!=='primary'||impact.weaponIndex!==nativeVehicleWeapon(op.index)?.weaponIndex)return;
 if(op.type==='clearing'&&(!game.progress.living.patrolActive||game.campDefense))return;
 if(op.type==='camp-defense'&&(!target.campDefense||game.campDefense?.gateId!==op.gate||game.campDefense.reason))return;
 run.combatPractice=task.id;
}
// 调用方在正式胜利或兽潮候选存档中记账，保留结算失败重试的原子性。
export function recordMainlineCombat(progress,type,{gate=null,won=true}={}){
 const run=progress?.mainline;if(run?.phase!=='doing')return false;
 const op=currentMainlineTask(run)?.guide.steps.find(s=>s.operation?.type===type&&s.operation.record&&(!gate||s.operation.gate===gate))?.operation;
 if(!op||!won||!Object.hasOwn(run.seen,op.record))return false;
 // 清缴和兽潮只要求正式胜利；不额外检查武器、驾驶或主炮击杀。
 if(!['clearing','camp-defense'].includes(type)){
  if(op.kind==='weapons'&&(!(op.indices||[op.index]).includes(progress.weapon)||!progress.weapons[progress.weapon]))return false;
  if(op.kind==='vehicle'&&run.combatPractice!==currentMainlineTask(run).id)return false;
 }
 run.seen[op.record]=1;return true;
}
