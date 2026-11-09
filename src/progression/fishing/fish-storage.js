// 鱼获容器只保存物种与数量；容量、清单和出售共用统计，不重复计入背包。
import {FISH_SPECIES,OUTDOOR_RULES} from '../../config/outdoors.js';
import {FISHING_CONTAINERS} from '../../config/fishing-tackle.js';
// 旧档无容器时为空，已存鱼不因版本或装备选择变化被截断。
export function normalizeFishContainers(raw){
 const containers=Object.fromEntries(Object.keys(FISHING_CONTAINERS).map(id=>[id,raw?.containers?.[id]===true]));
 const fishStores=Object.fromEntries(Object.keys(FISHING_CONTAINERS).map(id=>[id,Object.fromEntries(FISH_SPECIES.map(f=>[f.id,Math.max(0,Math.min(OUTDOOR_RULES.maxFish,Math.floor(Number(raw?.fishStores?.[id]?.[f.id])||0)))]))]));
 const selectedContainer=containers[raw?.selectedContainer]?raw.selectedContainer:Object.keys(containers).find(id=>containers[id])||'none';
 return {containers,fishStores,selectedContainer};
}
// 库存只读统计，独立鱼获容量允许恰好装满，不改变角色负重上限。
export function fishStoreStats(store={}){return FISH_SPECIES.reduce((s,f)=>{const n=store[f.id]||0;s.count+=n;s.mass+=n*f.mass;return s;},{count:0,mass:0});}
// 随身鱼获汇总包含背包与两类容器，收藏/图鉴不因更换存放位置而丢失。
export function carriedFishCount(outdoors,id){return (outdoors.fish?.[id]||0)+Object.keys(FISHING_CONTAINERS).reduce((n,key)=>n+(outdoors.fishStores?.[key]?.[id]||0),0);}
