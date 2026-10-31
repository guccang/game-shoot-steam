// 弹药铺进入正式森林深度队列，室内和独立战场不重复显示外部建筑。
import {AMMO_SHOP} from '../config/supplies.js';
import {drawBuildingArchitecture} from './building-architecture.js';
// 使用与墙体、入口一致的底座坐标。
export function ammoShopObjects(game){return game.mapId==='forest'&&!game.cottage&&!game.realm&&!game.story?[{...AMMO_SHOP,type:'ammo-shop'}]:[];}
// 屋身材质沿用森林房屋，炮弹招牌作为功能结构区别于种子屋。
export function drawAmmoShop(c,item,night,winter){c.save();c.translate(item.x,item.y);drawBuildingArchitecture(c,'ammo',winter,night);c.restore();}
