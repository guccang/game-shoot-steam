// 水壶主体同时供菜单与角色持握使用；水流只在当前动作内生成，不占常驻粒子池。
import {nearest} from '../world/coordinates.js';
import {FARM_ACTION_TIMING} from '../config/farm-tools.js';
// 原点为握把，小圆腹、提手、长嘴保持统一尺寸和森林绿描边。
export function drawWaterCan(c){
 c.save();c.lineWidth=2;c.strokeStyle='#43684e';c.fillStyle='#83b9a6';c.lineJoin='round';
 c.beginPath();c.ellipse(-5,-6,12,10,0,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(7,-2);c.lineTo(24,-10);c.lineTo(27,-5);c.lineTo(9,9);c.closePath();c.fill();c.stroke();c.beginPath();c.roundRect(-14,-7,26,22,6);c.fill();c.stroke();c.fillStyle='#c8dfbd';c.beginPath();c.ellipse(-1,-7,12,4,0,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='#588e82';c.beginPath();c.moveTo(-8,4);c.lineTo(5,4);c.stroke();c.restore();
}
// 提壶、倾倒、收壶共用姿态；出水口取壶嘴端面中点，方向取端面的外法线。
export function wateringPose(player,target,t){
 const facing=target.x<player.x?-1:1,end=FARM_ACTION_TIMING.water.end;
 const u=Math.max(0,Math.min(1,t<.18?t/.18:t>.78?(end-t)/(end-.78):1)),pour=u*u*(3-2*u),angle=1.1*pour;
 const tip={x:25.5*Math.cos(angle)+7.5*Math.sin(angle),y:25.5*Math.sin(angle)-7.5*Math.cos(angle)};
 const hand={x:player.x+14*facing+(target.x-facing*(12+tip.x)-player.x-14*facing)*pour,y:player.y-17-18*pour};
 return {hand,facing,angle,mouth:{x:hand.x+facing*tip.x,y:hand.y+tip.y},
  direction:{x:facing*(5*Math.cos(angle)+3*Math.sin(angle)),y:5*Math.sin(angle)-3*Math.cos(angle)},pouring:t>=.18&&t<=.78};
}
// 水流沿壶嘴方向离开，再向田面下落；控制点高度单调，取消原来的向上抛物弧。
export function wateringDrop(mouth,end,direction,u){
 const drop=end.y-mouth.y;if(drop<=0||direction.y<=0)return null;
 const length=Math.min(1.5,drop/(3*direction.y)),a={x:mouth.x+direction.x*length,y:mouth.y+direction.y*length};
 const b={x:end.x,y:mouth.y+drop*.7},v=1-u;
 const dx=3*v*v*(a.x-mouth.x)+6*v*u*(b.x-a.x)+3*u*u*(end.x-b.x),dy=3*v*v*(a.y-mouth.y)+6*v*u*(b.y-a.y)+3*u*u*(end.y-b.y);
 return {x:v*v*v*mouth.x+3*v*v*u*a.x+3*v*u*u*b.x+u*u*u*end.x,
  y:v*v*v*mouth.y+3*v*v*u*a.y+3*v*u*u*b.y+u*u*u*end.y,angle:Math.atan2(dy,dx)-Math.PI/2};
}
// 小手提起壶身、倾倒再收回；单股水流，最多八滴，暂停沿用冻结后的表现时钟。
export function drawWatering(c,game,player,target,job,t){
 const pose=wateringPose(player,target,t),{hand,facing,angle,mouth,direction}=pose;
 c.save();c.translate(hand.x,hand.y);c.scale(facing,1);c.rotate(angle);drawWaterCan(c);
 c.fillStyle='#f0cfa0';c.strokeStyle='#775e42';c.lineWidth=1.2;c.beginPath();c.ellipse(-5,-10,4,3,0,0,Math.PI*2);c.fill();c.stroke();c.restore();
 if(!job||!pose.pouring)return;
 c.lineWidth=1.6;c.strokeStyle='#c7eff1';c.fillStyle='#75c7d3';
 for(const site of (job.waterTargets||[]).slice(0,1)){const end=nearest(site,player),count=game.reducedMotion?3:8;for(let i=0;i<count;i++){const u=((t-.18)*2.8+i/count)%1,p=wateringDrop(mouth,end,direction,u);if(!p)continue;c.beginPath();c.ellipse(p.x,p.y,1.7,3.2,p.angle,0,Math.PI*2);c.fill();c.stroke();}}
}
