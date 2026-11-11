// 停车位和建筑操作徽记复用正式世界投影；绘制只读状态，不推进停车。
// 车位、地坪和标牌均使用当前停车场局部坐标。
import {PARKING as C,PARKING_SPOTS,NORTH_PARKING} from '../config/parking.js';
import {nearest} from '../world/coordinates.js';
import {GARAGE} from '../world/workshop.js';
import {box} from './primitives.js';
import {drawActionCountdown} from './action-countdown.js';
import {parkingInteractionAnchor,nearbyInteractionAnchor} from '../world/interaction-anchors.js';

// 露天车位使用浅土色地坪和开口标线，不占房门及道路；室内位沿用原车库地坪。
export function drawParkingGround(c,game,view,night=0){
 if(game.mapId!=='forest'||game.realm||game.story)return;
 // 公共停车场以一块浅土色地面和共用过道组织原场泊位，北门主通道保持开放。
 const lot=nearest(NORTH_PARKING,game.player),shiftX=lot.x-NORTH_PARKING.x,shiftY=lot.y-NORTH_PARKING.y;
 // 包围范围包含通道曲线、描边和牌子；完全屏外时不提交停车场图元。
 if(lot.x-30<=view.x+view.w&&lot.x+560>=view.x&&lot.y-30<=view.y+view.h&&lot.y+NORTH_PARKING.height+30>=view.y){
 c.save();c.translate(shiftX,shiftY);
 c.strokeStyle=night?'#afba8e40':'#d5c99870';c.lineWidth=42;c.lineCap='round';c.beginPath();
 c.moveTo(NORTH_PARKING.x+355,NORTH_PARKING.y+120);c.quadraticCurveTo(NORTH_PARKING.x+440,NORTH_PARKING.y+120,NORTH_PARKING.entrance.x,NORTH_PARKING.entrance.y);c.stroke();
 box(c,NORTH_PARKING.x,NORTH_PARKING.y,NORTH_PARKING.width,NORTH_PARKING.height,20,night?'#9baf8230':'#d5c99880','#91a07770',1.5);
 box(c,NORTH_PARKING.x+135,NORTH_PARKING.y-6,110,23,5,'#e9dcaf','#6c8869',1.5);c.fillStyle='#456a4b';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText('北门停车场',NORTH_PARKING.x+190,NORTH_PARKING.y+10);c.restore();
 }
 for(const spot of PARKING_SPOTS){
  if(spot.indoor)continue;
  const p=nearest(spot,game.player);
  if(p.x<view.x-70||p.x>view.x+view.w+70||p.y<view.y-70||p.y>view.y+view.h+70)continue;
  c.save();c.translate(p.x,p.y);
  box(c,-C.width/2,-48,C.width,C.height,12,night?'#9baf822b':'#d5c99865');
  c.strokeStyle=night?'#c8d4a5':'#f4e8ba';c.lineWidth=2.8;c.lineCap='round';
  c.beginPath();c.moveTo(-43,29);c.lineTo(-43,-37);c.quadraticCurveTo(-43,-42,-38,-42);c.lineTo(38,-42);c.quadraticCurveTo(43,-42,43,-37);c.lineTo(43,29);c.stroke();
  for(const x of [-26,18]){box(c,x+2,-34,14,7,2,'#38543d30');box(c,x,-36,14,6,2,'#b7bea0','#71856c',1);}
  c.fillStyle=night?'#bfcd9c':'#7b956a';c.font='bold 14px sans-serif';c.textAlign='center';c.fillText(spot.number?String(spot.number):'停',0,16);
  c.restore();
 }
}
// 车库内的驾驶者排在门洞之后绘制，再用正式洞口遮罩保留屋顶、立柱的遮挡。
export function parkingGaragePose(player,vehicle){
 if(!vehicle.active)return null;
 for(const spot of PARKING_SPOTS.filter(s=>s.indoor)){
  const g=nearest({x:spot.x,y:spot.garageY},player);
  if(Math.abs(player.x-g.x)<GARAGE.bayHalf&&player.y<g.y+GARAGE.threshold&&player.y>g.y+GARAGE.bayTop)return g;
 }
 return null;
}
// 对齐和倒车状态固定显示在目标车库或泊位，车辆运动不再带走提示。
export function drawParkingCountdown(c,game,player,zoom=1){
 const fire=game.fireRescue;
 const s=game.fireActive&&game.vehicle.active&&fire?.phase==='parking'?{phase:fire.transit?.step===0?'align':'reverse'}:game.parking;
 if(!s||!['align','reverse'].includes(s.phase))return;
 const anchor=game.fireActive&&fire?.phase==='parking'?nearbyInteractionAnchor(game,{type:'fire-parking'}):parkingInteractionAnchor(s.id);
 if(!anchor)return;
 const point=nearest(anchor,player);
 c.save();c.translate(point.x,point.y);c.scale(1/zoom,1/zoom);
 drawActionCountdown(c,{progress:1,icon:'parking',label:s.phase==='align'?'对齐':'倒车'});c.restore();
}
