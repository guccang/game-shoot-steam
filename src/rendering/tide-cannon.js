// 潮汐炮水压弹与定向水冠：有限平涂、深青轮廓，手机夜景保留清晰亮芯。
import { oval } from './primitives.js';

// 显示真实弹头与短尾迹，不扩大命中判定，也不产生全屏光晕。
export function drawTideProjectile(c,b,reduced=false) {
  c.save();c.translate(b.x,b.y-((b.z??9)-9));c.rotate(Math.atan2(b.dy,b.dx));
  const tail=Math.min(b.travelled,reduced?10:27);
  c.lineCap='round';c.strokeStyle='#367b86';c.lineWidth=9;c.beginPath();c.moveTo(-tail,0);c.lineTo(0,0);c.stroke();
  c.strokeStyle='#88dfdf';c.lineWidth=6;c.stroke();
  oval(c,0,0,7,5,'#b3f5e9','#367b86',1.5);oval(c,1,-1,3.5,2,'#f2fff0');
  if(!reduced){oval(c,-tail*.6,-2,3,1.5,'#ecfff4');oval(c,-tail-5,1,2.5,2,'#a5e9e0');}c.restore();
}

// 一枚有界复合粒子绘制水冠和五滴外甩水珠，减少动态只保留小幅静态命中标记。
export function drawTideSplash(c,p,age,reduced=false) {
  const muzzle=p.kind==='tide-muzzle',reach=reduced?7:(muzzle?10:22)*(1-Math.pow(1-age,2));
  c.strokeStyle='#3c7d86';c.lineWidth=2;c.fillStyle='#8edbd5';
  c.beginPath();c.moveTo(-5,0);
  for(let i=0;i<=6;i++){const angle=-1.25+i*2.5/6,r=(i%2?1.35:.65)*(muzzle?8:15)+reach;
    c.lineTo(Math.cos(angle)*r,Math.sin(angle)*r*(muzzle?.6:1));}
  c.closePath();c.fill();c.stroke();
  c.strokeStyle='#eefff0';c.lineWidth=3;c.beginPath();c.moveTo(-3,0);c.lineTo(10+reach*.6,0);c.stroke();
  if(!reduced&&!muzzle)for(let i=0;i<5;i++){
    const angle=-1.35+i*.675,r=20+age*38;
    oval(c,Math.cos(angle)*r,Math.sin(angle)*r,Math.max(1.3,4*(1-age)),2.5,'#c6f5ea','#468d95',1.2);
  }
}
