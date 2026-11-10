import {campExpansionPoint,campPlots} from '../config/camp-land.js';
// 安全范围和护栏碰撞由同一配置生成，避免看得见的门与实际通路错位。
import {SETTLEMENTS} from '../config/settlements.js';
import {nearest} from './coordinates.js';
import {SpatialGrid} from './spatial-grid.js';
// 边缘余量也用于检查整座战斗圈与安全区分离。
export function settlementAt(point,margin=0){if(campExpansionPoint(point,undefined,margin)){const region=campPlots().find(r=>{const p=nearest(point,{x:(r.left+r.right)/2,y:(r.top-58)/2});return r.top< -58&&p.x>=r.left-margin&&p.x<=r.right+margin&&p.y>=r.top-margin&&p.y<-58;});return {...SETTLEMENTS.find(s=>s.id==='sunleaf'),...region,id:'sunleaf',name:'晴叶营地'};}return SETTLEMENTS.find(s=>{const p=nearest(point,{x:(s.left+s.right)/2,y:(s.top+s.bottom)/2});return Math.hypot(Math.max(s.left-p.x,0,p.x-s.right),Math.max(s.top-p.y,0,p.y-s.bottom))<=margin;})||null;}
// 相邻聚落共用的边完全敞开，只生成合并轮廓的外栏；绘制、碰撞和树冠避让同源。
export function buildSettlementFences(settlements){return settlements.flatMap(s=>['top','bottom','left','right'].flatMap(side=>{
 const horizontal=['top','bottom'].includes(side),lo=horizontal?s.left:s.top,hi=horizontal?s.right:s.bottom,fixed=s[side];
 const opposite={top:'bottom',bottom:'top',left:'right',right:'left'}[side];
 const shared=settlements.filter(other=>other!==s&&other[opposite]===fixed)
  .map(other=>[Math.max(lo,horizontal?other.left:other.top),Math.min(hi,horizontal?other.right:other.bottom)])
  .filter(([a,b])=>b>a);
 const gates=s.gates.filter(g=>g.side===side&&!shared.some(([a,b])=>g.at>=a&&g.at<=b)),parts=[];
 const cuts=[...new Set([lo,hi,...shared.flat(),...gates.flatMap(g=>[g.at-g.width/2,g.at+g.width/2])])].sort((a,b)=>a-b);
 for(let i=1;i<cuts.length;i++){
  const a=cuts[i-1],b=cuts[i],middle=(a+b)/2;
  if(shared.some(([from,to])=>middle>=from&&middle<=to)||gates.some(g=>middle>g.at-g.width/2&&middle<g.at+g.width/2))continue;
  const n=Math.ceil((b-a)/58);
  for(let j=0;j<n;j++){
   const from=a+(b-a)*j/n,to=a+(b-a)*(j+1)/n;
   parts.push({type:'settlement-fence',settlement:s.id,horizontal,x:horizontal?(from+to)/2:fixed,y:horizontal?fixed:(from+to)/2,length:to-from});
  }
 }
 for(const g of gates)parts.push({type:'settlement-gate',settlement:s.id,name:s.name,horizontal,x:horizontal?g.at:fixed,y:horizontal?fixed:g.at,length:g.width});
 return parts;
}));}
export const SETTLEMENT_FENCES=buildSettlementFences(SETTLEMENTS);
// 静态围栏按空间分桶；扩边覆盖整段栏杆，环形地图边缘也使用同一精确碰撞。
const fenceGrid=new SpatialGrid(SETTLEMENT_FENCES.filter(f=>f.type==='settlement-fence').map(f=>({...f,radius:Math.max(f.length/2,5)})));
// 脚底圆只查询附近栏杆，避免每个寻路采样点遍历整座营地；门洞保持原宽度。
export function settlementBlocked(x,y,radius=12,footprint={x:radius,y:radius},origin=null){return fenceGrid.query(x,y,x,y,Math.max(footprint.x,footprint.y)).some(f=>{const p=nearest({x,y},f),old=origin&&nearest(origin,f),axis=f.horizontal?'y':'x',offset=p[axis]-f[axis],before=old&&old[axis]-f[axis];
 // 旧存档已贴入车轮时允许向原侧退开，不能借恢复逻辑穿越围栏。
 if(old&&Math.abs(before)<footprint[axis]+5&&offset*before>0&&Math.abs(offset)>Math.abs(before))return false;
 return f.horizontal?Math.abs(p.x-f.x)<f.length/2+footprint.x&&Math.abs(p.y-f.y)<footprint.y+5:Math.abs(p.y-f.y)<f.length/2+footprint.y&&Math.abs(p.x-f.x)<footprint.x+5;});}
// 树冠避让也使用空间索引，新增聚落不让每棵树遍历全部围栏。
const clearingGrid=new SpatialGrid(SETTLEMENT_FENCES.map(f=>({...f,radius:f.length/2+100})));
// 树冠避让边界与门口。
export function settlementClearing(x,y){return clearingGrid.query(x,y,x,y).some(f=>{const p=nearest({x,y},f);return f.horizontal?Math.abs(p.x-f.x)<f.length/2+45&&Math.abs(p.y-f.y)<95:Math.abs(p.y-f.y)<f.length/2+70&&Math.abs(p.x-f.x)<75;});}
