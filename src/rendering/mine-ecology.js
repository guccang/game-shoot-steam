// 地下九类景观使用同一森林描边与低饱和块面，独立绘制地面、水流、植株和生物动作。
import {minePoint} from '../config/mining.js';
import {MINE_ANIMALS} from '../config/mine-ecology.js';
import {box,oval,poly} from './primitives.js';
const ink='#365a47';
// 连续地形由共享地貌绘制器负责，设施仍按原施工格保留真实木桥范围。
export function drawMineTerrain(c,cell,layer,night,time){
 if(!layer.bridges?.[`${cell.x},${cell.y}`])return;
 const {x,y}=minePoint(cell);box(c,x-31,y-31,62,62,2,night?'#9f946e':'#c4aa79',ink,2);
 for(let j=-24;j<32;j+=12){box(c,x-30,y+j,60,2,0,'#8c805c');oval(c,x-26,y+j+5,1,1,ink);oval(c,x+26,y+j+5,1,1,ink);}
}
// 原入口继续绑定正式九景实体绘制，怪物和投射物保持独立。
export {drawMineFlora as drawMineLandscape} from './mine-flora.js';
// 六条腿分相抬起、蝠翼独立开合、菌伞双脚交替；受击闪白、蓄力轮廓和消散均不拉伸主体。
export function drawMineAnimal(c,a,time){
 if(a.hp<=0&&!a.death)return;c.save();if(a.hp<=0)c.globalAlpha=Math.min(1,a.death/.6);const {x,y}=a,phase=a.clock||0,step=Math.sin(a.walk||0),fold=a.hp<=0?.55+.45*a.death/.6:1,fill=a.flash>0?'#f7e6b9':a.kind==='beetle'?'#9ba980':a.kind==='bat'?'#9aa9a0':'#b7b58d';
 oval(c,x,y+5,17,5,'#294b373b');
 if(a.phase==='windup'){c.strokeStyle='#ce9568';c.lineWidth=2;c.beginPath();c.arc(x,y,23,0,Math.PI*2);c.stroke();}
 if(a.kind==='beetle'){
  for(const side of [-1,1])for(let i=0;i<3;i++){const lift=Math.sin((a.walk||0)+i*2+side)*3;c.strokeStyle=ink;c.lineWidth=3;c.beginPath();c.moveTo(x+side*8,y-13+i*6);c.lineTo(x+side*(15+lift)*fold,y-17+i*8);c.lineTo(x+side*20*fold,y-10+i*7+lift);c.stroke();}
  oval(c,x,y-7,12,17,fill,ink,2);box(c,x-1,y-21,2,28,1,'#627d60');oval(c,x,y-23,8,6,'#778e72',ink,1.5);for(const dx of [-4,4])oval(c,x+dx,y-25,2,2,'#f0db96');
 }else if(a.kind==='bat'){
  const flap=a.hp<=0?9:Math.sin(phase*15)*11;for(const side of [-1,1]){poly(c,[[x+side*6,y-18],[x+side*29*fold,y-27+flap],[x+side*25*fold,y-8+flap],[x+side*17,y-14+flap*.5],[x+side*10,y-4]],fill,ink,2);c.strokeStyle=ink;c.lineWidth=1;c.beginPath();c.moveTo(x+side*6,y-18);c.lineTo(x+side*25*fold,y-8+flap);c.stroke();}
  oval(c,x,y-15,8,11,'#829788',ink,2);poly(c,[[x-7,y-21],[x-7,y-34],[x-1,y-25],[x+2,y-25],[x+7,y-34],[x+7,y-21]],fill,ink,1.5);for(const dx of [-3,3])oval(c,x+dx,y-23,1.5,2,'#f0dfae');
 }else{
  for(const side of [-1,1])box(c,x+side*6-3,y-4+step*side*3,7,9,3,'#83976e',ink,1.5);box(c,x-8,y-24,16,25,6,'#ddd0a2',ink,2);oval(c,x,y-25,22,12,fill,ink,2);for(const dx of [-12,0,12])oval(c,x+dx,y-28+Math.abs(dx)/4,3,2,'#f2dfa6');for(const dx of [-3,3])oval(c,x+dx,y-12,1.5,2,ink);
 }
 if(a.hp>0&&a.hp<(a.maxHp||MINE_ANIMALS[a.kind].hp)){box(c,x-17,y-43,34,4,2,ink);box(c,x-16,y-42,32*Math.min(1,a.hp/(a.maxHp||MINE_ANIMALS[a.kind].hp)),2,1,'#e3c88c');}c.restore();
}
// 孢子和车炮使用独立运动实体，弹道不依附于角色位图。
export function drawMineBolts(c,bolts){for(const b of bolts||[]){oval(c,b.x,b.y,b.enemy?5:4,b.enemy?5:4,b.enemy?'#baac84':'#f2d89b',ink,1.5);if(!b.enemy){c.strokeStyle='#ead491';c.lineWidth=2;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-b.vx*.025,b.y-b.vy*.025);c.stroke();}}}
