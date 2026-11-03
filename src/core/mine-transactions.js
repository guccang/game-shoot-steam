// 地下设施与生态奖励共用原子存档，失败不改变库存或地图状态。
import {bindEconomy,economyFor} from '../config/economy.js';
import {capturePatrol} from './patrol-session.js';
import {mineLayer} from '../progression/mine-layers.js';
// 核心结果始终使用中文，并保留当前房间的可读反馈。
export function mineNotice(game,message,ok=false){if(game.cottage)game.cottage.notice=message;return {ok,message};}
// 候选进度先保存再替换，第三参数始终指向当前层的数据。
export function miningCommit(game,change,message){
 const next=bindEconomy({...game.progress,mining:structuredClone(game.progress.mining)},economyFor(game.progress));
 change(next.mining,next,mineLayer(next.mining,game.cottage?.depth||1));const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 try{if(game.livingPersist&&game.livingPersist(next)!==true)return mineNotice(game,'保存失败，地图与材料未改变，请重试。');}catch{return mineNotice(game,'保存失败，地图与材料未改变，请重试。');}
 game.progress=next;game.onEvent?.('mining-change');return mineNotice(game,message,true);
}
