import {campBuildingFinish,campBuildingFinishKey,withCampBuildingFinish} from './camp-building-finish.js';
// 只缓存原先逐帧重画的营地静态立面，已有景物图集与动态施工保持各自入口。
import {createRenderCanvas} from './canvas-recovery.js';
import {StaticRasterCache} from './static-raster-cache.js';
import {drawBuildingArchitecture} from './building-architecture.js';
// 每个静态条目捕获外观，仍共享原8MB上限和逐帧预热队列。
class CampBuildingCache extends StaticRasterCache{
 // 只有正在绘制的营地建筑加入外观键，其他调用保留原缓存。
 draw(c,key,bounds,paint){const finish=campBuildingFinish();super.draw(c,campBuildingFinishKey()+':'+key,bounds,ctx=>withCampBuildingFinish(finish,paint,ctx));}
}
export const campBuildingCache=new CampBuildingCache();
// 全场共用一张混合工作画布；不按建筑数量或积雪量增加缓存。
let snowBlend=null;
// 工作画布单独计入诊断，避免漏报渐积雪时的临时像素。
export function campSnowBlendBytes(){return snowBlend?snowBlend.width*snowBlend.height*4:0;}
const sizes={'warehouse-depot':[182,101],warehouse:[144,124],'cat-home':[144,132],furniture:[136,120],seed:[114,110],legendary:[214,158]};
// 底座原点不变，顶部额外留出猫耳与描边，下方包含接触影。
export function drawCachedCampArchitecture(c,kind,winter=false,night=0){
 const [w,h]=sizes[kind];const snow=Math.max(0,Math.min(1,Number(winter)||0)),dark=!!night;
 const bounds=[-w/2-20,-h-16,w+40,h+40];
 // 两端直接绘制；稳定后释放临时混合像素。
 if(snow<=0||snow>=1){
  if(snowBlend){snowBlend.width=snowBlend.height=1;snowBlend=null;}
  const snowy=snow>=1;campBuildingCache.draw(c,kind+':'+snowy+':'+dark,bounds,ctx=>drawBuildingArchitecture(ctx,kind,snowy,dark));return;
 }
 // 预乘透明度相加后一次贴回世界，半雪状态不会重复压深接触影或门洞边缘。
 snowBlend ||= createRenderCanvas();const width=Math.ceil(bounds[2]*2),height=Math.ceil(bounds[3]*2);
 if(snowBlend.width!==512){snowBlend.width=512;snowBlend.height=400;}
 const blend=snowBlend.getContext('2d');blend.setTransform(1,0,0,1,0,0);blend.clearRect(0,0,512,400);blend.setTransform(2,0,0,2,-bounds[0]*2,-bounds[1]*2);
 blend.globalCompositeOperation='source-over';blend.globalAlpha=1-snow;
 campBuildingCache.draw(blend,kind+':false:'+dark,bounds,ctx=>drawBuildingArchitecture(ctx,kind,false,dark));
 blend.globalCompositeOperation='lighter';blend.globalAlpha=snow;
 campBuildingCache.draw(blend,kind+':true:'+dark,bounds,ctx=>drawBuildingArchitecture(ctx,kind,true,dark));
 c.drawImage(snowBlend,0,0,width,height,...bounds);
}
