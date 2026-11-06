// 小屋仓库沿用营地统一坐标；木材共用建设库存，弹药与种子单独保存。
import {TOWN_LAYOUT} from './town-layout.js';
export const WAREHOUSE=Object.freeze({...TOWN_LAYOUT.warehouse,id:'warehouse',name:'小屋仓库',mapId:'forest'});

// 后院平顶库的锚点同时用于建筑绘制、农田和树冠避让。
export const WAREHOUSE_DEPOT=Object.freeze({...TOWN_LAYOUT.warehouseDepot,id:'warehouse-depot',mapId:'forest'});
