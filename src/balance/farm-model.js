// 农田经济审计：调用正式播种、浇水和收割事务，显式计入逐块动作与回访时间。
import {freshProgress} from '../progression/progress.js';
import {grantFarmSeeds} from '../progression/farm.js';
import {buyFarmSeeds} from '../core/farm-seeds.js';
import {farmAction} from '../core/farm.js';
import {updateFarmDelivery,claimFarmParcel} from '../core/farm-delivery.js';
import {FARM_CROPS,FARM_WATER,FARM_DELIVERY,FARM_SEED_DOOR,farmLevel} from '../config/farm.js';
import {seededRandom} from './model-metrics.js';
import {FARM_ACTION_TIMING} from '../config/farm-tools.js';
import {equipmentRecipe} from '../progression/equipment-goals.js';
import {economyUpgradeCost,RECOMMENDED_ECONOMY} from '../config/economy.js';

// 标准情景从零金币及已获得的一轮雏菊种子开始，不把任务、秘境和随机快递算入种田收益；货架沿用初始营地98折。
export function simulateFarmEconomy({plots=8,minutes=120,visitSeconds=30,water=true,longCrops=false,delivery=false,seed=1}={}){
 if(!Number.isInteger(plots)||plots<1||plots>512||!Number.isFinite(minutes)||minutes<=0||!Number.isFinite(visitSeconds)||visitSeconds<1)throw Error('农田模拟参数无效');
 const progress=freshProgress();progress.coins=0;grantFarmSeeds(progress.farm,0,plots);
 progress.farm.plots=Array.from({length:plots},(_,id)=>({id,mapId:'forest',x:780+(id%8)*56,y:620+Math.floor(id/8)*52,crop:null,plantedAt:0,readyAt:0,watered:false}));
 progress.farm.dug=plots;progress.farm.nextId=plots;
 const game={progress,state:'playing',mapId:'forest',player:{x:780,y:620},livingPersist:()=>true,random:seededRandom(seed)};
 const epoch=1000000,limit=minutes*60,step=.6,roundTrip=12;
 let time=plots*(FARM_ACTION_TIMING.dig.end+step),activeSeconds=time,gross=0,seedCost=0,harvests=0;
 if(time>limit)throw Error('模拟时长不足以开垦指定数量的田地');
 const unlocks=[0],milestones={},targets=[['weapons',3],['weapons',2],['weapons',12],['vehicle',0],['vehicle',1],['vehicle',3],['vehicle',2],['vehicle',6]];
 // 一个目标单独攒钱，并额外留下一轮种子钱；这些时刻不能解读为连续购齐所有装备。
 function record(purchases=true){
  const f=game.progress.farm,level=farmLevel(f);
  for(let i=unlocks.length;i<level;i++)unlocks.push(Number((time/60).toFixed(2)));
  const reserve=f.plots.reduce((sum,p)=>sum+(p.crop===null?0:FARM_CROPS[p.crop].cost),0);
  if(purchases)for(const [kind,index] of targets){const recipe=equipmentRecipe(kind,index),key=kind+':'+index;if(milestones[key]===undefined&&game.progress.coins>=recipe.coins+reserve)milestones[key]=Number((time/60).toFixed(2));}
 }
 // 逐块操作共用同一时间轴；生长可与后续操作重叠，动作完成前不会凭空发奖。
 function action(kind,plot,crop=0){
  const duration=FARM_ACTION_TIMING[kind].end+step;if(time+duration>limit)return false;
  time+=duration;activeSeconds+=duration;game.player={x:plot.x,y:plot.y};
  const before=game.progress.coins,result=farmAction(game,kind,{plot:plot.id,crop,now:epoch+time*1000});
  if(!result.ok)throw Error('模拟农活失败：'+result.message);
  if(kind==='harvest'){gross+=result.coins;harvests++;}else if(kind==='plant')seedCost+=before-game.progress.coins;
  return true;
 }
 while(time<limit){
  if(delivery)updateFarmDelivery(game,epoch+time*1000);
  const now=epoch+time*1000,f=game.progress.farm;
  if(!f.delivery.parcels.length&&!f.plots.some(p=>p.crop===null||p.readyAt<=now)){time=Math.min(limit,time+visitSeconds);continue;}
  if(time+roundTrip>=limit)break;time+=roundTrip;activeSeconds+=roundTrip;
  // 礼物情景使用正式寄送与领取规则，单独支付往返柜台24秒及每封1秒，不凭空免费加种子。
  if(delivery&&game.progress.farm.delivery.parcels.length){const duration=24+game.progress.farm.delivery.parcels.length;if(time+duration>=limit)break;time+=duration;activeSeconds+=duration;game.player={...FARM_DELIVERY};for(const p of [...game.progress.farm.delivery.parcels])if(!claimFarmParcel(game,p.id).ok)throw Error('模拟领取种子失败');}
  for(const old of [...game.progress.farm.plots]){
   let p=game.progress.farm.plots.find(p=>p.id===old.id);
   if(p.crop!==null&&p.readyAt<=epoch+time*1000){if(!action('harvest',p))break;record(false);p=game.progress.farm.plots.find(p=>p.id===old.id);}
   if(p.crop!==null)continue;
   const crops=FARM_CROPS.map((c,i)=>({...c,index:i,paidCost:game.progress.farm.seeds[i]>0?0:c.cost})).filter(c=>(game.progress.farm.unlocked[c.index]||game.progress.farm.seeds[c.index]>0)&&c.paidCost<=game.progress.coins);
   // 常回田选单位时间净收益；长途外出选最长周期，不让短周期纸面收益误代表离线经营。
   crops.sort((a,b)=>longCrops?b.seconds-a.seconds:(b.value-b.paidCost)/b.seconds-(a.value-a.paidCost)/a.seconds);
   if(!crops.length)continue;const crop=crops[0].index;
   // 购种走正式柜台，独立计入往返与交易时间以及金币支出。
   if(!game.progress.farm.seeds[crop]){if(time+25>=limit)break;time+=25;activeSeconds+=25;game.player={...FARM_SEED_DOOR};const before=game.progress.coins;if(!buyFarmSeeds(game,crop).ok)throw Error('模拟购种失败');seedCost+=before-game.progress.coins;}
   if(!action('plant',p,crop))break;
   if(water&&!action('water',game.progress.farm.plots.find(q=>q.id===p.id)))break;
  }
  record();time=Math.min(limit,time+visitSeconds);
 }
 return {initialSeeds:plots,plots,minutes,visitSeconds,water,longCrops,delivery,seed,parcelsClaimed:game.progress.farm.delivery.claimed,gross,seedCost,net:gross-seedCost,netPerMinute:Math.round((gross-seedCost)/minutes),harvests,activeMinutes:Number((activeSeconds/60).toFixed(2)),level:farmLevel(game.progress.farm),unlocks,milestones};
}

// 报价直接引用正式货架与升级函数，材料门槛另列，不把攒够金币冒充已经可以购买。
export function farmEconomyCatalog(){
 const progress=freshProgress();
 return {crops:FARM_CROPS.map(c=>({...c,net:c.value-c.cost,coinsPerMinute:Math.round((c.value-c.cost)*60/c.seconds),wateredSeconds:c.seconds*(1-FARM_WATER.reduction)})),
  equipment:['weapons','vehicle'].flatMap(kind=>Array.from({length:kind==='vehicle'?9:18},(_,index)=>{const base=RECOMMENDED_ECONOMY[kind==='vehicle'?'vehicles':kind][index];return {kind,index,listCoins:base.coins,listWood:base.wood,...equipmentRecipe(kind,index)};})),
  upgrades:['weapons','vehicle','heroes','turret'].flatMap(kind=>[5,10,15].map(target=>{const cost={coins:0,wood:0};for(let level=1;level<target;level++){const price=economyUpgradeCost(progress,kind,kind==='vehicle'?1:0,level);cost.coins+=price.coins;cost.wood+=price.wood;}return {kind,target,...cost};}))};
}
