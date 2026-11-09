// 图鉴明细只累计真实行为，不从持有数量推算已经出售或消耗的历史。
import {CREATURE_MONSTERS} from '../../config/creature-codex.js';
import {FARM_CROPS} from '../../config/farm.js';
const monsterKeys=new Set(CREATURE_MONSTERS.map(e=>e.key));
// 有界安全整数拒绝损坏存档和无穷大。
function count(n){return Number.isFinite(n)?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(n))):0;}
// 仅保存正式目录的稳定键；旧明细缺失时提示历史不完整。
export function normalizeCodexStatistics(raw,legacy=false){
 return {version:1,partial:!!raw?.partial||legacy,monsters:Object.fromEntries([...monsterKeys].map(key=>[key,count(raw?.monsters?.[key])])),crops:Object.fromEntries(FARM_CROPS.map(c=>[c.id,{planted:count(raw?.crops?.[c.id]?.planted),harvested:count(raw?.crops?.[c.id]?.harvested)}]))};
}
// 从真实死亡对象得到类别，矿洞动物与地表同名对象互不混记。
export function codexMonsterKey(target){return target.mineKind?'mine:'+target.mineKind:target.type==='boss'?'boss:'+target.kind:'monster:'+(target.species||(target.flying?'leaf-bat':'slime'));}
// 调用方在死亡保护后记录；地下调用方与死亡、矿石奖励一并原子保存。
export function recordCodexDefeat(progress,target){
 const key=codexMonsterKey(target);if(!monsterKeys.has(key))return;
 const s=progress.statistics.codex??=normalizeCodexStatistics(null,true);s.monsters[key]=count((s.monsters[key]||0)+1);
}
// 播种和收割在候选存档上累计，保存失败不会留下次数。
export function recordCodexCrop(progress,crop,action){
 const id=FARM_CROPS[crop]?.id;if(!id||!['planted','harvested'].includes(action))return;
 const s=progress.statistics.codex??=normalizeCodexStatistics(null,true),row=s.crops[id]??={planted:0,harvested:0};row[action]=count(row[action]+1);
}
