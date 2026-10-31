// 背包与各车型货舱独立保存，装卸只在车旁，超载后仍能卸货恢复行驶。
import {PARKING_SPOTS} from '../config/parking.js';
import {validateProgress} from '../progression/progress.js';
import {FARM_CROPS,FARM_STOCK_CAP,FARM_DELIVERY,FARM_SEED_DOOR} from '../config/farm.js';
import {vehicleBuild} from '../config/vehicle-load.js';
import {vehicleLocations} from './vehicle-location.js';
import {personalFleet} from './vehicle-repair.js';
import {worldDistance} from '../world/coordinates.js';
import {creditResource} from '../progression/resource-wallet.js';
import {RESOURCE_CAP} from '../config/resource-limits.js';
import {recordEconomy} from '../progression/economy-ledger.js';
import {capturePatrol} from './patrol-session.js';
// 有车体才有货舱；房内只访问实际停入当前建筑泊位的车辆。
export function cargoAccessible(game,index){
 if(!personalFleet(game)||!['playing','paused'].includes(game.state)||!game.progress.vehicleHulls[index])return false;
 if(game.cottage)return game.progress.campParking.owned.some(r=>r.hull===index&&PARKING_SPOTS.some(s=>s.id===r.spot&&s.indoor&&s.kind===game.cottage.kind));
 const site=vehicleLocations(game).find(v=>v.hull===index);return site?.mapId===game.mapId&&worldDistance(site,game.player)<=130&&!['outbound','hooking','towing','repairing','ready'].includes(game.progress.vehicleService?.[index]?.phase);
}
// 只提交候选进度，保存失败不吞货物；保存时同时记录当前车队位置。
export function commitCargo(game,next,message){const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);let saved=false;try{saved=game.livingPersist?.(next)===true;}catch{}if(!saved)return {ok:false,message:'保存失败，货物和金币均未改变。'};game.progress=next;return {ok:true,message};}
// 数量必须为正整数；允许装到超载，由正式行驶规则停止车辆。
export function transferCargo(game,index,crop,count,direction){
 if(!cargoAccessible(game,index))return {ok:false,message:'请靠近这辆载具后装卸。'};
 if(!FARM_CROPS[crop]||!Number.isInteger(crop)||!Number.isSafeInteger(count)||count<=0||!['load','unload'].includes(direction))return {ok:false,message:'装卸数量无效。'};
 const next=validateProgress(structuredClone(game.progress)),cargo=vehicleBuild(next,index).cargo,bag=next.farm.inventory,from=direction==='load'?bag:cargo,to=direction==='load'?cargo:bag;
 if(from[crop]<count||to[crop]+count>FARM_STOCK_CAP)return {ok:false,message:'货物不足或目标库存已满。'};
 from[crop]-=count;to[crop]+=count;return commitCargo(game,next,`${FARM_CROPS[crop].name} ×${count} 已${direction==='load'?'装入货舱':'取回背包'}。`);
}
// 正式收购点为种子小屋和快递站；背包与在场车辆货舱可直接一起出售。
export function canSellCrops(game){return personalFleet(game)&&['playing','paused'].includes(game.state)&&(game.cottage?.kind==='seed'||!game.cottage&&game.mapId==='forest'&&[FARM_DELIVERY,FARM_SEED_DOOR].some(p=>worldDistance(p,game.player)<=130));}
// 收购价格沿用原作物收获价，库存及金币同事务，溢出部分继续保留。
export function sellCrops(game){
 if(!canSellCrops(game))return {ok:false,message:'请带作物到种子小屋或快递站出售。'};
 const next=validateProgress(structuredClone(game.progress)),stores=[next.farm.inventory,...next.logistics.builds.filter((_,i)=>cargoAccessible(game,i)).map(b=>b.cargo)];let coins=0,count=0;
 for(const stock of stores)for(let i=0;i<FARM_CROPS.length;i++){const n=Math.min(stock[i],Math.floor((RESOURCE_CAP-next.coins)/FARM_CROPS[i].value));if(n>0){stock[i]-=n;count+=n;coins+=creditResource(next,'coins',n*FARM_CROPS[i].value);}}
 if(!count)return {ok:false,message:'没有可出售的作物，或金币已满。'};
 recordEconomy(next,'income','farm:sale',{coins});
 return commitCargo(game,next,`已售出 ${count} 份作物，金币 +${coins}。`);
}
