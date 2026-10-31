// 奶油白金杯面包车：平头高顶、金色侧条和真实滑门，前后层给驾驶员留座位。
import {box,oval,poly,outline} from './primitives.js';
import {JINBEI_BODY_SCALE} from '../config/jinbei.js';
// 车轮辐条跟随实际行程；只滑动车门，不拉伸整车模拟运动。
export function drawJinbeiRear(c,phase=0,hatch=0,side=1){
 c.save();c.scale(JINBEI_BODY_SCALE,JINBEI_BODY_SCALE);
 oval(c,3,35,56,18,'#253c3340');
 for(const x of [-47,47])for(const y of [-28,30]){box(c,x-7,y-13,14,26,6,'#48584e',outline,2);oval(c,x,y,5,9,'#a7b49b',outline,1);c.strokeStyle='#536b58';c.lineWidth=2;c.beginPath();c.moveTo(x+Math.cos(phase)*4,y+Math.sin(phase)*8);c.lineTo(x-Math.cos(phase)*4,y-Math.sin(phase)*8);c.stroke();}
 box(c,-43,-52,86,94,14,'#dddbbd',outline,2.7);box(c,-35,-48,70,14,7,'#f5ebc9',outline,2);
 box(c,-36,-33,72,59,7,'#668c83',outline,2);poly(c,[[-31,-29],[-5,-29],[-23,21],[-31,21]],'#a7c9b5');
 for(const x of [-39,30])box(c,x,-41,9,69,3,'#d0ad65',outline,1.3);
 const open=Math.sin(Math.min(1,hatch/.7)*Math.PI*.75);
 if(hatch>0)box(c,side>0?34:-44,-5,10,33,2,'#4a5f51',outline,1.5);
 c.save();c.translate(side*(hatch>0?open*2:0),hatch>0?-open*24:0);box(c,side>0?34:-44,-8,10,36,3,'#e8dfba',outline,1.6);box(c,side>0?36:-42,-4,6,16,2,'#8baba0',outline,1);box(c,side>0?37:-41,17,4,2,1,'#6b7e65');c.restore();
 for(const x of [-47,42])box(c,x,-10,5,12,2,'#c8c8a6',outline,1.3);
 c.restore();
}
// 前脸挡住驾驶员脚部，窗上沿留出头部；金色牌与横格栅区别于消防车。
export function drawJinbeiFront(c){
 c.save();c.scale(JINBEI_BODY_SCALE,JINBEI_BODY_SCALE);
 box(c,-42,8,84,38,10,'#e7dfbb',outline,2.5);box(c,-38,10,76,7,3,'#c8a45e');
 box(c,-22,23,44,12,4,'#6b806b',outline,1.7);for(let y=26;y<34;y+=4)box(c,-19,y,38,1,0,'#c4c9a9');
 for(const x of [-35,23])box(c,x,22,12,10,3,'#faf0c5',outline,1.5);
 box(c,-15,36,30,7,2,'#e3be6a',outline,1);c.fillStyle=outline;c.font='bold 6px sans-serif';c.textAlign='center';c.fillText('金杯',0,42);
 box(c,-39,43,78,6,3,'#7e8f77',outline,1.7);
 c.restore();
}
