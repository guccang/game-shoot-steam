// 双指缩放只输出距离比例；镜头数值由上层管理，地面建造与单指摇杆共享手势仲裁。
import { createEventScope } from './events.js';
import { BATTLEFIELD_UI_SELECTOR } from './input-targets.js';

// 捕获阶段接管双指，直到所有触点抬起才重新允许单指移动或点击。
export function createPinchInput({ frame, enabled, onStart, onScale }) {
  const scope = createEventScope(), touches = new Map();
  let active = false, distance = 0, blockClick = false;
  // 只使用前两个触点；额外手指加入不改变当前缩放基准。
  function separation() {
    const [a, b] = touches.values();
    return b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
  // 菜单和建造目录保留原生交互；世界中的地面格位仍属于可缩放战场。
  function down(event) {
    if (!touches.size) blockClick = false;
    if (event.pointerType !== 'touch' || !enabled()) return;
    const control = event.target.closest(BATTLEFIELD_UI_SELECTOR);
    if (control && !control.classList.contains('guardian-ground-pad')) return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size < 2 && !active) return;
    if (!active) {
      active = true;
      blockClick = true;
      onStart();
    }
    distance = separation();
    for (const id of touches.keys()) frame.setPointerCapture(id);
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  // 每次移动按增量缩放，抵达倍率边界后反向捏合立即响应。
  function move(event) {
    if (!touches.has(event.pointerId)) return;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!active) return;
    const next = separation();
    if (enabled() && distance >= 8 && next >= 8) onScale(next / distance);
    distance = next;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  // 抬起一根后仍锁住剩余手指，避免突然恢复摇杆或把结束动作当作建造点击。
  function end(event) {
    if (!touches.has(event.pointerId)) return;
    const wasActive = active;
    touches.delete(event.pointerId);
    distance = separation();
    if (!touches.size) active = false;
    if (!wasActive) return;
    if (frame.hasPointerCapture(event.pointerId)) frame.releasePointerCapture(event.pointerId);
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  // 双指后的兼容点击不能穿透到世界建筑；键盘激活始终保留。
  function click(event) {
    if (!blockClick || event.detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  // 先清空触点再释放捕获，避免同步的丢失捕获事件递归处理旧手势。
  function reset() {
    const ids = [...touches.keys()];
    touches.clear();
    active = false;
    distance = 0;
    for (const id of ids) if (frame.hasPointerCapture(id)) frame.releasePointerCapture(id);
  }
  scope.on(frame, 'pointerdown', down, true);
  scope.on(frame, 'pointermove', move, true);
  scope.on(frame, 'pointerup', end, true);
  scope.on(frame, 'pointercancel', end, true);
  // 格位向战场转交捕获是正常接管；战场自身意外丢失捕获则清理本次手势。
  scope.on(frame, 'lostpointercapture', event => {
    if (event.target === frame && touches.has(event.pointerId) && !frame.hasPointerCapture(event.pointerId)) reset();
  }, true);
  scope.on(frame, 'click', click, true);
  // 与应用输入一同释放监听器和仍按住的触点。
  function dispose() { scope.dispose(); reset(); }
  return { get active() { return active; }, reset, dispose };
}
