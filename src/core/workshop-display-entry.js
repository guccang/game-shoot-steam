// 售货员候停使用固定逻辑步长；只返回服务意图，购买和暂停仍交给正式页面。
import {interiorShopkeeper,interiorCounter,SHOPKEEPER_ENTRY as C} from '../config/workshop-interiors.js';

// 柜台前沿之外保留完整角色脚底空间，避免候停点落入家具碰撞。
export function shopkeeperApproach(room){const seller=interiorShopkeeper(room),counter=interiorCounter(room);return seller&&counter?{x:seller.x+55,y:counter.y+counter.height/2+26}:null;}
// 首次接近只建立计时，移动清零；关闭页面后留在原处不会再次打开。
export function updateWorkshopDisplayEntry(game,dt,input={x:0,y:0},dialogOpen=false){
 const room=game.cottage;if(!room)return null;
 const site=shopkeeperApproach(room);
 if(!site){room.displayEntry=null;room.displayEntryLatch=false;return null;}
 if(game.state!=='playing'||dialogOpen)return null;
 const distance=Math.hypot(game.player.x-site.x,game.player.y-site.y);
 if(distance>C.releaseRadius)room.displayEntryLatch=false;
 if(room.sleep||game.player.hp<=0||distance>C.radius||room.displayEntryLatch||Math.hypot(input.x,input.y)>.01||Math.hypot(game.player.vx||0,game.player.vy||0)>C.stopSpeed){room.displayEntry=null;return null;}
 const tick=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;
 room.displayEntry=room.displayEntry?{...room.displayEntry,elapsed:room.displayEntry.elapsed+tick}:{elapsed:0,site};
 if(room.displayEntry.elapsed+1e-9<C.wait)return null;
 room.displayEntry=null;room.displayEntryLatch=true;room.exitElapsed=0;
 return {kind:room.kind,index:undefined};
}
