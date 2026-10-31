// 车体装配仅在工坊办理，保存成功后更新同一辆车，保留损耗比例及弹药。
import {validateProgress} from '../progression/progress.js';
import {vehicleBuild,VEHICLE_ENGINES,LOAD_RULES} from '../config/vehicle-load.js';
import {vehicleModel,vehicleMaxHp} from '../config/vehicles.js';
import {economyFor} from '../config/economy.js';
import {personalFleet} from './vehicle-repair.js';
import {sendMail} from '../progression/mailbox.js';
import {capturePatrol} from './patrol-session.js';
// 不同底盘使用对应价格；已买发动机免费换装，拆下装甲保管在工坊。
export function vehicleBuildPrice(progress,index,action,choice=0){
 const b=vehicleBuild(progress,index),price=economyFor(progress).vehicles[index]?.coins||0;
 if(action==='engine')return b.engines.includes(choice)?0:Math.ceil(price*(VEHICLE_ENGINES[choice]?.price||0));
 return action==='add-armor'&&!b.spares?Math.max(1,Math.ceil(price*LOAD_RULES.platePriceRate)):0;
}
// 受理边界与按钮相同，不能用旧升级接口或异地请求免费改车。
export function vehicleBuildReason(game,index){
 if(!personalFleet(game)||!['playing','paused'].includes(game.state))return '请结束当前活动后到载具工坊装配。';
 if(game.cottage?.kind!=='vehicle')return '请进入载具工坊，与售货员交谈后装配。';
 if(!game.progress.vehicleHulls[index])return '尚未拥有这辆载具。';
 if(game.progress.vehicleService?.[index]?.phase)return '车辆损坏或正在维修，请先修复再装配。';
 if(game.progress.logistics.tow)return '请先解除牵引。';return '';
}
// 所有扣费、物件与邮件先提交候选存档，失败不改变运行时耐久。
export function configureVehicleBuild(game,index,action,choice=0){
 const reason=vehicleBuildReason(game,index);if(reason)return {ok:false,message:reason};
 const next=validateProgress(structuredClone(game.progress)),b=vehicleBuild(next,index),v=game.vehicles[index];let label;
 if(action==='engine'){
  if(!Number.isInteger(choice)||!VEHICLE_ENGINES[choice]||choice===b.engine)return {ok:false,message:'请选择另一款发动机。'};
  label='换装'+VEHICLE_ENGINES[choice].name;
 }else if(action==='add-armor'){
  if(b.plates>=LOAD_RULES.maxPlates)return {ok:false,message:'已达到装甲层数上限。'};label='加装一层装甲';
 }else if(action==='remove-armor'){
  if(!b.plates||b.spares>=LOAD_RULES.maxPlates)return {ok:false,message:'没有可拆装甲或工坊保管位已满。'};label='拆下一层装甲';
 }else return {ok:false,message:'无效装配方案。'};
 const cost=vehicleBuildPrice(next,index,action,choice);if(next.coins<cost)return {ok:false,message:`金币不足，需要 ${cost} 金币。`};next.coins-=cost;
 if(action==='engine'){b.engine=choice;if(!b.engines.includes(choice))b.engines.push(choice);}
 else if(action==='add-armor'){b.plates++;if(b.spares)b.spares--;}
 else{b.plates--;b.spares++;}
 const ratio=v.maxHp?v.hp/v.maxHp:0,snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 sendMail(next,{sender:'载具工坊',title:vehicleModel(index).name+'装配手续',body:`${label}，实际支付 ${cost} 金币。现有附加装甲 ${b.plates} 层。拆下的装甲和已购发动机存放在工坊，不计入随车重量。`});
 let saved=false;try{saved=game.livingPersist?.(next)===true;}catch{}
 if(!saved)return {ok:false,message:'保存失败，装配与费用未生效。'};
 game.progress=next;v.maxHp=vehicleMaxHp({...next,vehicleIndex:index});v.hp=Math.max(0,Math.min(v.maxHp,v.maxHp*ratio));
 return {ok:true,message:`${label}完成，花费 ${cost} 金币。耐久损耗比例保持不变。`};
}
