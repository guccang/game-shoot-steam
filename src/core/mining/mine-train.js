// 挂接时沿真实轨段对齐车辆；后车依次驶过前车离开的轨段。
import {MINING,MINE_DIRECTIONS,minePoint,mineKey,mineCell} from '../../config/mining.js';
import {railCell,railExits,cartOnSegment} from '../../config/mine-rail-routes.js';
import {mineLayer} from '../../progression/mining/mine-layers.js';
import {miningCommit,mineNotice} from './mine-transactions.js';
// 从任意座位找到整列车头，循环挂钩也不能阻塞更新。
export function mineTrainHead(layer,cart){
 const seen=new Set();while(cart?.leader&&!seen.has(cart.id)){seen.add(cart.id);const parent=layer.carts.find(c=>c.id===cart.leader);if(!parent)break;cart=parent;}return cart;
}
// 从任意车厢返回完整编组，乘坐中间车厢也统计全列容量与挂接关系。
export function mineTrain(layer,head){
 head=mineTrainHead(layer,head);
 const train=[];
 while(head&&!train.includes(head)){train.push(head);head=layer.carts.find(c=>c.leader===head.id);}
 return train;
}
// 首尾端均可驾驶，中间车厢仅乘坐；查询不修改编组或座位。
export function mineCartCanDrive(game){
 const room=game.cottage;if(room?.kind!=='mine'||!room.ride)return false;
 const l=mineLayer(game.progress.mining,room.depth||1),cart=l?.carts.find(c=>c.id===room.ride);
 return !!cart&&(!cart.leader||!l.carts.some(c=>c.leader===cart.id));
}
export const MINE_CART_DRIVER_NOTICE='中间车厢只能乘坐，请先下车，到列车首端或尾端上车开车。';
// 尾端换为驾驶端只翻转连接与轨段方向，车体和乘员都保持原坐标。
export function reverseMineTrain(layer,cart){
 const train=mineTrain(layer,cart);if(train.length<2||train.at(-1)?.id!==cart.id)return;
 train.reverse();for(const [i,c] of train.entries()){
  c.leader=i?train[i-1].id:null;
  if(cartOnSegment(layer,c)){[c.from,c.target]=[c.target,c.from];const a=railCell(c.from),b=railCell(c.target);c.heading=MINE_DIRECTIONS.findIndex(d=>d.x===Math.sign(b.x-a.x)&&d.y===Math.sign(b.y-a.y));}
  else if(i===0){const other=train[1],dx=Math.sign(c.x-other.x),dy=Math.sign(c.y-other.y);c.heading=MINE_DIRECTIONS.findIndex(d=>d.x===dx&&d.y===dy);}
  c.departure=null;c.previous=null;
 }
}
// 整列车同步向上一个或下一个轨道连接点靠拢，不越过弯道，不把两节车放到同一点。
function dockingPositions(layer,train,end){
 const positions=[],used=new Set();
 for(const cart of train){
  const key=cartOnSegment(layer,cart)?cart[end]:mineKey(mineCell(cart));
  const point=minePoint(railCell(key)),distance=Math.hypot(cart.x-point.x,cart.y-point.y);
  if(!layer.rails[key]||used.has(key)||distance>MINING.tile*.8)return null;
  if(positions.length&&!railExits(layer,positions.at(-1).key).some(exit=>exit.key===key))return null;
  positions.push({id:cart.id,key,...point,distance});used.add(key);
 }
 return positions;
}
// 两个端点都可接车，选移动距离最短的一种，并避开旁边的第三列车。
function couplingPlan(layer,train,occupied){
 const plans=[];
 // 首尾均可接另一整列；车头接车时反向整理本列，新的外侧车头继续负责驾驶。
 const sources=(train.length===1?[train]:[train,[...train].reverse()]).map(order=>({order,docks:['from','target'].map(end=>dockingPositions(layer,order,end)).filter(Boolean)}));
 for(const head of layer.carts){
  if(head.leader||train.includes(head))continue;
  const other=mineTrain(layer,head);
  for(const order of other.length===1?[other]:[other,[...other].reverse()]){
   for(const {order:source,docks} of sources){
    const tail=source.at(-1);
    if(Math.hypot(order[0].x-tail.x,order[0].y-tail.y)>MINING.tile*1.35)continue;
    for(const end of ['from','target']){
     const target=dockingPositions(layer,order,end);if(!target)continue;
     for(const a of docks){
      if(!railExits(layer,a.at(-1).key).some(exit=>exit.key===target[0].key))continue;
      const cars=alignCouplingSeat(layer,[...a,...target],occupied);if(!cars)continue;const keys=new Set(cars.map(c=>mineKey(mineCell(c))));
      if(keys.size!==cars.length)continue;
      if(layer.carts.some(c=>!train.includes(c)&&!other.includes(c)&&cars.some(p=>Math.hypot(p.x-c.x,p.y-c.y)<38)))continue;
      plans.push({cars,distance:cars.reduce((sum,c)=>sum+c.distance,0),reversed:source[0]!==train[0]});
     }
    }
   }
  }
 }
 return plans.sort((a,b)=>a.distance-b.distance||Number(a.reversed)-Number(b.reversed))[0];
}
// 以正在乘坐的车为固定锚点沿轨道对齐其余车辆，轨段中途挂接也不挪动猫猫。
function alignCouplingSeat(layer,docks,occupied){
 const index=docks.findIndex(c=>c.id===occupied.id),anchor=docks[index],dx=occupied.x-anchor.x,dy=occupied.y-anchor.y,distance=Math.hypot(dx,dy);
 if(distance<.001)return docks;
 if(dx&&dy)return null;
 const cell=railCell(anchor.key),edge=mineKey({x:cell.x+Math.sign(dx),y:cell.y+Math.sign(dy)}),before=docks[index-1],after=docks[index+1];
 const step=before?.key===edge?-1:after?.key===edge?1:index===0?-1:index===docks.length-1?1:0;if(!step)return null;
 const keys=new Set(docks.map(c=>c.key)),result=[];
 for(const [i,dock] of docks.entries()){
  let neighbor=docks[i+step];
  if(!neighbor){
   const inside=docks[i-step],direction=MINE_DIRECTIONS.findIndex(d=>d.x===Math.sign(dock.x-inside.x)&&d.y===Math.sign(dock.y-inside.y));
   const exits=railExits(layer,dock.key).filter(e=>!keys.has(e.key)),exit=exits.find(e=>e.key===edge)||exits.find(e=>e.i===direction)||exits[0];
   if(!exit)return null;neighbor={key:exit.key,...minePoint(railCell(exit.key))};
  }
  if(!railExits(layer,dock.key).some(e=>e.key===neighbor.key))return null;
  const fraction=distance/MINING.tile,x=dock.x+(neighbor.x-dock.x)*fraction,y=dock.y+(neighbor.y-dock.y)*fraction;
  if(dock.id===occupied.id&&Math.hypot(x-occupied.x,y-occupied.y)>.001)return null;
  const from=step<0?dock.key:neighbor.key,target=step<0?neighbor.key:dock.key,a=railCell(from),b=railCell(target);
  result.push({...dock,x:dock.id===occupied.id?occupied.x:x,y:dock.id===occupied.id?occupied.y:y,from,target,heading:MINE_DIRECTIONS.findIndex(d=>d.x===Math.sign(b.x-a.x)&&d.y===Math.sign(b.y-a.y))});
 }
 return result;
}
// 玩家只需靠近并停车；对齐和挂钩一起保存，失败时车辆仍在原处。
export function coupleMineCart(game,detach=false){
 const room=game.cottage;
 if(room?.kind!=='mine'||!room.ride||room.running||game.state!=='playing')return mineNotice(game,'请乘坐矿车并停车。');
 const l=mineLayer(game.progress.mining,room.depth||1),head=l.carts.find(c=>c.id===room.ride),train=mineTrain(l,head),tail=train.at(-1);
 if(!tail)return mineNotice(game,'找不到当前矿车。');
 if(detach)return miningCommit(game,(m,p,layer)=>{for(const c of layer.carts)if(train.some(t=>t.id===c.id))c.leader=null;},'挂钩已解开。');
 const plan=couplingPlan(l,train,head);
 if(!plan)return mineNotice(game,'请让两列矿车的首端或尾端在相连轨道上靠近停车，相距一节车以内。');
 const result=miningCommit(game,(_m,_p,layer)=>{
  for(const [i,dock] of plan.cars.entries()){
   const cart=layer.carts.find(c=>c.id===dock.id);
   Object.assign(cart,{x:dock.x,y:dock.y,leader:i?plan.cars[i-1].id:null,from:dock.from??null,target:dock.target??null,previous:null,departure:null,...(dock.heading===undefined?{}:{heading:dock.heading})});
  }
  const [first,second]=plan.cars,dx=Math.sign(first.x-second.x),dy=Math.sign(first.y-second.y);
  if(first.heading===undefined)layer.carts.find(c=>c.id===first.id).heading=MINE_DIRECTIONS.findIndex(d=>d.x===dx&&d.y===dy);
 },`已挂接为 ${plan.cars.length} 辆矿车，保持当前座位；首尾可开车，中间车厢仅乘坐。`);
 if(result.ok)room.cartInputDirection=null;
 return result;
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
  // 和车头在同一帧到达连接点，浮点余差不能让后车少走下一段的第一步。
  if(distance<=step+.001){cart.x=target.x;cart.y=target.y;cart.previous=cart.from;cart.target=null;}
 }
}
