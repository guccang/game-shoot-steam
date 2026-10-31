// 工坊工具保持固定接触点，棘轮传动与逐段焊缝共用正式施工进度。
import { box, oval, poly, outline } from './primitives.js';

// 扳手回程不倒转螺栓；焊枪沿焊缝推进，暂停保留工具姿势与已完成焊点。
export function drawWorkshopTool(c, tool, x, y, progress = 0, active = false, reduced = false) {
  const p=Math.max(0,Math.min(1,progress)),cycle=p*3,phase=cycle%1;
  const drive=Math.min(1,phase/.65),returning=phase>.65;
  const angle=reduced?-.55:-.85+.95*(returning?1-(phase-.65)/.35:drive);
  c.save();c.translate(x,y);
  try {
    if(active||p>0){c.strokeStyle='#d8b66e';c.lineWidth=2;c.beginPath();c.arc(0,0,23,0,Math.PI*2);c.stroke();}
    if(tool==='welder') {
      // 已焊部分留下鱼鳞状焊珠，喷嘴只沿尚未完成的短缝移动。
      c.strokeStyle='#315c43';c.lineWidth=3;c.beginPath();c.moveTo(-12,0);c.lineTo(12,0);c.stroke();
      for(let i=0;i<=Math.floor(p*8);i++)oval(c,-12+i*3,0,2,3,'#bfcbb1',outline,.7);
      const tip=reduced?0:-12+24*p;
      c.save();c.translate(tip,0);
      poly(c,[[0,0],[9,-10],[25,-12],[29,-6],[12,-3],[3,2]],'#718672',outline,2);
      box(c,21,-16,19,16,4,'#b68a51',outline,2);
      box(c,29,-5,9,20,3,'#315c43',outline,1.5);
      for(let i=0;i<3;i++)box(c,25+i*4,-13,2,7,1,'#f4dca0',null);
      if(active) {
        oval(c,0,0,reduced?3:5,3,'#f4dca0');oval(c,0,0,2,2,'#fff8df');
        if(!reduced)for(let i=0;i<6;i++) {
          const life=(p*9+i/6)%1,a=1+i*.45,r=7+life*17;
          c.strokeStyle=i%2?'#f4dca0':'#b68a51';c.lineWidth=1.6;
          c.beginPath();c.moveTo(Math.cos(a)*r,Math.sin(a)*r);c.lineTo(Math.cos(a)*(r+4),Math.sin(a)*(r+4));c.stroke();
        }
      }
      c.restore();
    } else {
      // 螺栓只在受力行程前进，手柄回摆时棘轮空转。
      oval(c,0,0,9,9,'#718672',outline,1.5);
      c.save();c.rotate(reduced?0:(Math.floor(cycle)+drive)*.95);
      poly(c,[[-5,-3],[0,-6],[5,-3],[5,3],[0,6],[-5,3]],'#f4dca0',outline,1.2);
      box(c,-3,-.8,6,1.6,0,'#315c43',null);c.restore();
      c.save();c.rotate(angle);
      box(c,-3,3,6,34,2,'#b7c6a6',outline,2);box(c,-4,21,8,16,3,'#b68a51',outline,1.5);
      poly(c,[[-9,-8],[-4,-12],[-4,-3],[4,-3],[4,-12],[9,-8],[9,2],[4,8],[-4,8],[-9,2]],'#cbd7b6',outline,2);
      oval(c,0,32,1.5,2,'#315c43');c.restore();
    }
    // 亮奶油金进度弧与麦穗金底环区分，让施工转圈在工具上清晰可见。
    if(p>0) { c.strokeStyle='#fff2a8';c.lineWidth=3;c.beginPath();c.arc(0,0,23,-Math.PI/2,-Math.PI/2+p*Math.PI*2);c.stroke(); }
  } finally {c.restore();}
}
