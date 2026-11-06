// 地面草叶与小花按固定小格生成，地面块只访问相交小格，不随世界面积增加逐帧扫描。
import {WORLD} from './coordinates.js';
const CELL=240,COLUMNS=Math.ceil(WORLD.width/CELL);
// 每格随机流由坐标固定，跨缓存块重画同一点不会改变纹理。
function randomCell(x,y){let seed=((x+1)*73856093^(y+1)*19349663)>>>0;return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
// 固定世界密度：每格55簇草、5个花石点，边缘截断仍使用相同索引。
export function* groundDetails(view,kind){
 const box=view||{x:0,y:0,w:WORLD.width,h:WORLD.height},count=kind==='grass'?55:5;
 const left=Math.max(0,Math.floor((box.x-8)/CELL)),right=Math.min(Math.ceil(WORLD.width/CELL)-1,Math.floor((box.x+box.w+8)/CELL));
 const top=Math.max(0,Math.floor((box.y-8)/CELL)),bottom=Math.min(Math.ceil(WORLD.height/CELL)-1,Math.floor((box.y+box.h+8)/CELL));
 for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++){
  const rand=randomCell(col+(kind==='grass'?0:10000),row);
  // 整图导出时亚像素草花只采一个样本；游戏分块仍保持原密度。
  for(let n=0;n<(view?count:1);n++){const x=col*CELL+rand()*CELL,y=row*CELL+rand()*CELL,index=(row*COLUMNS+col)*count+n;if(x>=WORLD.width||y>=WORLD.height||x<box.x-8||x>box.x+box.w+8||y<box.y-8||y>box.y+box.h+8)continue;yield {x,y,index};}
 }
}
