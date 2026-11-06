// 弹药铺进入正式森林深度队列，室内和独立战场不重复显示外部建筑。
import {AMMO_SHOP} from '../config/supplies.js';
import {drawGarage,drawGarageGround} from './garage.js';
import {box,poly} from './primitives.js';
import {campBuildingCache} from './camp-building-cache.js';
// 使用与墙体、入口一致的底座坐标。
export function ammoShopObjects(game){return game.mapId==='forest'&&!game.cottage&&!game.realm&&!game.story?[{...AMMO_SHOP,type:'ammo-shop'}]:[];}
// 宽门车库复用工坊材质与真实通道，炮弹标识区别维修中心。
export function drawAmmoShop(c,item,night,winter){c.save();c.translate(item.x,item.y);const snow=!!winter;campBuildingCache.draw(c,'ammo:'+snow,[-136,-184,272,240],ctx=>paintAmmoShop(ctx,snow));c.restore();}
// 原有门洞、坡道与炮弹标识一起生成，独立停车和装填交互不进入缓存。
function paintAmmoShop(c,winter){c.save();drawGarageGround(c);drawGarage(c,winter,{label:'弹药补给铺'});
 // 招牌下的双炮弹标识区别维修车库，门洞保持净空。
 for(const x of [-13,5]){box(c,x,-138,10,15,2,'#d3b776','#435d48',1.5);poly(c,[[x,-138],[x+5,-147],[x+10,-138]],'#e8d99e','#435d48',1.5);}c.restore();}
