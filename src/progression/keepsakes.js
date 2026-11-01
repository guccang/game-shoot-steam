// 交接物品显式发放，读取账本只校验已有物品。
import {KEEPSAKES} from '../config/keepsakes.js';
// 新入职档为空；普通规则场景可明确选择已交接初始物品。
export function freshKeepsakes(handedOver=false){return {items:handedOver?KEEPSAKES.map(item=>item.id):[]};}
// 只保留已知物品，不从交接阶段推算或补发历史赠品。
export function normalizeKeepsakes(raw){
 const items=new Set(Array.isArray(raw?.items)?raw.items:[]);
 return {items:KEEPSAKES.filter(item=>items.has(item.id)).map(item=>item.id)};
}
// 读取不改变存档或奖励。
export function ownsKeepsake(progress,id){return progress.keepsakes?.items.includes(id)===true;}
