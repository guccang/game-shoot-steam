// 矿车停车选向和路口设置只通过原子存档提交，按所在矿层隔离。
import {MINE_DIRECTIONS,mineCell,mineKey,minePoint} from '../config/mining.js';
import {railExits,railCell,cartDirectionChoices,cartOnSegment} from '../config/mine-rail-routes.js';
import {currentMineLayer} from './mine-layers.js';
import {miningCommit,mineNotice} from './mine-transactions.js';
import {mineOccupancy} from '../physics/mine-motion.js';
// 方向设置不接受暂停、死亡或非矿区的调用。
function active(game){return game.cottage?.kind==='mine'&&game.state==='playing'&&game.player.hp>0;}
// 查询当前乘坐矿车的合法方向，弹窗暂停时仍可只读展示。
export function stoppedCartChoices(game){
 const cart=currentMineLayer(game).carts.find(c=>c.id===game.cottage?.ride);
 return cart?cartDirectionChoices(currentMineLayer(game),cart):[];
}
// 步行必须能走到附近路口，不能隔着岩壁或在另一层远程设置。
export function reachableJunction(game,key){
 if(game.cottage?.kind!=='mine'||game.cottage.ride||game.vehicle.active)return false;
 const l=currentMineLayer(game);if(railExits(l,key).length<3)return false;
 const p=game.player,end=minePoint(railCell(key)),dx=end.x-p.x,dy=end.y-p.y,distance=Math.hypot(dx,dy);
 if(distance>56)return false;
 const steps=Math.max(1,Math.ceil(distance/4));
 for(let i=0;i<=steps;i++)if(!mineOccupancy(game,p.x+dx*i/steps,p.y+dy*i/steps))return false;
 return true;
}
// 只查玩家附近九格，以距离选择路口，不扫描历史轨网。
export function nearbyJunction(game){
 if(game.cottage?.kind!=='mine'||game.cottage.ride||game.vehicle.active)return null;
 const cell=mineCell(game.player),candidates=[];
 for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){
  const key=mineKey({x:cell.x+x,y:cell.y+y});if(reachableJunction(game,key)){const p=minePoint(railCell(key));candidates.push({key,distance:Math.hypot(p.x-game.player.x,p.y-game.player.y)});}
 }
 return candidates.sort((a,b)=>a.distance-b.distance||a.key.localeCompare(b.key))[0]?.key??null;
}
// 显式起步选向优先于脚下路口；轨段中间反向仅交换两端点，不移动坐标。
export function setMineCartDirection(game,direction){
 if(!active(game)||!game.cottage.ride||game.cottage.running)return mineNotice(game,'请先停车，再选择开车方向。');
 const l=currentMineLayer(game),cart=l.carts.find(c=>c.id===game.cottage.ride);
 const choice=cart&&cartDirectionChoices(l,cart).find(n=>n.i===direction);
 if(choice&&cart.target&&choice.key===cart.from&&l.carts.some(c=>c.leader===cart.id))return mineNotice(game,'请先驶至格心，再换到尾车返程。');
 if(!choice)return mineNotice(game,'这个方向没有相连轨道；轨段中间只能前进或掉头。');
 const result=miningCommit(game,(_m,_p,layer)=>{
  const c=layer.carts.find(n=>n.id===cart.id);
  if(cartOnSegment(layer,c)&&Math.hypot(c.x-minePoint(mineCell(c)).x,c.y-minePoint(mineCell(c)).y)>.001){
   if(choice.key===c.from){const from=c.from;c.from=c.target;c.target=from;}
   c.departure=null;
  }else{c.target=null;c.from=null;c.departure=direction;}
  c.heading=direction;
 },'已选择向'+MINE_DIRECTIONS[direction].name+'开车，点击「开车」出发。');
 if(result.ok)game.cottage.direction=direction;
 return result;
}
// 路口方向持续生效；空值恢复自动选路，失败时不改变原有规则。
export function setMineJunctionDirection(game,key,direction){
 if(!active(game)||!reachableJunction(game,key))return mineNotice(game,'请下车，走到要设置的交叉路口旁。');
 if(direction!==null&&!railExits(currentMineLayer(game),key).some(n=>n.i===direction))return mineNotice(game,'这个方向没有相连轨道。');
 return miningCommit(game,(_m,_p,layer)=>{
  layer.junctions??={};if(direction===null)delete layer.junctions[key];else layer.junctions[key]=direction;
 },direction===null?'路口已恢复自动：直行优先，再右转、左转，尽头折返。':'路口已设为向'+MINE_DIRECTIONS[direction].name+'，下次经过时自动采用。');
}

// 摇杆和键盘共用主轴选向；轻微漂移落在死区内，不产生保存请求。
export function mineInputDirection(input){
 if(Math.hypot(input.x,input.y)<.35)return null;
 return Math.abs(input.x)>Math.abs(input.y)?input.x>0?1:3:input.y>0?2:0;
}
// 停车选向只在方向变化时保存；行驶输入交给连接点选路，不逐帧写档。
export function steerStoppedMineCart(game,input){
 const room=game.cottage,direction=mineInputDirection(input);
 if(!room)return;
 if(!room.ride||room.running){room.cartInputDirection=direction;return;}
 if(direction!==null&&direction!==room.cartInputDirection)setMineCartDirection(game,direction);
 room.cartInputDirection=direction;
}
