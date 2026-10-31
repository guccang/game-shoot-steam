// 挑战等级统一盾牌徽章：阶级是永久战绩，轮廓与消耗资源图标区分。
import {canvasFont} from './text-style.js';

// 场景盾牌沿用面板徽章的轮廓与阶级数字，按调用方的局部坐标缩放。
export function drawChallengeRankIcon(c,tier,x,y,size=24){
 const rank=Math.max(0,Math.floor(Number(tier)||0));
 c.save();c.translate(x,y);c.scale(size/40,size/40);
 for(const [path,fill] of [['M5 6 Q20 0 35 6 L34 25 Q32 35 20 41 Q8 35 6 25 Z','#ecd596'],['M9 9 Q20 5 31 9 L30 24 Q28 31 20 36 Q12 31 10 24 Z','#fff3cf']]){
  const shape=new Path2D(path);c.fillStyle=fill;c.fill(shape);if(fill==='#ecd596'){c.strokeStyle='#49684c';c.lineWidth=2;c.stroke(shape);}
 }
 c.fillStyle='#789566';c.fill(new Path2D('m20 7 1.5 3 3.5.5-2.5 2.4.6 3.4-3.1-1.6-3.1 1.6.6-3.4-2.5-2.4 3.5-.5Z'));
 c.font=canvasFont(17,700);c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle='#36543e';c.fillText(String(rank),20,31);c.restore();
}

export function challengeRankIcon(tier){
 const rank=Math.max(0,Math.floor(Number(tier)||0));
 return `<svg class="challenge-rank-icon" viewBox="0 0 40 44" aria-hidden="true" focusable="false"><path d="M5 6 Q20 0 35 6 L34 25 Q32 35 20 41 Q8 35 6 25 Z" fill="#ecd596" stroke="#49684c" stroke-width="2"/><path d="M9 9 Q20 5 31 9 L30 24 Q28 31 20 36 Q12 31 10 24 Z" fill="#fff3cf"/><path d="m20 7 1.5 3 3.5.5-2.5 2.4.6 3.4-3.1-1.6-3.1 1.6.6-3.4-2.5-2.4 3.5-.5Z" fill="#789566"/><text x="20" y="31" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="700" fill="#36543e">${rank}</text></svg>`;
}
