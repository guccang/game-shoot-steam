import { onArtStyleChange } from '../art-styles/state.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { drawWorldSign } from './world-signs.js';
import { box, oval, poly } from './primitives.js';
import { worldStoryPosts } from '../core/story/story-posts.js';

// 世界回信驿使用正式Canvas绘制与脚底排序，不生成另一套预览资产。

let INK = style.storyPosts.materialColor;
// 共用绘制与动作输入，风格差异由配置提供。
export function storyPostObjects(game) {
  return worldStoryPosts(game).map((p) => ({ ...p, type: 'story-post' }));
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawStoryPostGround(c, p) {
  c.save();
  c.translate(p.x, p.y);
  oval(c, 7, 3, 61, 13, '#29423530');
  for (const [x, y, w] of [
    [-20, 23, 18],
    [13, 30, 20],
    [-4, 45, 17],
  ])
    oval(c, x, y, w, 6, '#d8d3ae', '#869778', 1.5);
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawStoryPost(c, p, night = 0, player = null) {
  c.save();
  c.translate(p.x, p.y);
  if (player && player.y < p.y && Math.abs(player.x - p.x) < 58 && p.y - player.y < 100) c.globalAlpha = 0.65;
  const wood = night > 0.5 ? '#958164' : style.storyPosts.drawStoryPostColor,
    cream = night > 0.5 ? '#ccd0ad' : '#f6e8bc';
  for (const x of [-39, 35]) {
    box(c, x, -85, 9, 89, 3, wood, INK, style.storyPosts.drawStoryPostValue);
    oval(c, x + 4, 3, 10, 4, '#7b8d6d', INK, 1);
  }
  box(c, -43, -82, 88, 63, 5, wood, INK, style.storyPosts.drawStoryPostValue);
  box(c, -36, -75, 74, 47, 3, cream, INK, 1.5);
  poly(
    c,
    [
      [-57, -83],
      [0, -111],
      [59, -84],
      [51, -74],
      [0, -96],
      [-51, -74],
    ],
    style.storyPosts.drawStoryPostColor2,
    INK,
    style.storyPosts.drawStoryPostValue,
  );
  poly(
    c,
    [
      [0, -111],
      [59, -84],
      [51, -74],
      [0, -96],
    ],
    style.storyPosts.drawStoryPostColor3,
    INK,
    style.storyPosts.drawStoryPostValue2,
  );
  box(c, -26, -65, 36, 24, 3, '#fff2cf', INK, 1.8);
  c.beginPath();
  c.moveTo(-26, -64);
  c.lineTo(-8, -51);
  c.lineTo(10, -64);
  c.strokeStyle = INK;
  c.stroke();
  box(c, 17, -63, 13, 20, 1, '#a9c9a2', INK, 1);
  c.beginPath();
  c.moveTo(20, -57);
  c.lineTo(27, -57);
  c.moveTo(20, -52);
  c.lineTo(25, -52);
  c.stroke();
  box(c, 42, -42, 22, 33, 5, '#729375', INK, style.storyPosts.drawStoryPostValue2);
  box(c, 45, -35, 15, 4, 1, INK);
  oval(c, 53, -47, 5, 5, '#efda8d', INK, 1.5);
  drawWorldSign(c, p.name, 0, -16);
  c.restore();
}

// 同步共享模块顶层的材质常量，后续绘制立即使用新配置。
onArtStyleChange(() => {
  INK = style.storyPosts.materialColor;
});
