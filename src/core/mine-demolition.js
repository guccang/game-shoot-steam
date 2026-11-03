// 拆除只作用于当前层附近设施，资源和轨网通过同一事务提交。
import {MINING,MINE_DIRECTIONS,mineCell,mineKey,minePoint} from '../config/mining.js';
import {railCell,railExits,cartOnSegment} from '../config/mine-rail-routes.js';
import {mineInsideBounds} from '../config/mine-ecology.js';
import {mineOccupancy} from '../physics/mine-motion.js';
import {currentMineLayer} from './mine-layers.js';
import {miningCommit,mineNotice} from './mine-transactions.js';
// 施工距离沿可通行地面检查，禁止穿墙远程回收。
function reachable(game,point,limit){
 const p=game.player,dx=point.x-p.x,dy=point.y-p.y,distance=Math.hypot(dx,dy);
 if(distance>limit)return false;
 const steps=Math.max(1,Math.ceil(distance/4));
 for(let i=0;i<=steps;i++)if(!mineOccupancy(game,p.x+dx*i/steps,p.y+dy*i/steps))return false;
 return true;
}
// 格心占用和两格之间的完整轨段都受保护，空车也不能被抽掉脚下轨道。
function occupied(layer,key){
 return layer.carts.some(c=>mineKey(mineCell(c))===key||cartOnSegment(layer,c)&&(c.from===key||c.target===key));
}
// 只读查询也可用于暂停中的确认页面；执行时再次检查同一目标。
export function mineRemovalCheck(game,target){
 const room=game.cottage;
 if(room?.kind!=='mine'||room.ride||game.vehicle.active)return {ok:false,message:'请停车下车，再回收设施。'};
 const layer=currentMineLayer(game);
 if(target?.kind==='rail'){
  if(typeof target.key!=='string'||!layer.rails[target.key])return {ok:false,message:'这里没有可拆除的铁轨。'};
  const point=minePoint(railCell(target.key));
  if(!mineInsideBounds(layer,point.x,point.y)||!reachable(game,point,80))return {ok:false,message:'请走近这段铁轨，不能隔墙拆除。'};
  if(occupied(layer,target.key))return {ok:false,message:'铁轨被矿车占用，请先移走或回收矿车。'};
 }else if(target?.kind==='cart'){
  const cart=layer.carts.find(c=>c.id===target.id);
  if(!cart||!reachable(game,cart,56))return {ok:false,message:'请走近要回收的空矿车。'};
 }else return {ok:false,message:'请选择铁轨或矿车。'};
 const refund=MINING.prices[target.kind];
 return {ok:true,message:'回收后返还 '+refund.ore+' 矿石、'+refund.wood+' 木材。',refund};
}
// 确认页明确列出脚下、前方和最近空车，固定标识避免确认时换目标。
export function mineRemovalChoices(game){
 if(game.cottage?.kind!=='mine')return [];
 const cell=mineCell(game.player),direction=MINE_DIRECTIONS[game.cottage.direction??1];
 const here={kind:'rail',key:mineKey(cell),label:'拆除脚下铁轨'},ahead={kind:'rail',key:mineKey({x:cell.x+direction.x,y:cell.y+direction.y}),label:'拆除前方铁轨'};
 const cart=currentMineLayer(game).carts.filter(c=>reachable(game,c,56)).sort((a,b)=>Math.hypot(a.x-game.player.x,a.y-game.player.y)-Math.hypot(b.x-game.player.x,b.y-game.player.y)||a.id-b.id)[0];
 return [here,ahead,{kind:'cart',id:cart?.id,label:'回收附近矿车'}].map(target=>({...target,...mineRemovalCheck(game,target)}));
}
// 回收原价材料，不返还消耗过的燃料；存档失败时设施、库存和工具均不改变。
export function removeMineFacility(game,target){
 if(game.state!=='playing'||game.player.hp<=0)return mineNotice(game,'请回到矿道后再回收。');
 const check=mineRemovalCheck(game,target);if(!check.ok)return mineNotice(game,check.message);
 const result=miningCommit(game,(mining,progress,layer)=>{
  if(target.kind==='cart')layer.carts=layer.carts.filter(c=>c.id!==target.id);
  else{
   delete layer.rails[target.key];
   // 拆掉出口或三岔变两岔时清除失效路口规则，只遍历该层已有规则。
   for(const [key,direction] of Object.entries(layer.junctions||{})){
    const exits=railExits(layer,key);
    if(exits.length<3||!exits.some(e=>e.i===direction))delete layer.junctions[key];
   }
   for(const cart of layer.carts){
    if(cart.previous===target.key)cart.previous=null;
    if(cart.from===target.key||cart.target===target.key){cart.from=null;cart.target=null;}
    if(cart.departure!=null&&!railExits(layer,mineKey(mineCell(cart))).some(e=>e.i===cart.departure))cart.departure=null;
   }
  }
  mining.ore+=check.refund.ore;progress.wood+=check.refund.wood;
 },(target.kind==='cart'?'矿车已回收。':'铁轨已拆除，通道保留。')+check.message);
 if(result.ok)Object.assign(game.cottage,{tool:null,autoDig:false,dig:null,shaftWork:0,autoBuildKey:null});
 return result;
}
