// 苍鹭机甲共用场景、停车与图标的双层画法，猫驾驶员坐在两层装甲之间。
import {MECH_STEP,mechFoot} from '../config/biped-mech.js';
import {box,oval,poly,outline} from './primitives.js';

// 支撑脚随车身移动向后收，摆动脚先屈膝抬高，再伸到前方快速踏下。
export function drawMechLegs(c,phase,dx=0,dy=0){
 oval(c,0,26,36,8,'rgba(58,68,48,.20)');
 for(const side of [-1,1]){
  const cycle=Math.PI*2,angle=((phase+(side<0?Math.PI:0))%cycle+cycle)%cycle;
  const step=angle/Math.PI,swing=step<1;
  const reach=MECH_STEP*(swing?step*step*(3-2*step)-.5:1.5-step);
  const ground=mechFoot(side,reach,dx,dy);
  // 前七成逐渐提膝，末段迅速伸腿；脚下投影保留离地高度的参照。
  const lift=swing?19*Math.sin(Math.PI*(step<.7?step/.7*.5:.5+(step-.7)/.3*.5)):0;
  const ankle=ground.y-lift-7,knee=8+(ground.y-35)*.46-lift*.68;
  const toe=ground.x*side,hinge=30+(toe-27)*.45+lift*.19;
  c.save();c.scale(side,1);
  oval(c,toe,ground.y+1,10-lift*.18,2.8-lift*.055,'rgba(57,62,45,.22)');
  poly(c,[[12,-10],[21,-12],[hinge+4,knee-3],[hinge-2,knee+6],[18,3]],'#547875');
  poly(c,[[hinge-3,knee],[hinge+4,knee-1],[toe+3,ankle],[toe-4,ankle+1]],'#adb5a0');
  oval(c,hinge,knee,7,6,'#d99a59',outline);
  oval(c,hinge,knee,3,3,'#61736d');
  c.translate(toe,ankle);c.rotate(lift*.012);
  poly(c,[[-5,-4],[4,-4],[10,2],[9,7],[-9,7],[-10,3]],'#526967');
  box(c,-5,2,10,3,1,'#e1b575');
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
