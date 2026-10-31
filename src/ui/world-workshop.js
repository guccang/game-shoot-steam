import { i18nText } from "../i18n/index.js";
import {sceneHit,placeSceneHit} from './scene-hit.js';
// 地图工坊入口使用正式镜头和指针短按，拖动移动时不会误开工坊。
import {worldDistance} from '../world/coordinates.js';
import { WORKSHOP, VEHICLE_WORKSHOP, workshopAt } from '../world/workshop.js';
import { createEventScope } from '../platform/events.js';
// 门牌跟随最近世界镜像，触摸与键盘均可进入同一工作台。
export function createWorldWorkshop({ game, renderer, root, onEnter, kind = 'weapons' }) {
  const site=kind==='vehicle'?VEHICLE_WORKSHOP:WORKSHOP;
  const scope = createEventScope(), button = root.createElement('button');
  button.className = 'world-workshop-entry'; button.textContent = (kind==='vehicle'?i18nText('workshop.vehicle.title'):i18nText('workshop.weapons.title'));button.dataset.workshopKind=kind;
  button.setAttribute('aria-label', kind==='vehicle'?'打开载具升级界面':'打开武器升级界面');
  sceneHit(button,button.getAttribute('aria-label'));
  root.getElementById('game').after(button);
  // 建筑仍可短按与键盘进入，从本体开始拖动也交给战场摇杆，不形成输入挡板。
  button.setAttribute('data-world-movement', '');
  // 两类工坊均允许骑乘时靠近点击，打开面板不进入室内、不改变驾驶状态。
  function available() { return game.state === 'playing' && game.mapId === 'forest' && !game.realm && !game.story && !game.cottage && worldDistance(game.player,site)<=155 && !root.querySelector('dialog[open]') && !game.arrivalCinematic; }
  // 指针短按由统一输入判定后激活；原生键盘点击同样 detail=0，拖动释放不会误开。
  scope.on(button, 'click', e => { if (available() && e.detail === 0) onEnter(); });
  // 返回是否消费点击，让同一短按只打开一个地图入口。
  function tap(e) {
    if (!available() || !renderer.view) return false;
    const v = renderer.view, r = renderer.canvas.getBoundingClientRect();
    if (!workshopAt({ x: v.x + (e.clientX - r.left) / r.width * v.w, y: v.y + (e.clientY - r.top) / r.height * v.h },site)) return false;
    onEnter(); return true;
  }
  // 只保留一个透明 DOM 命中区，不因场景循环创建重复节点。
  function render() {
    button.hidden = !available() || !renderer.view;
    if (button.hidden) return;
    placeSceneHit(button,site,renderer,root.getElementById('game-frame'),{width:site.width,height:site.height,foot:8});
  }
  // 释放门牌和全部监听器。
  function dispose() { scope.dispose(); button.remove(); }
  return { tap, render, dispose };
}
