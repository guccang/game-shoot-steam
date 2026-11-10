// 地貌团子正式程序美术：固定脚底、共享软体姿态，冠饰与鳍叶独立错相运动。
import {BIOME_DUMPLING_BY_ID,dumplingShotAngles} from '../config/biome-dumplings.js';
import {drawBiomeDumplingPng} from './biome-dumpling-png.js';
import {oval,outline} from './primitives.js';

// 精修PNG按独立锚点组装，原水纹、软体时钟、受击和技能状态保持。
export function drawBiomeDumpling(c,e,pose,reduced=false){
 const p=BIOME_DUMPLING_BY_ID[e.dumplingVariant];if(!p)throw Error('缺少地貌团子配置：'+e.dumplingVariant);
 const t=reduced?0:(e.ecoClock||0)+(e.phase||0),wave=reduced?0:Math.sin(t*2.6)*2;
 if(e.aquatic)oval(c,0,3,29+wave,7,'#bce0d32a','#95c8c5',1);
 drawBiomeDumplingPng(c,e,p,pose,wave,t);
}

// 预警复用发射角与落点，地面细线保留走位空隙，蓄力结束后及时收起。
export function drawBiomeDumplingWarning(c,e){
  const p=BIOME_DUMPLING_BY_ID[e.dumplingVariant],a=e.assault;if(!p||e.hp<=0||!a)return;
  const sweeping=p.pattern==='sweep'&&a.phase==='recovery'&&a.elapsed<.28;
  if(a.phase!=='windup'&&!sweeping)return;
  const angle=Math.atan2(a.dirY,a.dirX);c.save();c.strokeStyle=sweeping?p.color:'#be674b';c.fillStyle='#f1cd7e22';c.lineWidth=sweeping?6:1.8;c.setLineDash(sweeping?[]:[5,5]);
  if(p.pattern==='sweep'){
    if(sweeping){const t=Math.min(1,a.elapsed/.28),swing=angle-.7+1.4*t,ex=a.originX+Math.cos(swing)*p.range,ey=a.originY+Math.sin(swing)*p.range;
      c.lineCap='round';c.beginPath();c.moveTo(e.x,e.y-15);c.quadraticCurveTo(a.originX+Math.cos(swing-.35)*p.range*.55,a.originY+Math.sin(swing-.35)*p.range*.55,ex,ey);c.stroke();c.save();c.translate(ex,ey);c.rotate(swing);oval(c,-4,-3,9,4,p.accent,p.color,1.2);c.restore();
    }else{c.beginPath();c.moveTo(a.originX,a.originY);c.arc(a.originX,a.originY,p.range,angle-.7,angle+.7);c.closePath();c.fill();c.stroke();}
  }
  else if(p.splash){c.beginPath();c.arc(a.endX,a.endY,p.splash,0,Math.PI*2);c.fill();c.stroke();}
  else for(let volley=0;volley<(p.pattern==='ring'?(p.volleys||1):1);volley++)for(const [i,dir]of dumplingShotAngles(p,angle,volley).entries()){
    c.beginPath();c.moveTo(a.originX,a.originY);const curve=p.curve?(p.id==='fern'?(i===0?1:-1):1)*p.curve:0;
    for(let n=1;n<=16;n++){const t=p.range/p.speed*n/16,x=curve?p.speed*(Math.sin(dir+curve*t)-Math.sin(dir))/curve:Math.cos(dir)*p.range*n/16,y=curve?p.speed*(Math.cos(dir)-Math.cos(dir+curve*t))/curve:Math.sin(dir)*p.range*n/16;c.lineTo(a.originX+x,a.originY+y);}c.stroke();
  }
  c.setLineDash([]);if(!sweeping){c.beginPath();c.arc(e.x,e.y,27,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,a.elapsed/p.windup));c.stroke();}c.restore();
}

// 飞行物按冰锥、叶刃、滚石、火核、花粉和水珠分形，尾迹只展示已走过的方向。
export function drawBiomeDumplingBolt(c,b,reduced=false){
  const p=BIOME_DUMPLING_BY_ID[b.dumplingVariant],r=b.radius,angle=Math.atan2(b.dy,b.dx);c.save();
  if(!reduced){c.strokeStyle=p.accent+'99';c.lineWidth=Math.max(2,r*.6);c.beginPath();c.moveTo(-b.dx*Math.min(28,b.age*b.speed),-b.dy*Math.min(28,b.age*b.speed));c.lineTo(0,0);c.stroke();}
  c.fillStyle=p.color;c.strokeStyle=outline;c.lineWidth=1.6;
  if(['icehorn','riftcrystal'].includes(p.id)){c.rotate(angle);c.beginPath();c.moveTo(r*2,0);c.lineTo(-r,-r);c.lineTo(-r*.4,0);c.lineTo(-r,r);c.closePath();c.fill();c.stroke();}
  else if(p.id==='fern'){c.rotate(reduced?angle:b.age*12);c.beginPath();c.moveTo(-r,0);c.quadraticCurveTo(0,-r*1.8,r,0);c.quadraticCurveTo(0,r*1.8,-r,0);c.fill();c.stroke();c.beginPath();c.moveTo(-r,0);c.lineTo(r,0);c.stroke();}
  else if(['shale','sandbell','lavapot'].includes(p.id)){c.rotate(reduced?0:b.age*4);c.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.stroke();c.strokeStyle=p.accent;c.beginPath();c.moveTo(-r*.6,-r*.3);c.lineTo(r*.2,0);c.lineTo(-r*.2,r*.7);c.stroke();}
  else if(p.id==='ashfan'){c.rotate(angle);c.beginPath();c.moveTo(r,0);c.quadraticCurveTo(-r,-r*1.5,-r*2,0);c.quadraticCurveTo(-r,r*1.5,r,0);c.fill();c.stroke();oval(c,0,0,r*.4,r*.4,p.accent);}
  else if(p.id==='orchid'){for(let i=0;i<3;i++){const a=i*Math.PI*2/3+(reduced?0:b.age*3);oval(c,Math.cos(a)*r*.5,Math.sin(a)*r*.5,r*.5,r*.5,p.accent,outline,1);}oval(c,0,0,r*.3,r*.3,p.color);}
  else {oval(c,0,0,r,r,p.id==='bubble'?'#b4e5e533':p.color,outline,1.6);oval(c,-r*.25,-r*.3,r*.32,r*.22,p.accent);if(p.id==='snowcap'){c.rotate(reduced?0:b.age*6);c.strokeStyle='#f5f2d9';c.beginPath();c.moveTo(-r*.7,0);c.lineTo(r*.7,0);c.moveTo(0,-r*.7);c.lineTo(0,r*.7);c.stroke();}}
  c.restore();
}
