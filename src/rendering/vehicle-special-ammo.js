// 真实持续伤害区域使用不同局部轮廓，低动态只停止波动、不隐藏范围。
import {SPECIAL_AMMO} from '../config/vehicle-special-ammo.js';
import {nearest} from '../world/coordinates.js';
export function drawSpecialAmmoZones(c,game,reduced=false){
 for(const z of game.specialAmmoZones||[]){const p=nearest(z,game.player),r=SPECIAL_AMMO[z.key],age=z.lifetime-z.life;c.save();c.translate(p.x,p.y);c.strokeStyle=r.color;c.fillStyle=r.color;c.globalAlpha=Math.min(.22,z.life*.3);c.beginPath();c.ellipse(0,0,z.radius,z.radius,0,0,Math.PI*2);c.fill();c.globalAlpha=Math.min(.8,z.life);c.lineWidth=2;c.stroke();
 for(let i=0;i<8;i++){const a=i*Math.PI/4,d=z.radius*.65,x=Math.cos(a)*d,y=Math.sin(a)*d,phase=reduced?0:Math.sin(age*4+i)*5;c.beginPath();if(z.key==='frost'){c.moveTo(x-5,y);c.lineTo(x,y-17);c.lineTo(x+5,y);c.closePath();}else if(z.key==='flame'){c.moveTo(x-7,y);c.quadraticCurveTo(x-9,y-10,x+phase,y-24);c.quadraticCurveTo(x+9,y-8,x+7,y);c.closePath();}else if(z.key==='gas'){c.ellipse(x,y-7+phase,15,9,0,0,Math.PI*2);}else{c.moveTo(x-6,y-6);c.lineTo(x+6,y+6);}c.fill();c.stroke();}c.restore();}
}
