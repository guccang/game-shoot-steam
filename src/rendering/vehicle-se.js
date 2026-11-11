// SE 世界提示使用真实中心和范围；不修改车体、履带或炮塔动作。
import {nearest} from '../world/coordinates.js';
// 地面巡战边界仅描边，不遮挡敌方预警。
export function drawVehicleSE(c,g){if(g.cottage||!g.vehicle.active)return;const s=g.seControl;c.save();
 if(s?.mode==='combat'&&s.mapId===g.mapId){const p=nearest(s.anchor,g.player);c.strokeStyle='#a5d6b9';c.lineWidth=2;c.setLineDash([10,8]);c.beginPath();c.arc(p.x,p.y,s.radius,0,Math.PI*2);c.stroke();c.setLineDash([]);c.fillStyle='#f8edc7';c.font='13px sans-serif';c.textAlign='center';c.fillText('SE巡战 · '+s.radius+'米',p.x,p.y-s.radius+20);}
 if(s){c.globalAlpha=1;c.fillStyle='#f8edc7';c.font='12px sans-serif';c.textAlign='center';c.fillText(s.mode==='combat'?'SE巡战':'SE自动驾驶',g.player.x,g.player.y+60);}c.restore();}
