// 拖绳连接正式牵引车与残骸落点，复用世界镜像坐标，不创建副本车辆。
import {nearest} from '../world/coordinates.js';
// 绳索在车辆主体前绘制，固定端点落地，转向时不旋转车体图片。
export function drawPlayerTow(c,game,player){const t=game.progress.logistics?.tow,r=t&&game.progress.vehicleService[t.target];if(!r||game.cottage||r.mapId!==game.mapId)return;const target=nearest(game.towedPosition??r.position,player);c.save();c.strokeStyle='#375340';c.lineWidth=4;c.beginPath();c.moveTo(player.x,player.y);c.lineTo(target.x,target.y);c.stroke();c.strokeStyle='#d1b878';c.lineWidth=2;c.setLineDash([6,4]);c.stroke();c.restore();}
