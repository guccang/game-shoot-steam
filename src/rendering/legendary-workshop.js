// 传奇重车棚沿用正式地面排序；只对正在驾驶红狼的玩家显现，不推进解锁状态。
import {LEGENDARY_WORKSHOP as SITE} from '../config/legendary-workshop.js';
import {legendaryVisible} from '../core/legendary-workshop.js';
import {box,poly,oval} from './primitives.js';
import {canvasFont} from './text-style.js';
// 返回单一世界入口对象，让镜头裁剪和循环地图镜像沿用普通实体路径。
export function legendaryObjects(game){return legendaryVisible(game)?[{...SITE,type:'legendary-workshop',width:220,height:160}]:[];}
// 屋顶、门槛、狼徽与两侧工作灯形成重车工坊剪影，门前留出坦克停靠空地。
export function drawLegendaryWorkshop(c,item,night=0){
 c.save();c.translate(item.x,item.y);oval(c,12,8,116,25,'#29483838');
 box(c,-98,-108,196,114,7,'#b6b28b','#315747',3);poly(c,[[98,-108],[114,-93],[114,4],[98,6]],'#718672','#315747',2);
 box(c,-70,-76,140,80,7,'#355346','#315747',3);box(c,-60,-69,120,70,5,'#233e34');
 for(let x=-50;x<=50;x+=25)box(c,x,-59,15,39,2,'#627361');
 box(c,-30,-44,60,15,2,'#c49a61','#315747',2);box(c,-25,-28,5,29,1,'#8a7251');box(c,20,-28,5,29,1,'#8a7251');
 poly(c,[[-111,-108],[-69,-151],[70,-151],[112,-108]],'#b45a49','#315747',3);poly(c,[[-101,-111],[-65,-142],[66,-142],[99,-111]],'#cf8463','#315747',1.5);
 box(c,-23,-133,46,31,5,'#f2d99c','#315747',2);poly(c,[[-12,-123],[-11,-131],[-3,-125],[3,-125],[11,-131],[12,-123],[7,-113],[0,-109],[-7,-113]],'#b45a49','#315747',1.4);
 for(const side of [-1,1]){box(c,side*84-6,-66,12,24,4,night>.2?'#ffdc83':'#e5ce8b','#315747',2);box(c,side*84-16,-28,32,28,3,'#8a7251','#315747',2);}
 box(c,-88,0,176,9,2,'#d1c89e','#315747',2);c.font=canvasFont(14);c.textAlign='center';c.fillStyle='#fff6dc';c.fillText('传奇工坊',0,-84);c.restore();
}
