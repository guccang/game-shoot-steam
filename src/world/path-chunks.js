// 静态道路按连续32条边建立包围盒，保留原路径顺序与全部端点，不简化形状。
import {nearest,WORLD} from './coordinates.js';
const cache=new WeakMap();
// 同一路径只建立一次轻量分组；共享端点保证组间不漏掉一条线段。
export function pathChunks(path){
 let chunks=cache.get(path);if(chunks)return chunks;
 chunks=[];
 for(let start=1;start<path.length;start+=32){
  const end=Math.min(path.length,start+32);let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for(let i=start-1;i<end;i++){const p=path[i],x=p.x??p[0],y=p.y??p[1];left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  chunks.push({start,end,x:(left+right)/2,y:(top+bottom)/2,w:right-left,h:bottom-top});
 }
 cache.set(path,chunks);return chunks;
}
// 包围盒跨最近镜像切线时保守保留，最终仍由原逐线段判定决定是否绘制。
export function pathChunkVisible(chunk,player,bounds){
 const p=nearest(chunk,player),dx=Math.abs(p.x-player.x),dy=Math.abs(p.y-player.y);
 if(dx+chunk.w/2>=WORLD.width/2||dy+chunk.h/2>=WORLD.height/2)return true;
 return p.x+chunk.w/2>=bounds.x&&p.x-chunk.w/2<=bounds.x+bounds.w&&p.y+chunk.h/2>=bounds.y&&p.y-chunk.h/2<=bounds.y+bounds.h;
}
