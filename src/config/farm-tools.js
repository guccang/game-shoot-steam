// 农活命中与表现共用时刻、刃口接触点，避免动画挥空却已结算。
export const FARM_ACTION_TIMING=Object.freeze({dig:{hit:.38,end:.72},remove:{hit:.38,end:.72},plant:{hit:.34,end:.68},harvest:{hit:.42,end:.82},saw:{hit:.9,end:1.2},water:{hit:.55,end:.95}});
// 最后一个交战目标消失后继续持枪警戒，使用有效游玩秒数，避免击杀后立即闪回农具。
export const FARM_COMBAT_RESUME_DELAY=1.05;
export const FARM_TOOL_CONTACT=Object.freeze({dig:{x:36,y:12},harvest:{x:36,y:0}});
// 推镰的刃口偏移同时用于绘制和命中，锁行容差小于两条相邻田垄的间距。
export const ROW_REAPER=Object.freeze({reach:26,startRange:76,rowTolerance:5,maxGap:113,speed:.62});
export const FARM_CROP_SIZE=Object.freeze([{width:18,height:14},{width:32,height:40},{width:49,height:67}]);

// 有界缓动只改变工具关节，不缩放身体或修改实际动作时间。
function smooth(t){const u=Math.max(0,Math.min(1,t));return u*u*(3-2*u);}
// 刃口围绕握柄旋转，供正式绘制和命中对齐验收共用。
function turn(point,angle){return {x:point.x*Math.cos(angle)-point.y*Math.sin(angle),y:point.x*Math.sin(angle)+point.y*Math.cos(angle)};}
// 蓄力慢、挥落快、接触短停、收势慢；接触时刃口严格落在目标坐标。
export function farmToolPose(action,elapsed,player,target,active=true){
 const timing=FARM_ACTION_TIMING[action],contact=FARM_TOOL_CONTACT[action],base={x:player.x+14,y:player.y-17};
 const idle=-.9,t=Math.max(0,elapsed),wind=.18,hold=.045,follow=action==='dig'?.52:.59;
 const aim=Math.atan2(target.y-base.y,target.x-base.x)-Math.atan2(contact.y,contact.x);
 // 使用最短转角，角色从目标另一侧操作时不突然整圈旋转。
 const goal=idle+Math.atan2(Math.sin(aim-idle),Math.cos(aim-idle)),back=goal-(action==='dig'?1.05:.95);
 let angle=idle,reach=0,phase='idle';
 if(active){
  if(t<wind){const u=smooth(t/wind);angle=idle+(back-idle)*u;reach=u*.2;phase='windup';}
  else if(t<timing.hit){const u=(t-wind)/(timing.hit-wind),s=u*u*u;angle=back+(goal-back)*s;reach=.2+.8*s;phase='strike';}
  else if(t<timing.hit+hold){angle=goal;reach=1;phase='contact';}
  else if(t<follow){const u=smooth((t-timing.hit-hold)/(follow-timing.hit-hold));angle=goal+(action==='dig'?.13:.64)*u;reach=1;phase='follow';}
  else{const u=smooth((t-follow)/(timing.end-follow)),endAngle=goal+(action==='dig'?.13:.64);angle=endAngle+(idle-endAngle)*u;reach=1-u;phase='recover';}
 }
 const atHit=turn(contact,goal),x=base.x+(target.x-atHit.x-base.x)*reach,y=base.y+(target.y-atHit.y-base.y)*reach,tip=turn(contact,angle);
 return {x,y,angle,phase,contact:{x:x+tip.x,y:y+tip.y}};
}
