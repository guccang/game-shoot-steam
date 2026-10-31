// 补给购买、制作、道具使用与主炮转移均先保存候选快照，再更新实际状态。
import {AMMO_TYPES,SUPPLY_ITEMS,GUN_MASSES,ammoKind,vehicleFaults} from '../config/supplies.js';
import {VEHICLE_ARMAMENTS,VEHICLE_WEAPONS} from '../config/vehicle-armaments.js';
import {validateProgress} from '../progression/progress.js';
import {vehicleLoad} from '../progression/load-weight.js';
import {capturePatrol} from './patrol-session.js';
import {personalFleet} from './vehicle-repair.js';
import {vehicleLocations} from './vehicle-location.js';
import {worldDistance} from '../world/coordinates.js';
import {createVehicle} from '../combat/vehicle.js';
import {sendMail} from '../progression/mailbox.js';
import {cargoAccessible} from './cargo.js';
// 弹药装卸保持总量不变，货舱超载后仍可卸货。
export function transferSupplyAmmo(game,hull,key,count,direction){
 if(!supplyAvailable(game)||!cargoAccessible(game,hull))return {ok:false,message:'请靠近载具后装卸弹药。'};
 if(!AMMO_TYPES[key]||!Number.isSafeInteger(count)||count<=0||!['load','unload'].includes(direction))return {ok:false,message:'无效装卸数量。'};
 const next=candidate(game),bag=next.supplies.hand,car=next.supplies.vehicles[hull],from=direction==='load'?bag:car,to=direction==='load'?car:bag;
 if(from[key]<count||to[key]+count>100000)return {ok:false,message:'弹药不足或库存已满。'};
 from[key]-=count;to[key]+=count;
 return commit(game,next,`${AMMO_TYPES[key].name} ${count} 发已${direction==='load'?'装入货舱':'取回背包'}。`);
}
// 使用游戏当前弹夹生成候选副本，不让失败交易修改真实库存。
function candidate(game){const next=validateProgress(structuredClone(game.progress)),snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);return next;}
// 当前巡林才处理永久物品，活动不能消费或生成永久供给。
export function supplyAvailable(game){return personalFleet(game)&&['playing','paused'].includes(game.state)&&game.player.hp>0;}
// 室内补给只给停在店旁的当前车辆，背包始终随角色同行。
export function supplyVehicleNearby(game,index=game.vehicle.index){const site=vehicleLocations(game).find(v=>v.hull===index),origin=game.cottage?.outside||game.player;return !!site&&site.mapId===game.mapId&&worldDistance(site,origin)<=240&&!game.progress.vehicleService[index]?.phase;}
// 存储明确成功才替换进度，异常与失败都可以安全重试。
function commit(game,next,message){let saved=false;try{saved=game.livingPersist?.(next)===true;}catch{}if(!saved)return {ok:false,message:'保存失败，物品、弹药和费用未改变。'};game.progress=next;return {ok:true,message};}
// 商店价格按一包计费，制作消耗木材与零件；一次最多二十包。
export function tradeSupply(game,{kind,id,batches=1,craft=false,target='hand'}={}){
 if(!supplyAvailable(game)||game.cottage?.kind!=='ammo')return {ok:false,message:'请进入弹药补给铺，与柜台售货员交谈。'};
 if(!Number.isInteger(batches)||batches<1||batches>20||!['ammo','item'].includes(kind)||!['hand','vehicle'].includes(target))return {ok:false,message:'无效补给数量。'};
 const rule=(kind==='ammo'?AMMO_TYPES:SUPPLY_ITEMS)[id];if(!rule||kind==='item'&&craft)return {ok:false,message:'该补给不能制作。'};
 if(target==='vehicle'&&(kind!=='ammo'||!supplyVehicleNearby(game)))return {ok:false,message:'请把当前载具停到弹药铺门前再装载。'};
 const next=candidate(game),stock=kind==='item'?next.supplies.items:target==='hand'?next.supplies.hand:next.supplies.vehicles[game.vehicle.index],amount=(rule.pack||1)*batches;
 if(stock[id]+amount>(kind==='item'?999:100000))return {ok:false,message:'库存已满。'};
 const coins=craft?0:rule.coins*batches,wood=craft?rule.wood*batches:0,parts=craft?rule.parts*batches:0;
 if(next.coins<coins||next.wood<wood||next.materials.parts<parts)return {ok:false,message:'金币或制作材料不足。'};
 next.coins-=coins;next.wood-=wood;next.materials.parts-=parts;stock[id]+=amount;
 sendMail(next,{sender:'弹药补给铺',title:(craft?'弹药制作':'补给购买')+'手续',body:`${rule.name} ×${amount}，花费 ${coins} 金币、${wood} 木头、${parts} 机械零件；已放入${target==='vehicle'?'当前载具货舱':'猫猫背包'}。`});
 return commit(game,next,`${rule.name} +${amount}，已计入负重。`);
}
// 维修包只用于尚未完全损坏的部件；不恢复车体HP，也不能复活报废车。
export function useSupplyItem(game,id){
 if(!supplyAvailable(game)||!SUPPLY_ITEMS[id])return {ok:false,message:'当前不能使用道具。'};
 if(!game.progress.supplies.items[id])return {ok:false,message:'道具不足，请到弹药补给铺购买。'};
 const v=game.vehicle,rule=SUPPLY_ITEMS[id],fault=vehicleFaults(game.progress,v.index);let hp=game.player.hp;
 if(id==='medkit'){if(hp>=game.maxHp())return {ok:false,message:'猫猫生命已满。'};hp=Math.min(game.maxHp(),hp+rule.heal);}
 else{if(!game.progress.vehicleHulls[v.index]||v.hp<=0||!supplyVehicleNearby(game))return {ok:false,message:'请靠近完好车体后维修部件；报废车必须送厂。'};const value=id==='gunKit'?fault.gun:fault.engine;if(value<=0)return {ok:false,message:'该部件没有故障。'};if(value>=100)return {ok:false,message:'部件已完全损坏，道具无法维修，请送维修中心。'};}
 const next=candidate(game);next.supplies.items[id]--;
 if(id==='medkit'){if(next.patrol)next.patrol.playerHp=hp;}
 else if(id==='gunKit')next.supplies.gunFaults[v.weaponIndex]=Math.max(0,fault.gun-rule.repair);
 else next.supplies.engineFaults[v.index]=Math.max(0,fault.engine-rule.repair);
 const result=commit(game,next,id==='medkit'?`已回复 ${hp-game.player.hp} HP。`:'临时维修完成，部件损坏降低35个百分点。');if(result.ok)game.player.hp=hp;return result;
}
// 主炮来源唯一，允许跨车型安装；卸下的主炮返回工坊，枪内弹药退回原车备用库。
export function mountMainGun(game,hull,gun){
 if(!Number.isInteger(hull)||!supplyAvailable(game)||game.cottage?.kind!=='vehicle'||!game.progress.vehicleHulls[hull])return {ok:false,message:'请进入载具工坊拆装已拥有车辆的主炮。'};
 if(gun!==null&&(!VEHICLE_ARMAMENTS.some(w=>w.weaponIndex===gun)||!game.progress.vehicleWeapons[gun]))return {ok:false,message:'尚未拥有这门主炮。'};
 const old=game.progress.vehicleLoadouts[hull],donor=gun===null?-1:game.progress.vehicleLoadouts.indexOf(gun);
 if(old===gun)return {ok:false,message:'已经安装这门主炮。'};
 const changed=[...new Set([hull,...(donor>=0?[donor]:[])])];
 if(changed.some(i=>game.progress.vehicleService[i]?.phase)||game.progress.logistics.tow)return {ok:false,message:'请先完成维修或解除牵引再换炮。'};
 const next=candidate(game);
 for(const i of changed){const w=VEHICLE_WEAPONS[next.vehicleLoadouts[i]],key=ammoKind(w),m=next.supplies.vehicleMags[i];if(key){if(next.supplies.vehicles[i][key]+(m?.ammo||0)>100000)return {ok:false,message:'原车备用库存已满，请先卸下部分弹药再换炮。'};next.supplies.vehicles[i][key]+=m?.ammo||0;}next.supplies.vehicleMags[i]={weapon:null,ammo:0,remaining:0};next.vehicleLoadouts[i]=null;}
 next.vehicleLoadouts[hull]=gun;
 // 计入主炮自身、备用弹药、装甲和驾驶员，不附加车型白名单。
 if(gun!==null&&vehicleLoad(game,hull,{progress:next,driver:true}).overloaded)return {ok:false,message:`装上这门主炮（${GUN_MASSES[gun]} kg）后会超载，请卸货、减装甲或换发动机。`};
 sendMail(next,{sender:'载具工坊',title:'主炮换装记录',body:gun===null?'主炮已拆下，存放于工坊。':`${VEHICLE_WEAPONS[gun].name}已安装。原车弹药留在原车，损坏状态随主炮保留。`});
 const result=commit(game,next,'主炮换装完成，弹药和故障均已保留。');if(!result.ok)return result;
 for(const i of changed){const v=game.vehicles[i],replacement=createVehicle(next,game.maxHp(),i);Object.assign(v,{weaponIndex:replacement.weaponIndex,module:replacement.module,modules:replacement.modules,targetId:null,recoil:replacement.recoil});}
 return result;
}
