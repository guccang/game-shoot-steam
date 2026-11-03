import {createMineSurfaceCache,mineSurfaceContours} from '../world/mine-surface-cache.js';
// 连续地下地貌：复用地表的湿岸、浅滩、岩床和分层水色，不再逐格贴地板。
import {mineSurfaceField} from '../world/mine-surface.js';
import {mineCell,minePoint} from '../config/mining.js';
import {mineTerrain,mineHash,mineInsideBounds} from '../config/mine-ecology.js';
import {oval,poly} from './primitives.js';
import {shoreStone} from './shore-art.js';
const caches=new WeakMap();
// 抵消三角面内部边后填充真实轮廓，保持原开口与孔洞，降低每帧填充和裁切成本。
function surfacePath(polygons){const path=new Path2D();for(const points of mineSurfaceContours(polygons)){path.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))path.lineTo(p.x,p.y);path.closePath();}return path;}
// 短段只表示岸边，不把三角网格内部边缘画出来。
function edgePath(edges){const path=new Path2D();for(const [a,b] of edges){path.moveTo(a.x,a.y);path.lineTo(b.x,b.y);}return path;}
// 每个绘制器保留有界分块路径，跨格只合并路径，不重建整个视口的三角面。
function geometry(renderer,layer,first,last){
 let cache=caches.get(renderer);if(!cache){cache={chunks:createMineSurfaceCache(mesh=>({open:surfacePath(mesh.open),water:surfacePath(mesh.water),walls:edgePath(mesh.walls),shores:edgePath(mesh.shores)}))};caches.set(renderer,cache);}
 const p=minePoint(first),q=minePoint(last),sample=cache.chunks.sample(layer,{x:p.x-64,y:p.y-64,w:q.x-p.x+128,h:q.y-p.y+128});
 if(!cache.items||cache.items.length!==sample.items.length||sample.items.some((item,i)=>item!==cache.items[i])){
  const value={open:new Path2D(),water:new Path2D(),walls:new Path2D(),shores:new Path2D(),rect:sample.rect,nodes:0,edges:0};
  for(const chunk of sample.items){for(const kind of ['open','water','walls','shores'])value[kind].addPath(chunk.value[kind]);value.nodes+=chunk.nodes;value.edges+=chunk.edges;}
  cache.items=sample.items;cache.value=value;
 }
 Object.assign(cache.value,{chunkCaches:sample.cached,chunkRebuilds:sample.rebuilt,totalChunkBuilds:sample.builds});return cache.value;
}
// 与地表草坡相同的中点曲线，宽窄变化由世界种子决定而非镜头随机。
function patch(c,x,y,rx,ry,seed,color){
 const points=Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,r=1+Math.sin(i*2.1+seed)*.13;return {x:x+Math.cos(a)*rx*r,y:y+Math.sin(a)*ry*r};});
 c.beginPath();const first=points[0],last=points.at(-1);c.moveTo((first.x+last.x)/2,(first.y+last.y)/2);
 points.forEach((p,i)=>{const n=points[(i+1)%points.length];c.quadraticCurveTo(p.x,p.y,(p.x+n.x)/2,(p.y+n.y)/2);});c.closePath();c.fillStyle=color;c.fill();
}
// 岩面裂隙与嵌矿呈稀疏成组分布，真实矿格仍由原开采规则结算。
function rockBed(c,layer,first,last,night){
 const a=minePoint(first),b=minePoint(last);c.fillStyle=night?'#526958':'#8d997e';c.fillRect(a.x-80,a.y-80,b.x-a.x+160,b.y-a.y+160);
 for(let y=first.y;y<=last.y;y++)for(let x=first.x;x<=last.x;x++){const h=mineHash(x,y,layer.seed),p=minePoint({x,y});if(h%13===0){c.strokeStyle=night?'#6f8065':'#aab597';c.lineWidth=1.8;c.beginPath();c.moveTo(p.x-25,p.y+8);c.bezierCurveTo(p.x-14,p.y-3,p.x+9,p.y+2,p.x+27,p.y-12);c.stroke();}if(mineInsideBounds(layer,p.x,p.y)&&(h>>>10)%17===0){for(let i=0;i<3;i++){const xx=p.x-12+i*10,yy=p.y+(i%2)*7;poly(c,[[xx-5,yy],[xx-2,yy-10],[xx+4,yy-15],[xx+9,yy-5],[xx+5,yy+3]],i===1?'#bdcbb0':'#d0b47f','#5c7155',1.4);}}}
}
// 自然地面按生态组铺草坡、土壤和岩床，轮廓与格子边界无关。
function meadows(c,layer,first,last,night){
 for(let y=Math.floor((first.y-4)/7);y<=Math.ceil((last.y+4)/7);y++)for(let x=Math.floor((first.x-4)/7);x<=Math.ceil((last.x+4)/7);x++){
  const cell={x:x*7+1,y:y*7+1},p=minePoint(cell),t=mineTerrain(cell,layer),h=mineHash(x,y,layer.seed);
  patch(c,p.x-20+(h%37),p.y+13,257,218,h,night?t.biome.night:t.biome.floor);
  c.save();c.globalAlpha=.18;patch(c,p.x-42,p.y-25,164,142,h+2,night?'#adc19c':'#e1dfaf');c.restore();
 }
}
// 岸石复用正式地表石块；湿岸草叶仅在干燥开放地面出现，避免漂在水上。
function shoreDetails(c,layer,first,last,night,time){
 let stones=0;for(let y=first.y;y<=last.y;y++)for(let x=first.x;x<=last.x;x++){
  const h=mineHash(x,y,layer.seed);if(h%2!==0)continue;const p=minePoint({x,y}),xx=p.x-24+(h>>>8)%48,yy=p.y-24+(h>>>16)%48,s=mineSurfaceField(layer,xx,yy);
  if(s.open<.7||s.water>.42||s.water<.006)continue;
  shoreStone(c,xx,yy,.7+(h%5)*.12);stones++;
  for(let i=0;i<3;i++){const sway=Math.sin(time*1.1+i+h)*1.8;c.strokeStyle=night?'#98b18a':'#698a51';c.lineWidth=2;c.beginPath();c.moveTo(xx+12+i*4,yy+3);c.quadraticCurveTo(xx+9+i*5+sway,yy-6,xx+13+i*5+sway,yy-12-i%2*7);c.stroke();}
 }return stones;
}
// 水流沿世界坐标连续推进，湖面使用缓慢涟漪，温泉气泡和雾汽独立运行。
function waterMotion(c,layer,mesh,night,time){
 const r=mesh.rect;let waves=0;c.save();c.clip(mesh.water);c.lineCap='round';
 for(let y=Math.floor(r.y/64);y<=Math.ceil((r.y+r.h)/64);y++)for(let x=Math.floor(r.x/86);x<=Math.ceil((r.x+r.w)/86);x++){
  const h=mineHash(x,y,layer.seed),xx=x*86+(h%45),yy=y*64+(h>>>8)%37,field=mineSurfaceField(layer,xx,yy);if(field.water<.55)continue;
  const t=mineTerrain(mineCell({x:xx,y:yy}),layer),flow=t.biome.id==='river',phase=(time*(flow?.22:.08)+(h%100)/100)%1,drift=flow?phase*44-22:Math.sin(time*.7+h)*4,alpha=Math.sin(phase*Math.PI)*.66;
  c.globalAlpha=alpha;c.strokeStyle=night?'#b3d6bd':'#e2efcf';c.lineWidth=1.5;c.beginPath();c.moveTo(xx-20,yy+drift);c.bezierCurveTo(xx-8,yy+drift+5,xx+6,yy+drift+4,xx+20,yy+drift-1);c.stroke();waves++;
  if(!flow&&h%3===0){c.globalAlpha=(1-phase)*.35;c.beginPath();c.ellipse(xx+17,yy+16,4+phase*17,2+phase*6,0,0,Math.PI*2);c.stroke();}
  if(t.biome.id==='spring'){c.globalAlpha=.45*(1-phase);oval(c,xx,yy-phase*16,2+phase*3,1+phase*2,night?'#d4e4c3':'#e8efd5');}
 }
 c.restore();return waves;
}
// 地形静态形体与动态水流分层；桥梁和铁路稍后按真实施工格绘制。
export function drawMineLandscapeGround(renderer,layer,first,last,night,time){
 const c=renderer.c,mesh=geometry(renderer,layer,first,last);rockBed(c,layer,first,last,night);
 c.lineJoin='round';c.lineCap='round';c.strokeStyle=night?'#304d43':'#5b755b';c.lineWidth=19;c.stroke(mesh.walls);c.strokeStyle=night?'#889a7a':'#c2c5a0';c.lineWidth=5;c.stroke(mesh.walls);
 c.fillStyle=night?'#728568':'#b0ba8c';c.fill(mesh.open);c.save();c.clip(mesh.open);meadows(c,layer,first,last,night);
 c.strokeStyle=night?'#48664f':'#8ba16e';c.lineWidth=36;c.stroke(mesh.shores);c.strokeStyle=night?'#9b9a75':'#c8b985';c.lineWidth=24;c.stroke(mesh.shores);c.strokeStyle=night?'#b2ac83':'#e3cfa0';c.lineWidth=12;c.stroke(mesh.shores);
 c.fillStyle=night?'#427f87':'#52a4b5';c.fill(mesh.water);c.save();c.clip(mesh.water);
 c.strokeStyle=night?'#659f9c':'#86c3b6';c.lineWidth=30;c.stroke(mesh.shores);c.strokeStyle=night?'#9dc3ab':'#c2d9b7';c.lineWidth=9;c.stroke(mesh.shores);
 // 深水色块轻微偏移，沿用地表湖泊的有限层次，不使用重渐变。
 c.globalAlpha=.14;for(let y=Math.floor(first.y/3)*3;y<=last.y+3;y+=3)for(let x=Math.floor(first.x/4)*4;x<=last.x+4;x+=4){const p=minePoint({x,y});patch(c,p.x-28,p.y+14,94,48,x+y,night?'#245c70':'#287e9c');}c.restore();
 const waves=waterMotion(c,layer,mesh,night,time),stones=shoreDetails(c,layer,first,last,night,time);c.restore();
 renderer.mineLandscapeReview={designCriterion:'underground-landscape-quality',continuous:true,sharedCollision:true,nodes:mesh.nodes,edges:mesh.edges,waves,stones,animationTime:time,newBitmapBytes:0,geometryCaches:1,chunkCaches:mesh.chunkCaches,chunkRebuilds:mesh.chunkRebuilds,totalChunkBuilds:mesh.totalChunkBuilds};
}
