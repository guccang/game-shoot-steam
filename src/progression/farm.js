// 世界农田存档：坐标、种子库存和快递均白名单校验，读档不发奖。
import {FARM_CROPS,FARM_LEVEL_XP,FARM_MAX_PLOTS,FARM_STOCK_CAP,FARM_SEED_DROP,FARM_WATER,farmCell,farmLevel} from '../config/farm.js';
// 新档通过怪物掉落或任务奖励获得首粒种子并永久解锁购买；快递只补已解锁品种。
export function freshFarm(){return {version:6,xp:0,harvested:0,watered:0,planted:0,dug:0,lessonRewarded:false,nextId:0,wildMaps:[],wildScatterVersion:0,seeds:FARM_CROPS.map(()=>0),unlocked:FARM_CROPS.map(()=>false),seedDryKills:0,inventory:FARM_CROPS.map(()=>0),plots:[],delivery:{nextAt:0,serial:0,claimed:0,parcels:[]}};}
// 所有种子来源共用入库与解锁；库存满时不丢失已发现品种。
export function grantFarmSeeds(farm,crop,count){
 if(!Number.isInteger(crop)||!FARM_CROPS[crop]||!Number.isSafeInteger(count)||count<=0)return 0;
 farm.unlocked??=FARM_CROPS.map(()=>false);farm.unlocked[crop]=true;
 const gained=Math.min(count,FARM_STOCK_CAP-farm.seeds[crop]);farm.seeds[crop]+=gained;return gained;
}
// 所有无界数值经过有限整数约束。
function integer(value,max=FARM_STOCK_CAP){return Number.isFinite(value)?Math.max(0,Math.min(max,Math.floor(value))):0;}
// v1/v2 地块落回原营地；v3 按地图与坐标保存，不用数组下标定位田地。
export function validateFarm(raw){
 if(!raw||![1,2,3,4,5,6].includes(raw.version))return freshFarm();
 const seen=new Set(),plots=[];
 for(const [index,p] of (Array.isArray(raw.plots)?raw.plots:[]).slice(0,FARM_MAX_PLOTS).entries()){
  const id=raw.version===1?index:p?.id;if(!Number.isInteger(id)||id<0||id>1e7||seen.has(id))continue;
  const old=raw.version<3?farmCell(id):p;
  if(!old||!Number.isFinite(old.x)||!Number.isFinite(old.y))continue;
  const mapId=raw.version<3?'forest':p.mapId;if(!['forest','jiuzhaigou'].includes(mapId))continue;
  const x=((old.x%10800)+10800)%10800,y=((old.y%8400)+8400)%8400;
  if(plots.some(q=>q.mapId===mapId&&Math.abs(q.x-x)<1&&Math.abs(q.y-y)<1))continue;seen.add(id);
  const crop=Number.isInteger(p.crop)&&FARM_CROPS[p.crop]?p.crop:null,plantedAt=integer(p.plantedAt,8640000000000000),readyAt=integer(p.readyAt,8640000000000000);
  plots.push({id,mapId,x,y,crop,plantedAt:crop===null?0:plantedAt,readyAt:crop===null?0:Math.max(plantedAt,Math.min(readyAt,plantedAt+FARM_CROPS[crop].seconds*1000)),watered:p.watered===true,...(p.wild===true?{wild:true,...(Number.isFinite(p.wildSownAt)&&p.wildSownAt>=0?{wildSownAt:p.wildSownAt}:{})}:{})});
 }
 const d=raw.delivery||{},parcelIds=new Set(),parcels=[];
 for(const p of (Array.isArray(d.parcels)?d.parcels:[]).slice(0,5)){
  if(!Number.isInteger(p?.id)||p.id<1||p.id>1e7||parcelIds.has(p.id)||!Number.isInteger(p.crop)||!FARM_CROPS[p.crop]||!Number.isFinite(p.count)||p.count<1)continue;
  parcelIds.add(p.id);parcels.push({id:integer(p.id,1e7),crop:p.crop,count:integer(p.count,20),sender:integer(p.sender,3),arrivedAt:integer(p.arrivedAt,8640000000000000)});
 }
 const harvested=integer(raw.harvested);
 // v4 按旧等级与档内比例换算一次经验，保留已解锁品种；再次读档绝不重复补经验。
 let xp=integer(raw.xp);
 if(raw.version<4){const tier=Math.min(7,Math.floor(xp/30));xp=integer(tier===7?FARM_LEVEL_XP[7]+xp-210:FARM_LEVEL_XP[tier]+Math.floor((xp%30)/30*(FARM_LEVEL_XP[tier+1]-FARM_LEVEL_XP[tier])));}
 // 野外田不能冒充玩家开垦或播种；旧档没有野外标记时保留历史计数迁移。
 const wildMaps=['forest','jiuzhaigou'].filter(id=>Array.isArray(raw.wildMaps)&&raw.wildMaps.includes(id));
 // 新增品种不继承旧版等级权限；旧八种的库存、解锁和在种作物完整保留。
 return {version:6,xp,harvested,watered:Math.max(integer(raw.watered),plots.filter(p=>!p.wild&&p.crop!==null&&p.watered).length),unlocked:FARM_CROPS.map((crop,i)=>raw.unlocked?.[i]===true||integer(raw.seeds?.[i])>0||raw.version<5&&i<8&&(plots.some(p=>!p.wild&&p.crop===i)||farmLevel({xp})>=crop.level)),seedDryKills:integer(raw.seedDryKills,FARM_SEED_DROP.pity-1),dug:Math.max(integer(raw.dug),plots.filter(p=>!p.wild).length),planted:Math.max(integer(raw.planted),plots.some(p=>p.wild)?0:harvested,plots.filter(p=>!p.wild&&p.crop!==null).length),lessonRewarded:raw.version<3?harvested>0:raw.lessonRewarded===true,nextId:Math.max(integer(raw.nextId,1e7),...plots.map(p=>p.id+1),0),wildMaps,wildScatterVersion:integer(raw.wildScatterVersion,1),seeds:FARM_CROPS.map((_,i)=>integer(raw.seeds?.[i])),inventory:FARM_CROPS.map((_,i)=>integer(raw.inventory?.[i])),plots,delivery:{nextAt:integer(d.nextAt,8640000000000000),serial:Math.max(integer(d.serial,1e7),...parcels.map(p=>p.id),0),claimed:integer(d.claimed),parcels}};
}
// 离线只成熟当前一茬，不自动种植或结算。
export function farmGrowth(plot,now=Date.now()){if(plot.crop===null)return 0;if(now>=plot.readyAt)return 1;return Math.max(0,Math.min(1,(now-plot.plantedAt)/Math.max(1,plot.readyAt-plot.plantedAt)));}
// 种田入门的完成事实来自正式事务，旧存档已做过的步骤继续保留。
export function farmLesson(farm){return [{done:farm.dug>0,label:'用锄头开出一块田',hint:'点击种地，选中锄头，再点击可站立的地面。'},{done:farm.planted>0,label:'在空田播下一颗种子',hint:'点击空田选种，再点田块或拖动；猫猫会走近撒种。'},{done:farm.harvested>0,label:'收割成熟作物，获得金币',hint:'雏菊60秒成熟，点击成熟田的镰刀，等待猫猫走近收割。'}];}

// 手浇与雨水共用单茬加速上限；空田也可湿润，但不累计作物照料次数。
export function wetFarmPlot(farm,plot,now){
 const before=plot.readyAt;
 if(!plot.watered&&plot.crop!==null){
  if(farmGrowth(plot,now)<1)plot.readyAt=Math.max(now,plot.readyAt-FARM_CROPS[plot.crop].seconds*1000*FARM_WATER.reduction);
  if(!plot.wild)farm.watered=Math.min(FARM_STOCK_CAP,farm.watered+1);
 }
 plot.watered=true;return (before-plot.readyAt)/1000;
}
