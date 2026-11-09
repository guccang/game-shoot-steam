// 营地永久账本：已击败名额、整轮次数、有效游玩冷却和线索均白名单迁移。
import {MONSTER_CAMPS,CAMP_CHARACTERS,MONSTER_CAMP_RULES} from '../../config/monster-camps.js';
// 损坏与旧存档只恢复合法进度，不把缺失数据当作已完成。
export function normalizeMonsterCamps(raw){
 const camps={},clues=Array.isArray(raw?.clues)?raw.clues:[],items=Array.isArray(raw?.items)?raw.items:[];
 for(const c of MONSTER_CAMPS){const r=raw?.camps?.[c.id];camps[c.id]={clears:Number.isSafeInteger(r?.clears)?Math.max(0,Math.min(999999,r.clears)):0,mask:Number.isInteger(r?.mask)&&r.mask>=0&&r.mask<32?r.mask:0,cooldown:Number.isFinite(r?.cooldown)?Math.max(0,Math.min(MONSTER_CAMP_RULES.respawn,r.cooldown)):0};}
 return {camps,clues:CAMP_CHARACTERS.filter(n=>clues.includes(n.id)).map(n=>n.id),items:CAMP_CHARACTERS.filter(n=>items.includes(n.id)&&clues.includes(n.id)).map(n=>n.id)};
}
