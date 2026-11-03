// 钓具搭配与鱼种抽样只负责纯计算；购买、装备和扣饵由野外事务保存。
import {FISH_SPECIES,FISH_WATERS} from '../config/fish-catalog.js';
import {FISHING_RODS,FISHING_BAITS,rodOwned,baitCount,fishCatchWeight} from '../config/fishing-tackle.js';
// 先识别地表或地下生态类别；独立湖池和附近鱼群加权由 lake-fishing 继续筛选。
export function fishingWater(game){return game.cottage?.kind==='mine'?'mine':game.mapId;}
// 预览不要求拥有装备，便于购前比较；正式抛竿另外校验库存和正在使用的搭配。
export function fishingOdds(rodId,baitId,water){const entries=FISH_SPECIES.map((fish,index)=>({fish,index,weight:fishCatchWeight(fish,rodId,baitId,water)})).filter(e=>e.weight>0),total=entries.reduce((s,e)=>s+e.weight,0);return entries.map(e=>({...e,probability:e.weight/total}));}
// 使用半开区间抽样，0和接近1的端点都能映射到有效候选鱼。
export function sampleFishingOdds(entries,random){if(!entries.length)return null;let point=Math.max(0,Math.min(1-Number.EPSILON,Number(random)||0));for(const e of entries){point-=e.probability;if(point<0)return e;}return entries.at(-1);}
// 同一规则检查准备与抛竿，库存用尽不会悄悄换另一种饵。
export function fishingSetup(game){const p=game.progress.outdoors,rodId=p.selectedRod||'rod',baitId=p.selectedBait||'bait',water=fishingWater(game);const reason=!rodOwned(p,rodId)?'请先购买并装备鱼竿。':!baitCount(p,baitId)?'当前鱼饵已用完，请购买或换一种鱼饵。':!FISH_WATERS[water]?'这里没有可垂钓水域。':'';return {rodId,baitId,water,rod:FISHING_RODS[rodId],bait:FISHING_BAITS[baitId],reason};}
