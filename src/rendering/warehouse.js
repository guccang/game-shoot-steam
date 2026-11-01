// 小屋仓库加入正式深度队列，复用营地立面与统一昼夜光照。
import {WAREHOUSE} from '../config/warehouse.js';
import {drawBuildingArchitecture} from './building-architecture.js';
// 仅森林外景绘制世界仓库，室内使用独立房间。
export function warehouseObjects(game){return game.mapId==='forest'&&!game.cottage&&!game.realm&&!game.story?[{...WAREHOUSE,type:'warehouse'}]:[];}
// 门槛锚点同时服务世界实体与进入倒计时。
export function drawWarehouse(c,item,night=0,winter=false){c.save();c.translate(item.x,item.y);drawBuildingArchitecture(c,'warehouse',winter,night);c.restore();}
