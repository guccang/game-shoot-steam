// 调试批量发放使用正式负重；装不下时把本批新武器统一放入小屋仓库。
import {catLoad} from './load-weight.js';
import {carriedWeapon} from './weapon-storage.js';
// 保留正在使用的装备及伴随挂载；再次执行可整理此前批量获取的闲置武器。
export function storeDebugWeaponOverflow(previous,next,game=null){
 const snapshot=Object.assign(Object.create(game||null),{progress:next});
 if(!game)snapshot.magazines=next.supplies.handMags;
 if(!catLoad(snapshot).overloaded)return next;
 const mounted=new Set([next.weapon,...next.funnelLoadout.filter(i=>i!==12),next.mechanicalLoadout,next.spiderLoadout]);
 const spare=next.weapons.map((_,i)=>i).filter(i=>carriedWeapon(next,i)&&!mounted.has(i));
 for(const i of spare)if(!previous.weapons[i])next.warehouse.weapons.push(i);
 // 旧的批量授予可能已经塞满背包；只整理闲置武器，不丢弃物品或移动当前装备。
 if(catLoad(snapshot).overloaded)for(const i of spare)if(carriedWeapon(next,i))next.warehouse.weapons.push(i);
 return next;
}
