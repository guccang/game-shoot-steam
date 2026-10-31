// 引力枪及落点场共用磁环语言，范围跟随实际战斗数据，不参与规则推进。
import {box,oval,poly,outline} from './primitives.js';
import {nearest} from '../world/coordinates.js';
import {currentGravityFields} from '../combat/gravity-field.js';
// 短机匣与双极磁环独立于手部绘制，枪口与43单位正式锚点一致。
export function drawGravityGun(c,slide=0,flash=0){
 box(c,-29,-12,43,24,7,'#85849b',outline,2.4);box(c,-23,-11,26,6,3,'#c8c7d0');
 box(c,-14,7,12,18,4,'#5b6a62',outline,2);box(c,-31,-6,8,13,3,'#5e7067',outline,2);
 oval(c,-7,0,10,10,'#b6ded0',outline,2);oval(c,-7,0,4,4,flash?'#fff3ce':'#647a91');
 for(const y of [-13,8]){box(c,8-slide*.2,y,29,5,2,'#d4c6a4',outline,1.7);box(c,20-slide*.2,y-1,7,7,2,'#6b8a80',outline,1.2);}
 oval(c,38,-1,7,18,'#677d77',outline,2.2);oval(c,40,-1,3,11,'#b9e7d9',outline,1.2);oval(c,43,-1,1.6,6,flash?'#fff3ce':'#667891');
}
// 引力弹有明亮小核与双环，不使用普通弹壳轮廓。
export function drawGravityProjectile(c,b,reduced=false){
 c.save();c.translate(b.x,b.y);oval(c,0,0,6,6,'#cdd9ed',outline,1.4);oval(c,0,0,2.5,2.5,'#fff3ce');
 c.strokeStyle='#b3dfd0';c.lineWidth=1.7;c.beginPath();c.ellipse(0,0,11,5,reduced?0:b.age*4,0,Math.PI*2);c.stroke();c.restore();
}
// 范围线在地面层，向心弧与粒子连续收拢；低动态模式保留安静的边界和核心。
export function drawGravityFields(c,game,reduced=false){
 for(const field of currentGravityFields(game)){
  const p=nearest(field,game.player),age=field.duration-field.life,fade=Math.min(1,field.life/.35,age/.12+.15);c.save();c.translate(p.x,p.y);c.globalAlpha*=fade;
  c.fillStyle='#667c9b16';c.beginPath();c.arc(0,0,field.radius,0,Math.PI*2);c.fill();
  c.strokeStyle='#779b9b';c.lineWidth=2;c.setLineDash([9,12]);c.beginPath();c.arc(0,0,field.radius,0,Math.PI*2);c.stroke();c.setLineDash([]);
  if(!reduced)for(let i=0;i<3;i++){const r=18+(field.radius-18)*(1-((age*.55+i/3)%1));c.strokeStyle='#badad080';c.lineWidth=2;c.beginPath();c.arc(0,0,r,age+i,age+i+Math.PI*1.4);c.stroke();}
  if(!reduced)for(let i=0;i<10;i++){const t=(age*.65+i*.17)%1,r=22+(field.radius-22)*(1-t),a=i*2.399+age*.3;oval(c,Math.cos(a)*r,Math.sin(a)*r,2,2,'#e5e6bd');}
  oval(c,0,0,19,12,'#697f91',outline,1.8);oval(c,0,-1,10,6,'#c3dfd8',outline,1);oval(c,0,-1,4,3,'#fff0c5');c.restore();
 }
}
