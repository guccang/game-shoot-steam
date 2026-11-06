import {ORE_KEYS,oreCount,CART_CAPACITY,ORE_MASS} from '../config/mine-freight.js';
import {catLoad} from '../progression/load-weight.js';
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

// 先决定整笔矿物的去向，再把开采、地形与货物一同保存，失败不破坏矿点。
export function mineFreightReward(game,amount,change,message){
 const depth=game.cottage.depth||1,layer=mineLayer(game.progress.mining,depth);
 const near=new Set(layer.carts.filter(c=>Math.hypot(c.x-game.player.x,c.y-game.player.y)<=192).map(c=>c.id));
 // 三格内可投料；同一列的其余车厢随近车一起接矿。
 const byId=new Map(layer.carts.map(c=>[c.id,c]));
 function rootId(cart){while(cart.leader&&byId.has(cart.leader))cart=byId.get(cart.leader);return cart.id;}
 const roots=new Set([...near].map(id=>rootId(byId.get(id))));
 const carts=layer.carts.filter(c=>roots.has(rootId(c))).sort((a,b)=>Math.hypot(a.x-game.player.x,a.y-game.player.y)-Math.hypot(b.x-game.player.x,b.y-game.player.y));
 const allocations=[];
 let left=amount;
 for(const cart of carts){
  const n=Math.min(left,CART_CAPACITY-oreCount(cart.cargo));
  if(n>0)allocations.push([cart.id,n]);
  left-=n;if(!left)break;
 }
 if(left&&carts.length)return mineNotice(game,'矿车容量不足，请运到本层入口卸货，或再建一辆矿车。');
 if(left){const load=catLoad(game);if(load.weight+left*ORE_MASS>=load.capacity)return mineNotice(game,'背包装不下这批矿石，请在轨道上建造矿车，或先返回入口卸货。');}
 const key=mineMetal(depth);
 return miningCommit(game,(m,p,l)=>{
  change(m,p,l);
  if(left){m.bagOre??={};m.bagOre[key]=(m.bagOre[key]||0)+left;}
  for(const [id,n] of allocations){const cart=l.carts.find(c=>c.id===id);cart.cargo??={};cart.cargo[key]=(cart.cargo[key]||0)+n;}
 },message+' · '+(left?'已放入背包':'已装入矿车'));
}
// 到站时把整列车及随身矿一起送入仓库，动画只在存储成功之后播放。
export function unloadMineFreight(game,train,station){
 const room=game.cottage,m=game.progress.mining,amount=oreCount(m.bagOre)+train.reduce((n,c)=>n+oreCount(c.cargo),0);
 if(!amount||room.freightRetry>game.time)return;
 const ids=new Set(train.map(c=>c.id));
 const result=miningCommit(game,(next,p,l)=>{
  const stores=[next.bagOre,...l.carts.filter(c=>ids.has(c.id)).map(c=>c.cargo)];
  for(const cargo of stores)for(const [i,key] of ORE_KEYS.entries())if(cargo?.[key]){creditOre(p,i+1,cargo[key]);delete cargo[key];}
 },'已送至小屋仓库：矿石 ×'+amount+'，对应金属 ×'+amount+'。');
 if(result.ok){room.running=false;room.shipment={time:game.time,station,points:train.length?train.map(c=>({x:c.x,y:c.y})): [{x:game.player.x,y:game.player.y}]};}
 else {room.running=false;room.freightRetry=game.time+2;}
}
