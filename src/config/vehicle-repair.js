// 维修中心几何、报价比例和工时由玩法与正式绘制共同读取。
import {TOWN_LAYOUT} from './town-layout.js';
export const REPAIR_LAYOUT_VERSION=2;
export const REPAIR_CENTER=Object.freeze({id:'vehicle-repair',name:'载具维修中心',mapId:'forest',...TOWN_LAYOUT.repair});
export const REPAIR_BAY=Object.freeze({x:REPAIR_CENTER.x+185,y:REPAIR_CENTER.y+160});
export const VEHICLE_REPAIR=Object.freeze({repairRate:.5,repairSeconds:12,hookSeconds:2,towSpeed:115,radius:250});

// 加长平板拖车由独立驾驶室、载台与三轴车轮组成；货物锚点用于挂钩和正式载运。
export const TOW_TRUCK=Object.freeze({width:218,height:110,wheelRadius:12,navigationRadius:34,loadX:-34,loadY:-10});
// 根据真实行驶朝向镜像车头与载台，不改变被救车辆的车型比例。
export function towLoadPoint(order){const facing=Math.cos(order.angle||0)<0?-1:1;return {x:order.truck.x+TOW_TRUCK.loadX*facing,y:order.truck.y+TOW_TRUCK.loadY};}
