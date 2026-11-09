import {drawWeapon} from './characters.js';
// 小屋家具正式绘制：目录、摆放预览与室内共用独立主体，植物不烘焙进花盆。
import {box,oval,poly} from './primitives.js';
import {plantState} from '../progression/home/home-decor.js';
const INK='#315c43',WOOD='#c7a276',CREAM='#fff0c9',LEAF='#91ae86';

// 细线只描述结构，保持正常手机尺寸的轮廓优先。
function line(c,points,color=INK,width=1.5){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
// 生长阶段只改变真实局部枝叶和花果，盆底锚点始终不动。
function drawPlant(c,state){
 if(!state.plant)return;
 const height=state.ratio<.5?18:32;line(c,[[0,-10],[0,-10-height]],INK,2);
 oval(c,-6,-height,8,4,'#82b879',INK,1);oval(c,6,-height-6,8,4,'#91bd7b',INK,1);
 if(state.ratio>=.5){oval(c,-7,-height+8,7,4,LEAF,INK,1);oval(c,6,-height-14,6,4,LEAF,INK,1);}
 if(state.ready){
  if(state.plant.id==='mint'){for(const x of [-9,7])oval(c,x,-39,7,4,'#b8d391',INK,1);}
  else if(state.plant.id==='berry'){for(const x of [-10,8]){oval(c,x,-27,5,7,'#ce8571',INK,1);oval(c,x,-30,1,1,CREAM);}}
  else{for(let i=0;i<5;i++){const a=i*Math.PI*2/5;oval(c,Math.cos(a)*6,-43+Math.sin(a)*6,4,4,CREAM,INK,.7);}oval(c,0,-43,3,3,'#e5b55e');}
 }
}
// 家具坐标使用底座中心，主体向上展开，夜晚保持相同剪影和层级。
export function drawHomeDecor(c,item,night=false,calendar={day:1,elapsed:0},progress=null){
 const {type,width:w,height:h}=item;c.save();c.translate(item.x||0,item.y||0);
 if(item.layer==='floor')oval(c,3,5,w/2+2,Math.min(9,h/3),'#32493326');
 if(type==='weapon-rack'){
  box(c,-48,-72,96,84,5,night?'#a88b63':'#c7a276',INK,2);
  box(c,-42,-65,84,67,3,'#70836a',INK,1.5);
  for(let slot=0;slot<3;slot++){
   const yy=-54+slot*23;line(c,[[-37,yy+9],[37,yy+9]],'#e0c38c',2);
   const index=item.weapons?.[slot];
   if(Number.isInteger(index)){c.save();c.beginPath();c.rect(-40,yy-11,80,21);c.clip();drawWeapon(c,index,-20,yy,index===14?.4:index===0?1.2:.72,0,0,0,progress?.mods?.[index]||0,progress?.weaponParts?.[index]);c.restore();}
   else{for(const xx of [-23,23])line(c,[[xx,yy-4],[xx,yy+4],[xx+5,yy+4]],'#bbcca0',1.5);}
  }
  for(const xx of [-43,36])box(c,xx,7,7,12,2,'#9c7953',INK,1.5);
 }else if(type==='pot'){
  poly(c,[[-14,-10],[14,-10],[10,11],[-10,11]],'#c99378',INK,1.7);oval(c,0,-10,14,5,'#dbb18b',INK,1.5);oval(c,0,-10,10,3,'#776046');drawPlant(c,plantState(item,calendar));
 }else if(type==='painting'){
  box(c,-22,-24,44,36,3,WOOD,INK,2);box(c,-17,-19,34,26,1,'#d9dfb9',INK,1);oval(c,9,-12,4,4,'#e9c679');poly(c,[[-16,5],[-4,-12],[6,3],[11,-5],[17,6]],'#82a381',INK,1);
 }else if(type==='television'){
  line(c,[[-18,6],[-20,15]],INK,3);line(c,[[18,6],[20,15]],INK,3);box(c,-28,-34,56,42,7,WOOD,INK,2);box(c,-23,-29,36,30,6,night?'#6f9998':'#a4c1ae',INK,1.5);
  poly(c,[[-21,-1],[-10,-19],[0,-5],[9,-17],[11,-1]],'#527b65',INK,1);oval(c,20,-19,3,3,CREAM,INK,1);line(c,[[17,-7],[23,-7]],INK);line(c,[[0,-35],[-9,-44]],INK);line(c,[[0,-35],[9,-43]],INK);
 }else if(type==='radio'){
  line(c,[[-9,-24],[-9,-32],[9,-32],[9,-24]],INK,2);box(c,-16,-24,32,31,5,WOOD,INK,2);box(c,-12,-19,17,20,3,'#879d7d',INK,1);
  for(let x=-9;x<5;x+=4)line(c,[[x,-16],[x,-2]],'#536e56',1);oval(c,10,-14,3,3,CREAM,INK,1);oval(c,10,-3,3,3,CREAM,INK,1);
 }else if(type==='plush'){
  for(const x of [-10,10])oval(c,x,-31,7,7,WOOD,INK,1.5);oval(c,0,-10,13,16,WOOD,INK,1.5);oval(c,0,-27,13,11,'#d9ba88',INK,1.5);oval(c,0,-8,7,9,CREAM);
  for(const x of [-11,11]){oval(c,x,4,7,5,WOOD,INK,1.5);oval(c,x,-11,5,7,WOOD,INK,1.5);}for(const x of [-5,5])oval(c,x,-29,1.4,1.8,INK);oval(c,0,-24,3,2,INK);
 }else if(type==='curtain'){
  line(c,[[-40,-27],[40,-27]],INK,3);
  for(const side of [-1,1]){poly(c,[[side*38,-25],[side*17,-25],[side*24,5],[side*34,27],[side*39,24]],LEAF,INK,1.6);line(c,[[side*29,-21],[side*30,3],[side*34,17]],'#627e59',1);oval(c,side*28,5,6,2,'#e9cc88');oval(c,side*29,-11,3,5,'#d9dfb0');}
 }else if(type==='sofa'){
  box(c,-34,-27,68,31,9,'#7e9c79',INK,2);box(c,-34,-3,68,20,5,'#6f8a6c',INK,2);
  for(const x of [-25,2])box(c,x,-14,24,24,6,'#aac29a',INK,1.5);for(const x of [-36,26])box(c,x,-17,10,32,4,'#91ae86',INK,1.5);for(const x of [-26,23])box(c,x,16,5,5,1,WOOD,INK,1);
 }else if(type==='table'){
  for(const x of [-13,10])box(c,x,-1,5,17,2,WOOD,INK,1.5);oval(c,0,-3,21,13,'#ab8559',INK,1.5);oval(c,0,-8,21,13,'#debd8c',INK,2);oval(c,0,-8,14,8,'transparent','#bb9a6c',1);
 }else if(type==='bookcase'){
  box(c,-23,-60,46,72,3,WOOD,INK,2);
  for(let row=0;row<3;row++){box(c,-18,-55+row*21,36,18,0,'#957a54',INK,1);for(let n=0;n<4;n++)box(c,-15+n*8,-52+row*21,6,14,1,[LEAF,CREAM,'#bd8e76','#9fb9ac'][n],INK,.8);}
 }else if(type==='lamp'){
  oval(c,0,5,13,6,WOOD,INK,1.6);box(c,-2,-40,4,44,1,'#8c9e7c',INK,1);
  poly(c,[[-19,-34],[-10,-53],[10,-53],[19,-34]],night?'#f1d48b':'#d4c192',INK,2);oval(c,0,-33,18,4,CREAM,INK,1.2);
 }else if(type==='rug'){
  box(c,-w/2,-h/2,w,h,10,'#b9be92','#697e5d',1.7);box(c,-w/2+5,-h/2+5,w-10,h-10,7,'transparent','#e0ddaf',2);line(c,[[0,14],[0,-11]],'#7c9367',2);oval(c,-7,-2,9,5,'#e6dfb3');oval(c,7,-9,9,5,'#e6dfb3');
 }else if(type==='clock'){
  poly(c,[[-18,-21],[0,-35],[18,-21]],'#8da57c',INK,2);box(c,-14,-21,28,33,2,WOOD,INK,1.6);oval(c,0,-6,10,10,CREAM,INK,1);line(c,[[0,-13],[0,-6],[6,-4]],INK,1.3);line(c,[[-6,13],[-6,22],[0,22]],INK,1.4);
 }else if(type==='basket'){
  c.beginPath();c.ellipse(0,-13,12,12,0,Math.PI,0);c.strokeStyle=INK;c.lineWidth=2;c.stroke();box(c,-16,-14,32,25,6,WOOD,INK,1.7);
  for(let y=-8;y<10;y+=5)line(c,[[-13,y],[13,y]],'#8f7951',1);for(let x=-10;x<14;x+=6)line(c,[[x,-12],[x,9]],'#e7c88e',1.2);
 }else if(type==='stool'){
  for(const x of [-9,5])box(c,x,-4,5,17,2,WOOD,INK,1.5);oval(c,0,-7,15,10,'#c79475',INK,1.7);for(const [x,y] of [[-7,-9],[6,-11],[1,-3]])oval(c,x,y,3,2,CREAM);
 }else if(type==='vase'){
  line(c,[[0,-19],[-6,-43]],INK,1.5);line(c,[[0,-19],[7,-39]],INK,1.5);for(const [x,y] of [[-6,-43],[7,-39]]){oval(c,x,y,5,5,CREAM,INK,1);oval(c,x,y,2,2,'#e3bb69');}oval(c,0,-1,12,14,CREAM,INK,1.7);box(c,-5,-22,10,16,3,CREAM,INK,1.6);line(c,[[-8,4],[8,4]],'#96aa7c',2);
 }else throw new Error('缺少小屋家具绘制器：'+type);
 c.restore();
}
