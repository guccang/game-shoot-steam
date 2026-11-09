// 商路以已有道路和地标为目的地，报价与佣金分别结算。
import {TOWN_LAYOUT} from './town-layout.js';
import {LIVING_PLACES} from './living-world.js';
export const TRADE_BOARD={id:'trade-board',name:'营地订单板',mapId:'forest',x:TOWN_LAYOUT.spawn.x-60,y:TOWN_LAYOUT.spawn.y-12};
export const TRADE_STATIONS=[
 {id:'trade-relay',name:'旧哨驿站',mapId:'forest',x:LIVING_PLACES.relay.x+68,y:LIVING_PLACES.relay.y+45,percent:120,commission:120,guards:0},
 {id:'trade-amber',name:'琥珀林驿站',mapId:'forest',x:2530,y:890,percent:150,commission:260,guards:2},
];
export const TRADE_SITES=[TRADE_BOARD,...TRADE_STATIONS];
// 两条护送线路分别挂牌；重复交付同一项仍可获取报酬。
export const TRADE_TASK_IDS=['crop','relic',...TRADE_STATIONS.map(s=>s.id)];
export const TRADE_BOARD_SIZE={width:144,height:84,foot:-32};
export const TRADE_RELIC={name:'遗失的货签',count:3,coins:90};
