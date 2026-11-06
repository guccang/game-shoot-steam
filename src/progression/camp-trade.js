// 只保存订单事实；重开页面或读档都不会重新发放报酬。
import {FARM_CROPS} from '../config/farm.js';
import {TRADE_STATIONS,TRADE_RELIC} from '../config/camp-trade.js';
import {canonical} from '../world/coordinates.js';
// 旧存档从空订单板开始，未知商品与失效路线不参与结算。
export function normalizeTrade(raw){
 const serial=Number.isSafeInteger(raw?.serial)&&raw.serial>=0?raw.serial:0;
 const crop=FARM_CROPS.some(c=>c.id===raw?.crop)?raw.crop:null;
 const relic=Number.isInteger(raw?.relic)?Math.max(0,Math.min(TRADE_RELIC.count,raw.relic)):null;
 const e=raw?.escort,station=TRADE_STATIONS.find(s=>s.id===e?.station);
 const escort=station&&Number.isFinite(e.x)&&Number.isFinite(e.y)?{station:station.id,...canonical(e),cleared:Math.min(station.guards,Math.max(0,Math.floor(Number(e.cleared)||0))),ambush:e.ambush===true,hp:Math.min(100,Math.max(1,Number(e.hp)||100))}:null;
 return {serial,crop,relic,escort,keep:raw?.keep===true};
}
