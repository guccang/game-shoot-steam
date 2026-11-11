import {syncSEControl} from '../../combat/vehicle-se.js';
// SE 装配事务与操作入口；装配在工坊完成，控制开关可随车操作。
import {VEHICLE_SE,SE_INSTALL_LIMIT,SE_MAX_UPGRADE,seLevel,seUpgradeCost,seShieldMax,usesPersonalSE,seBuild,normalizeVehicleSE} from '../../config/vehicle-se.js';
import {regionalCampHere} from '../camp/regional-camp-access.js';
import {vehicleBuildReason} from './vehicle-build.js';
import {vehicleLoad} from '../../progression/inventory/load-weight.js';
import {syncCampDefense} from '../camp/camp-defense.js';
import {capturePatrol} from '../battle/patrol-session.js';
// 保存成功后才替换正式进度，失败不扣金币或改变装置状态。
export function configureVehicleSE(g,h,key,action,value){
 if(!VEHICLE_SE[key]||!g.progress.vehicleHulls[h]||!['playing','paused'].includes(g.state))return {ok:false,message:'当前无法操作装置。'};
 if(['buy','install','remove'].includes(action)){
  const reason=vehicleBuildReason(g,h);
  if(reason)return {ok:false,message:reason};
  const camp=regionalCampHere(g);
  if(action!=='remove' && camp && camp.seDevice!==key && !seBuild(g.progress,h).owned.includes(key)){
   return {ok:false,message:'这处营地未出售该装置。'};
  }
 }
 else if(action==='upgrade'){
  if(g.cottage?.kind!=='seWorkshop')return {ok:false,message:'请到 SE 改装工坊升级。'};
 }
 else if(!['toggle','radius'].includes(action)||!usesPersonalSE(g))return {ok:false,message:'当前无法操作装置。'};
 const next=structuredClone(g.progress);next.vehicleSE=normalizeVehicleSE(next.vehicleSE,next.vehicleHulls.length);const b=next.vehicleSE[h],r=VEHICLE_SE[key];let cost=0;
 if(action==='upgrade'){
  if(!b.owned.includes(key))return {ok:false,message:'这辆车尚未拥有该装置。'};
  const level=seLevel(b,key);
  if(level>=SE_MAX_UPGRADE)return {ok:false,message:'该装置已升至最高级。'};
  cost=seUpgradeCost(key,level);
  if(next.coins<cost)return {ok:false,message:'金币不足。'};
  next.coins-=cost;b.levels[key]=level+1;
 }
 else if(action==='buy'){
  if(b.owned.includes(key))return {ok:false,message:'这辆车已拥有该装置。'};
  if(next.coins<r.coins)return {ok:false,message:'金币不足。'};
  next.coins-=r.coins;
  b.owned.push(key);if(key==='shield')b.shield=seShieldMax(b);
 }
 else if(action==='install'){if(b.installed.includes(key))return {ok:false,message:'该装置已经安装。'};
  if(b.installed.length>=SE_INSTALL_LIMIT)return {ok:false,message:`每辆车最多安装 ${SE_INSTALL_LIMIT} 个 SE 装置，请先卸下一件。`};
  cost=b.owned.includes(key)?0:r.coins;if(next.coins<cost)return {ok:false,message:'金币不足。'};if(!b.owned.includes(key)){b.owned.push(key);if(key==='shield')b.shield=seShieldMax(b);}b.installed.push(key);b.disabled=b.disabled.filter(k=>k!==key);next.coins-=cost;if(vehicleLoad(g,h,{progress:next,driver:true}).overloaded)return {ok:false,message:'安装后载荷不足，请先卸货。'};}
 else if(action==='remove'){if(!b.installed.includes(key))return {ok:false,message:'该装置未安装。'};b.installed=b.installed.filter(k=>k!==key);b.disabled=b.disabled.filter(k=>k!==key);}
 else if(action==='toggle'){if(!b.installed.includes(key))return {ok:false,message:'请先安装装置。'};b.disabled=b.disabled.includes(key)?b.disabled.filter(k=>k!==key):[...b.disabled,key];}
 else {if(key!=='combat'||![150,250,400].includes(value))return {ok:false,message:'请选择有效范围。'};b.radius=value;}
 const snapshot=Object.create(g);snapshot.progress=next;
 // 局内切换装置时，随同本波进度和当前驾驶状态一次写入候选存档。
 if(g.campDefense)syncCampDefense(snapshot);
 next.patrol=capturePatrol(snapshot);let saved=false;try{saved=g.livingPersist?.(next)===true;}catch{}
 if(!saved)return {ok:false,message:'保存失败，金币与装置未改变。'};g.progress=next;if(action!=='buy'&&h===g.vehicle.index&&['combat','autopilot'].includes(key)){
  if(key==='autopilot')g.sePausedRoute=null;
  syncSEControl(g);
 }
 if(action==='upgrade')return {ok:true,message:r.name+'改装至 +'+b.levels[key]+'，花费 '+cost+' 金币。'};
 if(action==='buy')return {ok:true,message:r.name+'已购入，可在任一营地给这辆车安装。'};
 return {ok:true,message:action==='remove'?r.name+'已卸下，保存在该车工坊库存。':action==='install'?r.name+'安装完成，花费'+cost+'金币。':'装置设置已保存。'};
}
