// 仓库存档只保存备用弹药与种子，已入库木材继续使用 progress.wood。
import {AMMO_TYPES} from '../config/supplies.js';
import {FARM_CROPS,FARM_STOCK_CAP} from '../config/farm.js';
// 库存限额与随身同类物品一致，非法数量不进入存档。
function stock(value,cap){return Number.isFinite(value)?Math.min(cap,Math.max(0,Math.floor(value))):0;}
// 新游戏与存档校验共用完整目录，不保存任意物品键。
export function normalizeWarehouse(raw){return {ammo:Object.fromEntries(Object.keys(AMMO_TYPES).map(key=>[key,stock(raw?.ammo?.[key],100000)])),seeds:FARM_CROPS.map((_,i)=>stock(raw?.seeds?.[i],FARM_STOCK_CAP))};}
