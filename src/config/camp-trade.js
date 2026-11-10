// 商路以五方友善营地为目的地，报价与佣金分别结算。
import {TOWN_LAYOUT} from './town-layout.js';
import {REGIONAL_CAMPS} from './regional-camps.js';
export const TRADE_BOARD={id:'trade-board',name:'营地订单板',mapId:'forest',x:TOWN_LAYOUT.spawn.x-60,y:TOWN_LAYOUT.spawn.y-12};
// 保留前两条旧线路ID，旧存档的护送和完成记录继续有效。
export const TRADE_STATIONS=REGIONAL_CAMPS.map((c,i)=>({id:['trade-relay','trade-amber'][i]||'trade-'+c.id,name:c.name+'商站',mapId:'forest',x:c.x+100,y:c.y+100,percent:120+i*15,commission:120+i*140,guards:i?2:0,camp:c.id}));
export const TRADE_SITES=[TRADE_BOARD,...TRADE_STATIONS];
// 各条护送线路分别挂牌；重复交付同一项仍可获取报酬。
export const TRADE_TASK_IDS=['crop','relic',...TRADE_STATIONS.map(s=>s.id)];
export const TRADE_BOARD_SIZE={width:144,height:84,foot:-32};
export const TRADE_RELIC={name:'遗失的货签',count:3,coins:90};
