// 当前列车按车辆编号保存表现快照，镜头、座位、后车和轮毂共享显示时钟。
import {delta} from '../world/coordinates.js';
import {minePoint} from '../config/mining.js';
import {railCell} from '../config/mine-rail-routes.js';
import {mineTrain} from '../core/mining/mine-train.js';

// 存档事务可以替换整层对象，房间、层号、种子与乘坐状态共同标识连续区间。
function riding(game){
 const room=game.cottage;
 if(room?.kind!=='mine'||!room.ride)return null;
 const depth=room.depth||1,root=game.progress?.mining,layer=depth===1?root:root?.layers?.[depth];
 const head=layer?.carts?.find(cart=>cart.id===room.ride);
 return head?{layer,head,scope:[room,depth,layer.seed,game.state,game.mapId,room.ride,!!room.running]}:null;
}

// 单步跨过直角时，按路程先走完前一段再进入下一段，轮子贴住轨道。
function blendCart(view,cart,old,amount){
 let x=old.x,y=old.y,endX=cart.x,endY=cart.y,t=amount;
 if(old.target&&cart.target&&old.target!==cart.target){
  const corner=minePoint(railCell(old.target)),first=Math.hypot(corner.x-x,corner.y-y),second=Math.hypot(endX-corner.x,endY-corner.y);
  const along=(first+second)*amount;
  if(first>0&&along<=first){endX=corner.x;endY=corner.y;t=along/first;}
  else if(second>0){x=corner.x;y=corner.y;t=(along-first)/second;}
 }
 view.x=x+(endX-x)*t;view.y=y+(endY-y)*t;
 view.wheel=(cart.wheel||0)-delta((cart.wheel||0)-old.wheel,Math.PI*2)*(1-amount);
}

// 仅捕获当前编组；停放车辆由绘制器直接读取，表现坐标不写回存档。
export function createMineCartInterpolation(){
 let scope=null;
 const previous=new Map(),views=new Map(),shown=new Map();
 // 每步按编号重新关联，允许装卸矿物时原子替换车厢对象。
 function beforeStep(game){
  const current=riding(game);scope=current?.scope;previous.clear();
  if(current&&game.cottage.running)for(const c of mineTrain(current.layer,current.head)){
   previous.set(c.id,{x:c.x,y:c.y,wheel:c.wheel||0,leader:c.leader,target:c.target});
  }
  for(const id of views.keys())if(!previous.has(id))views.delete(id);
 }
 // 只有同一段连续驾驶才插值，换层、换车、急停和解挂立即使用新位置。
 function sample(game,alpha){
  shown.clear();const current=riding(game);if(!current)return shown;
  const continuous=game.cottage.running&&scope&&current.scope.every((value,i)=>value===scope[i]);
  for(const c of current.layer.carts){
   const old=previous.get(c.id);
   if(c!==current.head&&(!continuous||!old||old.leader!==c.leader))continue;
   let view=views.get(c.id);
   if(!view){view={};views.set(c.id,view);}
   for(const key of Object.keys(view))if(!Object.hasOwn(c,key))delete view[key];
   Object.assign(view,c);
   if(continuous&&old&&alpha<1&&Math.hypot(c.x-old.x,c.y-old.y)<=120)blendCart(view,c,old,Math.max(0,alpha));
   shown.set(c.id,view);
  }
  return shown;
 }
 // 丢弃上一段驾驶快照，让恢复后的首帧直接显示当前编组。
 function reset(){scope=null;previous.clear();views.clear();shown.clear();}
 return {beforeStep,sample,reset};
}
