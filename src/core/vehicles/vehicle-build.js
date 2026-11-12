import {regionalCampHere} from '../camp/regional-camp-access.js';
import {supplyVehicleNearby} from './supplies.js';
import {normalizeVehicleRefit,validVehicleZones,REFIT_RULES} from '../../config/vehicle-refit.js';
import {eraVehicle} from '../../config/vehicle-eras.js';
import {treasurePartReason} from '../activities/treasure.js';
import {vehicleLoad} from '../../progression/inventory/load-weight.js';
// 车体装配仅在工坊办理，保存成功后更新同一辆车，保留损耗比例及弹药。
import {validateProgress} from '../../progression/progress.js';
import {vehicleBuild,VEHICLE_ENGINES,LOAD_RULES} from '../../config/vehicle-load.js';
import {vehicleMaxHp,vehicleModel} from '../../config/vehicles.js';
import {economyFor} from '../../config/economy.js';
import {personalFleet} from './vehicle-repair.js';
import {capturePatrol} from '../battle/patrol-session.js';
// 不同底盘使用对应价格；已买发动机免费换装，拆下装甲保管在工坊。
export function vehicleBuildPrice(progress,index,action,choice=0){
 const b=vehicleBuild(progress,index),price=economyFor(progress).vehicles[index]?.coins??vehicleModel(index).purchaseRecipe?.coins??(eraVehicle(index)?.payload||0)*4;
 if(['upgrade-engine','upgrade-chassis'].includes(action))return Math.max(1,Math.ceil(price*.1*(1+normalizeVehicleRefit(b.refit)[action==='upgrade-engine'?'engineLevel':'chassisLevel'])));
 if(action==='engine')return b.engines.includes(choice)?0:Math.ceil(price*(VEHICLE_ENGINES[choice]?.price||0));
 return action==='add-armor'&&!b.spares?Math.max(1,Math.ceil(price*LOAD_RULES.platePriceRate)):0;
}
// 受理边界与按钮相同，不能用旧升级接口或异地请求免费改车。
export function vehicleBuildReason(game,index){
 if(!personalFleet(game)||!['playing','paused'].includes(game.state))return '请结束当前活动后到载具工坊装配。';
 if(game.cottage?.kind!=='vehicle'&&!(regionalCampHere(game)&&supplyVehicleNearby(game,index)))return '请进入载具工坊，与售货员交谈后装配。';
 if(!game.progress.vehicleHulls[index])return '尚未拥有这辆载具。';
 if(game.progress.vehicleService?.[index]?.phase)return '车辆损坏或正在维修，请先修复再装配。';
 if(game.progress.logistics.tow)return '请先解除牵引。';return '';
}
// 所有扣费、物件与邮件先提交候选存档，失败不改变运行时耐久。
export function configureVehicleBuild(game,index,action,choice=0){
 const reason=vehicleBuildReason(game,index);if(reason)return {ok:false,message:reason};
 const next=validateProgress(structuredClone(game.progress)),b=vehicleBuild(next,index),v=game.vehicles[index];let label;
 if(action==='engine'&&eraVehicle(index))return {ok:false,message:'此车的动力随车型升阶，请在车库选择下一代车型。'};
 if(action==='engine'){
  if(!Number.isInteger(choice)||!VEHICLE_ENGINES[choice]||choice===b.engine)return {ok:false,message:'请选择另一款发动机。'};
  if(VEHICLE_ENGINES[choice].treasure){const missing=treasurePartReason(game,'engine:'+choice,index);if(missing)return {ok:false,message:missing};}
  if(VEHICLE_ENGINES[choice].regional&&!b.engines.includes(choice))return {ok:false,message:'请到对应地区营地购买这款特色引擎。'};
  label='换装'+VEHICLE_ENGINES[choice].name;
 }else if(action==='add-armor'){
  if(b.plates>=LOAD_RULES.maxPlates)return {ok:false,message:'已达到装甲层数上限。'};label='加装一层装甲';
 }else if(action==='remove-armor'){
  if(!b.plates||b.spares>=LOAD_RULES.maxPlates)return {ok:false,message:'没有可拆装甲或工坊保管位已满。'};label='拆下一层装甲';
 }else if(['upgrade-engine','upgrade-chassis','zones'].includes(action)){
  b.refit=normalizeVehicleRefit(b.refit);
  if(action==='zones'){if(!validVehicleZones(choice))return {ok:false,message:'区域占比须合计100%，每区5%至80%。'};label='调整区域';}
  else {const key=action==='upgrade-engine'?'engineLevel':'chassisLevel';if(b.refit[key]>=REFIT_RULES.maxLevel)return {ok:false,message:'已达到改造上限。'};label=key==='engineLevel'?'强化引擎':'扩容底盘';}
 }else return {ok:false,message:'无效装配方案。'};
 const cost=vehicleBuildPrice(next,index,action,choice);if(next.coins<cost)return {ok:false,message:`金币不足，需要 ${cost} 金币。`};next.coins-=cost;
 if(action==='engine'){
  // 拆下的探索发动机回工坊，换上的实物从原货舱或原车移走，保持唯一。
  if(VEHICLE_ENGINES[b.engine].treasure){next.treasure.parts['engine:'+b.engine]={place:'workshop'};b.engines=b.engines.filter(i=>i!==b.engine);}
  if(VEHICLE_ENGINES[choice].treasure){const location=next.treasure.parts['engine:'+choice];if(location.place==='installed'&&location.hull!==index){const donor=next.logistics.builds[location.hull];donor.engine=0;donor.engines=donor.engines.filter(i=>i!==choice);}next.treasure.parts['engine:'+choice]={place:'installed',hull:index};}
  b.engine=choice;if(!b.engines.includes(choice))b.engines.push(choice);
  if(next.logistics.builds.some((build,i)=>game.progress.vehicleHulls[i]&&build.engine!==game.progress.logistics.builds[i].engine&&vehicleLoad(game,i,{progress:next,driver:true}).overloaded))return {ok:false,message:'换装后目标车或拆出发动机的原车将满载，请先卸货或减装甲。'};
 }
 else if(action==='add-armor'){b.plates++;if(b.spares)b.spares--;}
 else if(action==='remove-armor'){b.plates--;b.spares++;}
 else if(action==='zones')b.refit.zones={...choice};
 else b.refit[action==='upgrade-engine'?'engineLevel':'chassisLevel']++;
 if(action!=='remove-armor'&&vehicleLoad(game,index,{progress:next,driver:true}).overloaded)return {ok:false,message:'改造后载荷不足，请先卸货或增加引擎、储物区域。'};
 const ratio=v.maxHp?v.hp/v.maxHp:0,snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 let saved=false;try{saved=game.livingPersist?.(next)===true;}catch{}
 if(!saved)return {ok:false,message:'保存失败，装配与费用未生效。'};
 game.progress=next;v.maxHp=vehicleMaxHp({...next,vehicleIndex:index});v.hp=Math.max(0,Math.min(v.maxHp,v.maxHp*ratio));
 return {ok:true,message:`${label}完成，花费 ${cost} 金币。耐久损耗比例保持不变。`};
}
