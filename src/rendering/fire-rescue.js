import { canvasFont } from './text-style.js';
import { i18nText } from "../i18n/index.js";
import {drawVehicleTracks,drawVehicleArmor} from './vehicle.js';
import {drawForestTree} from './forest-art.js';
import {drawBurningTree} from './fire-world.js';
// 森林消防的地面、可透显小屋、独立火冠怪及水流；正式游戏与工作台共享。
import {box,oval,poly,outline} from './primitives.js';
import {drawFireTruckRear,drawFireTruckFront} from './fire-truck.js';
// 值守棚敞开门面；屋体只在遮到司机时透显，前后深度仍由实体排序决定。
export function drawFireStation(c,item,player=null,time=0,layer='all') {
 c.save();c.translate(item.x,item.y);
 const inBay=player&&player.x>item.x-110&&player.x<item.x+16&&player.y>=item.y-40;
 if(!inBay&&player&&player.x>item.x-124&&player.x<item.x+85&&player.y<item.y&&player.y>item.y-145)c.globalAlpha*=.38;
 if(layer!=='front'){oval(c,-16,7,108,24,'#315c4330');
 box(c,-122,-8,200,17,5,'#899d86',outline,2);box(c,-120,-96,142,94,4,'#e4d4a3',outline,2.5);
 // 卷帘收在顶部，净开口容纳原尺寸消防车；库内地板、空驾驶席与门框区分停放和出车。
 box(c,-114,-82,130,86,3,'#385e4b',outline,2);box(c,-110,-28,122,32,2,'#8d9e82');
 for(const x of [-106,7]){c.strokeStyle='#daca94';c.lineWidth=2;c.beginPath();c.moveTo(x,-27);c.lineTo(x,4);c.stroke();}
 }
 if(item.parkedTruck&&layer==='all'){const parked={x:-49,y:-27};drawVehicleTracks(c,parked,item.parkedTruck);drawVehicleArmor(c,parked,item.parkedTruck,item.truckProgress,0,true);}
 if(layer!=='back'){
 for(let y=-82;y<=-74;y+=4)box(c,-112,y,126,3,1,'#b6c0a0');
 box(c,-121,-88,7,91,2,'#dfcc9b',outline,1.7);box(c,24,-88,7,91,2,'#dfcc9b',outline,1.7);
 poly(c,[[-128,-96],[-51,-130],[28,-96],[22,-87],[-120,-87]],'#b96d54',outline,2.4);
 poly(c,[[-128,-96],[-51,-130],[-43,-122],[-110,-93]],'#dca477',outline,1.5);
 box(c,27,-115,43,112,3,'#e9d9ac',outline,2.5);box(c,36,-43,25,43,2,'#496a54',outline,2);
 box(c,35,-88,27,29,4,'#a8cbc1',outline,2);c.strokeStyle=outline;c.lineWidth=2;c.beginPath();c.moveTo(49,-87);c.lineTo(49,-59);c.stroke();
 poly(c,[[21,-114],[48,-139],[77,-114],[70,-107],[28,-107]],'#b96d54',outline,2.2);
 oval(c,48,-101,8,6,Math.sin(time*4)>0?'#efc989':'#cf8c62',outline,1.5);
 box(c,-106,-98,114,12,2,'#bd7055',outline,1.5);c.font = canvasFont(10);c.textAlign='center';c.fillStyle='#fff0c2';c.fillText(i18nText("config.realms.12658843f1"),-49,-89);
 // 值守楼加装石砌墙裙、消防标识与屋面采光窗，车库门洞尺寸保持一致。
 box(c,28,-15,43,14,2,'#9aa48a',outline,1.5);
 box(c,-84,-116,42,14,2,'#b6d0bf',outline,1.5);
 for(const x of [-70,-57])box(c,x,-115,2,12,0,'#638777');
 box(c,39,-54,19,8,2,'#ba7052',outline,1.3);
 oval(c,73,-23,11,15,'#c6b17a',outline,2);oval(c,73,-23,6,10,null,outline,2);box(c,-121,-9,10,25,3,'#c46d54',outline,2);box(c,-124,-8,17,5,2,'#f3dda4',outline,1.5);}
 c.restore();
}
// 红色火苗怪有独立双脚、分叉火冠与表情；死亡火星沿正式死亡时钟消散。
export function drawEmberMonster(c,e,time,reduced=false) {
  c.save();const t=reduced?0:time*9+(e.phase||0);
  if(e.burst){const age=Math.max(0,(e.duration||.6)-e.life);c.globalAlpha*=Math.max(0,e.life/(e.duration||.6));
    for(let i=0;i<6;i++){const a=i*Math.PI/3;oval(c,Math.cos(a)*(9+age*42),-15+Math.sin(a)*(9+age*32),3,5,'#e5a266',outline,1);}c.restore();return;}
  for(const side of [-1,1])oval(c,side*11,2+Math.sin(t+side*1.6)*3,7,4,'#a75446',outline,1.6);
  const flick=reduced?0:Math.sin(t*.7)*4;
  c.beginPath();c.moveTo(-20,-5);c.quadraticCurveTo(-27,-19,-17,-37+flick);c.lineTo(-9,-26);c.quadraticCurveTo(-5,-38,0,-49-flick);c.quadraticCurveTo(12,-38,9,-29);c.lineTo(20,-38+flick);c.quadraticCurveTo(27,-16,20,-5);c.quadraticCurveTo(0,6,-20,-5);c.closePath();
  c.fillStyle=e.flash?'#f6d9a4':'#c76050';c.strokeStyle=outline;c.lineWidth=2;c.fill();c.stroke();
  oval(c,1,-12,11,10,'#e79b65');for(const x of [-8,8]){oval(c,x,-20,4,5,'#fff0bf');oval(c,x+1,-19,1.7,2.5,outline);}
  c.strokeStyle=outline;c.lineWidth=1.6;c.beginPath();c.moveTo(-4,-9);c.quadraticCurveTo(0,-6,4,-9);c.stroke();c.restore();
}
// 水流跟随消防栓与真实目标，不使用鼠标伪造命中；暂停保留最后的喷流姿态。
export function drawRescueStream(c,r,time,reduced=false) {
  const s=r?.stream;if(!s)return;c.save();c.lineCap='round';
  c.beginPath();c.moveTo(s.x,s.y);c.quadraticCurveTo((s.x+s.tx)/2,(s.y+s.ty)/2-20,s.tx,s.ty);
  c.lineWidth=8;c.strokeStyle='#508c9b';c.stroke();c.lineWidth=5;c.strokeStyle='#aee5df';c.stroke();
  const tick=reduced?0:time*4;for(let i=0;i<5;i++){const a=i*1.7+tick;oval(c,s.tx+Math.cos(a)*12,s.ty+Math.sin(a)*7,2,3,'#e5f3cf');}c.restore();
}
// 卡片复用真实车、小屋、火点和怪物轮廓，仅调整展示镜头。
export function drawFireCard(c,phase=0) {
  c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();c.scale(c.canvas.width/480,c.canvas.height/320);
  c.fillStyle='#d6dfb6';c.fillRect(0,0,480,320);oval(c,255,260,250,65,'#a8be88');
  drawFireStation(c,{x:130,y:217},null,phase);const tree={id:1,x:369,y:222,hp:55,maxHp:55,size:1,variant:'round',palette:0,fireRescue:{hp:66,lit:true,ever:true}};drawForestTree(c,tree,phase,0,false);drawBurningTree(c,tree,phase);
  c.save();c.translate(295,234);c.scale(1.4,1.4);drawFireTruckRear(c,phase);drawFireTruckFront(c);c.restore();
  c.save();c.translate(417,263);drawEmberMonster(c,{phase:0},phase);c.restore();
  drawRescueStream(c,{stream:{x:246,y:197,tx:369,ty:199}},phase);c.restore();
}
