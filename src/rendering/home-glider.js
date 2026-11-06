// 滑翔翼使用独立吊索与布面；猫身沿用视频图集，影子固定在真实地面投影。
import {HEROES} from '../config/heroes.js';
import {drawCat} from './characters.js';
import {PLAYER_SCALE} from '../combat/recoil.js';

// 两侧翼布在脊杆汇合，后缘随气流轻抖；高度压缩只影响空中绘制位置。
export function drawHomeGlider(c,player,hero,flight,time,reduced){
 const height=flight.height*flight.remaining/flight.distance;
 const lift=85*(1-Math.exp(-height/8)),wave=reduced?0:Math.sin(time*2.8);
 c.save();c.translate(player.x,player.y);
 c.fillStyle='#354e403b';c.beginPath();c.ellipse(5,4,34-lift*.13,7,0,0,Math.PI*2);c.fill();
 c.translate(0,-lift+wave*Math.min(1,height));
 c.save();
 c.translate(0,-13);
 c.strokeStyle='#465c48';c.lineWidth=1.8;c.lineJoin='round';
 for(const s of [-1,1]){
  c.beginPath();c.moveTo(s*28,-52);c.lineTo(s*17,1);c.lineTo(0,-53);c.stroke();
  c.beginPath();c.moveTo(0,-79);c.quadraticCurveTo(s*30,-69,s*66,-37+wave);
  c.quadraticCurveTo(s*34,-49+wave,s*15,-50);c.lineTo(0,-49);c.closePath();
  c.fillStyle=s<0?'#bad598':'#89b88c';c.fill();c.stroke();
  c.beginPath();c.moveTo(0,-77);c.lineTo(s*39,-48);c.quadraticCurveTo(s*34,-49,s*29,-47);c.closePath();c.fillStyle='#f5df9d';c.fill();
 }
 c.restore();
 drawCat(c,0,0,hero,player.angle,PLAYER_SCALE,0,0,null,reduced?.35:1,null,0,false,false,player.bodyAnimation,0,null,0,true,0,true);
 // 横杆位于胸口，双爪抓住两侧，吊绳从肩后穿过。
 c.strokeStyle='#4b5d48';c.lineWidth=3;c.lineCap='round';
 c.beginPath();c.moveTo(-19,-12);c.lineTo(19,-12);c.stroke();
 for(const side of [-1,1]){
  c.beginPath();c.ellipse(side*14,-12,4,3.5,0,0,Math.PI*2);
  c.fillStyle=HEROES[hero].color;c.fill();c.lineWidth=1.4;c.stroke();
 }
 c.restore();
}
