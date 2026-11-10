// 营地换路面保留原路形；只有玩家搬迁建筑时才使用重新规划的路网。
import {PATHS} from './paths.js';
import {LIVING_ROADS} from '../config/living-world.js';
import {nearest} from './coordinates.js';
import {campRoadNetwork} from './camp-layout-roads.js';
// 二次曲线采样与原道路一致，只保留营地附近有限段，不扫描整图到每帧。
function localRoads(){const paths=[];for(const path of [...PATHS,...LIVING_ROADS]){let part=[];for(const source of path){const p=nearest(source,{x:0,y:700});if(p.x>=-1250&&p.x<=950&&p.y>=-160&&p.y<=1550)part.push(p);else if(part.length){if(part.length>1)paths.push(part);part=[];}}if(part.length>1)paths.push(part);}return paths.map(path=>{const points=[path[0]];let a=path[0];for(let i=1;i<path.length-1;i++){const b=path[i],e={x:(b.x+path[i+1].x)/2,y:(b.y+path[i+1].y)/2},steps=Math.max(2,Math.ceil((Math.hypot(b.x-a.x,b.y-a.y)+Math.hypot(e.x-b.x,e.y-b.y))/12));for(let n=1;n<=steps;n++){const t=n/steps,u=1-t;points.push({x:u*u*a.x+2*u*t*b.x+t*t*e.x,y:u*u*a.y+2*u*t*b.y+t*t*e.y});}a=e;}points.push(path.at(-1));return points;});}
const original=localRoads();
// 材质切换不会改变原路，搬迁后的路径则来自正式规划器。
export function campSurfaceRoads(progress){return Object.keys(progress.campLayout?.positions||{}).length?campRoadNetwork(progress).paths:original;}
