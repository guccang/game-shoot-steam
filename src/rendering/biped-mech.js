// 苍鹭机甲共用场景、停车与图标的双层画法，猫驾驶员坐在两层装甲之间。
import {box,oval,poly,outline} from './primitives.js';

// 以实际移动累计的相位驱动髋、膝和脚掌，停车时保留最后一步的姿态。
export function drawMechLegs(c,phase){
 oval(c,0,26,36,8,'rgba(58,68,48,.20)');
 for(const side of [-1,1]){
  const stride=Math.sin(phase)*side,lift=Math.max(0,stride)*6;
  c.save();c.scale(side,1);
  const knee=8+stride*5,foot=28+stride*6-lift;
  poly(c,[[12,-10],[21,-12],[33,knee-3],[28,knee+6],[18,3]],'#547875');
  poly(c,[[27,knee],[34,knee-1],[30,foot],[23,foot+1]],'#adb5a0');
  oval(c,30,knee,7,6,'#d99a59',outline);
  oval(c,30,knee,3,3,'#61736d');
  poly(c,[[22,foot-4],[31,foot-4],[37,foot+2],[36,foot+7],[18,foot+7],[17,foot+3]],'#526967');
  box(c,22,foot+2,10,3,1,'#e1b575');
  c.restore();
 }
 box(c,-23,-33,46,30,9,'#465e60',outline,2.5);
 for(const side of [-1,1]){
  c.save();c.scale(side,1);
  poly(c,[[16,-27],[27,-32],[37,-24],[32,-10],[20,-8]],'#77958a');
  box(c,25,-24,7,4,1,'#e5b773');c.restore();
 }
}

// 前胸斜装甲包住驾驶座，下沿留出膝关节与脚掌的活动空间。
export function drawMechArmor(c,flash){
 poly(c,[[-23,-10],[-13,-14],[0,-8],[14,-14],[24,-10],[20,3],[10,11],[-10,11],[-20,3]],flash?'#b9c6aa':'#83a49a');
 for(const side of [-1,1]){
  c.save();c.scale(side,1);
  poly(c,[[5,-6],[17,-10],[20,-6],[14,-2],[7,0]],'#334e52');
  box(c,10,-6,6,2,1,'#a2ead8');c.restore();
 }
}
