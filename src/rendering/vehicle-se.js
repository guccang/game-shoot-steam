// SE 世界提示使用真实中心和范围；不修改车体、履带或炮塔动作。
import {seActive,seBuild} from '../config/vehicle-se.js';
import {nearest} from '../world/coordinates.js';
// 地面巡战边界仅描边，护罩按剩余容量显示弧线，不遮挡敌方预警。
export function drawVehicleSE(c,g){if(g.cottage||!g.vehicle.active)return;const s=g.seControl;c.save();
 if(s?.mode==='combat'&&s.mapId===g.mapId){const p=nearest(s.anchor,g.player);c.strokeStyle='#a5d6b9';c.lineWidth=2;c.setLineDash([10,8]);c.beginPath();c.arc(p.x,p.y,s.radius,0,Math.PI*2);c.stroke();c.setLineDash([]);c.fillStyle='#f8edc7';c.font='13px sans-serif';c.textAlign='center';c.fillText('SE巡战 · '+s.radius+'米',p.x,p.y-s.radius+20);}
 if(seActive(g,'shield')){const b=seBuild(g.progress,g.vehicle.index),p=g.player;c.strokeStyle='#a4dacd';c.globalAlpha=.35+b.shield/180*.45;c.lineWidth=g.seShieldFlash>0?5:2;c.beginPath();c.ellipse(p.x,p.y-18,55,43,0,-Math.PI/2,-Math.PI/2+Math.PI*2*b.shield/180);c.stroke();}
 if(s){c.globalAlpha=1;c.fillStyle='#f8edc7';c.font='12px sans-serif';c.textAlign='center';c.fillText(s.mode==='combat'?'SE巡战':'SE自动驾驶',g.player.x,g.player.y+60);}c.restore();}
