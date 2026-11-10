// 地貌团子正式程序美术：固定脚底、共享软体姿态，冠饰与鳍叶独立错相运动。
import {BIOME_DUMPLING_BY_ID,dumplingShotAngles} from '../config/biome-dumplings.js';
import {drawDumplingBody} from './dumpling-body.js';
import {oval,poly,outline} from './primitives.js';

// 每种造型同时改变宽高、冠部和侧部结构，不能只依靠换色识别。
export function drawBiomeDumpling(c,e,pose,reduced=false){
  const p=BIOME_DUMPLING_BY_ID[e.dumplingVariant];if(!p)throw Error('缺少地貌团子配置：'+e.dumplingVariant);
  const t=reduced?0:(e.ecoClock||0)+(e.phase||0),wave=Math.sin(t*2.6)*2;
  if(e.aquatic){oval(c,0,3,29+wave,7,'#bce0d32a','#95c8c5',1);for(const side of [-1,1])poly(c,[[side*15,-10],[side*(32+wave),-16],[side*27,-2],[side*16,0]],p.accent,outline,1.5);}
  const b=drawDumplingBody(c,{width:p.width,height:p.height,color:p.color,accent:p.accent,pose,flash:e.flash>0,motion:wave*.35});
  c.save();c.translate(pose.sway*.6,b.top);
  switch(p.shape){
    case 'cap':
      oval(c,0,2,24,8,'#edf0df',outline,1.7);oval(c,-8,-3,13,7,'#f7f2df');
      for(const side of [-1,1])oval(c,side*22,16,5,9,'#c6dce0',outline,1.5);break;
    case 'horn':
      for(const side of [-1,1])poly(c,[[side*8,8],[side*14,-17-wave],[side*22,10]],p.accent,outline,1.8);break;
    case 'stack':
      oval(c,0,-1,17,12,p.accent,outline,1.8);oval(c,-3,-15,10,7,'#f3efd9',outline,1.6);
      oval(c,-22,28,9,7,p.accent,outline,1.5);oval(c,23,28,9,7,p.accent,outline,1.5);break;
    case 'crater':
      poly(c,[[-21,10],[-15,-7],[-5,-3],[5,-9],[17,-5],[22,10]],'#8d8275',outline,2);
      oval(c,0,0,12,4,p.accent,outline,1.5);oval(c,4,-8-wave,3,4,'#e7b270');break;
    case 'fan':
      for(let i=-1;i<=1;i++)oval(c,i*12,-3-Math.abs(i)*3+wave,10,9,'#c0b9a3',outline,1.6);
      poly(c,[[-24,18],[-31,10],[-30,27],[-21,29]],p.accent,outline,1.5);break;
    case 'plates':
      for(const side of [-1,1])poly(c,[[side*9,3],[side*18,-13],[side*26,18],[side*18,27]],'#658079',outline,1.8);
      poly(c,[[-7,4],[0,-13],[7,4],[0,9]],p.accent,outline,1.5);break;
    case 'lotus':
      oval(c,0,0,26,7,'#80ae7a',outline,1.8);poly(c,[[0,0],[14,-6],[11,1]],p.color,null);
      for(let i=-1;i<=1;i++)oval(c,-8+i*5,-5-Math.abs(i)*2,4,7,'#e9c4c1',outline,1);break;
    case 'bubbles':
      for(const [x,y,r] of [[-13,-1,9],[2,-13,10],[17,1,7]]){oval(c,x,y+wave*.5,r,r,'#c4e2da',outline,1.5);oval(c,x-2,y-3,2,2,'#f7f2dc');}break;
    case 'spiral':
      c.strokeStyle=outline;c.lineWidth=2;c.beginPath();for(let i=0;i<50;i++){const a=i*.22,r=i*.22,x=Math.cos(a+t*.3)*r,y=Math.sin(a+t*.3)*r*.45;i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
      poly(c,[[-26,12],[-35,3],[-23,2],[-16,12]],p.accent,outline,1.5);break;
    case 'fronds':
      for(const side of [-1,1])for(let i=0;i<3;i++)poly(c,[[side*3,7-i*5],[side*(26-i*4),-4-i*6+wave],[side*13,9-i*5]],i%2?p.accent:'#659a6b',outline,1.3);break;
    case 'flower':
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;oval(c,Math.cos(a)*11,Math.sin(a)*8-3,7,6,p.accent,outline,1.3);}oval(c,0,-3,5,5,'#edcf81',outline,1.2);break;
    case 'vines':
      c.strokeStyle=outline;c.lineWidth=5;for(const side of [-1,1]){c.beginPath();c.moveTo(side*13,20);c.bezierCurveTo(side*38,12,side*(34+wave),-16,side*15,-10);c.stroke();}
      for(const side of [-1,1])poly(c,[[side*15,-10],[side*24,-20+wave],[side*30,-10],[side*18,-4]],p.accent,outline,1.3);break;
    case 'shelves':
      for(let i=0;i<3;i++)poly(c,[[-25+i*5,7-i*6],[16-i*2,3-i*6],[27-i*5,9-i*6],[-18+i*3,14-i*6]],i%2?p.accent:'#a7977a',outline,1.5);break;
    case 'bell':
      poly(c,[[-18,8],[-10,-10],[0,-15],[8,-7],[17,8]],p.accent,outline,1.7);oval(c,0,4,7,5,'#b89b66',outline,1.4);
      for(const side of [-1,1])oval(c,side*20,29,6,6,p.accent,outline,1.4);break;
    case 'crystals':
      for(const [x,h] of [[-16,13],[0,24],[15,17]])poly(c,[[x-6,9],[x-5,-h+wave*.4],[x,-h-6],[x+7,-h+2],[x+5,11]],p.accent,outline,1.6);break;
  }
  c.restore();
}

// 预警复用发射角与落点，地面细线保留走位空隙，蓄力结束后及时收起。
export function drawBiomeDumplingWarning(c,e){
  const p=BIOME_DUMPLING_BY_ID[e.dumplingVariant],a=e.assault;if(!p||e.hp<=0||a?.phase!=='windup')return;
  c.save();c.strokeStyle='#be674b';c.fillStyle='#f1cd7e22';c.lineWidth=1.8;c.setLineDash([5,5]);
  if(p.splash){c.beginPath();c.arc(a.endX,a.endY,p.splash,0,Math.PI*2);c.fill();c.stroke();}
  else for(const angle of dumplingShotAngles(p,Math.atan2(a.dirY,a.dirX))){c.beginPath();c.moveTo(a.originX,a.originY);c.lineTo(a.originX+Math.cos(angle)*p.range,a.originY+Math.sin(angle)*p.range);c.stroke();}
  c.setLineDash([]);c.beginPath();c.arc(e.x,e.y,27,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,a.elapsed/p.windup));c.stroke();c.restore();
}

// 弹丸大小与碰撞半径一致，颜色继承族群；不创建常驻位图和昼夜副本。
export function drawBiomeDumplingBolt(c,b){
  const p=BIOME_DUMPLING_BY_ID[b.dumplingVariant];
  oval(c,0,0,b.radius,b.radius,p.color,outline,1.6);oval(c,-b.radius*.25,-b.radius*.3,b.radius*.32,b.radius*.22,p.accent);
}
