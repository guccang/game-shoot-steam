// 售货员候停使用固定逻辑步长；只返回服务意图，购买和暂停仍交给正式页面。
import {interiorShopkeeper,interiorCounter,SHOPKEEPER_ENTRY as C} from '../../config/workshop-interiors.js';

// 柜台前沿之外保留完整角色脚底空间，避免候停点落入家具碰撞。
export function shopkeeperApproach(room){const seller=interiorShopkeeper(room),counter=interiorCounter(room);return seller&&counter?{x:seller.x,y:counter.y+counter.height/2+10+C.depth/2}:null;}
// 候停覆盖柜台完整前沿，柜内与柜后不计时；距离用于离开后的重新触发。
function approachDistance(game,site){const counter=interiorCounter(game.cottage);return Math.hypot(Math.max(0,Math.abs(game.player.x-site.x)-counter.width/2),Math.max(0,Math.abs(game.player.y-site.y)-C.depth/2));}
// 点击与候停共用服务提交，点击允许主动重开，自动候停仍由闩锁防止关闭后重弹。
export function requestShopkeeperService(game){
 const room=game.cottage,seller=room&&interiorShopkeeper(room);
 if(!seller||game.state!=='playing'||room.sleep||game.player.hp<=0||Math.hypot(game.player.x-seller.x,game.player.y-seller.y)>C.clickRadius)return null;
 room.displayEntry=null;room.displayEntryLatch=true;room.exitElapsed=0;room.storageNotice='';
 return {kind:room.kind,index:undefined};
}
// 首次接近只建立计时，移动清零；关闭页面后留在原处不会再次打开。
export function updateWorkshopDisplayEntry(game,dt,input={x:0,y:0},dialogOpen=false){
 const room=game.cottage;if(!room)return null;
 const site=shopkeeperApproach(room);
 if(!site){room.displayEntry=null;room.displayEntryLatch=false;return null;}
 if(game.state!=='playing'||dialogOpen)return null;
 const distance=approachDistance(game,site);
 if(distance>C.releaseRadius)room.displayEntryLatch=false;
 if(room.sleep||game.player.hp<=0||distance>1e-9||room.displayEntryLatch||Math.hypot(input.x,input.y)>.01||Math.hypot(game.player.vx||0,game.player.vy||0)>C.stopSpeed){room.displayEntry=null;return null;}
 const tick=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;
 room.displayEntry=room.displayEntry?{...room.displayEntry,elapsed:room.displayEntry.elapsed+tick}:{elapsed:0,site};
 if(room.displayEntry.elapsed+1e-9<C.wait)return null;
 return requestShopkeeperService(game);
}
