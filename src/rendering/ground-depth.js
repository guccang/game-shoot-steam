// 草地层次复用小型昼夜纹理；世界锚定的草簇和路肩不随镜头游动。
import {createRenderCanvas} from './canvas-recovery.js';
import {nightColor} from './river.js';
import {SCENE_DEPTH as D} from '../config/scene-depth.js';
let tiles=null,seasonKey=null;

// 草根短影、背光叶和亮尖组成一个小草簇，有限平涂保持手机上的干净轮廓。
export function drawGrassClump(c,x,y,seed=0,color=hex=>hex){
 const w=5+(seed%3);c.save();c.translate(x,y);
 c.fillStyle=color('#486d4930');c.beginPath();c.ellipse(2,2,w,1.8,0,0,Math.PI*2);c.fill();
 c.strokeStyle=color('#6d9159');c.lineWidth=1.8;c.lineCap='round';c.beginPath();c.moveTo(-3,1);c.quadraticCurveTo(-5,-2,-5,-4);c.moveTo(0,1);c.quadraticCurveTo(-1,-3,1,-7);c.moveTo(3,1);c.quadraticCurveTo(3,-2,6,-4);c.stroke();
 c.strokeStyle=color('#bdd48c');c.lineWidth=1;c.beginPath();c.moveTo(-5,-4);c.lineTo(-4,-2);c.moveTo(1,-7);c.lineTo(0,-4);c.stroke();c.restore();
}
// 连续的低频草色与稀疏草簇烘焙为小瓦片，边缘镜像保证重复处不出现接缝。
function buildGrassTile(night,season){
 const canvas=createRenderCanvas(),size=D.grassTile;canvas.width=canvas.height=size;const c=canvas.getContext('2d'),color=hex=>nightColor(hex,night),winter=season==='winter';
 c.fillStyle=color(winter?'#dce4d0':season==='autumn'?'#c5c18a':'#b9cd8c');c.fillRect(0,0,size,size);
 for(let i=0;i<8;i++)for(const ox of [-size,0,size])for(const oy of [-size,0,size]){
  const x=(i*97+13)%size+ox,y=(i*61+41)%size+oy;c.fillStyle=color(winter?'#a8beb21c':i%2?'#648b5e15':'#e8e9a620');c.beginPath();c.ellipse(x,y,48+i%3*18,15+i%4*5,-.25,0,Math.PI*2);c.fill();
 }
 if(!winter)for(let i=0;i<23;i++){const x=(i*97+17)%size,y=(i*53+11)%size;for(const ox of [-size,0,size])for(const oy of [-size,0,size])drawGrassClump(c,x+ox,y+oy,i,hex=>color(hex));}
 return canvas;
}
// 地契边界采用分段透明过渡；内部仍覆盖旧路，避免搬迁后留下旧路网。
export function drawCampGrass(c,rect,night,season='summer'){
 if(!tiles||seasonKey!==season){if(tiles)for(const t of tiles)t.width=t.height=1;tiles=[buildGrassTile(0,season),buildGrassTile(1,season)];seasonKey=season;}
 c.save();const alpha=c.globalAlpha;
 for(let i=0;i<2;i++){const weight=i?night:1;if(weight<=0)continue;c.fillStyle=c.createPattern(tiles[i],'repeat');c.globalAlpha=alpha*weight;c.fillRect(rect.x,rect.y,rect.w,rect.h);
  // 外缘薄色带只过渡材质，不增加高度、碰撞或道路阻塞。
  for(let j=1;j<=3;j++){const edge=j*3;c.globalAlpha=alpha*weight*(4-j)*.12;c.fillRect(rect.x-edge,rect.y-edge,rect.w+edge*2,3);c.fillRect(rect.x-edge,rect.y+rect.h+edge-3,rect.w+edge*2,3);c.fillRect(rect.x-edge,rect.y,3,rect.h);c.fillRect(rect.x+rect.w+edge-3,rect.y,3,rect.h);}
 }c.restore();
}
// 工作台统计常驻的两张小瓦片，季节更换会释放上一组。
export function groundDepthStats(){return {grassBytes:tiles?tiles.reduce((n,t)=>n+t.width*t.height*4,0):0};}
