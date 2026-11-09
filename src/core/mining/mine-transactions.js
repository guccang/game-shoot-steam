import {ORE_KEYS,ORE_NAMES,oreCount,CART_CAPACITY,ORE_MASS,mineOreKind,MINE_FREIGHT_LOADING} from '../../config/mine-freight.js';
import {mineCell} from '../../config/mining.js';
import {catLoad} from '../../progression/inventory/load-weight.js';
// 地下设施与生态奖励共用原子存档，失败不改变库存或地图状态。
import {bindEconomy,economyFor} from '../../config/economy.js';
import {capturePatrol} from '../battle/patrol-session.js';
import {mineLayer} from '../../progression/mining/mine-layers.js';
// 核心结果始终使用中文，并保留当前房间的可读反馈。
export function mineNotice(game,message,ok=false){if(game.cottage)game.cottage.notice=message;return {ok,message};}
// 完整复制候选进度后再保存，避免巡游快照写入共享对象；失败不污染任何旧档字段。
export function miningCommit(game,change,message){
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));
 change(next.mining,next,mineLayer(next.mining,game.cottage?.depth||1));const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 try{if(game.livingPersist&&game.livingPersist(next)!==true)return mineNotice(game,'保存失败，地图与材料未改变，请重试。');}catch{return mineNotice(game,'保存失败，地图与材料未改变，请重试。');}
 game.progress=next;game.onEvent?.('mining-change');return mineNotice(game,message,true);
}

// 提示明确尚未提炼，岩壁与天然矿物不会直接产出金属块。
export function oreDescription(key,amount){
 return ORE_NAMES[key]+' ×'+amount;
}
// 仅写入事务候选，存储失败时放弃整笔收益。
export function creditOre(progress,key,amount){
 if(key==='stone')progress.mining.ore=Math.min(9999999,progress.mining.ore+amount);
 else progress.industry.raw[key]=Math.min(9999999,(progress.industry.raw[key]||0)+amount);
}

// 开采投料与背包装车使用相同的同层列车范围，首尾任一节靠近即可整列接矿。
function nearbyFreightCarts(game,layer){
 const near=new Set(layer.carts.filter(c=>Math.hypot(c.x-game.player.x,c.y-game.player.y)<=MINE_FREIGHT_LOADING.radius).map(c=>c.id));
 if(!near.size)return [];
 // 三格内可投料；同一列的其余车厢随近车一起接矿。
 const byId=new Map(layer.carts.map(c=>[c.id,c])),rootsById=new Map();
 // 缓存整条挂接链的根，长列车也只遍历一次，异常环不导致主循环卡死。
 function rootId(cart){
  const visited=new Set();while(cart.leader&&byId.has(cart.leader)&&!rootsById.has(cart.id)&&!visited.has(cart.id)){visited.add(cart.id);cart=byId.get(cart.leader);}
  const root=rootsById.get(cart.id)??cart.id;rootsById.set(cart.id,root);for(const id of visited)rootsById.set(id,root);return root;
 }
 const roots=new Set([...near].map(id=>rootId(byId.get(id))));
 return layer.carts.filter(c=>roots.has(rootId(c))).sort((a,b)=>Math.hypot(a.x-game.player.x,a.y-game.player.y)-Math.hypot(b.x-game.player.x,b.y-game.player.y));
}
// 按实际余量分装；满载仅放弃未收纳矿物，开采和地形仍随同一笔事务保存。
export function mineFreightReward(game,amount,change,message,source={cell:mineCell(game.player)}){
 const depth=game.cottage.depth||1,layer=mineLayer(game.progress.mining,depth),carts=nearbyFreightCarts(game,layer);
 const allocations=[];
 let left=amount;
 for(const cart of carts){
  const n=Math.min(left,Math.max(0,CART_CAPACITY-oreCount(cart.cargo)));
  if(n>0)allocations.push([cart.id,n]);
  left-=n;if(!left)break;
 }
 const load=left?catLoad(game):null,bagged=load?Math.min(left,Math.max(0,Math.floor((load.capacity-load.weight+1e-6)/ORE_MASS))):0,discarded=left-bagged;
 const stored=amount-left,feedback=[stored?'矿车收纳 '+stored+' 份':'',bagged?'背包收纳 '+bagged+' 份':'',discarded?'空间已满，'+discarded+' 份未收纳，可继续挖掘':''].filter(Boolean).join(' · ');
 const key=mineOreKind(depth,layer.seed,source.cell,source.cycle||0);
 return miningCommit(game,(m,p,l)=>{
  change(m,p,l);
  if(bagged){m.bagOre??={};m.bagOre[key]=(m.bagOre[key]||0)+bagged;}
  for(const [id,n] of allocations){const cart=l.carts.find(c=>c.id===id);cart.cargo??={};cart.cargo[key]=(cart.cargo[key]||0)+n;}
 },message+'，开采出 '+oreDescription(key,amount)+' · '+feedback);
}
// 进入矿车投料范围后自动搬运背包原矿，按四矿种逐份分配，不改变类型或数量。
export function autoLoadMineFreight(game){
 const room=game.cottage;if(room?.kind!=='mine'||game.state!=='playing'||game.player.hp<=0||!oreCount(game.progress.mining.bagOre))return false;
 const depth=room.depth||1,now=game.time;
 if(room.cartLoadDepth!==depth){room.cartLoadDepth=depth;room.cartLoadNext=room.cartLoadRetry=0;}
 if(now<(room.cartLoadRetry||0)||now<(room.cartLoadNext||0))return false;
 room.cartLoadNext=now+MINE_FREIGHT_LOADING.interval;
 const layer=mineLayer(game.progress.mining,depth),carts=nearbyFreightCarts(game,layer),bag={...game.progress.mining.bagOre},allocations=[];
 for(const cart of carts){
  let roomLeft=Math.max(0,CART_CAPACITY-oreCount(cart.cargo));
  for(const key of ORE_KEYS){const n=Math.min(roomLeft,bag[key]||0);if(n){allocations.push([cart.id,key,n]);bag[key]-=n;roomLeft-=n;}if(!roomLeft)break;}
 }
 if(!allocations.length)return false;
 const count=allocations.reduce((sum,[,,n])=>sum+n,0),result=miningCommit(game,(m,p,l)=>{
  for(const [id,key,n] of allocations){const cart=l.carts.find(c=>c.id===id);cart.cargo??={};cart.cargo[key]=(cart.cargo[key]||0)+n;m.bagOre[key]-=n;if(!m.bagOre[key])delete m.bagOre[key];}
 },'背包矿物 ×'+count+' 已自动装入附近矿车。');
 if(!result.ok)room.cartLoadRetry=now+MINE_FREIGHT_LOADING.retry;
 return result.ok;
}
// 到站时把整列车及随身矿一起送入仓库，动画只在存储成功之后播放。
export function unloadMineFreight(game,train,station,includeBag=true){
 const room=game.cottage,m=game.progress.mining,amount=(includeBag?oreCount(m.bagOre):0)+train.reduce((n,c)=>n+oreCount(c.cargo),0);
 if(!amount||room.freightRetry>game.time)return;
 const ids=new Set(train.map(c=>c.id));
 const result=miningCommit(game,(next,p,l)=>{
  const stores=l.carts.filter(c=>ids.has(c.id)).map(c=>c.cargo);
  if(includeBag)stores.push(next.bagOre);
  for(const cargo of stores)for(const key of ORE_KEYS)if(cargo?.[key]){creditOre(p,key,cargo[key]);delete cargo[key];}
 },'已送至仓库：矿物 ×'+amount+'。石矿用于施工或切制石块，金属原矿可在提炼厂加工。');
 if(result.ok){room.running=false;room.shipment={time:game.time,station,points:train.length?train.map(c=>({x:c.x,y:c.y})): [{x:game.player.x,y:game.player.y}]};}
 else {room.running=false;room.freightRetry=game.time+2;}
}
