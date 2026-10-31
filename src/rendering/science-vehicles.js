// 六款科幻样车只绘制停机结构，保留独立支撑、舱体和推进器，不伪造驾驶动画。
import {box,oval,poly} from './primitives.js';
const edge='#3d6154',light='#dce1bd',metal='#7f9e91',glass='#659b9c';
// 科考车窗以少量平涂高光表达玻璃，不使用霓虹辉光。
function canopy(c,x,y,rx,ry){oval(c,x,y,rx,ry,glass,edge,2);oval(c,x-rx*.27,y-ry*.2,rx*.32,ry*.55,'#b9dcca');}
// 停驻状态的喷口与落地支撑分开，推进器没有悬浮火焰。
function pod(c,x,y,w=17,h=46){box(c,x-w/2,y,w,h,8,metal,edge,2);box(c,x-w/2+4,y+5,w-8,h-14,4,'#b2c9ae',edge,1);box(c,x-w/2+3,y+h-7,w-6,8,3,'#596f66',edge,1.5);}
// 圆环观测舱使用实心侧壁和可见内孔，球舱独立悬挂于环内。
function ring(c){
 c.save();c.translate(0,-28);c.scale(1,.92);c.beginPath();c.arc(0,0,40,0,Math.PI*2);c.arc(0,0,27,0,Math.PI*2,true);c.fillStyle=metal;c.fill('evenodd');c.strokeStyle=edge;c.lineWidth=2;c.stroke();
 for(const x of [-32,32])box(c,x-5,-12,10,24,3,'#c5d1b0',edge,1.5);
 box(c,-4,-31,8,22,3,light,edge,1.5);canopy(c,0,0,18,20);c.restore();
 for(const x of [-24,24])box(c,x-8,7,16,8,3,'#b4b9a0',edge,1.5);
}
// 每款拥有专属剪影和结构，所有型号使用相同脚底原点与柔和森林配色。
export function drawScienceVehicle(c,model){
 c.save();oval(c,4,9,43,15,'#2e493c35');
 if(model.id==='moon'){
  for(const x of [-32,32])pod(c,x,-47,20,58);
  poly(c,[[-24,4],[-22,-37],[0,-65],[22,-37],[24,4],[0,15]],light,edge,2);canopy(c,0,-31,15,22);
  box(c,-12,-4,24,8,4,'#e6c986',edge,1.5);
 }else if(model.id==='star'){
  for(const side of [-1,1])for(const y of [-40,-17,5]){poly(c,[[side*18,y-5],[side*35,y],[side*43,y+13],[side*31,y+16],[side*25,y+5]],metal,edge,2);oval(c,side*35,y+12,7,4,'#c7d1ac',edge,1);}
  box(c,-24,-61,48,69,14,'#b1bda7',edge,2);box(c,-18,-51,36,26,10,glass,edge,2);box(c,-12,-44,24,6,3,'#c7e0ce');box(c,-14,-15,28,15,5,'#e4cc91',edge,1.5);
  c.strokeStyle=edge;c.lineWidth=2;c.beginPath();c.moveTo(13,-58);c.lineTo(20,-73);c.stroke();oval(c,20,-74,3,3,'#e8d597',edge,1);
 }else if(model.id==='firewing'){
  poly(c,[[-5,-48],[-48,-6],[-44,10],[-12,0],[0,14],[12,0],[44,10],[48,-6],[5,-48]],'#9daf94',edge,2);
  for(const side of [-1,1]){poly(c,[[side*14,-25],[side*39,-4],[side*35,0],[side*12,-12]],'#d9dcb4',edge,1);pod(c,side*21,-15,13,33);}
  poly(c,[[-13,1],[-12,-40],[0,-69],[12,-40],[13,1],[0,12]],'#e4ce9b',edge,2);canopy(c,0,-35,9,18);
 }else if(model.id==='forestwhale'){
  for(const x of [-30,30])pod(c,x,-54,18,65);
  box(c,-23,-70,46,80,18,'#c5c6a2',edge,2);canopy(c,0,-48,18,15);
  box(c,-20,-23,40,29,5,metal,edge,2);for(const x of [-12,7])box(c,x,-20,5,24,1,'#d8d8b3',edge,1);
  box(c,-11,3,22,11,3,'#d6b583',edge,1.5);oval(c,0,-69,5,3,'#e5c983',edge,1);
 }else if(model.id==='mosstiger'){
  for(const x of [-31,31])for(const y of [-46,-8]){box(c,x-10,y-10,20,25,7,'#61766b',edge,2);box(c,x-6,y-6,12,15,4,metal,edge,1);}
  poly(c,[[-24,6],[-27,-45],[-16,-60],[16,-60],[27,-45],[24,6]],'#b8be98',edge,2);box(c,-18,-48,36,20,7,glass,edge,2);
  box(c,-8,-26,16,30,5,'#c6a478',edge,2);poly(c,[[-13,-62],[0,-82],[13,-62]],'#d7cfab',edge,2);
  c.strokeStyle='#7b8565';c.lineWidth=1.5;for(const y of [-75,-69,-63]){c.beginPath();c.moveTo(-5-(y+75)*.4,y);c.lineTo(5+(y+75)*.4,y);c.stroke();}
  box(c,-16,-18,9,12,3,'#d8dcbb',edge,1);box(c,7,-18,9,12,3,'#d8dcbb',edge,1);
 }else if(model.id==='starring')ring(c);
 else throw new Error('未知科幻样车型号：'+model.id);
 c.restore();
}
