import {assignRepairParking} from './repair-parking.js';
// 自行牵引共用真实残骸、重量与维修订单，连接不会移动或免费修复车辆。
import {validateProgress} from '../progression/progress.js';
import {vehicleLoad,catLoad,footTowCapacity} from '../progression/load-weight.js';
import {LOAD_RULES} from '../config/vehicle-load.js';
import {vehicleModel} from '../config/vehicles.js';
import {REPAIR_CENTER,REPAIR_BAY,REPAIR_LAYOUT_VERSION,VEHICLE_REPAIR} from '../config/vehicle-repair.js';
import {personalFleet,vehicleRepairQuote} from './vehicle-repair.js';
import {worldDistance,nearest,canonical} from '../world/coordinates.js';
import {blocked} from '../physics/motion.js';
import {capturePatrol} from './patrol-session.js';
// 拖行路径按残骸落地半径检查，不能借牵引穿过建筑、河岸和树林。
function clearSegment(game,from,to,index){const at=nearest(to,from),d=worldDistance(from,at),steps=Math.max(1,Math.ceil(d/5));for(let i=1;i<=steps;i++)if(blocked(from.x+(at.x-from.x)*i/steps,from.y+(at.y-from.y)*i/steps,18,game.trees,{mapId:game.mapId,livingCollision:game.mapId==='forest',amphibious:!!vehicleModel(index).amphibious}))return false;return true;}
// 徒步与驾驶使用独立牵引身份。
function tractor(game){return game.vehicle.active?game.vehicle.index:'cat';}
// 挂接前验证同地图距离、真实总重和当前车的剩余牵引能力。
export function towReason(game,target){
 if(!personalFleet(game)||game.cottage||!['playing','paused'].includes(game.state)||(game.vehicle.active&&game.vehicle.hp<=0))return '请在自由巡林时靠近残骸。';
 if(game.progress.logistics.tow)return '已经挂接一辆车，请先解除或交付维修。';
 const r=game.progress.vehicleService?.[target];if(target===tractor(game)||!game.progress.vehicleHulls[target]||r?.phase!=='wrecked'||game.vehicles[target]?.hp>0)return '只能牵引其他已报废的自有载具。';
 if(r.mapId!==game.mapId||worldDistance(r.position,game.player)>LOAD_RULES.hookDistance)return `请靠近残骸至${LOAD_RULES.hookDistance}米内挂接。`;
 const load=game.vehicle.active?vehicleLoad(game):catLoad(game),capacity=game.vehicle.active?load.towCapacity:footTowCapacity(load),mass=vehicleLoad(game,target,{driver:false}).mass;
 if(load.overloaded)return game.vehicle.active?'当前载具已超载，请先卸货或拆减装甲。':'背包已满，请先减轻负重。';
 if(mass>capacity)return `牵引力不足：目标总重 ${Math.ceil(mass)} kg，剩余牵引能力 ${Math.floor(capacity)} kg。`;
 if(!clearSegment(game,game.player,r.position,target))return '挂接路径被阻挡，请调整车辆位置。';return '';
}
// 持久化候选快照，连接、断开与优惠维修都能安全重试。
function commitTow(game,next,message){const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);let saved=false;try{saved=game.livingPersist?.(next)===true;}catch{}if(!saved)return {ok:false,message:'保存失败，牵引和费用未改变。'};game.progress=next;return {ok:true,message};}
// 连接保持两车原位置；只有后续真实驾驶才使残骸移动。
export function hookTow(game,target){const reason=towReason(game,target);if(reason)return {ok:false,message:reason};const next=validateProgress(structuredClone(game.progress));next.logistics.tow={tractor:tractor(game),target};return commitTow(game,next,'牵引绳已挂接，请拖到维修中心后交车。');}
// 手动解开将残骸留在当前拖行位置，货物和耐久均保留。
export function unhookTow(game){if(!game.progress.logistics.tow)return {ok:false,message:'当前没有牵引车辆。'};const next=validateProgress(structuredClone(game.progress));next.logistics.tow=null;return commitTow(game,next,'已解除牵引，损坏车辆停留在当前位置。');}
// 下车、换车、牵引车报废或跨场景后解除关系，不让残骸跟随角色瞬移。
export function maintainPlayerTow(game){const t=game.progress.logistics?.tow;if(!t)return;const r=game.progress.vehicleService[t.target];if(!personalFleet(game)||tractor(game)!==t.tractor||(game.vehicle.active&&game.vehicle.hp<=0)||r?.phase!=='wrecked'||r.mapId!==game.mapId){game.progress.logistics.tow=null;game.onEvent('vehicle-service',{text:'牵引已解除，损坏车辆保留在原地。'});}}
// 真实步进拉紧绳索；目标被挡时撤回牵引车本帧移动，双方都不穿墙。
export function advancePlayerTow(game,previous,dt){
 const t=game.progress.logistics?.tow;if(game.state!=='playing'||!t||dt<=0||worldDistance(game.player,previous)<.001)return;
 const r=game.progress.vehicleService[t.target],at=nearest(game.player,r.position),distance=worldDistance(at,r.position);
 if(distance<=LOAD_RULES.ropeLength)return;
 const amount=distance-LOAD_RULES.ropeLength,point={x:r.position.x+(at.x-r.position.x)*amount/distance,y:r.position.y+(at.y-r.position.y)*amount/distance};
 if(!clearSegment(game,r.position,point,t.target)){Object.assign(game.player,previous,{vx:0,vy:0});game.towObstructed=true;return;}
 game.towObstructed=false;Object.assign(r.position,canonical(point));r.wheel=(r.wheel||0)+amount/8;
}
// 自行运到厂免去大部分救援支出，优惠基于同一普通维修报价。
export function selfTowRepairQuote(game){const target=game.progress.logistics?.tow?.target;return target===undefined?0:Math.ceil(vehicleRepairQuote(game,target)*LOAD_RULES.selfTowRepairRate);}
// 真实到厂后交付，金币、订单、牵引关系及费用邮件一次保存。
export function deliverTowedVehicle(game){
 const t=game.progress.logistics?.tow,r=t&&game.progress.vehicleService[t.target];
 if(!t||!personalFleet(game)||!['playing','paused'].includes(game.state)||tractor(game)!==t.tractor||r?.phase!=='wrecked')return {ok:false,message:'请先牵引一辆报废车。'};
 if(game.mapId!=='forest'||worldDistance(game.player,REPAIR_CENTER)>VEHICLE_REPAIR.radius||worldDistance(r.position,REPAIR_CENTER)>VEHICLE_REPAIR.radius+LOAD_RULES.ropeLength)return {ok:false,message:'请把两辆车拖到维修中心院内再交车。'};
 const cost=selfTowRepairQuote(game);if(!cost||game.progress.coins<cost)return {ok:false,message:`金币不足，需要 ${cost} 金币。`};
 const next=validateProgress(structuredClone(game.progress));next.coins-=cost;next.logistics.tow=null;next.vehicleService[t.target]={hp:0,phase:'repairing',layoutVersion:REPAIR_LAYOUT_VERSION,mapId:'forest',position:{...REPAIR_BAY},truck:{...REPAIR_BAY},timer:0,wheel:r.wheel||0};
 assignRepairParking({...game,progress:next},t.target);
 return commitTow(game,next,`已交车维修，优惠费用 ${cost} 金币。`);
}
