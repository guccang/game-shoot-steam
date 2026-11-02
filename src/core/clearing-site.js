import {clearingEnemyLevel} from '../config/clearing-difficulty.js';
import {ENCOUNTERS} from '../config/encounters.js';
import {FOREST_LEVEL_ORIGIN,FOREST_LEVEL_BANDS,forestThreatAt} from '../world/forest-levels.js';
import {MONSTER_CAMPS,MONSTER_CAMP_RULES} from '../config/monster-camps.js';
// 接取时随机选择真实可达的林间战场，不修改地貌或生成额外奖励。
import {CLEARING_SITE_RULES as RULES,CLEARING_STARTER_RULES} from '../config/clearing.js';
import {biomeAt} from '../world/biomes.js';
import {canonical,worldDistance} from '../world/coordinates.js';
import {settlementAt} from '../world/settlements.js';
import {blocked} from '../physics/motion.js';
import {terrainLineClear} from '../physics/terrain-navigation.js';
import {planQuestRoute} from '../physics/quest-route.js';
import {normalizeClearingSite,clearingNavigationTarget} from '../progression/clearing-site.js';
import {createPlayerNavigationIndex} from './prepared-navigation.js';
// 圈心有足够落脚空间，周围至少六个方向可进入，避免贴水岸或狭窄死角。
export function clearingSiteOpen(site,trees){
 const body={mapId:'forest',livingCollision:true};
 // 清缴战场不能覆盖可旁观的常驻营地，保留圈外听闲聊的空间。
 if(MONSTER_CAMPS.some(c=>c.mapId==='forest'&&worldDistance(c,site)<RULES.radius+MONSTER_CAMP_RULES.observe))return false;
 if(settlementAt(site,RULES.radius+40)||blocked(site.x,site.y,60,trees,body))return false;
 let entries=0;
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,p={x:site.x+Math.cos(a)*240,y:site.y+Math.sin(a)*240};
  if(!blocked(p.x,p.y,30,trees,body)&&terrainLineClear({...site,mapId:'forest'},p,28))entries++;
 }
 return entries>=6;
}
// 有界抽样后用正式步行碰撞确认可达；树木采用接单快照，不被之后的生长或砍伐打断。
export function chooseClearingSite(game,onRoute=null){
 const origin=canonical(game.player),trees=createPlayerNavigationIndex(game.trees),previous=game.progress.living.clearingSite;
 const level=clearingEnemyLevel(game.progress.bosses),beginner=level<=3,maxLevel=Math.max(3,level);
 const band=FOREST_LEVEL_BANDS.find(b=>b.max>=maxLevel);
 const safeRadius=maxLevel>=FOREST_LEVEL_BANDS.at(-1).max?Infinity:band.from+(band.to-band.from)*(maxLevel-band.min+1)/(band.max-band.min+1);
 // 有限等级带内收紧抽样上界，避免大量候选落在必定被拒绝的远端。
 const rules=beginner?{...RULES,...CLEARING_STARTER_RULES}:{...RULES,maxDistance:Math.min(RULES.maxDistance,safeRadius-ENCOUNTERS.maxDistance+worldDistance(origin,FOREST_LEVEL_ORIGIN))};
 const body={...game.player,...origin,flying:false,amphibious:false,treePass:false,mapId:'forest',livingCollision:true},start=game.random()*Math.PI*2,offset=game.random();
 let routes=0;
 for(let i=0;i<rules.attempts;i++){
  // 低级任务半径与角度使用不同步长，避免窄草甸中的候选点退化到几条固定弧线。
  const angle=start+i*2.399963,distance=rules.minDistance+(rules.maxDistance-rules.minDistance)*((offset+i*0.41421356237)%1);
  const point=canonical({x:origin.x+Math.cos(angle)*distance,y:origin.y+Math.sin(angle)*distance});
  const site=normalizeClearingSite({...point,origin});
  if(beginner&&biomeAt(point.x,point.y).id!==CLEARING_STARTER_RULES.biome)continue;
  // 整个战场不能跨入超出任务难度的等级带，赶路另检查遭遇出生距离。
  if(!clearingAreaSafe(point,RULES.radius,safeRadius,maxLevel))continue;
  if(!site||previous&&worldDistance(site,previous)<rules.minSeparation||!clearingSiteOpen(site,trees))continue;
  const route=planQuestRoute(body,clearingNavigationTarget(site),trees,16000,{shortEdges:true});
  if(route.reachable&&clearingRouteSafe(route.points,safeRadius,beginner,maxLevel)){
   // 仅成功候选交付安全短边，接取事务决定是否缓存，不把路径塞进地点或存档。
   onRoute?.(route,trees);return site;
  }
  if(++routes>=16)break;
 }
 return null;
}

// 检查完整步行路线，防止低等级落点的引导路线穿过高等级野外遭遇区。
function clearingRouteSafe(points,safeRadius,beginner,maxLevel){
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/32));
  for(let n=0;n<=steps;n++){
   const point={x:a.x+(b.x-a.x)*n/steps,y:a.y+(b.y-a.y)*n/steps};
   if(!clearingAreaSafe(point,ENCOUNTERS.maxDistance,safeRadius,maxLevel))return false;
   if(beginner&&biomeAt(point.x,point.y).id!==CLEARING_STARTER_RULES.biome)return false;
  }
 }
 return true;
}

// 野怪会继承附近营地等级，必须同时避开高等级营地的整片势力范围。
function clearingAreaSafe(point,radius,safeRadius,maxLevel){
 if(worldDistance(point,FOREST_LEVEL_ORIGIN)+radius>=safeRadius)return false;
 return !MONSTER_CAMPS.some(c=>c.mapId==='forest'&&forestThreatAt(c.x,c.y).level>maxLevel&&worldDistance(point,c)<radius+MONSTER_CAMP_RULES.territoryRadius);
}
