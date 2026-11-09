// 六档营地优惠统一读取配置，不再按等级分组或锁定装备。
import {CAMP_LEVELS} from '../../config/camp-level.js';
import {campProgress} from '../camp/camp-level.js';
// 只读预览，浏览高等级优惠不会改变当前购买价格。
export function challengeCatalog(progress){const current=campProgress(progress).tier;return {current,next:Math.min(current+1,6),tiers:CAMP_LEVELS.map((row,index)=>({...row,tier:index+1,reached:index+1<=current}))};}
