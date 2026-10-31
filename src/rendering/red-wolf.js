// 红狼重型坦克：宽履带、红色楔形复合甲与狼徽，后层和前层分别参与人物遮挡。
import {box,oval,poly,outline} from './primitives.js';
import {RED_WOLF_HULL} from '../config/red-wolf-geometry.js';
// 履带按实际位移的轮相推进，轮架保持接地，悬挂上方车体承受炮击回坐。
export function drawRedWolfRear(c,phase=0,hull={x:0,y:0,compression:0}){
 oval(c,2,24,65,21,'#243c3440');
 const {width,length,trackWidth,centerOffset}=RED_WOLF_HULL;
 for(const x of [-width/2,width/2-trackWidth]){
  box(c,x,centerOffset-length/2,trackWidth,length,9,'#3f5149',outline,3);
  for(let i=0;i<10;i++){const y=-34+((i*7+phase*70/(Math.PI*2))%70+70)%70;box(c,x+3,y,19,4,1,'#899886');}
  box(c,x+5,-27,15,54,5,'#596b5b',outline,2);
  for(const y of [-20,-3,14,27])oval(c,x+12,y,5,5,'#a4ad8c',outline,1.5);
 }
 for(const side of [-1,1])for(const y of [-25,19]){c.strokeStyle=outline;c.lineWidth=6;c.beginPath();c.moveTo(side*48,y+7);c.lineTo(side*35+hull.x,y+hull.compression);c.stroke();c.strokeStyle='#c9c4a1';c.lineWidth=2;c.stroke();}
 c.save();c.translate(hull.x,hull.y);
 poly(c,[[-42,-36],[31,-36],[47,-17],[44,27],[-44,27],[-48,-15]],'#a95045',outline,3);
 poly(c,[[-33,-33],[27,-33],[36,-20],[-36,-19]],'#d68266',outline,1.8);
 box(c,-25,-27,50,22,8,'#cc7860',outline,2);oval(c,0,-19,23,10,'#40584b',outline,2);
 for(const side of [-1,1]){box(c,side<0?-47:31,-30,16,39,4,'#bc604f',outline,2);box(c,side<0?-44:34,-28,5,32,2,'#e7ad7d');}
 c.restore();
}
// 斜面前甲和小狼面徽记形成独立剪影，挡住脚部但给驾驶员脸与手持枪留空间。
export function drawRedWolfFront(c,flash=false){
 poly(c,[[-44,-5],[44,-5],[49,16],[32,36],[-32,36],[-49,16]],flash?'#f1d4a1':'#bb5c4b',outline,3);
 poly(c,[[-40,-3],[40,-3],[30,11],[-30,11]],'#df9271',outline,1.7);
 for(const side of [-1,1])for(let i=0;i<2;i++)box(c,side<0?-45:-3+side*33,8+i*12,16,10,2,'#954c43',outline,1.5);
 for(const x of [-29,20])box(c,x,23,9,6,2,'#f2dd9f',outline,1.3);
 poly(c,[[-10,17],[-9,10],[-3,15],[3,15],[9,10],[10,17],[6,26],[0,30],[-6,26]],'#f1dcaa',outline,1.5);
 poly(c,[[-5,19],[-1,21],[-5,23]],'#48634f');poly(c,[[5,19],[1,21],[5,23]],'#48634f');
}
// 256毫米主炮的宽炮闩、双复进杆与粗口制退器独立运动，不拉伸整座炮塔。
export function drawWolfCannon(c,kick=0){
 poly(c,[[-31,-17],[-20,-25],[-12,-19],[8,-21],[24,-12],[24,12],[8,20],[-27,17]],'#b45a49',outline,2.4);
 box(c,-24,-16,28,7,3,'#e0a17c');box(c,-8,-13,40,26,6,'#627660',outline,2.2);
 for(const y of [-15,15]){box(c,4,y-4,28,8,3,'#984e44',outline,1.5);box(c,24,y-2,Math.max(5,46-kick),4,1,'#d8d0aa');}
 c.save();c.translate(-kick,0);box(c,17,-8,73,16,3,'#a8ad8c',outline,2.1);box(c,46,-11,15,22,3,'#bd6a50',outline,1.8);
 poly(c,[[78,-12],[91,-12],[96,-8],[96,8],[91,12],[78,12]],'#d6c9a0',outline,2);
 for(const x of [82,89])box(c,x,-8,3,16,1,'#556c5b');box(c,94,-6,3,12,1,'#314f3e');c.restore();
}
