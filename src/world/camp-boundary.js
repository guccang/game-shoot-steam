import {REGIONAL_SETTLEMENTS} from '../config/regional-camps.js';
import {buildSettlementFences} from './settlements.js';
// 已购地块的并集外轮廓，同时供正式木栏、通行碰撞和规划图读取。
import {campPlots,CAMP_PLOTS,ownsCampPlot} from '../config/camp-land.js';
import {nearest} from './coordinates.js';
import {SpatialGrid} from './spatial-grid.js';
export const CAMP_GATE_WIDTH=360;
const cache=new Map();
// 同一直线上的相邻外缘合并，短边不额外开窄门。
function outline(regions){const lines=[];
 for(const s of regions)for(const side of ['top','bottom','left','right']){const horizontal=side==='top'||side==='bottom',lo=horizontal?s.left:s.top,hi=horizontal?s.right:s.bottom,fixed=s[side];
 const shared=regions.filter(r=>r!==s&&(side==='top'?r.top<fixed&&r.bottom>=fixed:side==='bottom'?r.bottom>fixed&&r.top<=fixed:side==='left'?r.left<fixed&&r.right>=fixed:r.right>fixed&&r.left<=fixed)).map(r=>[Math.max(lo,horizontal?r.left:r.top),Math.min(hi,horizontal?r.right:r.bottom)]).filter(([a,b])=>a<b),cuts=[...new Set([lo,hi,...shared.flat()])].sort((a,b)=>a-b);
 for(let i=1;i<cuts.length;i++)if(!shared.some(([a,b])=>(cuts[i-1]+cuts[i])/2>a&&(cuts[i-1]+cuts[i])/2<b))lines.push({side,horizontal,fixed,lo:cuts[i-1],hi:cuts[i]});
 }
 lines.sort((a,b)=>a.side.localeCompare(b.side)||a.fixed-b.fixed||a.lo-b.lo);const merged=[];for(const line of lines){const last=merged.at(-1);if(last&&last.side===line.side&&last.fixed===line.fixed&&last.hi>=line.lo)last.hi=Math.max(last.hi,line.hi);else merged.push({...line});}return merged;
}
// 地契与门位共用有界缓存，最多64项，不在碰撞热路径重建围栏。
export function campBoundary(progress,layout=progress?.campLayout){const owned=campPlots(progress).filter(p=>ownsCampPlot(progress,p.id)),key=JSON.stringify(owned)+JSON.stringify(layout?.gates||{});if(cache.has(key))return cache.get(key);
 // 围栏只围住已购地块，相邻街区共用外沿。
 const regions=owned,lines=outline(regions),objects=[],gates=[];
 // 东侧保留原营地与邻里各自的出入口，直线围栏不再带内凹转角。
 const fenceLines=lines.flatMap(l=>l.side==='right'&&l.lo<1000&&l.hi>1000?[{...l,hi:1000},{...l,lo:1000}]:[l]);
 for(const line of fenceLines){const {horizontal,fixed,lo,hi,side}=line;let gate=null;
 const gateWidth=horizontal&&side==='bottom'&&fixed===850&&hi-lo>=1000?520:CAMP_GATE_WIDTH;
 // 服务地北沿正对户外用品店后墙，保留围栏直到居民工艺院接入。
 const shopBackWall=side==='top'&&fixed===CAMP_PLOTS.find(p=>p.id==='services').top;
 if(!shopBackWall&&hi-lo>=gateWidth+48){const id=side+':'+(horizontal?lo:fixed)+':'+(horizontal?(side==='top'&&fixed< -58?-58:fixed):hi),low=lo+gateWidth/2+24,high=hi-gateWidth/2-24,preferred=layout?.gates?.[id];const ideal=Number.isFinite(preferred)?low+(high-low)*preferred:horizontal?(fixed>=2000?300:side==='bottom'&&fixed===850?500:390):lo>=1000?(side==='left'?1850:1250):729,at=Math.max(lo+gateWidth/2+24,Math.min(hi-gateWidth/2-24,ideal));gate={id,low,high,type:'settlement-gate',settlement:'sunleaf',name:'营地通道',horizontal,x:horizontal?at:fixed,y:horizontal?fixed:at,length:gateWidth,side};gates.push(gate);objects.push(gate);}
 const center=gate&&(horizontal?gate.x:gate.y),parts=gate?[[lo,center-gate.length/2],[center+gate.length/2,hi]]:[[lo,hi]];
 for(const [a,b] of parts){const count=Math.ceil((b-a)/58);for(let i=0;i<count;i++)objects.push({type:'settlement-fence',settlement:'sunleaf',horizontal,x:horizontal?a+(b-a)*(i+.5)/count:fixed,y:horizontal?fixed:a+(b-a)*(i+.5)/count,length:(b-a)/count});}
 }
 const remote=buildSettlementFences(REGIONAL_SETTLEMENTS);objects.push(...remote);gates.push(...remote.filter(o=>o.type==='settlement-gate'));
 const grid=new SpatialGrid(objects.filter(o=>o.type==='settlement-fence').map(o=>({...o,radius:o.length/2+5}))),result={objects,gates,lines,regions,grid,key};if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
}
// 实际围栏采用同一有限线段，牵引车与拖挂均按各自半径检查。
export function campBoundaryBlocked(x,y,radius,progress,footprint={x:radius,y:radius},origin=null){return campBoundary(progress).grid.query(x,y,x,y,Math.max(footprint.x,footprint.y)).some(f=>{const p=nearest({x,y},f),old=origin&&nearest(origin,f),axis=f.horizontal?'y':'x',offset=p[axis]-f[axis],before=old&&old[axis]-f[axis];
 // 旧存档已贴入车轮时允许向原侧退开，不能借恢复逻辑穿越围栏。
 const along=f.horizontal?'x':'y';
 if(old&&Math.abs(old[along]-f[along])<f.length/2+footprint[along]&&Math.abs(before)<footprint[axis]+5&&offset*before>0&&Math.abs(offset)>Math.abs(before))return false;
 return f.horizontal?Math.abs(p.x-f.x)<f.length/2+footprint.x&&Math.abs(p.y-f.y)<footprint.y+5:Math.abs(p.y-f.y)<f.length/2+footprint.y&&Math.abs(p.x-f.x)<footprint.x+5;});}
// 按当前位置判断是否位于主营地或地区营地，兼容扩建地块和地图镜像。
export function insideSurfaceCamp(game){
 if(game.mapId!=='forest')return false;
 const contains=region=>{
  const p=nearest(game.player,{x:(region.left+region.right)/2,y:(region.top+region.bottom)/2});
  return p.x>=region.left&&p.x<=region.right&&p.y>=region.top&&p.y<=region.bottom;
 };
 return REGIONAL_SETTLEMENTS.some(contains)||campBoundary(game.progress).regions.some(contains);
}
