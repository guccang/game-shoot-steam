// 野外方田沿用正式收割事务，一年未播种会清理；刷新、往返与死亡不补回作物。
import {WILD_FARM_SITES,WILD_FARM_SCATTER} from '../../config/wild-farm.js';
import {monsterCampClearing} from '../../config/monster-camps.js';
import {FARM_MAX_PLOTS} from '../../config/farm.js';
import {WORLD,delta,worldDistance} from '../../world/coordinates.js';
import {snapFarmPoint,farmLandReason,farmApproach} from '../../world/farm-land.js';
import {settlementAt} from '../../world/settlements.js';
import {wildFarmCandidates} from '../../world/wild-farm-sites.js';
import {clearingSite} from '../../progression/story/clearing-site.js';
import {SpatialGrid} from '../../world/spatial-grid.js';
import {blocked} from '../../physics/motion.js';
import {JIUZHAIGOU_SIGNPOSTS} from '../../world/jiuzhaigou.js';
import {canEnterFarm,commitFarm} from './farm.js';
import {wildFarmTime,wildFarmYear} from '../../progression/farming/wild-farm-age.js';
import {bindEconomy,economyFor} from '../../config/economy.js';

// 满一年未播种的野田整格回归自然；先持久化再清理操作队列，不发奖励也不补生成。
export function expireWildFarms(game){
 if(game.state!=='playing'||game.worldPending)return false;
 const now=wildFarmTime(game.progress.living.calendar);
 if(now<(game.wildFarmExpiryRetryAt||0))return false;
 const expired=new Set(game.progress.farm.plots.filter(p=>p.wild&&Number.isFinite(p.wildSownAt)&&now-p.wildSownAt>=wildFarmYear()).map(p=>p.id));
 if(!expired.size)return false;
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));
 next.farm.plots=next.farm.plots.filter(p=>!expired.has(p.id));
 // 沿用手动移除的任务恢复规则，不留下指向已消失田块的教学目标。
 const gardening=next.mainline.gardening;
 if(expired.has(gardening.plotId)){gardening.plotId=null;if(!gardening.watered){gardening.planted=0;gardening.harvested=0;}}
 const result=commitFarm(game,next,{action:'wild-expire',count:expired.size});
 if(!result.ok){game.wildFarmExpiryRetryAt=now+10000;return false;}
 const work=game.farmWork;
 if(work){if(work.job&&expired.has(work.job.id))work.job=null;work.queue=work.queue.filter(job=>!expired.has(job.id));}
 return true;
}

// 同时避开城镇、树冠和正式碰撞；每块田都留有可站立的农活位置。
function usable(game,point){
 // 营地周边留给居民、警戒边界和圈外观察，不把新野田生成在战斗活动区。
 if(monsterCampClearing(point.x,point.y,game.mapId))return false;
 if(game.mapId==='forest'&&settlementAt(point,80))return false;
 if(game.mapId==='jiuzhaigou'&&JIUZHAIGOU_SIGNPOSTS.some(s=>Math.abs(delta(s.x-point.x,WORLD.width))<110&&Math.abs(delta(s.y-40-point.y,WORLD.height))<110))return false;
 if((game.trees||[]).some(t=>t.hp>0&&Math.abs(delta(t.x-point.x,WORLD.width))<65*(t.size||1)&&Math.abs(delta(t.y-40-point.y,WORLD.height))<90*(t.size||1)))return false;
 return !farmLandReason(game,point)&&!!farmApproach(game,point);
}

// 从道路走进田边须有连续的步行通路，不把可落脚但被树围住的空洞当作采集点。
function roadAccessible(scene,sites,road){
 const walking={...scene,player:{...scene.player,...road,mapId:'forest',livingCollision:true}};
 return sites.some(site=>{
  const target=farmApproach(walking,site);if(!target)return false;
  const steps=Math.ceil(worldDistance(road,target)/12);
  for(let i=0;i<=steps;i++){const t=steps?i/steps:0;if(blocked(road.x+(target.x-road.x)*t,road.y+(target.y-road.y)*t,12,scene.trees,walking.player))return false;}
  return true;
 });
}

// 每图保留原固定示范田，森林额外生成完整2×2田；统一保存成功后才显示。
export function ensureWildFarms(game,now=Date.now()){
 const fixedDone=game.progress.farm.wildMaps?.includes(game.mapId),scatter=game.mapId==='forest'&&(game.progress.farm.wildScatterVersion||0)<WILD_FARM_SCATTER.version;
 if(game.worldPending||!canEnterFarm(game)||fixedDone&&!scatter||now<(game.wildFarmRetryAt||0))return false;
 game.wildFarmRetryAt=now+10000;
 // 即使玩家正驾驶飞行或两栖载具，田边也必须提供普通步行可用的操作位。
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress)),farm=next.farm,scene={...game,progress:next,player:{...game.player,flying:false,amphibious:false,treePass:false}};
 let added=0;
 for(const field of fixedDone?[]:WILD_FARM_SITES[game.mapId]){
  const sites=Array.from({length:field.size**2},(_,index)=>snapFarmPoint({x:field.x+(index%field.size)*56,y:field.y+Math.floor(index/field.size)*52},game.mapId));
  // 容量或空间不足时跳过整处方田，不放残缺田块，也不挤掉玩家已有作物。
  if(farm.plots.length+sites.length>FARM_MAX_PLOTS||!sites.every(p=>usable(scene,p)))continue;
  for(const site of sites){farm.plots.push({id:farm.nextId++,...site,crop:field.crop,plantedAt:0,readyAt:0,watered:false,wild:true,wildSownAt:wildFarmTime(next.living.calendar)});added++;}
 }
 if(!fixedDone)farm.wildMaps=[...(farm.wildMaps||[]),game.mapId];
 if(scatter){
  const placed=[],clearing=clearingSite(next),trees=new SpatialGrid(game.trees||[]);
  // 候选仅检查邻近树木，范围同时覆盖最大树冠和田边农活位置。
  const treeMargin=100+(game.trees||[]).reduce((max,t)=>Math.max(max,90*(t.size||1)),90);
  for(const candidates of wildFarmCandidates()){
   if(farm.plots.length+4>FARM_MAX_PLOTS)break;
   for(const field of candidates){
    const center={x:field.x+28,y:field.y+26};
    if(worldDistance(center,clearing)<clearing.radius+120||placed.some(p=>worldDistance(p,center)<WILD_FARM_SCATTER.minSeparation))continue;
    const sites=Array.from({length:4},(_,i)=>snapFarmPoint({x:field.x+(i%2)*56,y:field.y+Math.floor(i/2)*52},game.mapId));
    scene.trees=trees.query(Math.min(field.x,field.road.x),Math.min(field.y,field.road.y),Math.max(field.x+56,field.road.x),Math.max(field.y+52,field.road.y),treeMargin);
    if(!sites.every(p=>usable(scene,p))||!roadAccessible(scene,sites,field.road))continue;
    for(const [i,site]of sites.entries())farm.plots.push({id:farm.nextId++,...site,crop:field.crops[i],plantedAt:0,readyAt:0,watered:false,wild:true,wildSownAt:wildFarmTime(next.living.calendar)});
    placed.push(center);added+=4;break;
   }
  }
  farm.wildScatterVersion=WILD_FARM_SCATTER.version;
 }
 return commitFarm(game,next,{action:'wild-place',count:added}).ok;
}
