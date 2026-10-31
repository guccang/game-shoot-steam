import {WORLD} from '../world/coordinates.js';
import {TOWN_LAYOUT} from '../config/town-layout.js';
// 章节存档白名单校验：旧档补空状态，未知会话明确标记为不可恢复。
import {STORY_CHAPTER as BASE} from '../config/story.js';
import {STORY_CAMPAIGN} from '../config/story-campaign.js';
import {STORY_POSTS} from '../config/story-posts.js';
import { validatePatrol } from './patrol-progress.js';
import { validateRealmVehicles } from './realm-vehicles.js';
// 存档中的非有限数值不能传播至时间、生命和计数。
const finite=(v,lo,hi,fallback=lo)=>Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):fallback;
// 供给快照只含实际弹药和计时，不能保存实体引用与隐含武器成长。
export function storySupply(raw,DEF=BASE) {
  return {hp:finite(raw?.hp,1,DEF.hp,DEF.hp),vehicle:validateRealmVehicles(raw?.vehicle),
    magazines:Array.isArray(raw?.magazines)?raw.magazines.map(m=>({ammo:Math.floor(finite(m?.ammo,0,1000)),remaining:finite(m?.remaining,0,120)})):[],
    x:finite(raw?.x,0,WORLD.width-1,TOWN_LAYOUT.spawn.x),y:finite(raw?.y,0,WORLD.height-1,TOWN_LAYOUT.spawn.y)};
}
// 章节记录只恢复已提交阶段，战斗中的瞬态敌人不进入检查点。
export function validateStory(raw) {
  const result={version:1,chapters:{},worldFlags:{},boardRewards:{},run:null};
  for(const DEF of Object.values(STORY_CAMPAIGN)){
    const old=raw?.chapters?.[DEF.id];
    result.chapters[DEF.id]={completed:old?.completed===true,rewardClaimed:old?.rewardClaimed===true,
      followupLoadout:DEF.loadouts.some(l=>l.id===old?.followupLoadout)?old.followupLoadout:null,followupDismissed:old?.followupDismissed===true,
      choices:Object.fromEntries(Object.entries(DEF.choices||{}).filter(([key,options])=>options.some(o=>o.id===old?.choices?.[key])).map(([key])=>[key,old.choices[key]])),
      completedRoutes:[...new Set((Array.isArray(old?.completedRoutes)?old.completedRoutes:[]).filter(x=>Object.hasOwn(DEF.routes,x)))]};
    Object.assign(result.worldFlags,Object.fromEntries(Object.keys(DEF.completionFlags).map(k=>[k,raw?.worldFlags?.[k]===true])));
  }
  // 武器、载具、资源包都只保存完整交付后的合法选项；旧档新增赠礼默认未领取。
  for(const post of STORY_POSTS)if(post.collection&&post.chapters.every(id=>result.chapters[id]?.completed&&result.chapters[id]?.rewardClaimed)){
    const chosen=raw?.boardRewards?.[post.id];
    if(post.collection.options.some(o=>o.id===chosen))result.boardRewards[post.id]=chosen;
  }
  const r=raw?.run;if(!r)return result;
  const DEF=Object.hasOwn(STORY_CAMPAIGN,r.chapterId)?STORY_CAMPAIGN[r.chapterId]:null;
  if(!DEF||r.definitionVersion!==DEF.version||!Object.hasOwn(DEF.nodes,r.stageId)){result.invalidRun=true;return result;}
  const chosen=DEF.loadouts.some(l=>l.id===r.loadoutId)?r.loadoutId:null;
  if(DEF.nodes[r.stageId].requiresLoadout&&!chosen){result.invalidRun=true;return result;}
  const lines=Object.keys(DEF.dialogues);
  const experiences=Object.fromEntries(Object.keys(DEF.journey.experiences).filter(id=>r.experiences?.[id]===true).map(id=>[id,true]));
  const cueIds=new Set([...Object.keys(DEF.journey.experiences).map(id=>'experience:'+id),...Object.values(DEF.nodes).flatMap(n=>(n.cues||[]).map(c=>c.id))]);
  const lastExperienceLoadout=Object.entries(DEF.journey.experiences).some(([id,e])=>e.loadout===r.lastExperienceLoadout&&experiences[id])?r.lastExperienceLoadout:null;
  const routeVersion=DEF.world.routeVersion||0,checkpoint=storySupply(r.checkpoint,DEF);
  // 仅首次读取旧路线存档时重定位已搬迁阶段；新版坐标及森林返回位置保持原值。
  const checkpointSite=DEF.world.checkpointSites?.[r.stageId];
  if((r.routeVersion||0)<routeVersion&&checkpointSite)Object.assign(checkpoint,DEF.world.sites[checkpointSite]);
  result.run={chapterId:DEF.id,definitionVersion:DEF.version,routeVersion,runId:typeof r.runId==='string'?r.runId.slice(0,80):'restored',
    replay:!!r.replay,stageId:r.stageId,phase:['prepare','active','dialogue','failed'].includes(r.phase)?r.phase:'prepare',
    loadoutId:chosen,routeId:Object.hasOwn(DEF.routes,r.routeId)?r.routeId:null,
    experiences,lastExperienceLoadout,
    choices:Object.fromEntries(Object.entries(DEF.choices||{}).filter(([key,options])=>options.some(o=>o.id===r.choices?.[key])).map(([key])=>[key,r.choices[key]])),
    seenCues:[...new Set((Array.isArray(r.seenCues)?r.seenCues:[]).filter(id=>cueIds.has(id)))],
    dialogueChoices:Object.fromEntries(lines.filter(key=>r.dialogueChoices?.[key]==='base'||DEF.dialogues[key].variants?.some(v=>v.id===r.dialogueChoices?.[key])).map(key=>[key,r.dialogueChoices[key]])),
    flags:Object.fromEntries(DEF.flags.map(k=>[k,r.flags?.[k]===true])),
    readLines:Array.isArray(r.readLines)?[...new Set(r.readLines.filter(k=>lines.includes(k)))]:[],
    dialogue:lines.includes(r.dialogue)?r.dialogue:null,checkpoint,
    forestReturn:{patrol:validatePatrol(r.forestReturn?.patrol),mapId:r.forestReturn?.mapId==='jiuzhaigou'?'jiuzhaigou':'forest',
      x:finite(r.forestReturn?.x,0,WORLD.width-1,TOWN_LAYOUT.spawn.x),y:finite(r.forestReturn?.y,0,WORLD.height-1,TOWN_LAYOUT.spawn.y),
      hp:finite(r.forestReturn?.hp,0,1e9,120),vehicle:validateRealmVehicles(r.forestReturn?.vehicle),
      magazines:Array.isArray(r.forestReturn?.magazines)?r.forestReturn.magazines.map(m=>({ammo:Math.floor(finite(m?.ammo,0,10000)),remaining:finite(m?.remaining,0,120)})):[]},
    metrics:{seconds:finite(r.metrics?.seconds,0,1e8),deaths:Math.floor(finite(r.metrics?.deaths,0,1e6)),synergy:Math.floor(finite(r.metrics?.synergy,0,1e8)),frost:Math.floor(finite(r.metrics?.frost,0,1e8)),arcHits:Math.floor(finite(r.metrics?.arcHits,0,1e8)),frostRelay:Math.floor(finite(r.metrics?.frostRelay,0,1e8))},
  };
  return result;
}
