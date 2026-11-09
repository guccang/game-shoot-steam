// 世界农田存档：坐标、种子库存和快递均白名单校验，读档不发奖。
import {canonical} from '../../world/coordinates.js';
import {PEN_OX,PASTURE} from '../../config/pasture.js';
import {FARM_CROPS,FARM_MAX_PLOTS,FARM_STOCK_CAP,FARM_SEED_DROP,FARM_WATER} from '../../config/farm.js';
// 新档通过怪物掉落或任务奖励获得首粒种子并永久解锁购买；快递只补已解锁品种。
export function freshFarm(){return {version:6,toolChoices:{hoe:'hoe',water:'water',sickle:'sickle'},lastTool:'hoe',axis:'row',forage:0,forageDay:null,sheep:false,oxFeeds:0,sheepFeeds:0,oxSite:null,oxReturn:null,oxIdleSeconds:0,oxPlow:false,doubleCan:false,xp:0,harvested:0,watered:0,planted:0,dug:0,lessonRewarded:false,nextId:0,wildMaps:[],wildScatterVersion:0,seeds:FARM_CROPS.map(()=>0),unlocked:FARM_CROPS.map(()=>false),seedDryKills:0,inventory:FARM_CROPS.map(()=>0),plots:[],delivery:{nextAt:0,serial:0,claimed:0,parcels:[]}};}
// 所有种子来源共用入库与解锁；库存满时不丢失已发现品种。
export function grantFarmSeeds(farm,crop,count){
 if(!Number.isInteger(crop)||!FARM_CROPS[crop]||!Number.isSafeInteger(count)||count<=0)return 0;
 farm.unlocked??=FARM_CROPS.map(()=>false);farm.unlocked[crop]=true;
 const gained=Math.min(count,FARM_STOCK_CAP-farm.seeds[crop]);farm.seeds[crop]+=gained;return gained;
}
// 所有无界数值经过有限整数约束。
function integer(value,max=FARM_STOCK_CAP){return Number.isFinite(value)?Math.max(0,Math.min(max,Math.floor(value))):0;}
// 当前地块按地图与世界坐标校验，不接受旧营地编号。
export function validateFarm(raw){
 if(!raw||raw.version!==6)return freshFarm();
 const seen=new Set(),plots=[];
 for(const p of (Array.isArray(raw.plots)?raw.plots:[]).slice(0,FARM_MAX_PLOTS)){
  const id=p?.id;if(!Number.isInteger(id)||id<0||id>1e7||seen.has(id))continue;
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
  const mapId=p.mapId;if(!['forest','jiuzhaigou'].includes(mapId))continue;
  const {x,y}=canonical(p);
  if(plots.some(q=>q.mapId===mapId&&Math.abs(q.x-x)<1&&Math.abs(q.y-y)<1))continue;seen.add(id);
  const crop=Number.isInteger(p.crop)&&FARM_CROPS[p.crop]?p.crop:null,plantedAt=integer(p.plantedAt,8640000000000000),readyAt=integer(p.readyAt,8640000000000000);
  plots.push({id,mapId,x,y,crop,plantedAt:crop===null?0:plantedAt,readyAt:crop===null?0:Math.max(plantedAt,Math.min(readyAt,plantedAt+FARM_CROPS[crop].seconds*1000)),watered:p.watered===true,sprinklerWatered:p.watered===true&&p.sprinklerWatered===true,...(p.wild===true?{wild:true,...(Number.isFinite(p.wildSownAt)&&p.wildSownAt>=0?{wildSownAt:p.wildSownAt}:{})}:{})});
 }
 const d=raw.delivery||{},parcelIds=new Set(),parcels=[];
 for(const p of (Array.isArray(d.parcels)?d.parcels:[]).slice(0,5)){
  if(!Number.isInteger(p?.id)||p.id<1||p.id>1e7||parcelIds.has(p.id)||!Number.isInteger(p.crop)||!FARM_CROPS[p.crop]||!Number.isFinite(p.count)||p.count<1)continue;
  parcelIds.add(p.id);parcels.push({id:integer(p.id,1e7),crop:p.crop,count:integer(p.count,20),sender:integer(p.sender,3),arrivedAt:integer(p.arrivedAt,8640000000000000)});
 }
 const harvested=integer(raw.harvested);
 const xp=integer(raw.xp);
 // 野外田不计入玩家开垦或播种数量。
 const wildMaps=['forest','jiuzhaigou'].filter(id=>Array.isArray(raw.wildMaps)&&raw.wildMaps.includes(id));
 // 品种权限只来自明确解锁记录或现有种子。
 const site=raw.oxSite;
 const oxSite=raw.oxPlow===true&&site&&['forest','jiuzhaigou'].includes(site.mapId)&&Number.isFinite(site.x)&&Number.isFinite(site.y)?{mapId:site.mapId,x:site.x,y:site.y,...(Number.isFinite(site.yaw)?{yaw:site.yaw}:{}),facing:site.facing===-1?-1:1}:null;
 return {version:6,toolChoices:{hoe:raw.toolChoices?.hoe==='summon-ox'?'summon-ox':'hoe',water:raw.toolChoices?.water==='sprinkler'?'sprinkler':'water',sickle:raw.toolChoices?.sickle==='reaper'?'reaper':'sickle'},lastTool:['hoe','water','harvest','ox','seeder','reaper'].includes(raw.lastTool)?raw.lastTool:'hoe',axis:raw.axis==='column'?'column':'row',forage:integer(raw.forage,999),forageDay:Number.isSafeInteger(raw.forageDay)&&raw.forageDay>=0?integer(raw.forageDay,999999):null,sheep:raw.sheep===true,oxFeeds:integer(raw.oxFeeds),sheepFeeds:integer(raw.sheepFeeds),oxIdleSeconds:raw.oxPlow===true&&Number.isFinite(raw.oxIdleSeconds)?Math.max(0,Math.min(PASTURE.idleReturnSeconds,raw.oxIdleSeconds)):0,oxReturn:oxSite?.mapId==='forest'&&['gate','pen'].includes(raw.oxReturn)?raw.oxReturn:null,oxSite:oxSite||(raw.oxPlow===true?{...PEN_OX}:null),oxPlow:raw.oxPlow===true,doubleCan:raw.doubleCan===true,xp,harvested,watered:Math.max(integer(raw.watered),plots.filter(p=>!p.wild&&p.crop!==null&&p.watered).length),unlocked:FARM_CROPS.map((crop,i)=>raw.unlocked?.[i]===true||integer(raw.seeds?.[i])>0),seedDryKills:integer(raw.seedDryKills,FARM_SEED_DROP.pity-1),dug:Math.max(integer(raw.dug),plots.filter(p=>!p.wild).length),planted:Math.max(integer(raw.planted),plots.filter(p=>!p.wild&&p.crop!==null).length),lessonRewarded:raw.lessonRewarded===true,nextId:Math.max(integer(raw.nextId,1e7),...plots.map(p=>p.id+1),0),wildMaps,wildScatterVersion:integer(raw.wildScatterVersion,1),seeds:FARM_CROPS.map((_,i)=>integer(raw.seeds?.[i])),inventory:FARM_CROPS.map((_,i)=>integer(raw.inventory?.[i])),plots,delivery:{nextAt:integer(d.nextAt,8640000000000000),serial:Math.max(integer(d.serial,1e7),...parcels.map(p=>p.id),0),claimed:integer(d.claimed),parcels}};
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
