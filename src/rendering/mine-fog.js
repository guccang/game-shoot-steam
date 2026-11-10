// 地下光源查询与验收标识独立，雾幕合成复用地面同源绘制器。
import {MINE_VISION,mineLightSources} from '../world/mine-vision.js';
import {drawVisionFog} from './vision-fog.js';

// 保留地下光圈、色阶、时钟和入口点击规则，不改变已有矿区视野。
export function drawMineFog(renderer,game,layer,preparedSources=null){
 const {width:w,height:h,mineView:v}=renderer;
 const sources=preparedSources||mineLightSources(game,layer,{x:v.x,y:v.y,w:w/v.zoom,h:h/v.zoom});
 renderer.mineFogReview={designCriterion:'mine-fog-entrances',...drawVisionFog(renderer,{view:v,sources,opacity:MINE_VISION.opacity,scale:MINE_VISION.scale,time:layer.age})};
 return sources;
}
