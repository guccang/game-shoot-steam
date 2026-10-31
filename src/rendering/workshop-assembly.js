// 换件过程与局部前后对照复用正式部件绘制，不生成另一套示意零件。
import { drawEquipmentPart, partBounds } from './equipment-parts.js';

// 同倍率展示结构，保留容器边缘安全区，等级变化不会通过整体缩放伪装。
export function drawWorkshopPartComparison(c,index,spec,level) {
  c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();
  try {
    c.translate(c.canvas.width/2,c.canvas.height/2);
    // 改装机匣与下挂弹鼓超出旧小件范围；前后两级按联合边界共用倍率和中心。
    const b=spec.growthBounds?{x:spec.x+spec.growthBounds.left,y:spec.y+spec.growthBounds.top,width:spec.growthBounds.width,height:spec.growthBounds.height}:index===2&&spec.bounds?partBounds(spec):null;
    const scale=Math.min(c.canvas.width/(b?b.width+6:34),c.canvas.height/(b?b.height+6:24));
    c.scale(scale,scale);
    if(b)c.translate(-(b.x-spec.x+b.width/2),-(b.y-spec.y+b.height/2));
    drawEquipmentPart(c,index,spec,level,true);
  } finally {c.restore();}
}

// 两件沿相反方向移出和装入，装配点保持不动；距离由屏幕尺寸换算。
export function drawWorkshopReplacement(c,{index,spec,level,x,y,scale,angle=0,pixels,mirrorX=null},t) {
  c.resetTransform();c.clearRect(0,0,c.canvas.width,c.canvas.height);
  const lift=Math.min(1,t/.35),insert=Math.max(0,Math.min(1,(t-.5)/.5));
  // 平滑起停只移动部件本身，不能拉伸整个武器。
  const smooth=n=>n*n*(3-2*n);
  for(const origin of mirrorX===null?[x]:[x,mirrorX])for(const fresh of [false,true]) {
    const distance=fresh?1-smooth(insert):smooth(lift);
    c.save();
    try {
      c.globalAlpha=fresh?Math.min(1,t/.2):Math.max(0,1-Math.max(0,t-.55)/.45);
      c.translate(origin+(fresh?1:-1)*distance*48*pixels,y-distance*34*pixels);
      c.rotate(angle);c.scale(scale,scale);
      drawEquipmentPart(c,index,spec,level+(fresh?1:0),true);
    } finally {c.restore();}
  }
}
