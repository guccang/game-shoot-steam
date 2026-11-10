import {pathChunks,pathChunkVisible} from '../world/path-chunks.js';
// 附近示意图读取正式地形与对象，分别按当前屏幕宽高投影，周期边界不跳图。
import {LOCAL_MINIMAP as M} from '../config/local-minimap.js';
import {nearest,canonical} from '../world/coordinates.js';
import {NATURAL_TERRAIN} from '../world/natural-terrain.js';
import {JIUZHAIGOU_TERRAIN,JIUZHAIGOU_PATHS} from '../world/jiuzhaigou.js';
import {PATHS} from '../world/paths.js';
import {riverXAt,riverHalfWidth,BRIDGES} from '../world/river-geometry.js';
import {treeGrid} from '../world/spatial-grid.js';
import {CLICK_BUILDINGS} from '../config/scene-approach.js';
import {parkedOwned} from '../core/vehicles/camp-parking.js';
import {canvasFont} from './text-style.js';

// 猫猫居中，外框恰好是当前视野宽高的两倍，不固定世界距离。
export function localMinimapBounds(player,view){const w=view.w*M.range,h=view.h*M.range;return {x:player.x-w/2,y:player.y-h/2,w,h};}
// 任意对象先取最近镜像再投影，跨接缝的车与站牌仍在正确一侧。
export function localMinimapPoint(point,player,bounds){const p=nearest(Array.isArray(point)?{x:point[0],y:point[1]}:point,player);return {x:(p.x-bounds.x)/bounds.w,y:(p.y-bounds.y)/bounds.h};}
// 绘制只处理小地图附近对象；颜色降低对比，让实时玩家与危险标记优先可读。
export function drawLocalMinimap(c,g,view,night=false){
 const size=M.pixels,b=localMinimapBounds(g.player,view),at=p=>{const q=localMinimapPoint(p,g.player,b);return {x:q.x*size,y:q.y*size};},visible=p=>p.x>=-4&&p.x<=size+4&&p.y>=-4&&p.y<=size+4;
 c.clearRect(0,0,size,size);c.fillStyle=night?'#8d9e80':'#cddba0';c.fillRect(0,0,size,size);c.save();c.beginPath();c.rect(0,0,size,size);c.clip();
 // 大湖按真实轮廓裁剪，中心在屏外也能显示岸线。
 const terrain=g.mapId==='jiuzhaigou'?JIUZHAIGOU_TERRAIN:NATURAL_TERRAIN;
 for(const s of [...terrain.mountains,...terrain.lakes,...(terrain.earth||[])]){const p=nearest(s,g.player),r=s.bounds;if(p.x+r.x>b.x+b.w||p.x+r.x+r.w<b.x||p.y+r.y>b.y+b.h||p.y+r.y+r.h<b.y)continue;c.beginPath();for(const [i,q]of s.outline.entries()){const x=(p.x+q.x-b.x)/b.w*size,y=(p.y+q.y-b.y)/b.h*size;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fillStyle=s.earth?(s.kind==='rift'?'#56594d':s.color):['lake','water','fall'].includes(s.kind)?night?'#608e99':'#72bec6':night?'#778374':'#9ca78c';c.fill();}
 if(g.mapId==='forest'){
  const left=[],right=[];for(let y=b.y-40;y<=b.y+b.h+40;y+=40){const cy=canonical({x:0,y}).y,rx=nearest({x:riverXAt(cy),y},g.player).x;left.push({x:(rx-riverHalfWidth(cy,-1)-b.x)/b.w*size,y:(y-b.y)/b.h*size});right.push({x:(rx+riverHalfWidth(cy,1)-b.x)/b.w*size,y:(y-b.y)/b.h*size});}c.beginPath();[...left,...right.reverse()].forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=night?'#608e99':'#72bec6';c.fill();
 }
 c.strokeStyle=night?'#c1bc94':'#eada9e';c.lineWidth=4;c.lineCap='round';
 for(const path of g.mapId==='jiuzhaigou'?JIUZHAIGOU_PATHS:PATHS){c.beginPath();for(const chunk of pathChunks(path)){if(!pathChunkVisible(chunk,g.player,b))continue;for(let i=chunk.start;i<chunk.end;i++){const a=at(path[i-1]),z=at(path[i]);if(Math.abs(a.x-z.x)>size*2||Math.abs(a.y-z.y)>size*2||Math.max(a.x,z.x)<0||Math.min(a.x,z.x)>size||Math.max(a.y,z.y)<0||Math.min(a.y,z.y)>size)continue;c.moveTo(a.x,a.y);c.lineTo(z.x,z.y);}}c.stroke();}
 if(g.mapId==='forest')for(const bridge of BRIDGES){const p=at(bridge);c.fillStyle='#bc9d69';c.fillRect(p.x,p.y,bridge.width/b.w*size,bridge.height/b.h*size);}
 c.fillStyle=night?'#476b55':'#729769';let trees=0;
 for(const t of treeGrid(g.trees||[]).query(b.x,b.y,b.x+b.w,b.y+b.h,30)){if(t.hp<=0)continue;const p=at(t);if(!visible(p))continue;c.beginPath();c.arc(p.x,p.y,2.3,0,Math.PI*2);c.fill();trees++;}
 if(g.mapId==='forest')for(const building of CLICK_BUILDINGS){const p=at(building.site);if(!visible(p))continue;c.fillStyle='#a8895f';c.strokeStyle='#496650';c.lineWidth=1;c.fillRect(p.x-5,p.y-7,10,8);c.strokeRect(p.x-5,p.y-7,10,8);}
 // 怪物、车、站点分别用点、圆和方形，避免仅凭颜色区分。
 let enemies=0;for(const enemy of [...g.enemies,...(g.boss?[g.boss]:[])]){if(enemy.hp<=0)continue;const p=at(enemy);if(!visible(p))continue;c.fillStyle='#b85d46';c.beginPath();c.arc(p.x,p.y,enemy===g.boss?5:3,0,Math.PI*2);c.fill();enemies++;}
 for(const v of parkedOwned(g)){const p=at(v);if(!visible(p))continue;c.strokeStyle='#315b62';c.fillStyle='#d4e2d5';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,4,0,Math.PI*2);c.fill();c.stroke();}
 if(g.mapId==='forest')for(const s of g.progress.waystations?.sites||[]){const p=at(s);if(!visible(p))continue;c.fillStyle='#eac670';c.strokeStyle='#365b46';c.fillRect(p.x-4,p.y-4,8,8);c.strokeRect(p.x-4,p.y-4,8,8);}
 c.strokeStyle='#fff6dcaa';c.lineWidth=2;c.setLineDash([5,4]);c.strokeRect(size/4,size/4,size/2,size/2);c.setLineDash([]);
 c.save();c.translate(size/2,size/2);c.rotate((g.player.angle||0)+Math.PI/2);c.beginPath();c.moveTo(0,-8);c.lineTo(6,6);c.lineTo(0,3);c.lineTo(-6,6);c.closePath();c.fillStyle='#fff6dc';c.strokeStyle='#315c43';c.lineWidth=2;c.fill();c.stroke();c.restore();
 c.fillStyle='#315c43';c.font=canvasFont(17);c.textAlign='center';c.fillText('北',size/2,20);c.restore();return {bounds:b,trees,enemies,bytes:size*size*4};
}
