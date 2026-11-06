// 只缓存原先逐帧重画的营地静态立面，已有景物图集与动态施工保持各自入口。
import {StaticRasterCache} from './static-raster-cache.js';
import {drawBuildingArchitecture} from './building-architecture.js';
export const campBuildingCache=new StaticRasterCache();
const sizes={warehouse:[144,124],'cat-home':[144,132],furniture:[136,120],seed:[114,110],legendary:[214,158]};
// 底座原点不变，顶部额外留出猫耳与描边，下方包含接触影。
export function drawCachedCampArchitecture(c,kind,winter=false,night=0){
 const [w,h]=sizes[kind];const snow=!!winter,dark=!!night;
 campBuildingCache.draw(c,kind+':'+snow+':'+dark,[-w/2-20,-h-16,w+40,h+40],ctx=>drawBuildingArchitecture(ctx,kind,snow,dark));
}
