import { drawCozyCottageSnow } from './cozy-cottage.js';
// 雪后地表和受雪顶面：只改变绘制，不新增地形阻挡或逐帧雪粒子。
import { WORLD } from '../world/coordinates.js';
// 与地表一致的稳定噪声，使每块雪坡不受战斗随机数影响。
function terrainNoise(x,y) { const n=Math.sin(x*12.9898+y*78.233)*43758.5453; return n-Math.floor(n); }


// 不规则雪檐由暖白亮面与蓝灰底边组成，少量下垂体现积雪厚度。
export function snowCap(c, x, y, rx, ry, color = (hex) => hex) {
  c.save(); c.translate(x, y);
  c.beginPath(); c.moveTo(-rx, 0);
  c.bezierCurveTo(-rx*.9,-ry*.7,-rx*.42,-ry*.7,-rx*.2,-ry);
  c.bezierCurveTo(rx*.25,-ry*1.14,rx*.78,-ry*.64,rx,0);
  c.quadraticCurveTo(rx*1.04,ry*.5,rx*.66,ry*.32);
  c.quadraticCurveTo(rx*.47,ry*.92,rx*.23,ry*.45);
  c.quadraticCurveTo(-rx*.03,ry*.68,-rx*.25,ry*.32);
  c.quadraticCurveTo(-rx*.65,ry*.65,-rx,0); c.closePath();
  c.fillStyle=color('#c1d5d8'); c.fill();
  c.save(); c.clip();
  c.fillStyle=color('#f1f5eb'); c.beginPath();
  c.ellipse(-rx*.12,-ry*.38,rx*1.04,ry*.84,0,0,Math.PI*2);c.fill(); c.restore();
  c.restore();
}

// 大面积雪毯保持原区的少量色温，稀疏起伏均可跨缓存块重现，不产生新碰撞。
export function drawWinterMeadow(c, view) {
  c.fillStyle='#e1eae1ed'; c.fillRect(0,0,WORLD.width,WORLD.height);
  for(let y=75;y<WORLD.height;y+=210)for(let x=50;x<WORLD.width;x+=260) {
    const px=x+terrainNoise(x,y)*100, py=y+terrainNoise(y,x)*80;
    if(view&&(px+150<view.x||px-150>view.x+view.w||py+55<view.y||py-55>view.y+view.h))continue;
    c.save();c.translate(px,py);c.rotate((terrainNoise(x,y)-.5)*.5);
    c.beginPath();c.moveTo(-140,0);
    c.bezierCurveTo(-90,-35,-45,-16,0,-29);c.bezierCurveTo(70,-47,124,-12,142,3);
    c.bezierCurveTo(74,23,48,5,-4,20);c.bezierCurveTo(-70,31,-108,13,-140,0);
    c.fillStyle=terrainNoise(y,x)>.5?'#f4f6ed8c':'#b9d1cf38';c.fill();c.restore();
  }
}

// 不对称的低雪坡留出融雪凹口，亮面与弱接触影连续接回地表。
export function snowDrift(c,x,y,rx,ry,color=(hex)=>hex) {
  c.save();c.translate(x,y);
  c.beginPath();c.moveTo(-rx,0);
  c.bezierCurveTo(-rx*.85,-ry,-rx*.3,-ry*.85,-rx*.15,-ry*.5);
  c.quadraticCurveTo(rx*.5,-ry*1.25,rx,ry*.05);
  c.bezierCurveTo(rx*.45,ry*.65,rx*.15,ry*.25,-rx*.06,ry*.42);
  c.quadraticCurveTo(-rx*.6,ry*.72,-rx,0);c.closePath();
  c.fillStyle=color('#d1dfdc');c.fill();
  c.save();c.clip();c.beginPath();c.ellipse(-rx*.12,-ry*.35,rx*.93,ry*.83,0,0,Math.PI*2);
  c.fillStyle=color('#edf2e9');c.fill();c.restore();c.restore();
}

// 冬季花丛只保留少量枯茎，降低主体颜色和密度，不额外占用活动面。
export function winterPlant(c) {
  snowDrift(c,0,2,20,5);
  c.lineWidth=1.4;c.strokeStyle='#88927c';c.beginPath();
  c.moveTo(-6,1);c.quadraticCurveTo(-8,-5,-5,-10);c.moveTo(5,1);c.lineTo(7,-6);c.stroke();
}

// 屋顶、麦穗和低矮摆件的薄雪贴合已有顶面，保留材质与前后遮挡。
export function drawScenerySnow(c, item) {
  if(item.kind==='cottage') {
    drawCozyCottageSnow(c,item.homeFloors);
  } else if(item.kind==='fence') {
    for(const [x,y] of [[-42,-41],[0,-37],[42,-39]])snowCap(c,x,y,7,3);
  } else if(item.kind==='stones') {
    snowCap(c,-5,-25,12,5);snowCap(c,16,-11,7,3);
  } else if(item.kind==='logs') snowCap(c,-3,-33,16,4);
  else if(item.kind==='flowers') snowCap(c,2,1,22,3);
  else if(item.kind==='fern'||item.kind==='mushrooms') snowCap(c,-8,-10,8,3);
  else if(item.kind==='driftwood') snowCap(c,2,-15,22,3);
}
