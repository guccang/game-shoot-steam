import {mineInsideBounds} from './mine-ecology.js';
// 轨道连接和选路共用纯规则，界面、存档与驾驶读取同一合法出口。
import {MINE_DIRECTIONS,mineCell,mineKey,minePoint} from './mining.js';
// 网格键还原为轨道坐标，调用方只传已验证的轨道键。
export function railCell(key){const [x,y]=key.split(',').map(Number);return {x,y};}
// 只返回与当前格直接相连的四向轨道，不允许斜跨或跳轨。
export function railExits(layer,key){
 if(typeof key!=='string'||!layer?.rails?.[key])return [];
 const cell=railCell(key),point=minePoint(cell);if(!mineInsideBounds(layer,point.x,point.y))return [];
 return MINE_DIRECTIONS.map((d,i)=>({i,key:mineKey({x:cell.x+d.x,y:cell.y+d.y})})).filter(n=>{const p=minePoint(railCell(n.key));return layer.rails[n.key]&&mineInsideBounds(layer,p.x,p.y);});
}
// 判断车体是否确实停在两端点之间，同时用于旧档和损坏存档恢复。
export function cartOnSegment(layer,cart){
 if(typeof cart.from!=='string'||typeof cart.target!=='string'||!layer.rails[cart.from]||!layer.rails[cart.target]||!railExits(layer,cart.from).some(n=>n.key===cart.target))return false;
 const a=minePoint(railCell(cart.from)),b=minePoint(railCell(cart.target));
 return Number.isFinite(cart.x)&&Number.isFinite(cart.y)&&
 Math.abs(Math.hypot(cart.x-a.x,cart.y-a.y)+Math.hypot(cart.x-b.x,cart.y-b.y)-Math.hypot(a.x-b.x,a.y-b.y))<.001;
}
// 停在轨段中间只能沿轨前进或后退；格心可选任一相邻出口，包括原路掉头。
export function cartDirectionChoices(layer,cart){
 if(cartOnSegment(layer,cart)){
  const ends=[cart.from,cart.target].map(key=>({key,p:minePoint(railCell(key))}));
  if(ends.every(n=>Math.hypot(n.p.x-cart.x,n.p.y-cart.y)>.001))
   return ends.map(n=>({key:n.key,i:MINE_DIRECTIONS.findIndex(d=>d.x===Math.sign(n.p.x-cart.x)&&d.y===Math.sign(n.p.y-cart.y))}));
 }
 return railExits(layer,mineKey(mineCell(cart)));
}
// 实时输入优先于一次起步和路口设置；自动只选直行、右转和左转，尽头不自动掉头。
export function nextCartExit(layer,cart,fallback=1,inputDirection=null){
 const key=mineKey(mineCell(cart)),exits=railExits(layer,key),heading=Number.isInteger(cart.heading)?cart.heading:fallback;
 const configured=exits.length>=3?layer.junctions?.[key]:null;
 const order=[inputDirection,cart.departure,configured,heading,(heading+1)%4,(heading+3)%4];
 return order.map(i=>exits.find(n=>n.i===i)).find(Boolean)||null;
}
