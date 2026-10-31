import {drawBuildingArchitecture} from './building-architecture.js';
// 传奇重车棚沿用正式地面排序；只对正在驾驶红狼的玩家显现，不推进解锁状态。
import {LEGENDARY_WORKSHOP as SITE} from '../config/legendary-workshop.js';
import {legendaryVisible} from '../core/legendary-workshop.js';
// 返回单一世界入口对象，让镜头裁剪和循环地图镜像沿用普通实体路径。
export function legendaryObjects(game){return legendaryVisible(game)?[{...SITE,type:'legendary-workshop',width:220,height:160}]:[];}
// 宽跨厂房屋顶、门槛和两侧工业窗形成重车工坊剪影，门前留出坦克停靠空地。
export function drawLegendaryWorkshop(c,item,night=0){
 c.save();c.translate(item.x,item.y);drawBuildingArchitecture(c,'legendary',false,night);c.restore();
}
