// 矿车只能在相邻轨道格心挂接，后车依次驶过前车刚刚离开的轨段。
import {minePoint,mineKey,mineCell} from '../config/mining.js';
import {railCell,railExits} from '../config/mine-rail-routes.js';
import {mineLayer} from '../progression/mine-layers.js';
import {miningCommit,mineNotice} from './mine-transactions.js';
// 返回从当前车头到尾车的有序车辆。
export function mineTrain(layer,head){
 const train=[];
 while(head&&!train.includes(head)){train.push(head);head=layer.carts.find(c=>c.leader===head.id);}
 return train;
}
// 在停车时把相邻空闲车组挂到尾部，再次操作可解列。
export function coupleMineCart(game,detach=false){
 const room=game.cottage;
 if(room?.kind!=='mine'||!room.ride||room.running||game.state!=='playing')return mineNotice(game,'请乘坐车头并停车。');
 const l=mineLayer(game.progress.mining,room.depth||1),head=l.carts.find(c=>c.id===room.ride),train=mineTrain(l,head),tail=train.at(-1);
 if(!tail)return mineNotice(game,'找不到当前矿车。');
 if(detach)return miningCommit(game,(m,p,layer)=>{for(const c of layer.carts)if(train.some(t=>t.id===c.id))c.leader=null;},'挂钩已解开。');
 const key=mineKey(mineCell(tail)),point=minePoint(mineCell(tail));
 const next=railExits(l,key).map(exit=>minePoint(railCell(exit.key))).flatMap(q=>l.carts.filter(c=>!c.target&&!c.leader&&!train.includes(c)&&Math.hypot(c.x-q.x,c.y-q.y)<.01))[0];
 if(!next||tail.target||Math.hypot(tail.x-point.x,tail.y-point.y)>.01)return mineNotice(game,'请在格心停车，将另一辆矿车停在车尾相邻的轨道格。');
 return miningCommit(game,(m,p,layer)=>{layer.carts.find(c=>c.id===next.id).leader=tail.id;},'已挂接矿车，可以继续加挂或开往入口。');
}
// 后车分段跟进；朝向在路口改变，轮相随实际位移推进。
export function moveWagons(train,step){
 for(let i=train.length-1;i>0;i--){
  const cart=train[i],leader=train[i-1];
  if(!cart.target){cart.target=i===1?leader.from:mineKey(mineCell(leader));cart.from=mineKey(mineCell(cart));}
  const target=minePoint(railCell(cart.target)),dx=target.x-cart.x,dy=target.y-cart.y,distance=Math.hypot(dx,dy);
  const travel=Math.min(step,distance);
  cart.x+=dx/Math.max(distance,.0001)*travel;cart.y+=dy/Math.max(distance,.0001)*travel;
  cart.wheel=(cart.wheel+travel/8)%(2*Math.PI);
  if(travel>=distance){cart.previous=cart.from;cart.target=null;}
 }
}
