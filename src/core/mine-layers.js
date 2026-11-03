// 地下层按完整面积解锁，连接点与面积布局仅在首次施工时生成并保存。
import {mineCell,mineKey,minePoint} from '../config/mining.js';
import {MINE_ECOLOGY,mineCellArea,mineTerrain} from '../config/mine-ecology.js';
import {mineLayer,mineDevelopment,freshMineLayer} from '../progression/mine-layers.js';
import {miningCommit,mineNotice} from './mine-transactions.js';
// 获取当前层，未进入矿区时默认用于检查第一层存档。
export function currentMineLayer(game){return mineLayer(game.progress.mining,game.cottage?.depth||1);}
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
   const development=mineDevelopment(layer);if(development.ratio<MINE_ECOLOGY.unlockRatio)return mineNotice(game,`本层开发 ${(development.ratio*100).toFixed(2)}%，达到 50% 才能开通下一层。`);
   if(!layer.dug[key]||mineTerrain(cell,layer).water||mineCellArea(cell,layer)<4096)return mineNotice(game,'请在层内完整的干燥地块开通坡道。');
   const r=miningCommit(game,(m,p,l)=>{m.layers??={};m.layers[nextDepth]=freshMineLayer(nextDepth,cell);l.descent=key;},`地下 ${nextDepth} 层已开通，大小与生态布局已永久保存。`);if(!r.ok)return r;
   next=mineLayer(game.progress.mining,nextDepth);
  }
 }else return mineNotice(game,'请选择上行或下行。');
 room.depth=nextDepth;room.autoDig=false;room.dig=null;room.shaftWork=0;room.running=false;room.combat=null;room.bolts=[];room.scanWait=0;room.attackWait=0;room.ecologyActors=[];room.entryKey=direction===1?next.entry:currentMineLayer(game).descent;game.sceneApproach=null;
 Object.assign(game.player,point,{vx:0,vy:0,pushX:0,pushY:0});game.onEvent?.('cottage-change');return mineNotice(game,`已到地下 ${nextDepth} 层 · 覆盖地表 ${next.coverage.toFixed(0)}%。`,true);
}
