import {nearest} from '../world/coordinates.js';
// 维修建筑、残骸与拖车直接进入正式世界深度队列，不创建替代预览画面。
import {REPAIR_CENTER,REPAIR_BAY,VEHICLE_REPAIR as C} from '../config/vehicle-repair.js';
import {personalFleet} from '../core/vehicle-repair.js';
import {drawParkedHull} from './parked-vehicles.js';
import {box,oval} from './primitives.js';
// 同一个订单只生成一辆残骸；挂钩前保留原地，拖运后与拖板一起移动。
export function vehicleServiceObjects(game){
 if(!personalFleet(game)||game.cottage)return [];
 const objects=game.mapId==='forest'?[{...REPAIR_CENTER,type:'repair-center'}]:[];
 for(const [hull,r] of (game.progress.vehicleService||[]).entries()){
  if(!r?.phase||r.mapId!==game.mapId)continue;
  if(['wrecked','outbound','hooking'].includes(r.phase)){
   const t=r.phase==='hooking'?Math.min(1,r.timer/C.hookSeconds):0,truck=r.truck||r.position,origin=t?nearest(r.position,truck):r.position;
   objects.push({x:origin.x+(truck.x-35-origin.x)*t,y:origin.y+(truck.y-23-origin.y)*t,type:'repair-wreck',hull});
  }
  if(['outbound','hooking','towing'].includes(r.phase))objects.push({...r.truck,type:'repair-tow',hull,order:r});
  if(['repairing','ready'].includes(r.phase)&&!objects.some(o=>o.type==='repair-bay'))objects.push({...REPAIR_BAY,type:'repair-bay',hull,order:r});
 }
 return objects;
}
// 裂痕、松脱侧板与低矮烟气覆盖原装车壳，保留车型与独立炮塔识别。
export function drawWreckDamage(c,x,y,time=0){
 c.save();c.translate(x,y);oval(c,0,0,37,10,'#3c4f4266');
 c.strokeStyle='#344c42';c.lineWidth=2.5;c.lineJoin='round';c.beginPath();c.moveTo(-17,-32);c.lineTo(-7,-22);c.lineTo(-15,-15);c.lineTo(0,-7);c.moveTo(14,-36);c.lineTo(7,-23);c.lineTo(19,-19);c.stroke();
 box(c,20,-4,16,7,2,'#a0aa8c','#3c5946',1.5);
 for(let i=0;i<3;i++){const t=(time*.35+i/3)%1;c.globalAlpha=(1-t)*.42;oval(c,10+Math.sin(t*4)*5,-35-t*28,5+t*8,4+t*6,'#6b766b');}
 c.restore();
}
// 建筑先画地坪与阴影，再画墙面与屋顶；保留门前真实活动空间。
function drawCenter(c,item,night){
 c.save();c.translate(item.x,item.y);oval(c,8,6,87,19,'#324f3930');box(c,-86,-12,175,51,12,night?'#9da481':'#d7cba4');
 box(c,-72,-74,144,74,8,'#efe1b4','#355b43',2.2);box(c,23,-64,43,64,2,'#b6c29a','#355b43',1.8);
 box(c,-56,-57,62,57,5,'#53735b','#355b43',2);box(c,-49,-49,48,41,3,'#8c9b70');
 // 工具架和独立立柱使维修棚与已有整车销售车库结构不同。
 for(let i=0;i<3;i++){box(c,-45+i*16,-41,7,22,2,'#e8d598','#42644b',1.2);}
 c.beginPath();c.moveTo(-82,-72);c.lineTo(-15,-112);c.lineTo(80,-77);c.lineTo(70,-62);c.lineTo(-15,-90);c.lineTo(-73,-59);c.closePath();c.fillStyle='#7f9d69';c.fill();c.strokeStyle='#355b43';c.lineWidth=2.5;c.stroke();
 box(c,-60,-84,120,26,6,'#fff0bf','#42644b',2);c.fillStyle='#355b43';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText('载具维修中心',0,-66);
 c.strokeStyle='#f1dfac';c.lineWidth=4;c.beginPath();c.moveTo(37,-46);c.lineTo(53,-30);c.moveTo(35,-50);c.lineTo(31,-43);c.lineTo(40,-39);c.stroke();
 box(c,25,-13,38,9,3,'#42644b');c.restore();
}
// 拖车局部轮毂依真实位移转动，绞盘与载车平板独立，不用整图变形伪造动作。
function drawTow(c,item,game){
 const r=item.order;c.save();c.translate(item.x,item.y);oval(c,2,8,56,15,'#354e3c35');
 for(const x of [-40,34])for(const y of [-8,17]){oval(c,x,y,9,11,'#385346','#244d3c',1.5);c.save();c.translate(x,y);c.rotate(r.wheel||0);c.strokeStyle='#d4d9ae';c.lineWidth=2;c.beginPath();c.moveTo(-5,0);c.lineTo(5,0);c.moveTo(0,-6);c.lineTo(0,6);c.stroke();c.restore();}
 box(c,-44,-20,85,40,6,'#b0bd90','#365b43',2);box(c,6,-39,38,43,7,'#ead9a3','#365b43',2);box(c,12,-31,25,14,3,'#84aaa0','#365b43',1.5);
 box(c,21,-44,13,5,2,'#eac36d','#365b43',1);box(c,-40,-25,40,11,2,'#607d5c','#365b43',2);
 c.strokeStyle='#365b43';c.lineWidth=5;c.beginPath();c.moveTo(-5,-22);c.lineTo(-19,-51);c.lineTo(-42,-51);c.stroke();
 c.strokeStyle='#d9c996';c.lineWidth=2;c.beginPath();c.moveTo(-42,-51);c.lineTo(-42,-25);c.stroke();c.restore();
 if(r.phase==='towing'){const point={x:item.x-35,y:item.y-23};drawParkedHull(c,point,game,item.hull);drawWreckDamage(c,point.x,point.y,game.time);}
 if(r.phase==='hooking'){c.strokeStyle='#5e7256';c.lineWidth=2;c.beginPath();c.moveTo(item.x-42,item.y-25);c.lineTo(nearest(r.position,item).x,nearest(r.position,item).y-12);c.stroke();}
}
// 白天夜晚共用正式光照，进度与订单一致，绘制本身不推进维修。
export function drawVehicleServiceObject(c,item,game,night=0,reduced=false){
 if(item.type==='repair-center'){drawCenter(c,item,night);return;}
 if(item.type==='repair-tow'){drawTow(c,item,game);return;}
 drawParkedHull(c,item,game,item.hull);
 if(item.type==='repair-wreck'||item.order?.phase==='repairing')drawWreckDamage(c,item.x,item.y,reduced?0:game.time);
 if(item.type==='repair-bay'){
  const r=item.order;box(c,item.x-38,item.y+20,76,9,4,'#e9dfb5','#41634a',1.5);box(c,item.x-36,item.y+22,72*(r.phase==='ready'?1:r.timer/C.repairSeconds),5,2,'#79a674');
  c.save();c.fillStyle='#355b43';c.font='bold 11px sans-serif';c.textAlign='center';c.fillText(r.phase==='ready'?'已修好 · 待取车':'维修中',item.x,item.y+44);c.restore();
 }
}
