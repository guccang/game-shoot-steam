// 种子小屋改为玻璃屋顶、苗窗和木石底座，保持正式门位与种子交易。
import {drawCachedCampArchitecture} from './camp-building-cache.js';
// 绘制只改变立面，不移动门口或触控热点。
export function drawSeedShop(c,item){c.save();c.translate(item.x,item.y);drawCachedCampArchitecture(c,'seed');c.restore();}
