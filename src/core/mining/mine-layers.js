// 地下深层支付金币与施工材料开通，连接点和布局仅首次生成并保存。
import {mineCell,mineKey,minePoint,mineFreightCell,mineLayerUnlockCost} from '../../config/mining.js';
import {mineCellArea,mineTerrain} from '../../config/mine-ecology.js';
import {mineLayer,freshMineLayer} from '../../progression/mining/mine-layers.js';
import {recordEconomy} from '../../progression/economy/economy-ledger.js';
import {miningCommit,mineNotice} from './mine-transactions.js';
// 获取当前层，未进入矿区时默认用于检查第一层存档。
export function currentMineLayer(game){return mineLayer(game.progress.mining,game.cottage?.depth||1);}
// UI与实际扣款共用报价，探索率不参与权限或价格计算。
export function mineLayerUnlockQuote(game){
 const depth=(game.cottage?.depth||1)+1,unlocked=!!mineLayer(game.progress.mining,depth),cost=unlocked?{coins:0,ore:0,wood:0}:mineLayerUnlockCost(depth);
 const have={coins:game.progress.coins,ore:game.progress.mining.ore,wood:game.progress.wood},names={coins:'金币',ore:'矿石',wood:'木材'};
 const missing=Object.keys(cost).filter(k=>have[k]<cost[k]).map(k=>names[k]+'缺 '+(cost[k]-have[k]));
 return {depth,unlocked,cost,have,missing,affordable:!missing.length};
}
// 入口附近只做层间通行，矿车不能带离轨道，战车可沿施工坡道同行。
export function travelMineLayer(game,direction){
 if(game.cottage?.kind!=='mine'||game.state!=='playing'||game.cottage.ride||game.player.hp<=0)return mineNotice(game,'请在矿区停稳并下矿车后操作。');
 const room=game.cottage,depth=room.depth||1,layer=currentMineLayer(game),cell=mineCell(game.player),key=mineKey(cell),point=minePoint(cell);
 if(Math.hypot(point.x-game.player.x,point.y-game.player.y)>28)return mineNotice(game,'请站到通道格中央。');
 let nextDepth=depth+direction,next=mineLayer(game.progress.mining,nextDepth);
 if(direction===-1){if(depth===1||key!==layer.entry||!next)return mineNotice(game,'请沿小地图回到本层上行坡道。');}
 else if(direction===1){
  if(next){if(key!==layer.descent)return mineNotice(game,'请回到已建的下行坡道。');}
  else{
   if(depth===1&&key===mineKey(mineFreightCell(layer,depth)))return mineNotice(game,'请避开仓库升井，再开通下层坡道。');
   if(!layer.dug[key]||mineTerrain(cell,layer).water||mineCellArea(cell,layer)<4096)return mineNotice(game,'请在层内完整的干燥地块开通坡道。');
   const quote=mineLayerUnlockQuote(game),cost=quote.cost;
   if(!quote.affordable)return mineNotice(game,'开通材料不足：'+quote.missing.join('，')+'。矿石和木材使用仓库库存。');
   const r=miningCommit(game,(m,p,l)=>{p.coins-=cost.coins;m.ore-=cost.ore;p.wood-=cost.wood;m.layers??={};m.layers[nextDepth]=freshMineLayer(nextDepth,cell);l.descent=key;recordEconomy(p,'expense','mine:layer:'+nextDepth,{coins:cost.coins,wood:cost.wood});},`地下 ${nextDepth} 层已开通，大小与生态布局已永久保存。`);if(!r.ok)return r;
   next=mineLayer(game.progress.mining,nextDepth);
  }
 }else return mineNotice(game,'请选择上行或下行。');
 room.portalLatch=nextDepth+':'+key;room.portalWait=null;room.portalIntent=null;room.combatWork=null;room.combatRecovery=0;room.depth=nextDepth;room.autoDig=false;room.tool=null;room.dig=null;room.shaftWork=0;room.running=false;room.combat=null;room.bolts=[];room.scanWait=0;room.attackWait=0;room.ecologyActors=[];room.entryKey=direction===1?next.entry:currentMineLayer(game).descent;game.sceneApproach=null;
 Object.assign(game.player,point,{vx:0,vy:0,pushX:0,pushY:0});game.onEvent?.('cottage-change');return mineNotice(game,`已到地下 ${nextDepth} 层 · 覆盖地表 ${next.coverage.toFixed(0)}%。`,true);
}
