// 建筑可放在营地附近一百米内；未购地、水域和实际围栏仍受保护。
import {campPlots,campPlotAt,ownsCampPlot} from '../config/camp-land.js';
import {nearest} from './coordinates.js';
import {isWaterBlocked} from './river-geometry.js';
import {isLakeWater} from './natural-terrain.js';
export const CAMP_OUTSKIRTS_DISTANCE=1000;
// 有限的营地外缘区域供规划路网取边界，不扩大土地所有权或装饰权限。
export function campPlacementRegions(progress){return campPlots(progress).filter(p=>ownsCampPlot(progress,p.id)).map(p=>({left:p.left-CAMP_OUTSKIRTS_DISTANCE,right:p.right+CAMP_OUTSKIRTS_DISTANCE,top:p.top-CAMP_OUTSKIRTS_DISTANCE,bottom:p.bottom+CAMP_OUTSKIRTS_DISTANCE}));}
// 实际放置按最近边界的欧氏距离判断，不能用方框四角绕过一百米限制。
export function campPlacementPoint(progress,x,y,margin=0){return (margin?[[-margin,-margin],[margin,-margin],[-margin,margin],[margin,margin]]:[[0,0]]).every(([dx,dy])=>{const point={x:x+dx,y:y+dy},plot=campPlotAt(point,progress);if(plot&&!ownsCampPlot(progress,plot.id))return false;if(isWaterBlocked(point.x,point.y,8)||isLakeWater(point.x,point.y,8))return false;return campPlots(progress).some(r=>{if(!ownsCampPlot(progress,r.id))return false;const p=nearest(point,{x:(r.left+r.right)/2,y:(r.top+r.bottom)/2});return Math.hypot(Math.max(r.left-p.x,0,p.x-r.right),Math.max(r.top-p.y,0,p.y-r.bottom))<=CAMP_OUTSKIRTS_DISTANCE;});});}
