// 护送报价、固定波数与夜宿时长；坐标仍使用世界单位。
import {worldDistance} from '../world/coordinates.js';
import {displayMeters} from '../world/distance-units.js';
export const TRADE_ESCORT=Object.freeze({waves:3,batch:8,basePay:1000,perMeter:2,restSeconds:3,campDistanceMeters:200});
// 报价按循环地图最短距离计算，接单后保存，避免更新数值改变在途佣金。
export function escortQuote(origin,destination){const meters=displayMeters(worldDistance(origin,destination));return {meters,coins:TRADE_ESCORT.basePay+meters*TRADE_ESCORT.perMeter};}
// 击杀槽位按波次编号去重，读档丢失现场怪物时只补未击杀名额。
export function escortWaveDone(e){return Math.floor((e.defeated?.length||0)/TRADE_ESCORT.batch);}

// 货物完好百分比决定实收佣金，向下取整，损失不能带来额外收入。
export function escortPayout(e){return Math.floor(Math.max(0,e.pay||0)*Math.max(0,Math.min(100,e.hp??100))/100);}
