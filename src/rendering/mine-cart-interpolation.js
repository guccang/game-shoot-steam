// 当前乘坐矿车的有界表现快照，按层与车辆ID衔接，绝不改写存档中的车辆。
import {delta} from '../world/coordinates.js';
// 只读取当前乘坐的车辆，不遍历其他地下层，也不递归复制进度。
function riding(game){const room=game.cottage;if(room?.kind!=='mine'||!room.ride)return null;const depth=room.depth||1,root=game.progress?.mining,layer=depth===1?root:root?.layers?.[depth],cart=layer?.carts?.find(c=>c.id===room.ride);return cart?{cart,scope:[room,depth,layer.seed,game.state,game.mapId,room.ride,!!room.running]}:null;}
// 一份历史和一份表现对象随帧复用；原子保存替换对象不会丢失车辆的连续身份。
export function createMineCartInterpolation(){
 let previous=null;const view={};
 // 在正式模拟步前抓取位置和轮毂，不抓取路网、生态或背包。
 function beforeStep(game){const current=riding(game);previous=current?{scope:current.scope,x:current.cart.x,y:current.cart.y,wheel:current.cart.wheel||0}:null;}
 // 起停、换层、换车和大位移直接落在真实坐标，连续行驶只平滑同一辆车。
 function sample(game,alpha){const current=riding(game);if(!current)return null;const c=current.cart,continuous=previous&&current.scope.every((value,i)=>value===previous.scope[i])&&Math.hypot(c.x-previous.x,c.y-previous.y)<=120,amount=continuous?Math.max(0,Math.min(1,alpha)):1;for(const key of Object.keys(view))if(!Object.hasOwn(c,key))delete view[key];Object.assign(view,c);if(amount<1){view.x=previous.x+(c.x-previous.x)*amount;view.y=previous.y+(c.y-previous.y)*amount;view.wheel=(c.wheel||0)-delta((c.wheel||0)-previous.wheel,Math.PI*2)*(1-amount);}return view;}
 // 暂停恢复和场景清理不保留旧轨段的历史。
 function reset(){previous=null;}
 return {beforeStep,sample,reset};
}
