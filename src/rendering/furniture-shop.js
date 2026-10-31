// 家具店加入正式世界队列，外观与室内商品共用既有森林绘本材质。
import {FURNITURE_SHOP} from '../config/furniture-shop.js';
import {drawBuildingArchitecture} from './building-architecture.js';
// 常驻森林中展示店屋，室内和独立活动不复制世界建筑。
export function furnitureShopObjects(game){return game.mapId==='forest'&&!game.cottage&&!game.realm&&!game.story?[{...FURNITURE_SHOP,type:'furniture-shop'}]:[];}
// 底座位置与门口、碰撞目录一致，世界排序和光照由场景负责。
export function drawFurnitureShop(c,item,night=0,winter=false){c.save();c.translate(item.x,item.y);drawBuildingArchitecture(c,'furniture',winter,night);c.restore();}
