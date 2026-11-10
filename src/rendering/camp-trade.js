// 订单板、驿站和商队使用现有木牌与马车绘制器，同一世界队列处理遮挡。
import {TRADE_BOARD,TRADE_BOARD_SIZE,TRADE_TASK_IDS,TRADE_SITES,TRADE_STATIONS} from '../config/camp-trade.js';
import {tradeField} from '../core/camp/camp-trade.js';
import {drawWorldSign} from './world-signs.js';
import {drawVehicleTracks,drawVehicleArmor} from './vehicle.js';
import {box,oval} from './primitives.js';
import {canvasFont} from './text-style.js';

// 双柱木牌按脚底排序，两列数字从已交付的订单记录实时读取。
function drawOrderBoard(c,item,trade,night){
 const {width,height,foot}=TRADE_BOARD_SIZE,left=-width/2,top=foot-height,ink='#3c503c';
 c.save();c.translate(item.x,item.y);
 oval(c,3,-1,width*.43,5,'rgba(58,74,45,.18)');
 for(const x of [-50,50])box(c,x-4,top+9,8,-top-9,2,night>.5?'#947955':'#b38d62',ink,2);
 box(c,left,top,width,height-15,5,'#b99164',ink,2);
 box(c,left+4,top+4,width-8,24,3,'#42644d',ink,1);
 c.textAlign='center';c.textBaseline='middle';c.font=canvasFont(17,700);c.fillStyle='#fff3ce';
 c.fillText(item.name,0,top+16);
 box(c,left+4,top+31,width-8,34,2,'#fff1ce','#8f825f',1);
 c.fillStyle='#c5b68d';c.fillRect(-.5,top+35,1,26);
 c.fillStyle=ink;c.font=canvasFont(12,700);
 c.fillText('任务总数',-34,top+40);c.fillText('已完成',34,top+40);
 c.font=canvasFont(19,700);c.fillText(String(TRADE_TASK_IDS.length),-34,top+56);
 c.fillStyle='#315d42';c.fillText(String(trade?.completed?.length??0),34,top+56);
 c.restore();
}
// 只在真实森林地面展示，护送单位从当前存档读取位置。
export function tradeObjects(game){
 if(!tradeField(game))return [];
 // 正式帧优先使用表现坐标；逻辑查询及未启用插值的工作台仍读取权威存档。
 const sites=TRADE_SITES.map(s=>({...s,type:'trade-post'})),cart=Object.hasOwn(game,'tradeEscort')?game.tradeEscort:game.progress.trade?.escort;
 // 远站在林中设有收货帐篷、桌台与营灯，各自按脚底排序。近站沿用旧哨站原建筑。
 const outpost=TRADE_STATIONS.find(s=>s.id==='trade-amber');
 for(const [part,dx,dy] of [['tent',-76,-38],['table',32,-32],['lamp',61,-37]])sites.push({type:'outdoor-camp',part,x:outpost.x+dx,y:outpost.y+dy});
 for(const retired of game.tradeDepartures||[])sites.push({...retired,type:'trade-cart'});
 if(cart){sites.push({...cart,type:'trade-cart'});if(cart.camped)for(const [part,dx,dy]of [['tent',-80,0],['cot',0,55],['lamp',55,0]])sites.push({type:'outdoor-camp',part,x:cart.x+dx,y:cart.y+dy});}
 return sites;
}
// 商队的马步与轮纹沿用真实车体动作时钟，木牌不增加阻挡。
export function drawTradeObject(c,item,game,night,reduced){
 if(item.type==='trade-cart'){
  const vehicle={index:14,...(item.departing?item.motion:game.tradeMotion),active:true,angle:0,weaponIndex:0,recoil:{rise:0,kick:0}};
  drawVehicleTracks(c,item,vehicle,reduced,game.time,game.progress);
  drawVehicleArmor(c,item,vehicle,game.progress,game.time,reduced);
  drawWorldSign(c,item.departing?'返程商队':'商队 '+Math.ceil(item.hp)+'%',item.x,item.y-72);
 }else if(item.id===TRADE_BOARD.id){
  drawOrderBoard(c,item,game.progress.trade,night);
 }else{
  box(c,item.x-3,item.y-40,6,40,2,night>.5?'#776949':'#aa895c','#465643',1);
  drawWorldSign(c,item.name,item.x,item.y-25);
 }
}
