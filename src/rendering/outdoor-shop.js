// 户外店复用正式工坊墙体与开放门洞，独立帐篷、钓竿标识。
import {OUTDOOR_SHOP} from '../config/outdoor-shop.js';
import {drawGarage,drawGarageGround} from './garage.js';
import {poly,box} from './primitives.js';
// 只在大世界显示建筑。
export function outdoorShopObjects(game){return game.mapId==='forest'&&!game.cottage&&!game.realm&&!game.story?[{...OUTDOOR_SHOP,type:'outdoor-shop'}]:[];}
// 招牌位于门洞上方，保持通行区域净空。
export function drawOutdoorShop(c,item,night,winter){c.save();c.translate(item.x,item.y);drawGarageGround(c);drawGarage(c,winter,{label:'户外用品店'});box(c,-32,-140,64,28,4,'#f4e5b3','#435d48',2);c.save();c.translate(0,22);poly(c,[[-24,-135],[-9,-157],[6,-135]],'#e8d99e','#435d48',2);c.beginPath();c.moveTo(13,-134);c.lineTo(22,-158);c.lineTo(34,-145);c.lineTo(34,-133);c.strokeStyle='#435d48';c.lineWidth=2;c.stroke();c.restore();c.restore();}
