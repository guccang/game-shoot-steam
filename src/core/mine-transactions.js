import {ERA_RESOURCES} from '../config/vehicle-eras.js';
// 地下设施与生态奖励共用原子存档，失败不改变库存或地图状态。
import {bindEconomy,economyFor} from '../config/economy.js';
import {capturePatrol} from './patrol-session.js';
import {mineLayer} from '../progression/mine-layers.js';
// 核心结果始终使用中文，并保留当前房间的可读反馈。
export function mineNotice(game,message,ok=false){if(game.cottage)game.cottage.notice=message;return {ok,message};}
// 完整复制候选进度后再保存，避免巡游快照写入共享对象；失败不污染任何旧档字段。
export function miningCommit(game,change,message){
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));
 change(next.mining,next,mineLayer(next.mining,game.cottage?.depth||1));const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 try{if(game.livingPersist&&game.livingPersist(next)!==true)return mineNotice(game,'保存失败，地图与材料未改变，请重试。');}catch{return mineNotice(game,'保存失败，地图与材料未改变，请重试。');}
 game.progress=next;game.onEvent?.('mining-change');return mineNotice(game,message,true);
}

// 三种开采入口按当前层使用同一矿产，矿石和金属随同一笔存档入库。
export function mineMetal(depth){
 return depth>=3?'rareMetal':depth===2?'iron':'copper';
}
// 提示与实际入库复用同种金属，岩壁与天然矿物不会给出不同的产物。
export function oreDescription(depth,amount){
 return amount+' 矿石和 '+amount+' '+ERA_RESOURCES[mineMetal(depth)].name;
}
// 仅写入事务候选，存储失败时放弃整笔收益。
export function creditOre(progress,depth,amount){
 const key=mineMetal(depth);
 progress.mining.ore+=amount;
 progress.materials[key]=Math.min(9999999,(progress.materials[key]||0)+amount);
}
