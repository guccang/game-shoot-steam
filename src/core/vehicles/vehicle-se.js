// SE 装配事务与操作入口；装配在工坊完成，控制开关可随车操作。
import {VEHICLE_SE,seBuild,normalizeVehicleSE} from '../../config/vehicle-se.js';
import {vehicleBuildReason} from './vehicle-build.js';
import {vehicleLoad} from '../../progression/inventory/load-weight.js';
import {capturePatrol} from '../battle/patrol-session.js';
// 保存成功后才替换正式进度，失败不扣金币或改变装置状态。
export function configureVehicleSE(g,h,key,action,value){
 if(!VEHICLE_SE[key]||!g.progress.vehicleHulls[h]||!['playing','paused'].includes(g.state))return {ok:false,message:'当前无法操作装置。'};
 if(['install','remove'].includes(action)){const reason=vehicleBuildReason(g,h);if(reason)return {ok:false,message:reason};}
 else if(!['toggle','radius'].includes(action)||g.realm||g.story||g.fireActive||g.campDefense||g.workshopTrial)return {ok:false,message:'当前无法操作装置。'};
 const next=structuredClone(g.progress);next.vehicleSE=normalizeVehicleSE(next.vehicleSE,next.vehicleHulls.length);const b=next.vehicleSE[h],r=VEHICLE_SE[key];let cost=0;
 if(action==='install'){if(b.installed.includes(key))return {ok:false,message:'该装置已经安装。'};cost=b.owned.includes(key)?0:r.coins;if(next.coins<cost)return {ok:false,message:'金币不足。'};if(!b.owned.includes(key))b.owned.push(key);b.installed.push(key);b.disabled=b.disabled.filter(k=>k!==key);next.coins-=cost;if(vehicleLoad(g,h,{progress:next,driver:true}).overloaded)return {ok:false,message:'安装后载荷不足，请先卸货。'};}
 else if(action==='remove'){if(!b.installed.includes(key))return {ok:false,message:'该装置未安装。'};b.installed=b.installed.filter(k=>k!==key);b.disabled=b.disabled.filter(k=>k!==key);}
 else if(action==='toggle'){if(!b.installed.includes(key))return {ok:false,message:'请先安装装置。'};b.disabled=b.disabled.includes(key)?b.disabled.filter(k=>k!==key):[...b.disabled,key];}
 else {if(key!=='combat'||![150,250,400].includes(value))return {ok:false,message:'请选择有效范围。'};b.radius=value;}
 const snapshot=Object.create(g);snapshot.progress=next;next.patrol=capturePatrol(snapshot);let saved=false;try{saved=g.livingPersist?.(next)===true;}catch{}
 if(!saved)return {ok:false,message:'保存失败，金币与装置未改变。'};g.progress=next;if(h===g.vehicle.index)g.seControl=null;
 return {ok:true,message:action==='remove'?r.name+'已卸下，保存在该车工坊库存。':action==='install'?r.name+'安装完成，花费'+cost+'金币。':'装置设置已保存。'};
}
