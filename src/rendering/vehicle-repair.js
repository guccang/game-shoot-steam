import {drawGarage,drawGarageGround} from './garage.js';
import {drawWheel} from './pine-wheels.js';
import {nearest} from '../world/coordinates.js';
// 维修建筑、残骸与拖车直接进入正式世界深度队列，不创建替代预览画面。
import {REPAIR_CENTER,REPAIR_BAY,towLoadPoint,VEHICLE_REPAIR as C} from '../config/vehicle-repair.js';
import {personalFleet} from '../core/vehicle-repair.js';
import {drawParkedHull} from './parked-vehicles.js';
import {box,oval,poly} from './primitives.js';
// 同一个订单只生成一辆残骸；挂钩前保留原地，拖运后与拖板一起移动。
export function vehicleServiceObjects(game){
 if(!personalFleet(game)||game.cottage)return [];
 const objects=game.mapId==='forest'?[{...REPAIR_CENTER,type:'repair-center'}]:[];
 for(const [hull,r] of (game.progress.vehicleService||[]).entries()){
  if(!r?.phase||r.mapId!==game.mapId)continue;
  if(['wrecked','outbound'].includes(r.phase))objects.push({...r.position,type:'repair-wreck',hull});
  if(['outbound','hooking','towing'].includes(r.phase))objects.push({...r.truck,type:'repair-tow',hull,order:r});
  if(r.phase==='repairing'&&!objects.some(o=>o.type==='repair-bay'))objects.push({...REPAIR_BAY,type:'repair-bay',hull,order:r});
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
 c.save();c.translate(item.x,item.y);drawGarageGround(c);
 drawGarage(c,false,{label:'载具维修中心',repair:true});c.restore();
}
// 车头固定朝下；四轮复用现有载具胎纹，后载台与短驾驶室分层绘制。
function drawTow(c,item,game){
 const r=item.order,edge='#345646',load=towLoadPoint({...r,truck:item});
 c.save();c.translate(item.x,item.y);oval(c,2,-30,54,68,'#304b3c28');
 box(c,-42,-94,84,119,7,'#566f5d',edge,2);
 for(const y of [-76,17])for(const x of [-45,45])drawWheel(c,x,y,r.wheel||0);
 // 短平板从后坡板延伸至驾驶室后侧，正面透视与消防车的长水箱一致。
 box(c,-43,-108,86,83,5,'#8d9f86',edge,2);
 box(c,-36,-102,72,70,3,'#bdc5a7',edge,1.5);
 for(let y=-94;y<-35;y+=12)box(c,-32,y,64,2,0,'#91a58a');
 for(const x of [-43,38])box(c,x,-102,5,70,2,'#d8cf9e',edge,1.1);
 box(c,-40,-110,80,7,2,'#9cab90',edge,1.4);
 if(r.phase==='hooking')for(const x of [-31,15])poly(c,[[x,-109],[x+16,-109],[x+13,-122],[x+3,-122]],'#a5b399',edge,1.5);
 box(c,-13,-29,26,9,3,'#52735b',edge,1.5);oval(c,0,-25,9,4,'#c6ceb0',edge,1.1);
 c.restore();
 // 挂钩残骸与载运货物均在载台之后、驾驶室之前绘制，装车完成时锚点连续。
 if(['hooking','towing'].includes(r.phase)){
  const origin=nearest(r.position,item),t=r.phase==='towing'?1:Math.min(1,r.timer/C.hookSeconds),point={x:origin.x+(load.x-origin.x)*t,y:origin.y+(load.y-origin.y)*t};
  if(r.phase==='hooking'){c.save();c.strokeStyle='#5c6c58';c.lineWidth=2;c.beginPath();c.moveTo(item.x,item.y-25);c.lineTo(point.x,point.y+8);c.stroke();c.restore();}
  drawParkedHull(c,point,game,item.hull);drawWreckDamage(c,point.x,point.y,game.time);
  if(r.phase==='towing'){c.save();c.strokeStyle='#b99e65';c.lineWidth=2;for(const dx of [-27,27]){c.beginPath();c.moveTo(point.x+dx,point.y-14);c.lineTo(point.x+dx,point.y+16);c.stroke();}c.restore();}
 }
 c.save();c.translate(item.x,item.y);
 // 对称风挡、短引擎盖、前灯与格栅明确车头朝下，取消侧面驾驶室及横向翻转。
 box(c,-36,-22,72,49,7,'#d8bc7e',edge,2.3);
 box(c,-32,-19,64,7,3,'#eee0ab',edge,1.4);
 poly(c,[[-29,-11],[29,-11],[31,4],[-31,4]],'#9fc3b9',edge,1.7);
 c.strokeStyle='#dce7cd';c.lineWidth=2;c.beginPath();c.moveTo(-23,-7);c.lineTo(-15,0);c.moveTo(0,-10);c.lineTo(0,3);c.stroke();
 box(c,-35,5,70,24,6,'#dec58a',edge,2);box(c,-39,25,78,7,3,'#8a9d83',edge,1.8);
 for(const x of [-30,20])box(c,x,17,10,6,2,'#fff0b8',edge,1.2);
 box(c,-14,21,28,5,2,'#58765f',edge,1.2);
 for(const x of [-42,36])box(c,x,-6,6,12,2,'#6d8a74',edge,1.3);
 box(c,-19,-27,38,6,2,'#77876e',edge,1.1);
 for(const x of [-17,9])box(c,x,-29,8,6,2,Math.sin(game.time*8)>0?'#edc777':'#c9a061',edge,1);
 c.fillStyle=edge;c.font='bold 9px sans-serif';c.textAlign='center';c.fillText('救援',0,16);c.restore();
}
// 白天夜晚共用正式光照，进度与订单一致，绘制本身不推进维修。
export function drawVehicleServiceObject(c,item,game,night=0,reduced=false){
 if(item.type==='repair-center'){drawCenter(c,item,night);return;}
 if(item.type==='repair-tow'){drawTow(c,item,game);return;}
 drawParkedHull(c,item,game,item.hull,game.progress.logistics?.tow?.target===item.hull?{wheel:game.progress.vehicleService[item.hull].wheel,track:game.progress.vehicleService[item.hull].wheel}:null);
 if(item.type==='repair-wreck'||item.order?.phase==='repairing')drawWreckDamage(c,item.x,item.y,reduced?0:game.time);
 if(item.type==='repair-bay'){
  const r=item.order;box(c,item.x-38,item.y+20,76,9,4,'#e9dfb5','#41634a',1.5);box(c,item.x-36,item.y+22,72*Math.min(1,r.timer/C.repairSeconds),5,2,'#79a674');
  c.save();c.fillStyle='#355b43';c.font='bold 11px sans-serif';c.textAlign='center';c.fillText('维修中',item.x,item.y+44);c.restore();
 }
}
