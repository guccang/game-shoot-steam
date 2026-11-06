// 订单板、驿站和商队使用现有木牌与马车绘制器，同一世界队列处理遮挡。
import {TRADE_SITES,TRADE_STATIONS} from '../config/camp-trade.js';
import {tradeField} from '../core/camp-trade.js';
import {drawWorldSign} from './world-signs.js';
import {drawVehicleTracks,drawVehicleArmor} from './vehicle.js';
import {box} from './primitives.js';
// 只在真实森林地面展示，护送单位从当前存档读取位置。
export function tradeObjects(game){
 if(!tradeField(game))return [];
 const sites=TRADE_SITES.map(s=>({...s,type:'trade-post'})),cart=game.progress.trade?.escort;
 // 远站在林中设有收货帐篷、桌台与营灯，各自按脚底排序。近站沿用旧哨站原建筑。
 const outpost=TRADE_STATIONS.find(s=>s.id==='trade-amber');
 for(const [part,dx,dy] of [['tent',-76,-38],['table',32,-32],['lamp',61,-37]])sites.push({type:'outdoor-camp',part,x:outpost.x+dx,y:outpost.y+dy});
 if(cart)sites.push({...cart,type:'trade-cart'});
 return sites;
}
// 商队的马步与轮纹沿用真实车体动作时钟，木牌不增加阻挡。
export function drawTradeObject(c,item,game,night,reduced){
 if(item.type==='trade-cart'){
  const vehicle={index:14,...game.tradeMotion,active:true,angle:0,weaponIndex:0,recoil:{rise:0,kick:0}};
  drawVehicleTracks(c,item,vehicle,reduced,game.time,game.progress);
  drawVehicleArmor(c,item,vehicle,game.progress,game.time,reduced);
  drawWorldSign(c,'商队 '+Math.ceil(item.hp)+'%',item.x,item.y-72);
 }else{
  box(c,item.x-3,item.y-40,6,40,2,night>.5?'#776949':'#aa895c','#465643',1);
  drawWorldSign(c,item.name,item.x,item.y-25);
 }
}
