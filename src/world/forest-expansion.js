// 扩展森林的稳定林团与增量间距索引；不复制营地、剧情地点或碰撞地标。
import {WORLD, ORIGINAL_WORLD, PREVIOUS_FOREST_WORLD, wrap, worldDistance} from './coordinates.js';
// 固定坐标噪声只影响静态布局，不消耗战斗随机流。
function noise(x,y){const n=Math.sin(x*12.9898+y*78.233)*43758.5453;return n-Math.floor(n);}
// 外围每个疏林格生成一团，保留原地图内全部手工布置。
export function outerForestGroves(){
 const result=[];
 // 既有林区保持原有树团。
 for(let y=240;y<8400;y+=520)for(let x=240;x<10800;x+=520){
  if(x<ORIGINAL_WORLD.width+200&&y<ORIGINAL_WORLD.height+200)continue;
  result.push([x+(noise(x,y)-.5)*160,y+(noise(y,x)-.5)*160,155+noise(x+7,y)*55]);
 }
 // 远林用小树组和独树交错填充，每组带自己的株数，林间保留连续可穿行的草地。
 for(let y=290;y<WORLD.height;y+=580)for(let x=290;x<WORLD.width;x+=580){
  if(x<PREVIOUS_FOREST_WORLD.width&&y<PREVIOUS_FOREST_WORLD.height)continue;
  result.push([x+(noise(x,y)-.5)*330,y+(noise(y,x)-.5)*330,
   84+noise(x+7,y)*70,1+Math.floor(noise(x,y+11)*4)]);
 }
 return result;
}
// 外圈生态锚点与正式树种、地表颜色、怪物等级共用定义，旧四个目的地不变。
export function expandedBiomeAnchors(biomes){
 const result=[...biomes];
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  if(!row&&!col)continue;
  for(let n=0;n<4;n++){const source=biomes[(n+row+col)%biomes.length];result.push({...source,x:col*3600+700+(n%2)*2100,y:row*2800+650+Math.floor(n/2)*1400});}
 }
 // 远林按较大的景观区铺设生态锚点，颜色与战场属地共用同一位置。
 for(let y=2600;y<WORLD.height;y+=6000)for(let x=2600;x<WORLD.width;x+=6000){
  if(x<10800&&y<8400)continue;
  const source=biomes[Math.floor(noise(x,y)*biomes.length)];result.push({...source,x,y});
 }
 return result;
}
// 增量分桶供生成与疏林两阶段使用，跨循环边缘也保留原精确距离判定。
export class TreeSpacingIndex{
 // 桶宽约一棵树的避让半径，避免对所有已放树进行平方扫描。
 constructor(){this.cols=Math.ceil(WORLD.width/160);this.rows=Math.ceil(WORLD.height/160);this.w=WORLD.width/this.cols;this.h=WORLD.height/this.rows;this.cells=new Map();this.max=0;}
 // 新点只检查附近桶，允许各棵树使用不同的最低间距。
 accepts(tree,spacing){const r=Math.max(spacing,this.max),cx=Math.floor(tree.x/this.w),cy=Math.floor(tree.y/this.h),nx=Math.ceil(r/this.w),ny=Math.ceil(r/this.h);for(let y=cy-ny;y<=cy+ny;y++)for(let x=cx-nx;x<=cx+nx;x++)for(const other of this.cells.get(wrap(y,this.rows)*this.cols+wrap(x,this.cols))||[])if(worldDistance(tree,other.tree)<Math.max(spacing,other.spacing))return false;return true;}
 // 记录已通过布局检查的树，调用方仍负责正式碰撞与资源身份。
 add(tree,spacing=0){const key=Math.floor(wrap(tree.y,WORLD.height)/this.h)*this.cols+Math.floor(wrap(tree.x,WORLD.width)/this.w);if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push({tree,spacing});this.max=Math.max(this.max,spacing);}
}
