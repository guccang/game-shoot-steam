// 维修中心几何、报价比例和工时由玩法与正式绘制共同读取。
import {TOWN_LAYOUT} from './town-layout.js';
export const REPAIR_LAYOUT_VERSION=2;
export const REPAIR_CENTER=Object.freeze({id:'vehicle-repair',name:'载具维修中心',mapId:'forest',...TOWN_LAYOUT.repair});
export const REPAIR_BAY=Object.freeze({x:REPAIR_CENTER.x+185,y:REPAIR_CENTER.y+160});
export const VEHICLE_REPAIR=Object.freeze({repairRate:.5,repairSeconds:12,hookSeconds:2,towSpeed:115,radius:250});

// 正面俯视救援车沿用现有载具的车头朝下比例，紧凑载台位于驾驶室后方。
export const TOW_TRUCK=Object.freeze({width:108,height:142,wheelRadius:9,navigationRadius:34,loadX:0,loadY:-50});
// 装载点固定在车身后部，与路线方向无关，转弯不会让货物跳到车身另一侧。
export function towLoadPoint(order){return {x:order.truck.x+TOW_TRUCK.loadX,y:order.truck.y+TOW_TRUCK.loadY};}
