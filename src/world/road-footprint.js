// 道路中心线与轴对齐底座矩形的精确距离，供种植和装饰共用。
// 线段穿过底座时距离为零；否则最近点来自端点或矩形四角，保留斜路边缘的真实距离。
export function roadFootprintDistance(a,b,p,halfWidth,halfDepth){
 const ax=a.x-p.x,ay=a.y-p.y,bx=b.x-p.x,by=b.y-p.y,dx=bx-ax,dy=by-ay;
 let lo=0,hi=1;
 for(const [origin,step,half] of [[ax,dx,halfWidth],[ay,dy,halfDepth]]){
  if(Math.abs(step)<1e-9){if(Math.abs(origin)>half){lo=1;hi=0;break;}}
  else{const t1=(-half-origin)/step,t2=(half-origin)/step;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
 }
 if(lo<=hi)return 0;
 let distance=Math.min(Math.hypot(Math.max(0,Math.abs(ax)-halfWidth),Math.max(0,Math.abs(ay)-halfDepth)),Math.hypot(Math.max(0,Math.abs(bx)-halfWidth),Math.max(0,Math.abs(by)-halfDepth)));
 for(const x of [-halfWidth,halfWidth])for(const y of [-halfDepth,halfDepth]){
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));
  distance=Math.min(distance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
 }
 return distance;
}
