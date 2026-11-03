// 地下九类景观使用同一森林描边与低饱和块面，独立绘制地面、水流、植株和生物动作。
import {minePoint} from '../config/mining.js';
import {mineEntrancePlatform} from '../world/mine-entrances.js';
import {mineTerrain,MINE_ANIMALS} from '../config/mine-ecology.js';
import {box,oval,poly} from './primitives.js';
const ink='#365a47';
// 地面先铺生态底色，水流随运行时钟移动，桥板与轨道可叠加而不遮住岸线。
export function drawMineTerrain(c,cell,layer,night,time){
 const p=minePoint(cell),t=mineTerrain(cell,layer),{x,y}=p;box(c,x-32,y-32,65,65,0,night?t.biome.night:t.biome.floor);
 if(t.water){box(c,x-32,y-32,65,65,0,night?'#426d69':'#72a69a');for(let i=0;i<((t.hash>>>12)%3===0?0:1);i++){const yy=y-18+(t.hash>>>18)%36;const drift=Math.sin(time*1.2+i+cell.y)*4-5+(t.hash>>>10)%10;c.strokeStyle=night?'#8eb8a1':'#c4d9b3';c.lineWidth=1.5;c.beginPath();c.moveTo(x-22+drift,yy);c.quadraticCurveTo(x-6+drift,yy+5,x+13+drift,yy);c.stroke();}
  if(t.biome.id==='spring')for(let i=0;i<2;i++){const yy=y-8-((time*10+i*16)%32);oval(c,x-12+i*22,yy,9,3,'#e9e0c344');}
 }else if((t.hash>>>14)%3===0){oval(c,x-23+(t.hash>>>8)%46,y-22+(t.hash>>>20)%44,3,1.5,'#526e4b35');}
 if(layer.bridges?.[`${cell.x},${cell.y}`]){box(c,x-31,y-31,62,62,2,'#c4aa79',ink,2);for(let j=-24;j<32;j+=12){box(c,x-30,y+j,60,2,0,'#8c805c');oval(c,x-26,y+j+5,1,1,ink);oval(c,x+26,y+j+5,1,1,ink);}}
 return t;
}
// 设施和大型景观共用脚底排序，主体位于格边，中心留下步行、矿车与战车通路。
export function drawMineLandscape(c,cell,layer,night,time){
 if(mineEntrancePlatform(cell,layer))return;
 const t=mineTerrain(cell,layer),p=minePoint(cell),x=p.x-28+(t.hash>>>16)%14,y=p.y+10+(t.hash>>>24)%18,key=`${cell.x},${cell.y}`;
 if(!t.natural||t.safe||t.water)return;const harvested=(layer.harvested?.[key]||0)>layer.age;
 if(!t.prop){if(t.biome.id==='moss'&&(t.hash>>>12)%3===0){for(let i=0;i<2;i++)oval(c,x+i*13,y-i*3,6,2,night?'#80936c':'#c0cc8d');}return;}
 if(harvested){oval(c,x,y,8,3,'#7e9065',ink,1);box(c,x-2,y-5,4,5,1,'#c1b07f');return;}
 oval(c,x+1,y+3,14,5,'#294a3633');
 switch(t.biome.id){
 case 'mushroom':for(let i=0;i<2;i++){const xx=x+i*17,yy=y-i*9;box(c,xx-3,yy-24,6,26,3,'#e4d5a1',ink,1.5);oval(c,xx,yy-24,14-i*3,8,night?'#9fbb99':'#b9c99b',ink,2);for(let j=0;j<3;j++)oval(c,xx-7+j*6,yy-26,2,1.5,'#f5e5ac');if(night)oval(c,xx,yy-24,18,12,'#cce2a51b');}break;
 case 'roots':poly(c,[[x-8,y],[x-3,y-16],[x-6,y-42],[x+2,y-47],[x+7,y-25],[x+11,y-18],[x+18,y-23],[x+20,y-16],[x+10,y-9],[x+13,y+2],[x+4,y-2]],'#a18d65',ink,2);for(const [dx,dy] of [[-6,-37],[9,-25],[1,-46]]){oval(c,x+dx,y+dy,10,5,'#849c71',ink,1.5);box(c,x+dx-2,y+dy-1,4,2,1,'#cbd6a0');}break;
 case 'crystal':for(let i=0;i<3;i++){const xx=x+i*9,hh=20+(t.hash>>(i*3))%21;poly(c,[[xx-6,y],[xx-7,y-hh+7],[xx,y-hh],[xx+6,y-hh+8],[xx+4,y+2]],night?'#8eb7ad':'#bbd7bf',ink,1.5);poly(c,[[xx,y-hh],[xx+6,y-hh+8],[xx+4,y+2],[xx,y-3]],'#75a695');}break;
 case 'moss':for(let i=0;i<4;i++){const xx=x+i*6,hh=8+i%2*8;poly(c,[[xx,y],[xx-6,y-hh],[xx+1,y-hh+3],[xx+5,y-hh-3],[xx+4,y]],'#8ba473',ink,1);oval(c,xx+2,y-hh,3,3,'#ead298',ink,1);}break;
 case 'stalagmite':for(let i=0;i<2;i++){const xx=x+i*15;poly(c,[[xx-8,y],[xx-4,y-22-i*14],[xx+1,y-29-i*14],[xx+5,y-14],[xx+9,y+1]],'#bcbba1',ink,2);poly(c,[[xx+1,y-29-i*14],[xx+5,y-14],[xx+9,y+1],[xx+1,y-2]],'#8e9c89');}break;
 case 'river':for(let i=0;i<3;i++){const xx=x+i*7;box(c,xx,y-17-i%2*10,2,20+i%2*10,1,'#6c8963');oval(c,xx+1,y-20-i%2*10,3,7,'#d1bd83',ink,1);}break;
 case 'lake':oval(c,x,y,13,5,'#85a98b',ink,1.5);for(let i=0;i<3;i++){const xx=x+Math.sin(time*.8+i*2)*15,yy=y-15-i*7+Math.cos(time+i)*3;oval(c,xx,yy,night?2.5:1.7,2,'#eadb95');if(night)oval(c,xx,yy,5,5,'#f0df8530');}break;
 case 'spring':for(let i=0;i<3;i++)oval(c,x+i*9,y-i%2*6,8,5,'#bdb69b',ink,1.5);for(let i=0;i<2;i++)oval(c,x+9,y-16-((time*8+i*12)%24),6,3,'#efe4cc66');break;
 case 'fossil':oval(c,x+6,y-9,16,11,'#d0c19b',ink,1.5);c.strokeStyle='#f0e3b7';c.lineWidth=3;c.beginPath();c.arc(x+4,y-10,8,.2,Math.PI*1.9);c.arc(x+4,y-10,4,Math.PI*1.9,.4,true);c.stroke();for(let i=0;i<3;i++)box(c,x-6+i*9,y+2,5,4,2,'#e5d7a8',ink,1);break;
 }
}
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
 if(a.hp>0&&a.hp<MINE_ANIMALS[a.kind].hp){box(c,x-17,y-43,34,4,2,ink);box(c,x-16,y-42,32*a.hp/MINE_ANIMALS[a.kind].hp,2,1,'#e3c88c');}c.restore();
}
// 孢子和车炮使用独立运动实体，弹道不依附于角色位图。
export function drawMineBolts(c,bolts){for(const b of bolts||[]){oval(c,b.x,b.y,b.enemy?5:4,b.enemy?5:4,b.enemy?'#baac84':'#f2d89b',ink,1.5);if(!b.enemy){c.strokeStyle='#ead491';c.lineWidth=2;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-b.vx*.025,b.y-b.vy*.025);c.stroke();}}}
