// 散弹飘字按一次发射与实际目标累计；只整理表现，不参与扣血或奖励。
import {worldDistance} from '../world/coordinates.js';

// 同枪弹丸更新总数；不同目标和后续射击让开现有数字，寿命不被连续命中续满。
export function showDamageNumber(game,target,amount,critical,group){
 if(!group){game.float(target.x,target.y,critical?`${amount}!`:String(amount),critical?'#ffe396':'#fffef0',critical);return;}
 const existing=game.numbers.find(n=>n.damageGroup===group&&n.damageTarget===target&&n.life>0);
 if(existing){existing.amount+=amount;existing.big ||= critical;existing.text=String(existing.amount)+(existing.big?'!':'');existing.color=existing.big?'#ffe396':'#fffef0';return;}
 const n={x:target.x,y:target.y-28,text:critical?`${amount}!`:String(amount),amount,color:critical?'#ffe396':'#fffef0',big:critical,life:.95,damageGroup:group,damageTarget:target};
 // 纵向分层最多六格；使用最近世界镜像，边界附近也不会叠成一团。
 for(let i=0;i<6;i++){
  if(!game.numbers.some(other=>other.life>0&&worldDistance(n,other)<Math.max(36,n.text.length*13)))break;
  n.y-=30;
 }
 game.numbers.push(n);if(game.numbers.length>65)game.numbers.shift();
}
