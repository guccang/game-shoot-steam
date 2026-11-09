// 营地故事只保存四个稳定阶段；旧档自动得到未接取状态。
import {REGIONAL_CAMPS} from '../../config/regional-camps.js';
export function normalizeRegionalCamps(raw){return Object.fromEntries(REGIONAL_CAMPS.map(c=>[c.id,{stage:Number.isInteger(raw?.[c.id]?.stage)?Math.max(0,Math.min(3,raw[c.id].stage)):0}]));}
