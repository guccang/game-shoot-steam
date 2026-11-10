// 固定面积沿指定外缘增地，保护未购地、邻里小院和实际水面。
import {campPlots,ownsCampPlot} from '../config/camp-land.js';
import {CAMP_EXPANSION} from '../config/camp-expansion.js';
import {SETTLEMENTS} from '../config/settlements.js';
import {isWaterScenery} from './river-geometry.js';
import {isLakeWater} from './natural-terrain.js';
export const CAMP_EXPANSION_DIRECTIONS={north:'北',south:'南',west:'西',east:'东'};
// 检查预览和扣费前共用同一候选矩形，不能把桥当作可购买陆地。
const siteCache=new WeakMap();
// 方向预览按地契缓存，不在拖动和每次绘图中重复扫描水域。
export function campExpansionSite(progress,direction='north'){const key=JSON.stringify(progress.campLand)+direction,old=siteCache.get(progress);if(old?.key===key)return old.result;const result=computeExpansionSite(progress,direction);siteCache.set(progress,{key,result});return result;}
// 候选矩形与自然水面相交时整次拒绝，不改变任何现有边界。
function computeExpansionSite(progress,direction='north'){
 if(!CAMP_EXPANSION_DIRECTIONS[direction])return {reason:'请选择扩建方向。'};
 if(direction==='east')return {reason:'东面临河，不能向河流方向扩建。'};
 const plots=campPlots(progress),owned=plots.filter(p=>ownsCampPlot(progress,p.id)),horizontal=direction!=='west',side=direction==='north'?'top':direction==='south'?'bottom':'left',edge=(direction==='south'?Math.max:Math.min)(...owned.map(p=>p[side])),neighbors=SETTLEMENTS.find(p=>p.id==='neighbors'),obstacles=[...plots.filter(p=>!ownsCampPlot(progress,p.id)),neighbors],segments=[];
 for(const p of owned.filter(p=>p[side]===edge)){
  let intervals=[[horizontal?p.left:p.top,horizontal?p.right:p.bottom]];
  for(const o of obstacles){const touches=direction==='north'?o.bottom>=edge&&o.top<edge:direction==='south'?o.top<=edge&&o.bottom>edge:o.right>=edge&&o.left<edge;if(!touches)continue;const lo=horizontal?o.left:o.top,hi=horizontal?o.right:o.bottom;intervals=intervals.flatMap(([a,b])=>hi<=a||lo>=b?[[a,b]]:[[a,Math.min(b,lo)],[Math.max(a,hi),b]].filter(([x,y])=>y>x));}
  segments.push(...intervals);
 }
 segments.sort((a,b)=>a[0]-b[0]);const merged=[];for(const s of segments){const last=merged.at(-1);if(last&&s[0]<=last[1])last[1]=Math.max(last[1],s[1]);else merged.push([...s]);}
 merged.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));
 for(const [lo,hi] of merged){if(hi-lo<200)continue;const depth=CAMP_EXPANSION.area*100/(hi-lo),site=horizontal?{left:lo,right:hi,top:direction==='north'?edge-depth:edge,bottom:direction==='north'?edge:edge+depth}:{left:edge-depth,right:edge,top:lo,bottom:hi};
  if(Object.values(site).some(n=>Math.abs(n)>=23500))continue;
  if(obstacles.some(o=>site.left<o.right&&site.right>o.left&&site.top<o.bottom&&site.bottom>o.top))continue;
  let water=false;for(let x=site.left;x<=site.right&&!water;x+=20)for(let y=site.top;y<=site.bottom;y+=20)if(isWaterScenery(x,y)||isLakeWater(x,y,20)){water=true;break;}
  if(!water)return {site:{...site,direction},reason:''};
 }
 return {reason:'该方向有水域、邻里小院或未购土地，无法扩建。'};
}
