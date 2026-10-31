// 施工完成复用真实工具：收回后局部描边，不覆盖或放大设备主体。
import { drawWorkshopTool } from './workshop-tools.js';

// 点位使用屏幕逻辑像素；角括号保持真实零件内部可见，减少动态只绘制静态结果。
export function drawWorkshopCompletion(c,points,tool,time,reduced=false) {
  const retract=reduced?1:Math.min(1,time/.35),focus=reduced?1:Math.max(0,Math.min(1,(time-.35)/.8));
  if(retract<1) {
    const p=points[0],ease=retract*retract*(3-2*retract);
    c.save();c.translate(p.x+ease*34*p.flipX,p.y-ease*38);c.scale(1.25*p.flipX,1.25*p.flipY);
    c.globalAlpha=1-ease;drawWorkshopTool(c,tool,0,0,1,false,reduced);c.restore();return;
  }
  for(const p of points) {
    const expand=1+(1-focus)*.2,w=p.width/2*expand,h=p.height/2*expand,corner=9;
    c.save();c.translate(p.x,p.y);c.lineJoin='round';c.lineCap='round';
    // 奶油色外衬和绿色细边只围住新部件，不铺遮罩。
    for(const [color,width] of [['#f4dca0',5],['#315c43',2]]) {
      c.strokeStyle=color;c.lineWidth=width;c.beginPath();
      for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {c.moveTo(sx*(w-corner),sy*h);c.lineTo(sx*w,sy*h);c.lineTo(sx*w,sy*(h-corner));}
      c.stroke();
    }
    c.restore();
  }
}
