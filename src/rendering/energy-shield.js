// 护盾发生器与立体罩体分层绘制，所有曲面和命中点使用正式拦截几何。
import {box,oval,poly,outline} from './primitives.js';
import {energyShieldShape,activeSEShield} from '../combat/energy-shield-surface.js';

// 厚边、斜切面和内嵌能源核赋予发生器厚度，保持既有握持原点。
export function drawShieldEmitter(c) {
 box(c,-21,-10,12,20,4,'#567a67',outline,2);
 poly(c,[[-9,-17],[11,-22],[28,-11],[25,18],[10,33],[-9,22]],'#4d7e70',outline,2.5);
 poly(c,[[-12,-22],[8,-27],[24,-16],[21,13],[6,28],[-12,17]],'#92cbb9',outline,2.5);
 poly(c,[[-12,-22],[8,-27],[24,-16],[19,-13],[7,-21],[-7,-17]],'#e7f1c8',null,0);
 poly(c,[[-5,-15],[7,-19],[16,-11],[14,10],[5,19],[-5,11]],'#426f65','#d8edc4',1.5);
 oval(c,5,0,7,10,'#9bded3',outline,1.5);
 oval(c,3,-3,3,5,'#fff1b4',null);
}

// 后半罩体位于猫与车之后；前半罩体在装甲之后，避免屏障被车壳切开。
export function drawEnergyShield(c,game,position=game.player,reduced=false,layer='front') {
 const m=game.weapon().attackKind==='defense'?game.magazines[game.loadout.weapon]:null;
 const se=activeSEShield(game);
 if(!m&&!se)return;
 const vehicleHits=se&&game.seShieldEffects?.vehicle===game.vehicle?game.seShieldEffects.shieldImpacts:null;
 const impacts=vehicleHits?.length?[...(m?.shieldImpacts||[]),...vehicleHits]:m?.shieldImpacts||[];
 const powered=m?.ammo>0||se?.shield>0;
 if(!powered&&!impacts.length)return;
 const {x,y,rx,ry}=energyShieldShape(position,game.vehicle?.active);
 c.save();c.globalAlpha=1;
 if(layer==='back'){
  if(powered){
   // 底部落地椭圆与上方球面共享中心，前后半弧给出罩体深度。
   oval(c,x,y+ry*.7,rx*.76,ry*.2,'#73c4b51a',null);
   c.strokeStyle='#6ab09e80';c.lineWidth=2;c.beginPath();c.ellipse(x,y+ry*.7,rx*.76,ry*.2,0,Math.PI,Math.PI*2);c.stroke();
   c.strokeStyle='#87c8b57a';c.beginPath();c.ellipse(x,y,rx,ry,0,Math.PI,Math.PI*2);c.stroke();
  }
  c.restore();return;
 }
 c.save();c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.clip();
 if(powered){
  // 渐变严格裁剪在罩体路径内，不使用整块白色底板或缩放矩形。
  const glass=c.createRadialGradient(x-rx*.38,y-ry*.45,rx*.08,x+rx*.1,y+ry*.1,rx*1.3);
  glass.addColorStop(0,'#effbc832');glass.addColorStop(.42,'#bde9d009');glass.addColorStop(.78,'#69bca31a');glass.addColorStop(1,'#285e5547');
  c.fillStyle=glass;c.fillRect(x-rx,y-ry,rx*2,ry*2);
  // 低对比纬线和偏置经线沿曲面弯曲，中心保持透明以免遮住驾驶者。
  c.strokeStyle='#b7dfc34d';c.lineWidth=1.3;c.beginPath();c.ellipse(x,y+ry*.2,rx*.97,ry*.24,0,0,Math.PI*2);c.stroke();
  c.beginPath();c.ellipse(x+rx*.12,y,rx*.32,ry*.96,-.14,0,Math.PI*2);c.stroke();
 }
 for(const hit of impacts){
  const t=reduced?.35:1-hit.life/.42,alpha=Math.max(0,Math.min(1,hit.life/.25));
  const px=x+Math.cos(hit.angle)*rx,py=y+Math.sin(hit.angle)*ry;
  c.save();c.translate(px,py);c.rotate(Math.atan2(Math.sin(hit.angle)/ry,Math.cos(hit.angle)/rx));c.globalAlpha=alpha;
  const glow=c.createRadialGradient(-4,0,1,-4,0,30);glow.addColorStop(0,'#fff5bcbb');glow.addColorStop(1,'#b5efd400');
  c.fillStyle=glow;c.fillRect(-35,-35,70,70);
  c.strokeStyle='#fff3b7';c.lineWidth=3;c.beginPath();c.ellipse(0,0,6+t*10,10+t*22,0,0,Math.PI*2);c.stroke();
  c.strokeStyle='#b4ead3';c.lineWidth=1.5;c.beginPath();c.ellipse(-3,0,9+t*14,15+t*28,0,0,Math.PI*2);c.stroke();
  c.restore();
 }
 c.restore();
 if(powered){
  c.strokeStyle='#6cb59fbd';c.lineWidth=2;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.stroke();
  // 上左窄高光和下方前缘分开，避免重新形成扁平的整圈状态条。
  c.strokeStyle='#ebf7cce0';c.lineWidth=3;c.lineCap='round';c.beginPath();c.ellipse(x-1,y-1,rx-3,ry-3,0,Math.PI*1.15,Math.PI*1.67);c.stroke();
  c.strokeStyle='#a8e2bfba';c.lineWidth=2.5;c.beginPath();c.ellipse(x,y+ry*.7,rx*.76,ry*.2,0,0,Math.PI);c.stroke();
 }
 c.restore();
}
