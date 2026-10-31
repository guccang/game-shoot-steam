// 从正式平面速度和击退行程采样局部受击姿态；无额外时钟或战斗状态修改。
import {monsterHitProfile} from '../config/monster-hit-reactions.js';
// 连续命中沿用 hitStep，速度衰减时幅度归零，左右命中按真实动量改变承力方向。
export function monsterHitPose(enemy,reduced=false){
 const speed=Math.hypot(enemy.pushX||0,enemy.pushY||0),profile=monsterHitProfile(enemy);
 const strength=reduced||profile.roll?0:Math.min(1,speed/180),phase=(enemy.hitStep||0)/11;
 const dx=speed?(enemy.pushX||0)/speed:0,dy=speed?(enemy.pushY||0)/speed:0;
 return {strength,phase,dx,dy,lean:-dx*strength*profile.lean,
  settle:strength*(1.5+Math.abs(dy)*2),shift:dx*strength*2.5};
}
// 根足/靴子交替抬落；根端与腿一并移动，不能靠整张贴图旋转模拟步态。
export function hitFoot(pose,side){
 const wave=Math.sin(pose.phase+(side<0?Math.PI:0));
 return {lift:Math.max(0,wave)*5*pose.strength,x:-pose.dx*wave*4*pose.strength};
}
// 只变换根部以上的身体，脚/轮已在外层绘制，最多轻微倾斜后自动回正。
export function applyHitTorso(c,pose){
 c.translate(pose.shift,pose.settle-10);c.rotate(pose.lean);c.translate(0,10);
}
