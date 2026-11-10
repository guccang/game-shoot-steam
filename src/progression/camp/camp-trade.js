import {escortQuote,TRADE_ESCORT} from '../../config/trade-escort.js';
// 只保存订单事实；重开页面或读档都不会重新发放报酬。
import {FARM_CROPS} from '../../config/farm.js';
import {TRADE_BOARD,TRADE_SITES,TRADE_STATIONS,TRADE_RELIC,TRADE_TASK_IDS} from '../../config/camp-trade.js';
import {canonical} from '../../world/coordinates.js';
// 旧存档从空订单板开始，未知商品与失效路线不参与结算。
export function normalizeTrade(raw,ledger){
 const serial=Number.isSafeInteger(raw?.serial)&&raw.serial>=0?raw.serial:0;
 const crop=FARM_CROPS.some(c=>c.id===raw?.crop)?raw.crop:null;
 const relic=Number.isInteger(raw?.relic)?Math.max(0,Math.min(TRADE_RELIC.count,raw.relic)):null;
 const e=raw?.escort,station=TRADE_SITES.find(s=>s.id===e?.station);
 const escort=station&&Number.isFinite(e.x)&&Number.isFinite(e.y)?{origin:TRADE_SITES.find(s=>s.id===e.origin)?.id||TRADE_BOARD.id,station:station.id,...canonical(e),cleared:Math.min(station.guards,Math.max(0,Math.floor(Number(e.cleared)||0))),ambush:e.ambush===true,hp:Math.min(100,Math.max(0,Number.isFinite(e.hp)?e.hp:100))}:null;
 if(escort){const origin=TRADE_SITES.find(s=>s.id===escort.origin)||TRADE_BOARD;Object.assign(escort,{pay:Number.isSafeInteger(e.pay)&&e.pay>0?Math.min(e.pay,1000000):escortQuote(origin,station).coins,rounds:Math.max(0,Math.min(999999,Math.floor(Number(e.rounds)||0))),wave:Math.max(0,Math.min(3,Math.floor(Number(e.wave)||0))),defeated:[...new Set((Array.isArray(e.defeated)?e.defeated:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<TRADE_ESCORT.waves*TRADE_ESCORT.batch))],travel:Math.max(0,Math.min(1000000,Number(e.travel)||0)),camped:e.camped===true});escort.cleared=escort.defeated.length;}
 const completed=new Set(Array.isArray(raw?.completed)?raw.completed:[]);
 // 旧档按已交付次数与历史收款恢复。两站曾共用账目，只认能确认线路的佣金。
 if(!Array.isArray(raw?.completed)){
  if(serial>0)completed.add('crop');
  if(ledger?.income['trade:give-relic:coins']>0)completed.add('relic');
  const payouts=(ledger?.events||[]).filter(e=>e.source==='trade:finish-escort'&&e.type==='income').map(e=>e.amounts.coins);
  payouts.push(ledger?.income['trade:finish-escort:coins']);
  for(const station of TRADE_STATIONS.slice(0,2)){
   const other=TRADE_STATIONS.find(s=>s!==station);
   if(payouts.some(n=>n>0&&n%other.commission!==0))completed.add(station.id);
  }
 }
 return {serial,crop,relic,escort,failed:TRADE_TASK_IDS.filter(id=>Array.isArray(raw?.failed)&&raw.failed.includes(id)),keep:raw?.keep===true,completed:TRADE_TASK_IDS.filter(id=>completed.has(id))};
}
