// 区域地图与实景地块使用同一张低分辨率底色，树、草花与道路仍按世界尺寸绘制。
import {WORLD} from '../world/coordinates.js';
import {forestHabitat,oldForestInfluence} from '../world/forest-habitats.js';
import {forestCoverAt} from '../world/forest-cover.js';
import {createRenderCanvas,canvasRecoveryRevision} from './canvas-recovery.js';

let field,revision;
// 带一圈环面采样边，双线性放大后南北和东西接缝都延续对侧的颜色。
function groundField(){
  const step=200,w=WORLD.width/step,h=WORLD.height/step;
  const canvas=createRenderCanvas();canvas.width=w+2;canvas.height=h+2;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(canvas.width,canvas.height);
  for(let j=0;j<canvas.height;j++)for(let i=0;i<canvas.width;i++){
    const x=(i-.5)*step,y=(j-.5)*step,tint=[0,0,0];
    forestHabitat(x,y,tint);
    const cover=forestCoverAt(x,y);
    if(cover==='meadow')tint.splice(0,3,207,217,148);
    else if(cover==='other')tint.splice(0,3,181,186,145);
    else if(cover==='forest'&&forestHabitat(x,y).dominant.id==='meadow')tint.splice(0,3,141,174,126);
    const offset=4*(j*canvas.width+i);
    image.data.set(tint,offset);
    image.data[offset+3]=Math.round(245*(1-oldForestInfluence(x,y)*.3));
  }
  ctx.putImageData(image,0,0);
  return canvas;
}

// 冬季在雪面保留浅色分区，其余季节在道路与植被之下铺设完整地色。
export function drawHabitatGround(c,winter){
  if(!field||revision!==canvasRecoveryRevision()){field=groundField();revision=canvasRecoveryRevision();}
  c.save();c.imageSmoothingEnabled=true;c.globalAlpha*=winter ? .22 : 1;
  c.drawImage(field,1,1,field.width-2,field.height-2,0,0,WORLD.width,WORLD.height);
  c.restore();
}
