import {vehicleSmokeCloud} from '../combat/vehicle-field-devices.js';
import {nearest} from '../world/coordinates.js';

const turn=Math.PI*2;

// 地雷先从车侧弹出，再落地亮灯；外圈沿用实际触发半径。
export function drawFieldDevices(c,game,reduced){
 for(const m of game.vehicleMines||[]){
  if(m.mapId!==game.mapId)continue;
  const p=nearest(m,game.player),age=25-m.life,armed=age>=.5;
  c.save();c.translate(p.x,p.y);
  c.strokeStyle=armed?'#ffbf63':'#e5dec0';c.lineWidth=2;
  c.setLineDash([5,8]);c.beginPath();c.arc(0,0,34,0,turn);c.stroke();c.setLineDash([]);
  const travel=reduced?1:Math.min(1,age/.5);
  c.translate((m.launchDx||0)*(1-travel),(m.launchDy||0)*(1-travel)-Math.sin(travel*Math.PI)*18);
  c.fillStyle='#323e39';c.strokeStyle='#f6de9b';c.lineWidth=2;
  c.beginPath();c.ellipse(0,0,15,9,0,0,turn);c.fill();c.stroke();
  c.fillStyle='#a38c59';c.beginPath();c.ellipse(0,-4,11,6,0,0,turn);c.fill();
  c.fillStyle=armed?'#ff843b':'#e5dec0';c.beginPath();c.arc(0,-5,4,0,turn);c.fill();
  if(armed){c.globalAlpha=reduced ? .65 : .55+.35*Math.cos(age*4);c.strokeStyle='#fff1a7';c.beginPath();c.arc(0,-5,7,0,turn);c.stroke();}
  c.restore();
 }
}

// 在烟雾弹的固定落点绘制向外翻卷的烟团，外围阴影与亮边让昼夜都能辨认烟幕。
export function drawVehicleSmoke(c,game,reduced){
 const cloud=vehicleSmokeCloud(game);if(!cloud)return;
 const position=nearest(cloud,game.player),r=cloud.radius;
 const clock=reduced?0:(game.time||0)*.42;
 c.save();c.translate(position.x,position.y-8);
 for(let i=0;i<10;i++){
  const t=(clock+i*.37)%1,a=i*turn/10+.11*Math.sin(t*Math.PI+i);
  const spread=r*(.55+.43*t),size=r*(.24+.29*t);
  const x=Math.cos(a)*spread,y=Math.sin(a)*spread*.82-t*9;
  const cloud=c.createRadialGradient(x-size*.12,y-size*.25,0,x,y,size);
  cloud.addColorStop(0,'#f0f1df');cloud.addColorStop(.38,'#bcc8bd');
  cloud.addColorStop(.68,'#748b89');cloud.addColorStop(1,'rgba(91,113,114,0)');
  c.globalAlpha=.72*Math.sin(Math.PI*t);c.fillStyle=cloud;
  c.fillRect(x-size,y-size,size*2,size*2);
 }
 c.restore();
}

// 沿实际拦截方向画出短促曳光，在来弹消失处留下分叉碎光。
export function drawProtectionTrace(c,p,age,reduced){
 const reach=p.size,tail=reduced?0:Math.max(0,(age-.14)/.62)*reach;
 if(age<.76){
  for(const [width,color] of [[6,'#337e81'],[2.5,'#caffee']]){
   c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(tail,0);c.lineTo(reach,0);c.stroke();
  }
 }
 c.translate(reach,0);
 const spread=reduced?10:5+age*23;
 c.strokeStyle='#fff0af';c.lineWidth=2.5;c.beginPath();
 for(let i=0;i<7;i++){
  const a=i*turn/7+.25,dx=Math.cos(a),dy=Math.sin(a),length=spread*(i%2?.73:1);
  c.moveTo(dx*length*.52,dy*length*.52);c.lineTo(dx*length,dy*length);
 }
 c.stroke();c.fillStyle='#fffad9';c.beginPath();c.arc(0,0,Math.max(2,6*(1-age)),0,turn);c.fill();
}
