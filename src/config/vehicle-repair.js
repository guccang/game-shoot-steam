// 维修中心几何、报价比例和工时由玩法与正式绘制共同读取。
import {TOWN_LAYOUT} from './town-layout.js';
export const REPAIR_LAYOUT_VERSION=1;
export const REPAIR_CENTER=Object.freeze({id:'vehicle-repair',name:'载具维修中心',mapId:'forest',...TOWN_LAYOUT.repair});
export const REPAIR_BAY=Object.freeze({x:REPAIR_CENTER.x+185,y:REPAIR_CENTER.y+160});
export const VEHICLE_REPAIR=Object.freeze({wreckRate:.1,wearRate:.02,repairSeconds:12,hookSeconds:2,towSpeed:115,radius:250});
