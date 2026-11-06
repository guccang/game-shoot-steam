// 团子胶质动作只保存临时表现时钟，不修改碰撞体、数值、存档或随机序列。
import {MONSTER_FAMILIES} from '../config/monster-families.js';
import {worldDistance} from '../world/coordinates.js';

// 原生团子与同族装备兵共享软体动作，火苗和其他领主不参与。
export function isDumpling(actor){
 return actor.kind==='dumpling'||(!actor.ember&&actor.type==='enemy'&&MONSTER_FAMILIES.dumpling.members.includes(actor.species||'slime'));
}
// 连射命中保留一次完整压缩回弹，避免每颗弹丸把软体锁在压扁姿态。
export function markDumplingHit(actor){
 if(isDumpling(actor)&&!(actor.gelHitAge>=0&&actor.gelHitAge<.28))actor.gelHitAge=0;
}
// 以主动移动的实际路程推进步伐；停止只衰减幅度，保留相位与自然收势。
export function advanceDumplingMotion(actor,from,dt){
 if(!isDumpling(actor)||dt<=0)return;
 if(Number.isFinite(actor.gelHitAge))actor.gelHitAge=Math.min(.6,actor.gelHitAge+dt);
 const distance=worldDistance(from,actor),moving=Math.min(1,distance/Math.max(1,(actor.speed||34)*dt));
 actor.gelMove=(actor.gelMove||0)+(moving-(actor.gelMove||0))*(1-Math.exp(-dt*12));
 const stride=actor.campDefense&&actor.kind==='dumpling'?15:5;
 actor.gelStep=((actor.gelStep||0)+distance/stride)%(Math.PI*2);
}
// 胶体轮廓使用压缩、腾起、偏摆三个参数；车轮与武器不接受整体缩放。
export function dumplingPose(actor,reduced=false){
 if(reduced)return {squash:0,lift:0,sway:0};
 const armor=actor.species==='ironwood-bulwark',car=actor.species==='bramble-buggy';
 const phase=actor.gelStep||0,weight=(actor.ai?.phase&&actor.ai.phase!=='chase'?0:actor.gelMove||0);
 const gait=Math.sin(phase)*weight,age=actor.gelHitAge;
 const hit=Number.isFinite(age)&&age<.6?.3*Math.cos(age*Math.PI/.18)*Math.exp(-age*5)*(1-age/.6):0;
 const restraint=armor?.42:car?.55:1;
 return {squash:(hit-gait*.14)*restraint,
  lift:actor.flying||car?0:Math.max(0,gait)*(armor?2:actor.kind==='dumpling'?5:7),
  sway:Math.sin(phase-.6)*weight*1.5*restraint+hit*(actor.hitX||0)*4};
}
