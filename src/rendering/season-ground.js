import { consumeDrawSteps } from './draw-steps.js';
// 四季林缘装饰沿既有树位生成，只进入地面缓存，不创建实体或改变碰撞。
import { forestLayout, pathDistance } from '../world/biomes.js';
import { isWaterScenery } from '../world/river-geometry.js';
import { excludesNaturalScenery } from '../world/natural-terrain.js';
import { COTTAGES, WHEAT_FIELDS, SCENERY, isBeachScenery } from '../world/scenery.js';
import { coversRealmEntrance } from '../world/realm-entrances.js';
import { WORLD } from '../world/coordinates.js';
import { oval } from './primitives.js';
let patches, patchWork;
// 按整个装饰的包围范围避让，不能只检查花茎或落叶中心。
export function seasonalPatchAllowed(x,y) {
  const pad=20;
  if(x<pad||y<pad||x>WORLD.width-pad||y>WORLD.height-pad)return false;
  if(Math.hypot((x-900)/245,(y-830)/240)<1.1)return false;
  if(COTTAGES.some(h=>x>h.x-80*h.size-pad&&x<h.x+80*h.size+pad&&y>h.y-140*h.size-pad&&y<h.y+65))return false;
  if(WHEAT_FIELDS.some(f=>x>f.x-f.width/2-pad&&x<f.x+f.width/2+pad&&y>f.y-60&&y<f.y+(f.rows-1)*12+50))return false;
  if(SCENERY.some(p=>p.kind==='tent'&&Math.abs(x-p.x)<110&&y>p.y-110&&y<p.y+60))return false;
  for(const [dx,dy] of [[0,0],[-pad,-pad],[pad,-pad],[-pad,pad],[pad,pad]]) {
    const px=x+dx,py=y+dy;
    if(pathDistance(px,py)<38||isWaterScenery(px,py)||isBeachScenery(px,py)||excludesNaturalScenery(px,py)||coversRealmEntrance(px,py))return false;
  }
  return true;
}
// 布局只生成一次，季节共享位置，禁止随切换增加树木或消耗战斗随机数。
export function seasonGroundPatches() {
  consumeDrawSteps(prepareSeasonGroundSteps()); // 同步入口不发布未完成布局。
  return patches;
}
// 所有地块共用一次季节布局任务，每棵树让出执行权，临时结果完成后才发布。
function* buildSeasonPatches() {
  const result = [];
  for (const [index, tree] of forestLayout().entries()) {
    for(let n=0;n<5;n++) {
      const a=index*2.399+n*1.71,r=23+(index+n*7)%33;
      const x=tree.x+Math.cos(a)*r,y=tree.y+Math.sin(a)*r*.55+9;
      if(seasonalPatchAllowed(x,y))result.push({x,y,index:index*5+n,conifer:['pine','cypress'].includes(tree.variant)});
    }
    yield;
  }
  patches = result;
}
// 取消某块不取消全局静态布局；下一块接续未完成批次，避免重做整张森林。
export function* prepareSeasonGroundSteps() {
  if (!patches) patchWork ||= buildSeasonPatches();
  while (!patches) { patchWork.next(); yield; }
  patchWork = null;
}
// 粉白花只有少量两朵一簇，大小仍低于脚踝，花心降低对比。
function flowers(c,x,y,index) {
  for(const [dx,dy] of [[-5,0],[6,-4]]) {
    oval(c,x+dx,y+dy+3,5,2,'#79a268');
    for(let p=0;p<5;p++)oval(c,x+dx+Math.cos(p*1.256)*2.9,y+dy+Math.sin(p*1.256)*2,2.5,1.8,index%2?'#efc6ba':'#faf0d3');
    oval(c,x+dx,y+dy,1.3,1.1,'#cfab62');
  }
}
// 低蕨草在原林缘加厚叶层，不放大树冠或铺满开放草场。
function foliage(c,x,y,index) {
  oval(c,x,y+2,15,5,'#518b5c20');
  for(let n=-2;n<=2;n++) {
    c.beginPath();c.moveTo(x,y+2);c.quadraticCurveTo(x+n*8,y-11,x+n*5,y-14+Math.abs(n)*3);
    c.quadraticCurveTo(x+n*2,y-4,x,y+2);c.fillStyle=n%2?'#7db36b':'#52945c';c.fill();
  }
  oval(c,x-4,y-3,3.5,1.5,index%2?'#a6cb7d':'#87bb6b');
}
// 秋叶是贴地的尖叶轮廓和短叶脉，方向错落，低对比底色不形成整圈。
function leaves(c,x,y,index) {
  for(let n=0;n<4;n++) {
    const dx=((index*7+n*11)%27)-13,dy=((index*3+n*7)%15)-7;
    c.save();c.translate(x+dx,y+dy);c.rotate(index*.7+n*1.9);
    c.beginPath();c.moveTo(-5,0);c.quadraticCurveTo(-1,-4,5,0);c.quadraticCurveTo(1,3,-5,0);
    c.fillStyle=['#c7a267','#d8b66c','#ba8957'][n%3];c.fill();
    c.strokeStyle='#97774b70';c.lineWidth=.7;c.beginPath();c.moveTo(-3,0);c.lineTo(4,0);c.stroke();c.restore();
  }
}
// 冬季完全跳过，保持原雪地像素；夜色由所属地块统一转换。
export function drawSeasonGround(c,view,season) {
  if(!['spring','summer','autumn'].includes(season))return;
  for(const p of seasonGroundPatches()) {
    if(view&&(p.x<view.x-20||p.x>view.x+view.w+20||p.y<view.y-20||p.y>view.y+view.h+20))continue;
    if(season==='spring'&&p.index%4===0)flowers(c,p.x,p.y,p.index);
    if(season==='summer'&&p.index%2===0)foliage(c,p.x,p.y,p.index);
    if(season==='autumn'&&!p.conifer)leaves(c,p.x,p.y,p.index);
  }
}
