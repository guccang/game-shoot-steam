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
 const escort=station&&Number.isFinite(e.x)&&Number.isFinite(e.y)?{origin:TRADE_SITES.find(s=>s.id===e.origin)?.id||TRADE_BOARD.id,station:station.id,...canonical(e),cleared:Math.min(station.guards,Math.max(0,Math.floor(Number(e.cleared)||0))),ambush:e.ambush===true,hp:Math.min(100,Math.max(1,Number(e.hp)||100))}:null;
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
 return {serial,crop,relic,escort,keep:raw?.keep===true,completed:TRADE_TASK_IDS.filter(id=>completed.has(id))};
}
