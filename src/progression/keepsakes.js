// 入职交接与旧档迁移共用物品账本，物品永久保留且不重复发放。
import {KEEPSAKES} from '../config/keepsakes.js';
// 旧普通档视为已交接；新档在拿到钥匙之前不补发任何交接物品。
export function normalizeKeepsakes(raw,arrival){
 const handedOver=!arrival||arrival.keys||arrival.phase==='complete';
 const items=new Set(Array.isArray(raw?.items)?raw.items:[]);
 if(handedOver)for(const item of KEEPSAKES)items.add(item.id);
 return {items:KEEPSAKES.filter(item=>handedOver&&items.has(item.id)).map(item=>item.id)};
}
// 使用正式交接状态兜底历史存档；读取不改变存档或奖励。
export function ownsKeepsake(progress,id){return normalizeKeepsakes(progress.keepsakes,progress.arrival).items.includes(id);}
