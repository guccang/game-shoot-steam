// 地上地下共用柔边雾幕，按渲染器复用一张半分辨率画布。
const masks=new WeakMap();

// 光池按世界坐标投影，调用方提供表现时钟；减少动态时冻结雾团。
export function drawVisionFog(renderer,{view:v,sources,regions=[],opacity,scale,time:clock}){
 const {width:w,height:h,dpr,c}=renderer;
 let mask=masks.get(renderer);if(!mask){mask=renderer.canvas.ownerDocument.createElement('canvas');masks.set(renderer,mask);}
 const mw=Math.ceil(w*scale),mh=Math.ceil(h*scale);
 if(mask.width!==mw||mask.height!==mh){mask.width=mw;mask.height=mh;}
 const ctx=mask.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,w,h);
 ctx.globalCompositeOperation='source-over';ctx.fillStyle=`rgba(10,23,22,${opacity})`;ctx.fillRect(0,0,w,h);
 ctx.globalCompositeOperation='destination-out';
 // 营地保留公共基础照明；二十层柔边只在边界过渡，不改变野外浓雾。
 for(const p of regions){
  ctx.fillStyle=`rgba(0,0,0,${1-Math.pow(1-p.power,1/20)})`;
  for(let i=0;i<20;i++){const pad=p.feather*(1-i/19),x=(p.x-pad-v.x)*v.zoom,y=(p.y-pad-v.y)*v.zoom;ctx.beginPath();ctx.roundRect(x,y,(p.w+pad*2)*v.zoom,(p.h+pad*2)*v.zoom,Math.max(1,pad*v.zoom));ctx.fill();}
 }
 for(const p of sources){
  const x=(p.x-v.x)*v.zoom,y=(p.y-v.y)*v.zoom,r=p.radius*v.zoom;
  const light=ctx.createRadialGradient(x,y,r*.18,x,y,r);light.addColorStop(0,'rgba(0,0,0,.98)');light.addColorStop(.48,'rgba(0,0,0,.88)');light.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=light;ctx.fillRect(x-r,y-r,r*2,r*2);
 }
 ctx.globalCompositeOperation='source-over';
 // 少量世界锚定雾团只作色阶变化，不能以均匀灰幕重新照亮黑暗区域。
 const time=renderer.reduced.matches?0:clock;
 for(let i=0;i<5;i++){
  const x=((i*173-v.x*v.zoom*.1)%(w+180)+w+180)%(w+180)-90,y=((i*211-v.y*v.zoom*.1)%(h+180)+h+180)%(h+180)-90;
  const fog=ctx.createRadialGradient(x,y,0,x,y,155);fog.addColorStop(0,`rgba(73,103,94,${(.025+Math.sin(time*.22+i)*.008)*opacity/.985})`);fog.addColorStop(1,'rgba(73,103,94,0)');ctx.fillStyle=fog;ctx.fillRect(x-155,y-155,310,310);
 }
 c.save();c.setTransform(dpr,0,0,dpr,0,0);c.drawImage(mask,0,0,mw,mh,0,0,w,h);
 c.globalAlpha=opacity/.985;
 // 微光只点亮原灯芯或菌帽附近，暖灯与冷菇能从雾中辨别。
 for(const p of sources.filter(p=>p.kind!=='player'&&p.kind!=='window')){
  const x=(p.x-v.x)*v.zoom,y=(p.y-v.y)*v.zoom,r=(p.kind==='lamp'?22:16)*v.zoom;
  const tint=c.createRadialGradient(x,y,0,x,y,r);tint.addColorStop(0,p.kind==='lamp'?'#ffe5a366':'#a5f0cf66');tint.addColorStop(1,p.kind==='lamp'?'#ffe5a300':'#a5f0cf00');c.fillStyle=tint;c.fillRect(x-r,y-r,r*2,r*2);
 }
 c.restore();return {sources,regions,pixels:mw*mh,bytes:mw*mh*4,opacity};
}
