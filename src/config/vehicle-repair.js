// 维修中心几何、报价比例和工时由玩法与正式绘制共同读取。
import {TOWN_LAYOUT} from './town-layout.js';
export const REPAIR_LAYOUT_VERSION=2;
export const REPAIR_CENTER={id:'vehicle-repair',name:'载具维修中心',mapId:'forest',...TOWN_LAYOUT.repair};
export const REPAIR_BAY={x:REPAIR_CENTER.x+185,y:REPAIR_CENTER.y+160};
export const VEHICLE_REPAIR=Object.freeze({repairRate:.5,repairSeconds:12,hookSeconds:2,towSpeed:115,radius:250});
// 红狼的购车价包含稀有装备价值，日常维修不按同等溢价征收；其他车型维持现有标准。
const MODEL_REPAIR_RATES=Object.freeze({'red-wolf':.05});
// 以稳定车型身份选择费率，界面、普通救援和自行牵引共用此报价基础。
export function vehicleRepairRate(modelId){return MODEL_REPAIR_RATES[modelId]??VEHICLE_REPAIR.repairRate;}

// 正面俯视救援车沿用现有载具的车头朝下比例，紧凑载台位于驾驶室后方。
export const TOW_TRUCK=Object.freeze({width:108,height:142,wheelRadius:9,navigationRadius:34,loadX:0,loadY:-50});
// 只有出车、挂钩和返程阶段在世界中展示救援车。
export function rescueTruckVisible(phase){return phase==='outbound'||phase==='hooking'||phase==='towing';}
// 装载点固定在车身后部，与路线方向无关，转弯不会让货物跳到车身另一侧。
export function towLoadPoint(order){return {x:order.truck.x+TOW_TRUCK.loadX,y:order.truck.y+TOW_TRUCK.loadY};}
