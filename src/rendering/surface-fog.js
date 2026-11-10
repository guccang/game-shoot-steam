import {visibleCampLightRegions} from '../world/camp-lighting.js';
// 地面夜色共用地下柔边光池，雾层只遮世界，不遮主界面与近身倒计时。
import {SURFACE_VISION} from '../config/surface-vision.js';
import {surfaceNightStrength,surfaceLightSources} from '../world/surface-vision.js';
import {drawVisionFog} from './vision-fog.js';

// 每帧只使用已裁剪灯具和插值后的猫猫，世界移动时光池连续跟随。
export function drawSurfaceFog(renderer,game,player,view,lights,night,windows=[]){
 const strength=surfaceNightStrength({...game,surfaceNight:night});
 renderer.surfaceFogReview={designCriterion:'surface-night-fog',night:strength,sources:[],regions:[],pixels:0,bytes:0,opacity:0};
 if(strength<=.001)return;
 const sources=surfaceLightSources(player,lights,windows),regions=visibleCampLightRegions(game,view);
 Object.assign(renderer.surfaceFogReview,drawVisionFog(renderer,{view,sources,regions,opacity:SURFACE_VISION.opacity*strength,scale:SURFACE_VISION.scale,time:game.time}));
}
