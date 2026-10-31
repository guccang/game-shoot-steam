// 横向目录使用独立指针拖动，适配禁止浏览器平移的 Canvas 战场容器。
import { createEventScope } from './events.js';

// 超过拖动阈值才接管捕获，普通点按和键盘激活仍交给原按钮。
export function createDragScroll({ root, container, selector }) {
  const scope = createEventScope();
  let gesture = null, blockClick = false;
  // 面板内任何新按下都会结束上次兼容点击屏蔽，不影响关闭或类别按钮。
  function down(event) {
    if (gesture || event.button !== 0) return;
    blockClick = false;
    const list = event.target.closest(selector);
    if (!list || !container.contains(list)) return;
    const rect = list.getBoundingClientRect();
    // 原生滚动条继续接收鼠标，不叠加拖动算法。
    if (event.clientY >= rect.top + list.clientHeight) return;
    gesture = { id: event.pointerId, list, x: event.clientX, y: event.clientY,
      scroll: list.scrollLeft, dragged: false };
  }
  // 纵向或往返拖动也取消点选，防止拖动卡片后误买装备。
  function move(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const g = gesture;
    if (!g.dragged && Math.hypot(event.clientX - g.x, event.clientY - g.y) <= 8) return;
    if (!g.dragged) {
      g.dragged = blockClick = true;
      g.list.setPointerCapture(g.id);
    }
    g.list.scrollLeft = g.scroll + g.x - event.clientX;
    event.preventDefault();
  }
  // 先清空手势再释放捕获，捕获丢失事件不会递归清理。
  function reset() {
    const g = gesture;
    gesture = null;
    if (g && g.list.hasPointerCapture(g.id)) g.list.releasePointerCapture(g.id);
  }
  // 取消与松手均结束拖动，是否屏蔽 click 保留到本次点击消费完成。
  function end(event) {
    if (gesture?.id !== event.pointerId) return;
    if (event.type === 'pointercancel') blockClick = true;
    reset();
  }
  scope.on(container, 'pointerdown', down);
  scope.on(root, 'pointermove', move, { capture: true, passive: false });
  scope.on(root, 'pointerup', end, true);
  scope.on(root, 'pointercancel', end, true);
  scope.on(container, 'lostpointercapture', event => {
    // 从卡片的触摸隐式捕获转交列表是正常拖动，只有列表自身丢失捕获才取消。
    if (gesture?.id === event.pointerId && event.target === gesture.list &&
      !gesture.list.hasPointerCapture(event.pointerId)) reset();
  });
  scope.on(container, 'click', event => {
    if (!blockClick || event.detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  scope.on(container, 'dragstart', event => event.preventDefault());
  scope.on(root.defaultView, 'blur', reset);
  scope.on(root, 'visibilitychange', () => { if (root.hidden) reset(); });
  // 面板卸载同时移除全局监听，避免重挂载后重复滚动。
  function dispose() { scope.dispose(); reset(); }
  return { get interacting() { return !!gesture; }, reset, dispose };
}
