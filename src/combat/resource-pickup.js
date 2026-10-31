// 连续拾取的时间与轨迹：只读已到账数量，不修改钱包，也不消耗战斗随机序列。
import {RESOURCE_PICKUP as C,WOOD_PICKUP as W} from '../config/resource-pickup.js';
import {nearest} from '../world/coordinates.js';

// 每次击杀或伐木只保留一个奖励批次，保存原始起点供后续错峰发射。
export function createResourceDrop(target,coins,wood){
 return {x:target.x,y:target.y-15,originX:target.x,originY:target.y-15,coins,wood,age:0,life:coins>0?C.life:W.life};
}
// 少量收益也有连续反馈；大额收益限制图标数，避免按金币数分配对象。
function iconCount(amount,reduced,wood=false){
 if(wood)return amount>0?(reduced?1:Math.min(W.maxIcons,Math.max(W.minIcons,Math.ceil(Math.log2(amount+1))))):0;
 return amount>0?(reduced?3:Math.min(C.maxIcons,Math.max(C.minIcons,Math.ceil(Math.log2(amount+1))+5))):0;
}
// 二次曲线共用当前点和短拖尾采样，不通过拉伸资源图标伪造速度。
function arcPoint(start,control,goal,u){const v=1-u;return {x:v*v*start.x+2*v*u*control.x+u*u*goal.x,y:v*v*start.y+2*v*u*control.y+u*u*goal.y};}
// 返回当前可见的图标，延迟阶段不绘制，抵达角色后消失；同帧多次绘制不会推进动画。
export function resourcePickupPoses(drops,player,reduced=false){
 const result=[];
 for(let b=drops.length-1;b>=0;b--){
  const drop=drops[b];if(drop.life<=0)continue;
  const start=nearest({x:drop.originX??drop.x,y:drop.originY??drop.y},player);
  const age=drop.age??0,counts=[iconCount(drop.coins,reduced),iconCount(drop.wood,reduced,true)];
  for(let i=0;i<Math.max(...counts);i++)for(let kind=0;kind<2;kind++){
   if(i>=counts[kind])continue;
   const timing=kind?W:C,delay=i*timing.emitSeconds/Math.max(1,counts[kind]-1)+kind*.07;
   const duration=(reduced?timing.reducedFlightSeconds:timing.flightSeconds)+(i%3)*timing.flightVariation/2,t=(age-delay)/duration;
   if(t<=0||t>=1)continue;
   const seed=i*2.399+kind*1.7,spread=reduced?4:12;
   const sx=start.x+Math.cos(seed)*spread,sy=start.y+Math.sin(seed)*spread;
   const gx=player.x,gy=player.y-20,dx=gx-sx,dy=gy-sy,length=Math.max(1,Math.hypot(dx,dy));
   const bend=reduced?0:(i%2?1:-1)*(6+i%3*3),u=reduced?t*t:.4*t+.6*t*t;
   const origin={x:sx,y:sy},goal={x:gx,y:gy},control={x:(sx+gx)/2-dy/length*bend,y:(sy+gy)/2+dx/length*bend-(reduced?0:8)};
   const point=arcPoint(origin,control,goal,u),previous=Math.max(0,t-.08);
   const tail=arcPoint(origin,control,goal,reduced?u:.4*previous+.6*previous*previous);
   const tx=tail.x-point.x,ty=tail.y-point.y,limit=Math.min(1,18/Math.max(1,Math.hypot(tx,ty)));
   result.push({kind:kind?'wood':'coins',...point,tailX:point.x+tx*limit,tailY:point.y+ty*limit,
    alpha:Math.min(1,t/.08,(1-t)/.1),size:(kind?17:16)*(1-Math.max(0,t-.8)*.8)});
   if(result.length>=C.drawLimit)return result;
  }
 }
 return result;
}
