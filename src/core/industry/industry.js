// 两厂在本厂室内办理生产；原料可来自厂内、门口停靠车辆和小屋仓库。
import {INDUSTRY_SITES} from '../../config/industry.js';
export {INDUSTRY_SITES} from '../../config/industry.js';
import {INDUSTRY_GOODS,INDUSTRY_RECIPES,INDUSTRY_CAP} from '../../config/industry.js';
import {industryStore} from '../../progression/industry/industry.js';
import {validateProgress} from '../../progression/progress.js';
import {commitCargo} from '../inventory/cargo.js';
import {vehicleLoad} from '../../progression/inventory/load-weight.js';
import {worldDistance} from '../../world/coordinates.js';
import {parkingRecordSite} from '../../progression/vehicles/roadside-parking.js';
import {PARKING_SPOTS} from '../../config/parking.js';
import {productionAvailable} from '../farming/farm-production.js';
export const INDUSTRY_DOCK_RADIUS=160;
// 门前停靠位置供导航、正式进屋和车辆范围共用。
export function industryDoor(site){return {...site,y:site.y+55};}
// 房间身份隔离两厂，远程菜单只能查看配方与路线。
export function canUseIndustry(game,id){return !!INDUSTRY_SITES[id]&&productionAvailable(game)&&game.mapId==='forest'&&game.cottage?.kind===id;}
// 只读取实际停车记录，不把未停放的随行车或其他建筑库内车当作原料来源。
export function industryVehicles(game,id=game.cottage?.kind){
 const site=INDUSTRY_SITES[id];if(!site||!productionAvailable(game)||game.mapId!=='forest')return [];
 const door=industryDoor(site),records=game.progress.campParking.owned;
 return records.filter(r=>game.progress.vehicleHulls[r.hull]&&!(game.vehicle.active&&game.vehicle.index===r.hull)&&!game.progress.vehicleService?.[r.hull]?.phase&&!PARKING_SPOTS.some(s=>s.id===r.spot&&s.indoor)&&parkingRecordSite(r).mapId==='forest'&&worldDistance(parkingRecordSite(r),door)<=INDUSTRY_DOCK_RADIUS)
 .sort((a,b)=>worldDistance(parkingRecordSite(a),door)-worldDistance(parkingRecordSite(b),door)||a.hull-b.hull).map(r=>r.hull).filter((h,i,list)=>list.indexOf(h)===i);
}
// 页面和扣料共用汇总，木材与原矿保持各自真实货仓字段。
export function industryCargoCount(game,id,key){return industryVehicles(game,id).reduce((n,hull)=>{const [stock,k]=industryStore(game.progress,key,hull);return n+(stock[k]||0);},0);}
// 页面按真实来源显示可用原料，小屋仓库与既有仓库装卸共用字段，不创建镜像库存。
export function industryMaterialSources(game,id,key){
 const [stock,k]=industryStore(game.progress,key,'home'),home=stock[k]||0,cargo=industryCargoCount(game,id,key),local=game.progress.industry.sites[id].input[key]||0;
 return {home,cargo,local,total:home+cargo+local};
}
// 按靠厂门顺序取料；只修改隔离候选，材料不足时整笔丢弃。
function takeCargo(progress,cars,key,count){
 for(const hull of cars){const [stock,k]=industryStore(progress,key,hull),n=Math.min(count,stock[k]||0);if(n){stock[k]-=n;count-=n;}if(!count)break;}
 return count;
}
// 成品按各车剩余载荷分装，容量计算与实际驾驶一致，任何放不下均不提交。
function loadCargo(game,progress,cars,key,count){
 const snapshot=Object.assign(Object.create(game),{progress}),mass=key==='wood'?.1:.5;
 for(const hull of cars){const [stock,k]=industryStore(progress,key,hull,true),load=vehicleLoad(snapshot,hull,{driver:false}),room=Math.max(0,Math.floor((load.capacity-load.payload-1e-6)/mass)),n=Math.min(count,room,INDUSTRY_CAP-(stock[k]||0));if(n){stock[k]=(stock[k]||0)+n;count-=n;}if(!count)break;}
 return count===0;
}
// 历史厂内原料可取回；领取成品直接装回停靠车辆，不再要求玩家选择货物位置。
export function transferIndustry(game,id,key,count,direction){
 if(!canUseIndustry(game,id))return {ok:false,message:'请进入这座工厂，与管理员交互。'};
 if(!INDUSTRY_GOODS[key]||!Number.isSafeInteger(count)||count<=0||!['deposit','collect','return'].includes(direction))return {ok:false,message:'请选择有效物品和数量。'};
 const cars=industryVehicles(game,id);if(!cars.length)return {ok:false,message:'厂门附近没有停靠的载具，请先把货车停好。'};
 const next=validateProgress(structuredClone(game.progress)),site=next.industry.sites[id],plant=direction==='collect'?site.output:site.input;
 if(direction==='deposit'){
  if(plant[key]+count>INDUSTRY_CAP||takeCargo(next,cars,key,count)>0)return {ok:false,message:'停靠载具的原料不足或厂内库存已满。'};
  plant[key]+=count;
 }else{
  if(plant[key]<count)return {ok:false,message:'厂内货物不足，请检查数量。'};
  if(!loadCargo(game,next,cars,key,count))return {ok:false,message:'停靠载具的剩余载荷不足，请先卸货或减少数量。'};
  plant[key]-=count;
 }
 return commitCargo(game,next,INDUSTRY_GOODS[key].name+' ×'+count+(direction==='deposit'?' 已投入厂内。':' 已装入停靠载具。'));
}
// 先用厂内和停靠车辆的原料，再从小屋仓库补足；全部来源在同一候选存档中扣除。
export function startIndustry(game,id,recipeId,count=1,now=Date.now()){
 if(!canUseIndustry(game,id))return {ok:false,message:'请进入这座工厂，与管理员安排生产。'};
 const recipe=INDUSTRY_RECIPES.find(r=>r.id===recipeId&&r.site===id),site=game.progress.industry.sites[id];
 if(!recipe||!Number.isSafeInteger(count)||count<1||count>99)return {ok:false,message:'每批请选择1至99份。'};
 if(site.job)return {ok:false,message:'当前批次正在生产。'};
 if(site.output[recipe.output]+recipe.count*count>INDUSTRY_CAP)return {ok:false,message:'成品仓已满，请先取货。'};
 const cars=industryVehicles(game,id),next=validateProgress(structuredClone(game.progress)),s=next.industry.sites[id];
 for(const [key,n] of Object.entries(recipe.input)){
  const needed=n*count,local=Math.min(s.input[key],needed);s.input[key]-=local;
  const remaining=takeCargo(next,cars,key,needed-local),[home,homeKey]=industryStore(next,key,'home');
  if((home[homeKey]||0)<remaining){const available=industryMaterialSources(game,id,key).total;return {ok:false,message:'原料不足：'+INDUSTRY_GOODS[key].name+'需要 '+needed+'，合计可用 '+available+'，还缺 '+(needed-available)+'。请补充到小屋仓库或本厂停靠载具。'};}
  home[homeKey]-=remaining;
 }
 s.job={recipe:recipe.id,count,readyAt:now+recipe.seconds*count*1000};
 return commitCargo(game,next,'已开始'+recipe.name+'，原料已扣除，完成后可装回停靠载具。');
}
const retry=new WeakMap();
// 仅到期任务写盘一次，保存失败保留原任务，防止刷新或重试重复产出。
export function updateIndustry(game,now=Date.now()){
 if(!['playing','paused'].includes(game.state)||now<(retry.get(game)||0))return false;
 const due=Object.entries(game.progress.industry.sites).filter(([,s])=>s.job&&s.job.readyAt<=now);
 if(!due.length)return false;
 const next=validateProgress(structuredClone(game.progress));
 for(const [id] of due){const s=next.industry.sites[id],r=INDUSTRY_RECIPES.find(r=>r.id===s.job.recipe);s.output[r.output]+=r.count*s.job.count;s.job=null;}
 const result=commitCargo(game,next,'工厂生产已完成。');
 if(!result.ok)retry.set(game,now+2000);
 return result.ok;
}
