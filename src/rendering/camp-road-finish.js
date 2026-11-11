import {campPathWidth} from '../config/camp-roads.js';
// 材质与铺法只改变正式路网表面，不改变道路连通性；按视口裁剪纹理采样。
import {nearest} from '../world/coordinates.js';
import {nightColor} from './river.js';
// 每段道路的终点取起点附近的镜像；相机越过半图分界时，断开不同镜像的笔画。
export function visibleCampRoads(paths,view){
 const center={x:view.x+view.w/2,y:view.y+view.h/2},visible=[];
 for(const path of paths){
  const width=campPathWidth(path),pad=width/2+12;
  let run=null;
  for(let i=1;i<path.length;i++){
   const a=nearest(path[i-1],center),b=nearest(path[i],a);
   if(Math.max(a.x,b.x)<view.x-pad||Math.min(a.x,b.x)>view.x+view.w+pad||
      Math.max(a.y,b.y)<view.y-pad||Math.min(a.y,b.y)>view.y+view.h+pad){run=null;continue;}
   const last=run?.at(-1);
   if(!last||Math.abs(last.x-a.x)>1e-6||Math.abs(last.y-a.y)>1e-6){
    run=Object.assign([a],{width});visible.push(run);
   }
   run.push(b);
  }
 }
 return visible;
}
export function drawCampRoadFinish(c,paths,view,finish,night){const material=finish?.material||'earth',shape=finish?.shape||'plain',colors=material==='wood'?['#ad8e63','#d1b384','#927b59']:material==='stone'?['#a8b39e','#cbd1b7','#7d917b']:['#d9c48d','#e8d4a1','#b7a16f'];c.save();c.lineCap=shape==='plain'?'round':'square';c.lineJoin='round';const points=visibleCampRoads(paths,view);
 for(const [width,color] of [[66,'#71885c55'],[60,colors[2]],[56,colors[0]],[shape==='border'?43:47,colors[1]]]){c.strokeStyle=nightColor(color,night);for(const path of points){c.lineWidth=path.width+width-56;c.beginPath();path.forEach((p,i)=>{if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});c.stroke();}}
 const drawn=new Set();for(const path of points)for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(!len)continue;for(let t=0;t<len;t+=material==='wood'?12:24){const x=a.x+dx*t/len,y=a.y+dy*t/len,key=Math.round(x/10)+':'+Math.round(y/10);if(drawn.has(key)||x<view.x-40||x>view.x+view.w+40||y<view.y-40||y>view.y+view.h+40)continue;drawn.add(key);c.save();c.globalAlpha*=.3;c.translate(x,y);c.rotate(Math.atan2(dy,dx));c.strokeStyle=nightColor(colors[2],night);c.lineWidth=1;if(material==='wood'){c.beginPath();c.moveTo(0,-path.width/2+6);c.lineTo(0,path.width/2-6);c.stroke();}else if(material==='stone'){const half=path.width/2-7;c.strokeRect(-9,-half,18,Math.max(3,half-2));c.strokeRect(-5,2,18,Math.max(3,half-2));}if(shape==='mosaic'){c.fillStyle=nightColor(colors[0],night);c.beginPath();c.moveTo(-5,0);c.lineTo(0,-6);c.lineTo(5,0);c.lineTo(0,6);c.closePath();c.fill();}c.restore();}}c.restore();}
