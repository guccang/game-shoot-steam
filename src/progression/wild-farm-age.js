// 野外田地寿命使用游戏历法，离线时间和设备时钟不参与清理判断。
import {LIVING_DAY_MS,LIVING_SEASONS} from '../config/living-world.js';
import {livingSeasonDays} from '../world/living-calendar.js';

// 按绝对游戏时间记录最近播种，跨年仍能精确比较完整一年。
export function wildFarmTime(calendar){return (calendar?.day||0)*LIVING_DAY_MS+(calendar?.elapsed||0);}
// 一年的长度跟随正式四季配置，不用当前年份编号判断是否到期。
export function wildFarmYear(){return livingSeasonDays()*LIVING_DAY_MS*LIVING_SEASONS.length;}
// 旧档没有播种日期时从当前游戏日期起算；未来坏值收回当前时间。
export function initializeWildFarmAges(farm,calendar){
 const now=wildFarmTime(calendar);
 for(const plot of farm.plots)if(plot.wild&&(!Number.isFinite(plot.wildSownAt)||plot.wildSownAt<0||plot.wildSownAt>now))plot.wildSownAt=now;
}
