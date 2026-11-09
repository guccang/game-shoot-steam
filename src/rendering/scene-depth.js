// 场景地面投影与透明实体受光：不读回像素，不使用逐帧模糊和全屏后处理。
import {createRenderCanvas} from './canvas-recovery.js';
import {SCENE_DEPTH as D} from '../config/scene-depth.js';
import {treeShadowShape} from '../world/scene-depth.js';
let actorLayer=null;

// 房屋投影在全部实体之前绘制，保持门槛原点，向右下延伸的长度由屋高决定。
export function drawBuildingCastShadow(c,b,night){
 c.save();c.fillStyle=`rgba(38,65,54,${.20*(1-night*.75)})`;c.beginPath();c.moveTo(b.x-b.w*.48,b.y);c.lineTo(b.x+b.w*.48,b.y);c.lineTo(b.x+b.w*.48+b.dx,b.y+b.dy);c.lineTo(b.x-b.w*.48+b.dx,b.y+b.dy);c.closePath();c.fill();c.restore();
}

// 连通的冠影有不规则叶团边缘，根部接触影单独紧贴脚底。
export function drawCanopyShadow(c,tree,night=0){
 const p=treeShadowShape(tree);c.save();c.fillStyle=`rgba(37,69,57,${.19*(1-night*.72)})`;
 c.beginPath();c.moveTo(tree.x-7*p.s,tree.y);c.lineTo(p.x-p.rx*.8,p.y-p.ry*.5);
 c.bezierCurveTo(p.x-p.rx*1.2,p.y-p.ry*1.3,p.x-p.rx*.2,p.y-p.ry*1.4,p.x+p.rx*.15,p.y-p.ry*.85);
 c.bezierCurveTo(p.x+p.rx*.8,p.y-p.ry*1.3,p.x+p.rx*1.2,p.y-p.ry*.1,p.x+p.rx*.84,p.y+p.ry*.24);
 c.bezierCurveTo(p.x+p.rx,p.y+p.ry,p.x-p.rx*.2,p.y+p.ry*1.25,p.x-p.rx*.65,p.y+p.ry*.65);
 c.lineTo(tree.x+8*p.s,tree.y+4*p.s);c.closePath();c.fill();
 c.fillStyle='#24453655';c.beginPath();c.ellipse(tree.x,tree.y+3*p.s,12*p.s,4*p.s,0,0,Math.PI*2);c.fill();c.restore();
}
// 人物投影只在地面层画；已有脚底小影保留为接触影，空中/骑乘不重复投影。
export function drawActorCastShadow(c,point,light){
 c.save();c.translate(point.x,point.y+7);
 // 日影和灯影分别连续淡入淡出，跨光圈边缘不突然改变方向或跳出一块暗影。
 for(const [dx,dy,length,alpha] of [[D.sunX,D.sunY,27,.16*light.sun*(1-light.power)],[-light.dx,-light.dy,25+light.power*22,light.power*.24]]){
 if(alpha<.001)continue;c.fillStyle=`rgba(37,58,48,${alpha})`;
 c.beginPath();c.moveTo(-9,0);c.quadraticCurveTo(dx*length-15,dy*length-8,dx*length-9,dy*length+3);c.quadraticCurveTo(dx*length+7,dy*length+13,dx*length+15,dy*length+2);c.lineTo(10,1);c.closePath();c.fill();
 }
 c.restore();
}
// 小画布仅缓存空间，不缓存动作帧；每次仍由正式身体、小手和武器绘制器执行。
export function drawLitEntity(c,x,y,light,radius,draw){
 const r=Math.ceil(Math.max(100,radius)),size=Math.min(1024,r*2*D.actorResolution),resolution=size/(r*2);
 if(!actorLayer)actorLayer=createRenderCanvas();if(actorLayer.width!==size||actorLayer.height!==size){actorLayer.width=size;actorLayer.height=size;}
 const ctx=actorLayer.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,size,size);ctx.setTransform(resolution,0,0,resolution,size/2,size/2);
 ctx.save();try{draw(ctx);}finally{ctx.restore();}
 ctx.globalCompositeOperation='source-atop';
 // 明暗严格限制在现有透明轮廓内，身体与武器一起受光，枪口动作保持原样。
 const shade=ctx.createLinearGradient(-45,-65,42,25);shade.addColorStop(0,'rgba(255,238,177,.10)');shade.addColorStop(.42,'rgba(47,76,67,0)');shade.addColorStop(1,`rgba(42,68,62,${.15+light.night*.07})`);ctx.fillStyle=shade;ctx.fillRect(-r,-r,r*2,r*2);
 if(light.shade>0){ctx.fillStyle=`rgba(33,65,59,${light.shade*D.shadeStrength})`;ctx.fillRect(-r,-r,r*2,r*2);}
 if(light.power>.001){const glow=ctx.createLinearGradient(-light.dx*48,-28-light.dy*35,light.dx*48,-28+light.dy*35);glow.addColorStop(0,'rgba(255,208,128,0)');glow.addColorStop(.5,`rgba(255,211,137,${light.power*.14})`);glow.addColorStop(1,`rgba(255,224,159,${light.power*.55})`);ctx.fillStyle=glow;ctx.fillRect(-r,-r,r*2,r*2);}
 ctx.globalCompositeOperation='source-over';c.drawImage(actorLayer,x-r,y-r,r*2,r*2);
}
// 工作台读取实际合成画布预算，避免只报告配置中的理论上限。
export function sceneDepthStats(){return {actorBytes:actorLayer?actorLayer.width*actorLayer.height*4:0,actorWidth:actorLayer?.width||0};}
