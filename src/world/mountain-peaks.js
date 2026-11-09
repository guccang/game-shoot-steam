// 山地区域不是整块障碍；独立群峰的位置、碰撞底座和绘制深度共用同一份数据。
import {delta,WORLD} from './coordinates.js';
const cache=new WeakMap();
// 局部点位沿原山地轮廓生成，峰间留下可供猫猫和载具通行的连续空隙。
export function mountainPeaks(item){
 if(!item.regional)return [item];
 if(cache.has(item))return cache.get(item);
 const inside=(x,y)=>{let hit=false;const points=item.outline;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[j],b=points[i];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;};
 const peaks=[],b=item.bounds;
 for(let row=0,y=b.y+80;y<b.y+b.h-45;y+=190,row++)for(let col=0,x=b.x+85;x<b.x+b.w-45;x+=270,col++){
  const px=x+(row%2)*90+Math.sin(row*3+col+item.phase)*12,py=y+Math.cos(col*2+row+item.phase)*8;
  if(![[0,0],[-85,0],[85,0],[0,42]].every(([dx,dy])=>inside(px+dx,py+dy)))continue;
  peaks.push({id:item.id+':'+row+':'+col,atlasId:'regional-peak-'+item.variant,parentId:item.id,type:'landform',kind:'mountain',variant:item.variant,x:item.x+px,y:item.y+py,rx:76,ry:32,height:145,bounds:{x:-88,y:-34,w:176,h:80}});
 }
 cache.set(item,peaks);return peaks;
}
// 底座用小椭圆保留实体感，广阔山脚和峰间走廊不再参与整区碰撞。
export function touchesMountainPeak(peak,x,y,radius=0){
 const dx=delta(x-peak.x,WORLD.width),dy=delta(y-peak.y,WORLD.height)-6;
 return (dx/(88+radius))**2+(dy/(40+radius))**2<=1;
}
