// 地下雾独立覆盖正式世界画面，单张半分辨率画布复用，不创建全地图纹理。
import {MINE_VISION,mineLightSources} from '../world/mine-vision.js';
const masks=new WeakMap();

// 柔边光池与淡雾使用地下时钟，暂停和减少动态不会产生额外动画。
export function drawMineFog(renderer,game,layer,preparedSources=null){
 const {width:w,height:h,dpr,c,mineView:v}=renderer;
 let mask=masks.get(renderer);if(!mask){mask=renderer.canvas.ownerDocument.createElement('canvas');masks.set(renderer,mask);}
 const scale=MINE_VISION.scale,mw=Math.ceil(w*scale),mh=Math.ceil(h*scale);
 if(mask.width!==mw||mask.height!==mh){mask.width=mw;mask.height=mh;}
 const ctx=mask.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,w,h);
 ctx.globalCompositeOperation='source-over';ctx.fillStyle=`rgba(10,23,22,${MINE_VISION.opacity})`;ctx.fillRect(0,0,w,h);
 const sources=preparedSources||mineLightSources(game,layer,{x:v.x,y:v.y,w:w/v.zoom,h:h/v.zoom});
 ctx.globalCompositeOperation='destination-out';
 for(const p of sources){
  const x=(p.x-v.x)*v.zoom,y=(p.y-v.y)*v.zoom,r=p.radius*v.zoom;
  const light=ctx.createRadialGradient(x,y,r*.18,x,y,r);light.addColorStop(0,'rgba(0,0,0,.98)');light.addColorStop(.48,'rgba(0,0,0,.88)');light.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=light;ctx.fillRect(x-r,y-r,r*2,r*2);
 }
 ctx.globalCompositeOperation='source-over';
 // 少量世界锚定雾团只作色阶变化，不能以均匀灰幕重新照亮黑暗区域。
 const time=renderer.reduced.matches?0:layer.age;
 for(let i=0;i<5;i++){
  const x=((i*173-v.x*v.zoom*.1)%(w+180)+w+180)%(w+180)-90,y=((i*211-v.y*v.zoom*.1)%(h+180)+h+180)%(h+180)-90;
  const fog=ctx.createRadialGradient(x,y,0,x,y,155);fog.addColorStop(0,`rgba(73,103,94,${.025+Math.sin(time*.22+i)*.008})`);fog.addColorStop(1,'rgba(73,103,94,0)');ctx.fillStyle=fog;ctx.fillRect(x-155,y-155,310,310);
 }
 c.save();c.setTransform(dpr,0,0,dpr,0,0);c.drawImage(mask,0,0,mw,mh,0,0,w,h);
 // 微光只点亮原灯芯或菌帽附近，暖灯与冷菇能从雾中辨别。
 for(const p of sources.filter(p=>p.kind!=='player')){
  const x=(p.x-v.x)*v.zoom,y=(p.y-v.y)*v.zoom,r=(p.kind==='lamp'?22:16)*v.zoom;
  const tint=c.createRadialGradient(x,y,0,x,y,r);tint.addColorStop(0,p.kind==='lamp'?'#ffe5a366':'#a5f0cf66');tint.addColorStop(1,p.kind==='lamp'?'#ffe5a300':'#a5f0cf00');c.fillStyle=tint;c.fillRect(x-r,y-r,r*2,r*2);
 }
 c.restore();renderer.mineFogReview={designCriterion:'mine-fog-entrances',sources,pixels:mw*mh,bytes:mw*mh*4,opacity:MINE_VISION.opacity};return sources;
}
