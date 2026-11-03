// 正式矿轨绘制：先统一铺枕木，再画连续钢轨与接缝，避免每个方向相互叠盖。
import {MINE_DIRECTIONS,mineKey,minePoint} from '../config/mining.js';
import {mineRailShape} from './mine-rail-shapes.js';
import {box,oval,poly} from './primitives.js';
// 当前四邻直接决定连接，不缓存地块状态；铺设或拆除邻轨后下一帧立即换形。
export function mineRailMask(cell,layer){return MINE_DIRECTIONS.reduce((mask,d,i)=>layer.rails[mineKey({x:cell.x+d.x,y:cell.y+d.y})]?mask|(1<<i):mask,0);}
// 所有路径使用同一绘制批次，金属面覆盖统一轮廓，端点不重复加圆头。
function strokeRails(c,paths,color,width,offset=0){c.beginPath();for(const points of paths){c.moveTo(points[0].x+offset,points[0].y+offset);for(const p of points.slice(1))c.lineTo(p.x+offset,p.y+offset);}c.strokeStyle=color;c.lineWidth=width;c.stroke();}
// 每根枕木只出现一次，弯轨枕木绕自己的固定中心作径向排列。
function sleeper(c,p,night){c.save();c.translate(p.x,p.y);c.rotate(p.angle);box(c,-3,-17,6,34,1.4,night?'#97845f':'#b3986c','#4a6248',1.2);box(c,-2,-16,1.3,32,.5,night?'#b4a279':'#dcc293');for(const y of [-13,13])oval(c,0,y,1,1,'#51664d');c.restore();}
// 格心锚点与轨距沿用原版；三岔岔心、十字轮缘槽和方向箭头均低于人物矿车。
export function drawMineRail(c,cell,layer,night=false){
 const shape=mineRailShape(mineRailMask(cell,layer)),p=minePoint(cell);c.save();c.translate(p.x,p.y);
 for(const tie of shape.sleepers)sleeper(c,tie,night);
 c.lineCap='butt';c.lineJoin='round';strokeRails(c,shape.paths,'#45624c',6);strokeRails(c,shape.paths,night?'#a5b49d':'#c6d0b5',3.8);strokeRails(c,shape.paths,night?'#ced3ad':'#f1ebc7',1,-.6);
 if(shape.stop){c.save();c.translate(shape.stop.x,shape.stop.y);c.rotate(shape.stop.angle);box(c,-3,-15,6,30,1.4,night?'#a49168':'#cfb27c','#47644b',1.5);c.restore();}
 const direction=layer.junctions?.[mineKey(cell)];if(shape.exits.length>=3&&shape.exits.includes(direction)){c.save();c.rotate(direction*Math.PI/2-Math.PI/2);poly(c,[[-12,-4],[2,-4],[2,-9],[14,0],[2,9],[2,4],[-12,4]],'#f1d99f','#315c43',2);c.restore();}
 c.restore();return shape.kind;
}
