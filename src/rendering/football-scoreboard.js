// 足球站牌面直接读取正式纪录，累计和单场最高不依赖打开弹窗。
import {canvasFont} from './text-style.js';

// 大数字使用中文数量级，牌面保持固定宽度；向下取整不夸大记录。
function goalCount(value){
 const n=Math.max(0,Math.floor(Number(value)||0));
 for(const [unit,scale] of [['兆',1e12],['亿',1e8],['万',1e4]])if(n>=scale)return (Math.floor(n/scale*10)/10)+unit;
 return String(n);
}

// 与站牌共用局部坐标和色调，两行文字在牌面内分别左对齐标题、右对齐数字。
export function drawFootballScoreboard(c,record={}){
 c.save();c.fillStyle='#315a43';c.font=canvasFont(10,700);c.textBaseline='middle';
 for(const [label,value,y] of [['累计进球',(record.totalGoalsPartial?'≥':'')+goalCount(record.totalGoals),-55],['单场最高进球',goalCount(record.best),-37]]){
  c.textAlign='left';c.fillText(label,-49,y,60);c.textAlign='right';c.fillText(value,49,y,32);
 }
 c.restore();
}
