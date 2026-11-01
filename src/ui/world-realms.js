import {BUILDING_ENTRIES} from '../config/building-entries.js';
import { i18nText } from "../i18n/index.js";
import {sceneHit,placeSceneHit} from './scene-hit.js';
// 将世界建筑的短按与可聚焦门牌连接到现有秘境入口，不复制玩法或存档逻辑。
import { REALM_ENTRANCES, realmEntranceAt } from '../world/realm-entrances.js';
import { REALMS } from '../config/realms.js';
import { createEventScope } from '../platform/events.js';

// 门牌随正式镜头逐帧更新，既支持触摸建筑，也支持键盘激活入口。
export function createWorldRealms({ game, renderer, root, onEnter }) {
  const scope = createEventScope(), layer = root.createElement('div');
  layer.className = 'world-realm-entrances';
  layer.setAttribute('aria-label', i18nText("ui.world-realms.fe9f0e69c5"));
  const buttons = REALM_ENTRANCES.map(entry => {
    const button = root.createElement('button');
    button.className = `world-realm-entry world-realm-${entry.mode}`;
    button.dataset.worldRealm = entry.mode;
    button.textContent = entry.mode==='fire'?i18nText("ui.world-realms.80676f45bb"):`${REALMS[entry.mode].name} ↗`;
    button.setAttribute('aria-label', i18nText("ui.world-realms.683cc0dabb", { p0: (REALMS[entry.mode].name) }));
    sceneHit(button,button.getAttribute('aria-label'));
    scope.on(button,'click',event=>{if(event.detail===0&&available())enter(entry.mode);});
    layer.append(button);
    return button;
  });
  // 插入画布后方的界面层级，资源条、菜单和战斗 HUD 保持原有优先级。
  root.getElementById('game').after(layer);

  // 仅巡游中可以点击世界入口，暂停、死亡、弹窗和秘境场内不响应。
  function available() {
    return !game.cottage && !game.campDefense && !game.arrivalCinematic && game.state === 'playing' && game.mapId !== 'jiuzhaigou' && !game.realm && !game.story && !root.querySelector('dialog[open]');
  }
  // 点击和候停共用闩锁，离开秘境返回原门口时不会再次自动进入。
  function enter(mode){if(['fire','tower'].includes(mode)||!available())return false;const entry=BUILDING_ENTRIES.find(e=>e.type==='realm'&&e.key===mode);if(!entry)return false;return onEnter(mode);}
  // 采用实际画布尺寸与镜头倍率，覆盖手机、广角武器以及循环世界镜像。
  function tap(event) {
    if (!available() || !renderer.view) return;
    const rect = renderer.canvas.getBoundingClientRect(), view = renderer.view;
    const entry = realmEntranceAt({ x: view.x + (event.clientX-rect.left)/rect.width*view.w,
      y: view.y + (event.clientY-rect.top)/rect.height*view.h });
    if (entry) enter(entry.mode);
  }
  // 入库后不把浮动门牌压在下车猫猫头上；建筑本体与菜单仍可接警。
  // 门牌只显示短名称，交互区域至少四十四像素，玩法说明继续由原菜单问号承载。
  function render() {
    layer.hidden = !available() || !renderer.view;
    if (layer.hidden) return;
    REALM_ENTRANCES.forEach((entry,i)=>{
      if(['fire','tower'].includes(entry.mode)){buttons[i].hidden=true;return;}
      placeSceneHit(buttons[i],entry,renderer,root.getElementById('game-frame'),{width:entry.width,height:entry.height});
      if(entry.mode==='fire'&&(game.fireActive||game.fireGarageParked||game.fireRescue?.phase==='won'))buttons[i].hidden=true;
    });
  }
  // 卸载时同时移除动态门牌与监听器，重新挂载应用不会产生重复入口。
  function dispose() { scope.dispose(); layer.remove(); }
  return { tap, render, dispose, enter };
}
