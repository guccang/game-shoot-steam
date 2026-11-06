// 将原帧结尾染成同色，再在颈线上绘制折边及织纹，保留布结本身的运动。
import {CAT_SCARVES} from '../config/cat-scarves.js';

// 两张源片分别佩戴绿巾和黄巾，按源像素识别布料，避开薄荷的绿色衣服。
export function tintScarfKnot(pixels, source, size, head, breed){
 const rgb=parseInt(CAT_SCARVES[breed.id].cloth.slice(1),16);
 for(let y=head.neck-3;y<Math.min(size,head.neck+38);y++){
  for(let x=Math.max(0,Math.floor(head.x-40));x<Math.min(size,head.x+36);x++){
   const i=(y*size+x)*4,r=source[i],g=source[i+1],b=source[i+2];
   if(!source[i+3])continue;
   const fabric=breed.sprite===1?r>g+9&&g>b+34&&r>145:g>r+13&&g>b+14;
   if(!fabric)continue;
   const shade=Math.min(1.1,Math.max(.68,g/(breed.sprite===1?194:149)));
   pixels[i]=(rgb>>16)*shade;pixels[i+1]=(rgb>>8&255)*shade;pixels[i+2]=(rgb&255)*shade;
  }
 }
}

// 领巾略偏扣结一侧，织纹裁切在布内，保持远景有大色块、近看有针脚。
export function drawScarfBib(c,head,id){
 const s=CAT_SCARVES[id],d=s.depth;
 // 薄荷的圆脸下颌比其他品种低，折边贴在下颌外沿才能露出水纹。
 c.save();c.translate(head.x,head.neck+(id==='mint'?7:1));c.lineJoin='round';c.lineCap='round';
 c.beginPath();c.moveTo(-25,-5);c.quadraticCurveTo(0,4,25,-5);
 c.quadraticCurveTo(19,6,7,d-3);c.quadraticCurveTo(3,d+1,0,d);
 c.lineTo(-19,9);c.closePath();c.fillStyle=s.cloth;c.fill();
 c.strokeStyle=s.edge;c.lineWidth=2.2;c.stroke();c.clip();
 c.strokeStyle=s.trim;c.fillStyle=s.trim;c.lineWidth=2.3;
 c.beginPath();
 switch(s.motif){
  case 'leaf':
   c.moveTo(-6,10);c.quadraticCurveTo(-3,3,5,6);c.quadraticCurveTo(2,13,-6,10);c.fill();break;
  case 'wave':
   c.moveTo(-24,7);c.bezierCurveTo(-13,0,-7,14,3,7);c.quadraticCurveTo(11,2,20,6);c.stroke();break;
  case 'plaid':
   for(const x of [-9,6]){c.moveTo(x,-4);c.lineTo(x,25);}
   for(const y of [7,14]){c.moveTo(-24,y);c.lineTo(24,y);}
   c.stroke();break;
  case 'diagonal':
   for(const x of [-11,0]){c.moveTo(x,-3);c.lineTo(x+14,20);}c.lineWidth=3.5;c.stroke();break;
  case 'flower':
   for(let n=0;n<5;n++){const a=n*Math.PI*2/5;c.moveTo(4+Math.cos(a)*4,11+Math.sin(a)*4);c.arc(1+Math.cos(a)*4,11+Math.sin(a)*4,3,0,Math.PI*2);}
   c.fill();c.beginPath();c.arc(1,11,2.1,0,Math.PI*2);c.fillStyle=s.edge;c.fill();break;
  case 'diamond':
   c.moveTo(0,3);c.lineTo(7,9);c.lineTo(0,15);c.lineTo(-7,9);c.closePath();c.stroke();break;
  case 'bars':
   for(const y of [4,9]){c.moveTo(-15,y-3);c.lineTo(1,y+2);c.lineTo(16,y-3);}c.stroke();break;
 }
 c.restore();
}
