// 世界道路与留白查询独立于生态区，供地貌生成和植被布局共用。
import {TOWN_SHIFT_X} from '../config/town-layout.js';
import { WORLD, ORIGINAL_WORLD, canonical } from './coordinates.js';
// 主路横贯木桥，纵路连接营地与两片林区；首尾相接避免循环边缘断路。
export const PATHS = [
  Array.from({ length: WORLD.width / 20 + 1 }, (_, i) => {
    const x=i*20,local=x>WORLD.width-700?x-WORLD.width:x;
    // 院内横路随营地平移，东西两侧平滑接回原道路，木桥锚点保持原位。
    const source=x-TOWN_SHIFT_X*Math.max(0,Math.min(1,(local+700)/400,(1170-local)/380));
    return {x,y:729+Math.sin(source/ORIGINAL_WORLD.width*Math.PI*2)*Math.sin((source-1295)/ORIGINAL_WORLD.width*Math.PI)**2*50};
  }),
  Array.from({ length: WORLD.height / 20 + 1 }, (_, i) => ({
    x: 630 + TOWN_SHIFT_X*Math.max(Math.min(1,Math.max(0,(2600-i*20)/400)),Math.min(1,Math.max(0,(i*20-(WORLD.height-1100))/400))) + Math.sin((i * 20 / ORIGINAL_WORLD.height) * Math.PI * 2) * 65,
    y: i * 20,
  })),
  // 东侧支路连接新扩展的古林和禁林，路宽与营地主路保持一致。
  Array.from({ length: WORLD.height / 20 + 1 }, (_, i) => ({
    x: 2600 + Math.sin((i * 20 / ORIGINAL_WORLD.height) * Math.PI * 2) * 110,
    y: i * 20,
  })),
];
// 外围纵路与两条连接支路保持原路宽；横向支路止于河东，不制造无桥跨河通道。
for (const x of [5200, 7800, 10000]) PATHS.push(Array.from({length:WORLD.height/20+1},(_,i)=>({x:x+Math.sin(i*20/ORIGINAL_WORLD.height*Math.PI*2)*65,y:i*20})));
for (const y of [3600,6000]) {const wave=Math.sin(y/ORIGINAL_WORLD.height*Math.PI*2),left=2600+wave*110,right=10000+wave*65;PATHS.push(Array.from({length:371},(_,i)=>({x:left+(right-left)*i/370,y:y+Math.sin(i/370*Math.PI*2)*45})));}

// 道路段构成一次性空间树，局部留白查询不再扫描整张扩展地图。
function buildPathIndex(segments) {
 const box={left:Math.min(...segments.map(s=>s.left)),right:Math.max(...segments.map(s=>s.right)),top:Math.min(...segments.map(s=>s.top)),bottom:Math.max(...segments.map(s=>s.bottom))};
 if(segments.length<=8)return {...box,segments};
 const axis=box.right-box.left>box.bottom-box.top?'x':'y';
 segments.sort((a,b)=>(a.a[axis]+a.b[axis])-(b.a[axis]+b.b[axis]));
 const mid=segments.length>>1;return {...box,children:[buildPathIndex(segments.slice(0,mid)),buildPathIndex(segments.slice(mid))]};
}
const pathIndex=buildPathIndex(PATHS.flatMap(path=>path.slice(1).map((b,i)=>{const a=path[i];return {a,b,left:Math.min(a.x,b.x),right:Math.max(a.x,b.x),top:Math.min(a.y,b.y),bottom:Math.max(a.y,b.y)};})));
// 包围盒距离给出真实距离下界，远处枝条可安全跳过。
function boxDistance(node,p){return Math.max(node.left-p.x,0,p.x-node.right)**2+Math.max(node.top-p.y,0,p.y-node.bottom)**2;}
// 返回精确线段距离；只改变查询开销，营地与道路留白阈值保持不变。
export function pathDistance(x,y){
 const p=canonical({x,y});let best=Infinity;
 // 递归优先访问更近的枝条，不近似也不截断搜索范围。
 function visit(node){
  if(boxDistance(node,p)>=best)return;
  if(node.children){const [a,b]=node.children;if(boxDistance(a,p)<boxDistance(b,p)){visit(a);visit(b);}else{visit(b);visit(a);}return;}
  for(const {a,b} of node.segments){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));best=Math.min(best,(p.x-a.x-dx*t)**2+(p.y-a.y-dy*t)**2);}
 }
 visit(pathIndex);return Math.sqrt(best);
}
