// 地雷绘在地面，随车烟幕保留透明中心，方便看清车体和瞄准方向。
import {smokeRadius} from '../combat/vehicle-field-devices.js';
import {nearest} from '../world/coordinates.js';

// 使用游戏时钟缓慢移动烟团，暂停和减少动态效果时保持稳定。
export function drawFieldDevices(c,game,reduced){
 c.save();
 for(const m of game.vehicleMines||[]){
  if(m.mapId!==game.mapId)continue;
  const p=nearest(m,game.player);
  c.fillStyle='#74836b';c.strokeStyle='#374e40';c.lineWidth=2;
  c.beginPath();c.ellipse(p.x,p.y,11,6,0,0,Math.PI*2);c.fill();c.stroke();
  c.fillStyle=m.life>24.5?'#b2b99a':'#ffd590';c.fillRect(p.x-2,p.y-3,4,3);
 }
 const r=smokeRadius(game);
 if(r){
  const phase=reduced?0:(game.time||0)*.35;
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4+phase,x=game.player.x+Math.cos(a)*r*.77,y=game.player.y-9+Math.sin(a)*r*.62;
   const cloud=c.createRadialGradient(x,y,1,x,y,r*.55);
   cloud.addColorStop(0,'rgba(212,222,203,.62)');cloud.addColorStop(1,'rgba(201,213,193,0)');
   c.fillStyle=cloud;c.fillRect(x-r*.55,y-r*.55,r*1.1,r*1.1);
  }
 }
 c.restore();
}
