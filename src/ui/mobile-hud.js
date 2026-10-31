import { i18nText } from "../i18n/index.js";
// 手机将非战斗必需信息收进设置，复用节点保留头像、事件和无障碍标签。
import { createEventScope } from '../platform/events.js';

// 用占位标记恢复桌面布局，旋转、缩放及应用卸载时不会复制按钮或丢失监听。
export function createMobileHud(root, getRealm = () => false) {
  const scope = createEventScope();
  const media = root.defaultView.matchMedia('(max-width: 600px)');
  const container = root.getElementById('settings-patrol');
  const menu = root.querySelector('.field-menu');
  const toggle = root.getElementById('field-menu-toggle');
  const items = root.getElementById('field-menu-items');
  let expanded = false;
  let returnDialog = null;
  let inRealm = !!getRealm();
  // 所有屏幕共用折叠菜单；秘境仍直接显示唯一的局内入口。
  function renderMenu() {
    items.hidden = !expanded && !inRealm;
    toggle.setAttribute('aria-expanded', String(expanded && !inRealm));
    toggle.setAttribute('aria-label', expanded ? i18nText("ui.mobile-hud.ede2b17cf8") : i18nText("ui.mobile-hud.d9b0e615ad"));
    menu.dataset.expanded = String(expanded);
  }
  // 秘境直接显示唯一入口，进出时折叠旧菜单并恢复可见焦点。
  function syncRealm() {
    const active=!!getRealm();if(active===inRealm)return;
    inRealm=active;expanded=false;returnDialog=null;renderMenu();
    if(menu.contains(root.activeElement))
      (inRealm?root.getElementById('realm-button'):toggle).focus({preventScroll:true});
  }
  const entries = ['location-info'].map(id => {
    const node = root.getElementById(id), anchor = root.createComment(i18nText("ui.mobile-hud.f7c840a5cd", { p0: (id) }));
    node.before(anchor);
    return { node, anchor };
  });
  // 响应屏幕宽度，只搬移区域说明；波次与挑战入口始终保留在战场。
  function render() {
    expanded = false;
    renderMenu();
    container.hidden = !media.matches;
    for (const { node, anchor } of entries) {
      if (media.matches) container.append(node);
      else anchor.after(node);
    }
  }
  scope.on(toggle, 'click', () => {
    expanded = !expanded;
    renderMenu();
  });
  // 打开面板后自动收起，返回战场无需再关一次菜单；保持原按钮和原弹窗监听。
  scope.on(items, 'click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    returnDialog = button.getAttribute('aria-controls');
    expanded = false;
    renderMenu();
  });
  // 原触发按钮已经折叠，关闭养成面板后把键盘焦点交还给可见的菜单入口。
  // 猫窝定位等导航按钮没有弹窗，不为不存在的节点绑定关闭事件。
  for (const id of new Set([...items.querySelectorAll('button')].map(button => button.getAttribute('aria-controls')).filter(id=>id&&root.getElementById(id))))
    scope.on(root.getElementById(id), 'close', () => {
      if (returnDialog !== id) return;
      returnDialog = null;
      if (!root.querySelector('dialog[open]'))
        (inRealm?root.getElementById('realm-button'):toggle).focus({ preventScroll: true });
    });
  scope.on(root, 'pointerdown', event => {
    if (!expanded || menu.contains(event.target)) return;
    expanded = false;
    renderMenu();
  });
  scope.on(root, 'keydown', event => {
    if (event.key !== 'Escape' || !expanded || !menu.contains(root.activeElement)) return;
    // 收起菜单消耗本次按键，避免同时触发窗口级暂停快捷键。
    event.preventDefault();
    event.stopPropagation();
    expanded = false;
    renderMenu();
    toggle.focus();
  });
  scope.on(media, 'change', render);
  render();
  // 恢复原 DOM，保证重新挂载应用时占位关系与页面初始状态一致。
  function dispose() {
    scope.dispose();
    for (const { node, anchor } of entries) {
      anchor.after(node);
      anchor.remove();
    }
    container.hidden = true;
    items.hidden = false;
    expanded = false;
    toggle.setAttribute('aria-expanded', 'false');
    menu.dataset.expanded = 'false';
  }
  return { dispose, syncRealm };
}
