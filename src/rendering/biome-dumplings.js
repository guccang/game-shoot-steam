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
