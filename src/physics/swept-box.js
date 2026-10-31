// 固定朝向的车壳沿实际移动线段扫掠；保留长宽、角点和对角线的真实边界。
// 两个端点矩形的凸包就是连续平移覆盖区，避免用圆形半径或轴对齐大包围盒误伤。
export function sweptBox(from,to,{width,length,centerOffset=0}) {
  const points=[];
  for(const center of [from,to])for(const x of [-width/2,width/2])for(const y of [-length/2,length/2])
    points.push({x:center.x+x,y:center.y+centerOffset+y});
  points.sort((a,b)=>a.x-b.x||a.y-b.y);
  const unique=points.filter((p,i)=>!i||p.x!==points[i-1].x||p.y!==points[i-1].y);
  const lower=[],upper=[];
  for(const p of unique){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(const p of [...unique].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
// 叉积判断点位于有向边的哪侧，用于凸包与内部判定。
function cross(a,b,p){return (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);}
// 树干圆与凸扫掠区相交才压碎；边外角点按欧氏距离检查，不把树冠计入车宽。
export function sweptBoxTouchesCircle(polygon,point,radius) {
  let inside=true;
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dy=b.y-a.y;
    if(cross(a,b,point)<-1e-8)inside=false;
    const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1)));
    if(Math.hypot(point.x-a.x-dx*t,point.y-a.y-dy*t)<=radius+1e-8)return true;
  }
  return inside;
}
