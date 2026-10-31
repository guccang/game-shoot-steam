import {drawGarage,drawGarageGround} from './garage.js';
import {nearest} from '../world/coordinates.js';
// 维修建筑、残骸与拖车直接进入正式世界深度队列，不创建替代预览画面。
import {REPAIR_CENTER,REPAIR_BAY,TOW_TRUCK,towLoadPoint,VEHICLE_REPAIR as C} from '../config/vehicle-repair.js';
import {personalFleet} from '../core/vehicle-repair.js';
import {drawParkedHull} from './parked-vehicles.js';
import {box,oval,poly} from './primitives.js';
// 同一个订单只生成一辆残骸；挂钩前保留原地，拖运后与拖板一起移动。
export function vehicleServiceObjects(game){
 if(!personalFleet(game)||game.cottage)return [];
 const objects=game.mapId==='forest'?[{...REPAIR_CENTER,type:'repair-center'}]:[];
 for(const [hull,r] of (game.progress.vehicleService||[]).entries()){
  if(!r?.phase||r.mapId!==game.mapId)continue;
  if(['wrecked','outbound','hooking'].includes(r.phase)){
   const t=r.phase==='hooking'?Math.min(1,r.timer/C.hookSeconds):0,truck=r.truck||r.position,origin=t?nearest(r.position,truck):r.position,load=towLoadPoint({...r,truck});
   objects.push({x:origin.x+(load.x-origin.x)*t,y:origin.y+(load.y-origin.y)*t,type:'repair-wreck',hull});
  }
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
// 拖车局部轮毂依真实位移转动，绞盘与载车平板独立，不用整图变形伪造动作。
function drawTow(c,item,game){
 const r=item.order,facing=Math.cos(r.angle||0)<0?-1:1,edge='#345646';
 c.save();c.translate(item.x,item.y);c.scale(facing,1);oval(c,0,13,112,20,'#304b3c38');
 // 三根独立车轴：双后轴承载平板，前轴位于驾驶室下方。
 for(const x of [-78,-40,80])for(const y of [-12,18]){
  oval(c,x,y,12,16,'#30473e',edge,2);oval(c,x,y,7,10,'#8d9c8c',edge,1.4);
  c.save();c.translate(x,y);c.scale(1,.85);c.rotate((r.wheel||0)*facing);c.strokeStyle='#d8dfbb';c.lineWidth=2;
  for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.beginPath();c.moveTo(2,0);c.lineTo(7,0);c.stroke();}c.restore();
 }
 box(c,-108,-3,207,18,4,'#566f5d',edge,2);
 // 长载台具有防滑条、厚侧梁、折叠坡板和固定扣，尺寸足以承载原战车。
 poly(c,[[-108,-35],[38,-45],[54,-8],[-108,6]],'#b4bea2',edge,2.5);
 poly(c,[[-108,6],[54,-8],[54,3],[-108,18]],'#839881',edge,2);
 for(let x=-98;x<30;x+=16){c.strokeStyle='#829780';c.lineWidth=2;c.beginPath();c.moveTo(x,-28);c.lineTo(x+7,1);c.stroke();}
 for(const x of [-91,-55,-19,17]){box(c,x,8,16,5,1,'#e5c775',edge,1);}
 poly(c,[[-108,-35],[-117,-29],[-116,15],[-108,18]],'#9daa91',edge,2);
 if(r.phase==='hooking'){poly(c,[[-116,15],[-141,34],[-107,31],[-92,13]],'#a4af96',edge,2);}
 // 绞盘固定在载台前端，挂接钢索独立于车壳运动。
 box(c,20,-54,20,28,3,'#58775e',edge,2);oval(c,29,-39,9,6,'#c4cbb0',edge,1.5);
 // 高驾驶室、倾斜风挡、后视镜、保险杠和琥珀警灯呈现道路救援车结构。
 poly(c,[[43,-47],[53,-80],[88,-77],[106,-49],[105,1],[48,2]],'#e5c686',edge,2.5);
 poly(c,[[51,-48],[58,-71],[86,-69],[96,-48]],'#9fc3b9',edge,2);
 c.strokeStyle='#dbe5ca';c.lineWidth=2;c.beginPath();c.moveTo(65,-67);c.lineTo(60,-51);c.stroke();
 box(c,51,-42,41,33,4,'#e0b975',edge,1.6);box(c,57,-36,12,3,1,'#456652');
 box(c,94,-39,13,28,2,'#b3bd9c',edge,1.4);for(const y of [-33,-27,-21])box(c,97,y,8,2,0,'#577466');
 box(c,97,-7,13,12,2,'#dce0be',edge,1.4);box(c,99,-12,9,5,1,'#fff0af',edge,1);
 box(c,43,-48,7,15,2,'#536e5a',edge,1.5);box(c,60,-85,28,6,2,'#6f8069',edge,1.3);
 for(const x of [61,78])box(c,x,-90,10,7,2,Math.sin(game.time*8)>0?'#ffd77a':'#c58d4c',edge,1.2);
 c.fillStyle=edge;c.font='bold 10px sans-serif';c.textAlign='center';c.save();c.translate(73,-16);c.scale(facing,1);c.fillText('救援',0,0);c.restore();c.restore();
 if(r.phase==='towing'){
  const point=towLoadPoint({...r,truck:item});drawParkedHull(c,point,game,item.hull);drawWreckDamage(c,point.x,point.y,game.time);
  c.strokeStyle='#c6ae76';c.lineWidth=2;for(const dx of [-21,21]){c.beginPath();c.moveTo(point.x+dx,point.y-14);c.lineTo(point.x+dx+7,point.y+9);c.stroke();}
 }
 if(r.phase==='hooking'){const origin=nearest(r.position,item),load=towLoadPoint({...r,truck:item}),t=Math.min(1,r.timer/C.hookSeconds);c.strokeStyle='#5c6c58';c.lineWidth=2;c.beginPath();c.moveTo(item.x+29*facing,item.y-39);c.lineTo(origin.x+(load.x-origin.x)*t,origin.y+(load.y-origin.y)*t-12);c.stroke();}
}
// 白天夜晚共用正式光照，进度与订单一致，绘制本身不推进维修。
export function drawVehicleServiceObject(c,item,game,night=0,reduced=false){
 if(item.type==='repair-center'){drawCenter(c,item,night);return;}
 if(item.type==='repair-tow'){drawTow(c,item,game);return;}
 drawParkedHull(c,item,game,item.hull);
 if(item.type==='repair-wreck'||item.order?.phase==='repairing')drawWreckDamage(c,item.x,item.y,reduced?0:game.time);
 if(item.type==='repair-bay'){
  const r=item.order;box(c,item.x-38,item.y+20,76,9,4,'#e9dfb5','#41634a',1.5);box(c,item.x-36,item.y+22,72*Math.min(1,r.timer/C.repairSeconds),5,2,'#79a674');
  c.save();c.fillStyle='#355b43';c.font='bold 11px sans-serif';c.textAlign='center';c.fillText('维修中',item.x,item.y+44);c.restore();
 }
}
