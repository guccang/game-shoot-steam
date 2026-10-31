import {displayMeters} from '../world/distance-units.js';
import {taskNavigationEnabled} from '../core/task-navigation.js';
import { i18nText } from "../i18n/index.js";
// 章节罗盘复用任务地标，以最近世界镜像计算方位；不创建寻路或碰撞实体。
import { nearest } from '../world/coordinates.js';
import {storyDefinition,storySceneActive} from '../core/story-definition.js';
import {storyInteractionTarget,storyInteractionNear} from '../core/story-interaction.js';

// SVG箭头默认朝上，屏幕坐标向下为正；重合时不伪造方向。
export function storyBearing(player, site, radius=storyDefinition().interaction.radius) {
  const target = nearest(site, player), dx = target.x - player.x, dy = target.y - player.y;
  const distance = Math.hypot(dx, dy);
  return { angle: (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360,
    near: distance <= radius, coincident: distance < 1, distance };
}

// 创建单个圆形导航；领主战移入血条左侧，保持方向指示而不覆盖预警。
export function createStoryNavigation(root) {
  const node = root.createElement('div'), quest = root.getElementById('quest'), boss = root.getElementById('boss-hud');
  node.id = 'story-navigation'; node.className = 'story-navigation'; node.hidden = true;
  node.setAttribute('role', 'img');
  node.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="story-navigation-disc" cx="22" cy="22" r="20"/><path class="story-navigation-arrow" d="M22 9 32 29 22 25 12 29Z"/><circle class="story-navigation-center" cx="22" cy="22" r="4"/></svg>';
  const distanceLabel=root.createElement('span');distanceLabel.className='story-navigation-distance';node.append(distanceLabel);
  quest.prepend(node);
  const arrow = node.querySelector('.story-navigation-arrow');
  // 只修改正式HUD元素；暂停、弹窗、试射、暂离时不留下旧目标。
  function render(game, objective) {
    // 需要点击时罗盘也指向实体，赶路阶段继续沿既有路点导航。
    const site = game.story&&objective.action?storyInteractionTarget(game):storyDefinition(game).world.sites[objective.site];
    node.hidden = !taskNavigationEnabled(game) || !game.story || game.story.phase !== 'active' || !!game.story.trial ||
      game.state !== 'playing' || !storySceneActive(game) || !site || !!root.querySelector('dialog[open]');
    boss.classList.toggle('story-has-navigation', !node.hidden && !!game.boss);
    if (node.hidden) return;
    const host = game.boss ? boss : quest;
    if (node.parentNode !== host) { if (game.boss) host.append(node); else host.prepend(node); }
    const bearing = storyBearing(game.player, site,storyDefinition(game).interaction.radius);
    if(objective.action)bearing.near=storyInteractionNear(game);
    const meters=displayMeters(bearing.distance),distanceText=i18nText('ui.story-navigation.distance',{p0:meters});
    distanceLabel.textContent=distanceText;node.dataset.distance=String(meters);
    arrow.setAttribute('transform', `rotate(${bearing.angle.toFixed(2)} 22 22)`);
    node.dataset.site = objective.site; node.dataset.near = String(bearing.near);
    node.dataset.coincident = String(bearing.coincident); node.dataset.angle = bearing.angle.toFixed(2);
    const label = `${objective.label} · ${bearing.near ? i18nText("ui.story-navigation.c6ffca86a5") : i18nText("ui.story-navigation.78ee8b51a9")}`;
    node.setAttribute('aria-label', label+' · '+distanceText); node.title = i18nText('ui.story-navigation.target-distance',{p0:meters});
  }
  // 卸载时恢复领主栏布局，不遗留动态节点。
  function dispose() { node.remove(); boss.classList.remove('story-has-navigation'); }
  return { render, dispose };
}
