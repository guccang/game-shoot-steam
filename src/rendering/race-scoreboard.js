// 赛道站牌直接读取已保存的完赛记录，未有成绩时不显示虚构名次或时间。
import {raceTime} from '../config/forest-race.js';
import {canvasFont} from './text-style.js';

// 复用站牌局部坐标，标题与数值分列，较长数字限制在牌面内。
export function drawRaceScoreboard(c,record={}){
 const best=record.best,clears=record.clears||0;
 const count=clears>=10000?`${Math.floor(clears/1000)/10}万`:String(clears);
 c.save();c.fillStyle='#315a43';c.font=canvasFont(10,700);c.textBaseline='middle';
 for(const [label,value,y] of [
  ['完赛次数',`${count}次`,-70],
  ['最好名次',best>=1&&best<=4?`第${5-best}名`:'暂无',-52],
  ['最快用时',record.bestTimeMs>0?raceTime(record.bestTimeMs/1000):'暂无',-34],
 ]){
  c.textAlign='left';c.fillText(label,-49,y,43);
  c.textAlign='right';c.fillText(value,49,y,48);
 }
 c.restore();
}
