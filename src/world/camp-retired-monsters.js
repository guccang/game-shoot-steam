// 被已购营地覆盖的野外营地退场；只过滤运行表现，保留稳定身份与历史进度。
import {MONSTER_CAMPS,MONSTER_CAMP_RULES} from '../config/monster-camps.js';
import {campPlots,ownsCampPlot} from '../config/camp-land.js';
import {nearest} from './coordinates.js';
const cache=new WeakMap();
// 棚屋、营火和居民占地一旦与营地相交，整个野外营地一起隐藏，避免残留半座棚。
export function retiredMonsterCampIds(progress){const key=JSON.stringify(progress.campLand),old=cache.get(progress);if(old?.key===key)return old.ids;const plots=campPlots(progress).filter(p=>ownsCampPlot(progress,p.id)),radius=150*MONSTER_CAMP_RULES.scale,ids=new Set();for(const camp of MONSTER_CAMPS){if(camp.mapId!=='forest')continue;if(plots.some(r=>{const p=nearest(camp,{x:(r.left+r.right)/2,y:(r.top+r.bottom)/2}),dx=Math.max(r.left-p.x,0,p.x-r.right),dy=Math.max(r.top-p.y,0,p.y-r.bottom);return dx*dx+dy*dy<=radius*radius;}))ids.add(camp.id);}cache.set(progress,{key,ids});return ids;}
// 场景、交互与地图共用同一资格，不把新营地当成可继续刷怪的野外驻地。
export function monsterCampRetired(progress,camp){return !!camp&&retiredMonsterCampIds(progress).has(typeof camp==='string'?camp:camp.id);}
