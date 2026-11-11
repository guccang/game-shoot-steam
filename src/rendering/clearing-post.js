// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { drawWorldSign } from './world-signs.js';
import { box, oval, poly } from './primitives.js';
import { CLEARING_POSTS } from '../config/clearing.js';
import { livingForest } from '../world/living-spaces.js';
import { challengeProgress } from '../config/economy.js';
import { drawChallengeRankIcon } from './challenge-rank.js';
import { canvasFont } from './text-style.js';

// 清缴告示牌的正式绘制器，双木柱、挑战盾牌区别于回信驿的信封屋顶。

// 常驻入口只在普通森林出现，故事、入职和秘境不混入接取按钮。
// 共用绘制与动作输入，风格差异由配置提供。
export function clearingPostObjects(game) {
  return livingForest(game)
    ? CLEARING_POSTS.map(post=>({ ...post, type: 'story-post', clearing: true, challenge: challengeProgress(game.progress) }))
    : [];
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawClearingPost(c, p, night, player) {
  const ink = style.clearingPost.drawClearingPostColor,
    wood = night > 0.5 ? '#958164' : style.clearingPost.drawClearingPostColor2,
    paper = night > 0.5 ? '#ccd0ad' : style.clearingPost.drawClearingPostColor3;
  c.save();
  c.translate(p.x, p.y);
  if (player && player.y < p.y && Math.abs(player.x - p.x) < 52 && p.y - player.y < 90) c.globalAlpha = 0.65;
  for (const x of [-36, 29]) {
    box(c, x, -77, 9, 79, 2, wood, ink, style.clearingPost.drawClearingPostValue);
    poly(
      c,
      [
        [x, -77],
        [x + 4, -83],
        [x + 13, -79],
        [x + 9, -73],
      ],
      '#dfbd83',
      ink,
      style.clearingPost.drawClearingPostValue2,
    );
    oval(c, x + 4, 3, 12, 5, '#8e9875', ink, 1);
  }
  box(c, -55, -91, 110, 76, 5, wood, ink, style.clearingPost.drawClearingPostValue3);
  box(c, -48, -85, 96, 62, 3, paper, ink, style.clearingPost.drawClearingPostValue2);
  poly(
    c,
    [
      [-58, -94],
      [54, -98],
      [59, -90],
      [-55, -86],
    ],
    '#d8b27b',
    ink,
    style.clearingPost.drawClearingPostValue,
  );
  const q = p.challenge,
    full = q.nextXp === null,
    ratio = full ? 1 : (q.xp - q.start) / (q.nextXp - q.start);
  drawChallengeRankIcon(c, q.tier, -41, -81, 22);
  c.fillStyle = ink;
  c.font = canvasFont(13, 700);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(`营地 ${q.tier} 级`, 12, -68);
  c.font = canvasFont(11, 700);
  c.fillText(`购买 ${q.percent / 10} 折`, 0, -48);
  box(c, -42, -36, 84, 7, 3, '#d6d7ad', ink, 1);
  if (ratio > 0) box(c, -41, -35, 82 * ratio, 5, 2, '#658b54');
  drawWorldSign(c, '清缴委托', 0, -13);
  c.restore();
}
