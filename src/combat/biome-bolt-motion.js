// 地貌弹丸的真实运动与落砸高度；绘制器使用相同进度，不修改命中半径。
import {BIOME_DUMPLING_BY_ID} from '../config/biome-dumplings.js';
// 非追踪弧线按初始方向匀速转弯，方向锁定后不会追着玩家改道。
export function biomeBoltStep(b,dt){
 const p=BIOME_DUMPLING_BY_ID[b.dumplingVariant];if(!p)return null;
 const initial=b.launchSpeed??p.speed,acc=p.acceleration||0,old=b.speed,next=Math.max(p.minSpeed||initial,Math.min(p.maxSpeed||initial,initial+acc*((b.age||0)+dt)));
 b.speed=next;const travel=Math.min(b.remaining,(old+next)*.5*dt),curve=b.curve||0,angle=Math.atan2(b.dy,b.dx),turn=curve*dt;
 const mid=angle+turn*.5;b.dx=Math.cos(angle+turn);b.dy=Math.sin(angle+turn);
 return {travel,to:{x:b.x+Math.cos(mid)*travel,y:b.y+Math.sin(mid)*travel}};
}
// 弹体离地抛物线与预告落点同步，落地阴影始终留在真实平面位置。
export function biomeBoltHeight(b){const p=BIOME_DUMPLING_BY_ID[b.dumplingVariant];if(!p?.arcHeight)return 0;const t=Math.max(0,Math.min(1,1-b.remaining/Math.max(1,b.flightDistance||b.remaining)));return Math.sin(Math.PI*t)*p.arcHeight;}
