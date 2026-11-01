import {taskCropStock} from '../progression/task-resources.js';
import {WAREHOUSE} from '../config/warehouse.js';
import {vehicleLocations} from './vehicle-location.js';
import {cargoAccessible} from './cargo.js';
// 整备前收获指引共用真实升级报价和现有田地，不催熟、不补刷、不直接发金币。
import {MAINLINE_TASKS} from '../config/mainline.js';
import {cachedMainlineConditionCost} from '../progression/mainline-cost.js';
import {farmGrowth} from '../progression/farm.js';
import {FARM_CROPS} from '../config/farm.js';
import {worldDistance} from '../world/coordinates.js';
import {farmApproach} from '../world/farm-land.js';
import {settlementAt} from '../world/settlements.js';

// 已升级部分不重复预算，收获数与当前余额共同决定是否可以继续整备。
export function harvestBudget(progress,task){
 const target=MAINLINE_TASKS.find(t=>t.id===task?.goal?.harvestFor);
 const cost=target?cachedMainlineConditionCost(progress,target.goal).coins:0;
 const crops=taskCropStock(progress),cashMissing=Math.max(0,cost-progress.coins);
 return {cost,crops,cashMissing,missing:Math.max(0,cashMissing-crops.value),collected:progress.coins+crops.value>=cost,ready:progress.mainline.gardening?.taskId===task?.id&&progress.mainline.gardening.harvested>0&&progress.coins>=cost};
}

// 优先成熟自种田，再找营地外已有成熟野田；同组按距离选择，不指向空田或异地图。
export function harvestGuidePlot(game,now=Date.now()){
 const walking={...game,player:{...game.player,flying:false,amphibious:false,treePass:false}};
 const plots=game.progress.farm.plots.filter(p=>p.mapId===game.mapId&&p.crop!==null&&(!p.wild||p.mapId!=='forest'||!settlementAt(p)));
 const priority=p=>farmGrowth(p,now)>=1?(p.wild?1:0):2;
 return plots.sort((a,b)=>priority(a)-priority(b)||(priority(a)===2?a.readyAt-b.readyAt:0)||worldDistance(a,game.player)-worldDistance(b,game.player)||a.id-b.id).find(p=>farmApproach(walking,p,'harvest'))||null;
}

// 缺额随真实消费与收成变化，作物耗尽时仍提供种植入口，不保留已经收空的导航点。
export function harvestGuideHint(game,task,plot=harvestGuidePlot(game),now=Date.now()){
 const {missing,cashMissing,crops}=harvestBudget(game.progress,task);
 if(cashMissing&&crops.total)return `作物 ${crops.total} 份（背包 ${crops.bag} · 载具 ${crops.vehicles}），可结算 ${crops.value} 金币；${missing?'结算后还差 '+missing+' 金币':'收成已够'}，${harvestDeliveryTarget(game).label}`;
 const budget=missing?`升级还差${missing}金币`:'收获一次，学习赚金币';
 if(!plot)return `${budget}；打开种地，用库存种子播种后收获`;
 const crop=FARM_CROPS[plot.crop];
 if(farmGrowth(plot,now)<1)return `${budget}；${crop.name}约${Math.max(1,Math.ceil((plot.readyAt-now)/1000))}秒后成熟，可浇水加速`;
 return `${budget}；${plot.wild?'营地外野田':'已种好的田'} · ${crop.name}，收获后出售可得${crop.value}金币`;
}

// 优先运回随身或在场车辆的收成；远处车辆先定位取货，不隔空兑换金币。
export function harvestDeliveryTarget(game){
 const sites=vehicleLocations(game).filter(v=>game.progress.logistics.builds[v.hull].cargo.some(n=>n>0));
 if(game.progress.farm.inventory.some(n=>n>0)||sites.some(v=>cargoAccessible(game,v.hull)))return {site:{...WAREHOUSE,y:WAREHOUSE.y+60},label:'运回小屋仓库，靠近后自动结算金币',kind:'settle'};
 const site=sites.sort((a,b)=>(a.mapId===game.mapId?0:1)-(b.mapId===game.mapId?0:1)||worldDistance(a,game.player)-worldDistance(b,game.player))[0];
 return site?{site,label:'取回'+site.name+'中的收成'+(site.mapId!==game.mapId?'（先前往'+(site.mapId==='forest'?'晴叶森林':'九寨沟')+'）':''),kind:'retrieve'}:null;
}
