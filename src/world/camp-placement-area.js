// 地形决定能否放置，旧营地区域仅用于限定路网搜索范围。
import {campPlots,ownsCampPlot} from '../config/camp-land.js';
import {isWaterBlocked} from './river-geometry.js';
import {isLakeWater} from './natural-terrain.js';
export const CAMP_OUTSKIRTS_DISTANCE=1000;
// 有限的营地外缘区域供规划路网取边界，不扩大土地所有权或装饰权限。
export function campPlacementRegions(progress){return campPlots(progress).filter(p=>ownsCampPlot(progress,p.id)).map(p=>({left:p.left-CAMP_OUTSKIRTS_DISTANCE,right:p.right+CAMP_OUTSKIRTS_DISTANCE,top:p.top-CAMP_OUTSKIRTS_DISTANCE,bottom:p.bottom+CAMP_OUTSKIRTS_DISTANCE}));}
// 检查中心及占地边缘是否为可建设的陆地。
export function campPlacementPoint(progress,x,y,margin=0){
 const offsets=margin?[-margin,0,margin]:[0];
 return offsets.every(dx=>offsets.every(dy=>!isWaterBlocked(x+dx,y+dy,8)&&!isLakeWater(x+dx,y+dy,8)));
}
