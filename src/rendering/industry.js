// 两座工业建筑参与正式脚底排序，动态部件由当前生产状态驱动。
import {TOWN_LAYOUT} from '../config/town-layout.js';
import {box,oval,poly} from './primitives.js';
// 世界实体使用固定底座，室内、秘境和剧情不重复绘制营地工业区。
export function industryObjects(game){
 return game.mapId==='forest'&&!game.cottage&&!game.realm&&!game.story?['refinery','factory'].map(id=>({...TOWN_LAYOUT[id],id,type:'industry'})):[];
}
// 高砖炉和低车间使用不同剪影，工序动画独立于房屋主体。
export function drawIndustry(c,item,game,night=0){
 const active=!!game.progress.industry?.sites[item.id]?.job,t=active?game.time:0,edge='#3e5b45',wall=night?'#8a9e7c':'#f0dfb0',roof=night?'#49644d':'#789860';
 c.save();c.translate(item.x,item.y);c.lineJoin='round';c.lineCap='round';
 oval(c,8,9,105,16,'#35553a35');box(c,-100,-8,200,22,5,night?'#73806b':'#b9bb91',edge,2);
 box(c,-90,-99,180,100,4,wall,edge,3);poly(c,[[-100,-99],[0,-133],[100,-99],[90,-85],[-90,-85]],roof,edge,3);
 box(c,-26,-46,52,48,4,'#425b43',edge,2);box(c,-19,-39,38,39,3,'#223d30');
 if(item.id==='refinery'){
  box(c,-77,-144,28,93,3,night?'#7c7059':'#b9976a',edge,3);box(c,-82,-151,38,12,3,'#e0c996',edge,2);
  for(let y=-137;y<-66;y+=15){c.strokeStyle=edge;c.lineWidth=1;c.beginPath();c.moveTo(-75,y);c.lineTo(-51,y);c.stroke();}
  box(c,30,-64,45,58,8,'#bc9c72',edge,2);box(c,36,-43,33,27,8,'#364b39',edge,2);
  if(active){
   poly(c,[[40,-18],[44,-35-Math.sin(t*6)*3],[51,-25],[59,-39],[66,-18]],'#e5a958');
   for(let i=0;i<3;i++){const u=(t*.32+i/3)%1;c.globalAlpha=(1-u)*.3;oval(c,-63+Math.sin(u*4)*6,-154-u*31,6+u*7,4+u*4,'#c8c5ae');}c.globalAlpha=1;
  }
  poly(c,[[-80,-12],[-59,-29],[-40,-9]],'#9da991',edge,2);
 }else{
  box(c,-73,-54,42,39,3,'#809a79',edge,2);
  c.save();c.translate(-52,-35);c.rotate(t*2);oval(c,0,0,13,13,'#d2c18b',edge,2);
  for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.strokeStyle=edge;c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.lineTo(10,0);c.stroke();}c.restore();
  box(c,35,-60,42,9,2,'#7a8f72',edge,2);box(c,38,-51,6,37,1,'#7a8f72',edge,1);box(c,68,-51,6,37,1,'#7a8f72',edge,1);
  box(c,44,-43+(active?Math.sin(t*3)*6:0),24,9,2,'#bcc6ae',edge,2);box(c,33,-12,48,10,3,'#c8ac75',edge,2);
 }
 box(c,-61,-83,122,24,4,'#fff1c5',edge,2);c.font='bold 13px sans-serif';c.textAlign='center';c.fillStyle=edge;c.fillText(item.id==='refinery'?'矿产提炼厂':'金属加工厂',0,-66);
 c.restore();
}
// 室内设备单独绘制，碰撞共用家具底座；炉火、压床与传动轮由本厂批次驱动。
export function drawIndustryMachine(c,item,game,night=0){
 const id=game.cottage.kind,active=!!game.progress.industry.sites[id].job,t=active?game.time:0,edge='#3e5b45';
 c.save();c.translate(item.x,item.y);c.lineJoin='round';
 oval(c,3,5,36,11,'#35553a35');box(c,-32,-4,64,12,3,night?'#839078':'#c9bd92',edge,2);
 if(id==='refinery'){
  box(c,-25,-69,50,68,6,night?'#90806a':'#bd9c73',edge,2);box(c,-17,-91,19,23,2,'#8b9a7b',edge,2);
  box(c,-18,-48,36,35,6,'#304b39',edge,2);
  if(active)poly(c,[[-14,-17],[-10,-37-Math.sin(t*6)*4],[-3,-27],[8,-42],[15,-17]],'#e5a958',edge,1);
  for(let y=-62;y<-48;y+=10){c.beginPath();c.moveTo(-23,y);c.lineTo(23,y);c.strokeStyle=edge;c.stroke();}
 }else{
  box(c,-29,-70,58,10,3,'#9cac87',edge,2);box(c,-26,-60,7,53,2,'#789477',edge,2);box(c,19,-60,7,53,2,'#789477',edge,2);
  box(c,-17,-42+(active?Math.sin(t*3)*7:0),34,12,3,'#bfc8ad',edge,2);box(c,-22,-11,44,9,2,'#cfb57e',edge,2);
  c.save();c.translate(25,-60);c.rotate(t*2);oval(c,0,0,11,11,'#d7c795',edge,2);c.strokeStyle=edge;c.lineWidth=2;c.beginPath();c.moveTo(-8,0);c.lineTo(8,0);c.moveTo(0,-8);c.lineTo(0,8);c.stroke();c.restore();
 }
 c.restore();
}
