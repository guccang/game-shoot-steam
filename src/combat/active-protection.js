// 主动防护只处理敌方飞行弹体，沿实际移动段检查拦截时机。
import {seActive,seBuild,seLevel} from '../config/vehicle-se.js';
import {nearest} from '../world/coordinates.js';
import {segmentCircle} from './collision.js';

// 车载装置共享一份冷却，暂停时由战斗时钟停止推进。
export function advanceProtection(game,dt){
 const build=game.progress?.vehicleSE?.[game.vehicle?.index];
 if(build?.protectionWait>0)build.protectionWait=Math.max(0,build.protectionWait-dt);
}

// 只有预计命中车体或在车旁引爆的弹丸才消耗拦截机会。
export function interceptThreat(game,from,to,end,{previous=game.player,radius=0,splash=0,limit=Infinity,bodyRadius=game.player.radius||12}={}){
 if(!game.progress?.vehicleHulls||!seActive(game,'protection'))return false;
 const build=seBuild(game.progress,game.vehicle.index);
 if(build.protectionWait>0)return false;
 const now=nearest(game.player,from),old=nearest(previous,from);
 const start={x:from.x-old.x,y:from.y-old.y},step={x:to.x-now.x,y:to.y-now.y},origin={x:0,y:0};
 const t=segmentCircle(start,step,origin,Math.max(155,splash)+radius);
 if(t===null||t>limit)return false;
 const direct=segmentCircle(start,step,origin,bodyRadius+radius)!==null||segmentCircle(to,end,now,bodyRadius+radius)!==null;
 if(splash?Math.hypot(end.x-now.x,end.y-now.y)>splash:!direct)return false;
 build.protectionWait=2-.4*seLevel(build,'protection');
 const x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t;
 // 起点与拦截点使用同一世界镜像，跨地图边界时曳光仍指向真实来弹。
 const originY=now.y-15,dx=x-now.x,dy=y-originY;
 game.fx.add('protection-trace',now.x,originY,.48,{size:Math.hypot(dx,dy),angle:Math.atan2(dy,dx)});
 return true;
}
