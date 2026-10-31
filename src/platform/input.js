// 键盘和摇杆统一输出移动向量，不负责战斗或动画循环。
import { createEventScope } from './events.js';
import { createPinchInput } from './pinch-input.js';
import { BATTLEFIELD_UI_SELECTOR } from './input-targets.js';
// 战场按下处就是摇杆原点，交互控件继续保留各自的点击行为。
export function createInput({ game, root, host, onChange, onTap = () => {}, onPinch = () => {}, enabled = () => true }) {
  const scope = createEventScope(),
    keys = new Set(),
    joystick = { x: 0, y: 0, pointer: null, originX: 0, originY: 0, radius: 1 },
    frame = root.getElementById('game-frame'),
    pad = root.getElementById('joystick'),
    stick = root.getElementById('stick');
  let tap = null, pendingTap = null;
  const pinch = createPinchInput({
    frame,
    // 仅守护女神接管双指；普通场景保留首指移动，第二指不改变镜头。
    enabled: () => enabled() && game.realm?.mode === 'guardian' && (game.state === 'playing' || game.canExploreRealm) && !root.querySelector('dialog[open]'),
    // 接管时保留指针捕获，避免释放事件中断正在开始的双指手势。
    onStart: () => { pendingTap = null; release(false); },
    onScale: onPinch,
  });
  // 优先使用物理键位，兼容中文输入法的 Process、大小写和非英语键盘布局。
  function movementKey(event) {
    const physical = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
      ArrowUp: 'arrowup', ArrowLeft: 'arrowleft', ArrowDown: 'arrowdown', ArrowRight: 'arrowright' };
    return physical[event.code] || event.key?.toLowerCase();
  }
  // 弹窗与原生输入框保留自己的按键操作，空格不抢占按钮或炮塔下拉选择。
  function keydown(event) {
    if (!enabled()) return;
    if (root.querySelector('dialog[open]') || event.target.closest?.('input, select, textarea, [contenteditable]') ||
      event.ctrlKey || event.altKey || event.metaKey) return;
    const key = movementKey(event);
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
      event.preventDefault();
      keys.add(key);
    }
    if(game.realm?.mode==='race'&&['ShiftLeft','ShiftRight'].includes(event.code)){event.preventDefault();keys.add(key);}
    if (event.code === 'Space' && !event.repeat && event.target.tagName !== 'BUTTON') {
      event.preventDefault();
      game.pause();
      reset();
      onChange();
    }
  }
  // 捕获指针后将摇杆位置限制为单位圆。
  function move(event) {
    if (joystick.pointer !== event.pointerId) return;
    if (tap && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10) tap = null;
    let x = event.clientX - joystick.originX,
      y = event.clientY - joystick.originY;
    const length = Math.hypot(x, y),
      max = joystick.radius;
    if (length > max) {
      x *= max / length;
      y *= max / length;
    }
    joystick.x = x / max;
    joystick.y = y / max;
    stick.style.transform = `translate(${x}px,${y}px)`;
  }
  // 单指控制移动；双指战场触摸由缩放接管，菜单和载具按钮仍独立响应。
  function start(event) {
    if (!enabled()) return;
    // 仅显式标注的世界门牌可兼作摇杆起点，设置等常规按钮仍独立接收输入。
    const control = event.target.closest(BATTLEFIELD_UI_SELECTOR);
    const worldControl = control?.hasAttribute?.('data-world-movement') ? control : null;
    if (pinch.active || joystick.pointer !== null || (game.state !== 'playing' && !game.canExploreRealm) || event.button !== 0 ||
      root.querySelector('dialog[open]') ||
      (control && !worldControl)) return;
    event.preventDefault();
    const rect = frame.getBoundingClientRect();
    pendingTap = null;
    joystick.pointer = event.pointerId;
    joystick.originX = event.clientX;
    joystick.originY = event.clientY;
    tap = { x: event.clientX, y: event.clientY, time: event.timeStamp, control: worldControl };
    pad.style.left = `${event.clientX - rect.left}px`;
    pad.style.top = `${event.clientY - rect.top}px`;
    pad.hidden = false;
    joystick.radius = pad.getBoundingClientRect().width * 0.3;
    frame.setPointerCapture(event.pointerId);
    move(event);
  }
  // 非控制手指抬起不能打断移动，也不能把键盘正在按住的方向清空。
  function end(event) {
    if (event.pointerId !== joystick.pointer) return;
    // 仅短按抬起触发世界交互；拖动后再回到原点、取消和长按均不会误入秘境。
    const pressed = tap;
    release();
    if (pressed && event.type === 'pointerup' && event.timeStamp - pressed.time < 550 &&
      Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) <= 10 &&
      game.state === 'playing' && !root.querySelector('dialog[open]')) pendingTap = { event, control: pressed.control };
  }
  // 等当前触摸对应的 click 再进入：避免 pointerup 新开的祝福弹窗吃到同一手势的穿透点击。
  function activateTap(event) {
    if (!enabled()) { pendingTap = null; return; }
    const pressed = pendingTap;
    pendingTap = null;
    if (pressed && event.timeStamp - pressed.event.timeStamp < 1000 && game.state === 'playing' &&
      !root.querySelector('dialog[open]')) {
      // 捕获后的 click 落在战场容器，使用按下时的门牌；移动中的门牌不改变短按对象。
      if (pressed.control?.isConnected && !pressed.control.hidden) pressed.control.click();
      else if (!pressed.control && !event.target.closest('button, a, [role="button"]')) onTap(pressed.event);
    }
  }
  // 松手立即收起浮动摇杆，先清除归属再释放捕获，避免丢失捕获事件递归。
  function release(capture = true) {
    tap = null;
    const pointer = joystick.pointer;
    joystick.x = 0;
    joystick.y = 0;
    joystick.pointer = null;
    pad.hidden = true;
    stick.style.transform = '';
    if (capture && pointer !== null && frame.hasPointerCapture(pointer)) frame.releasePointerCapture(pointer);
  }
  // 切窗、关面板和卸载均清除输入，主动释放仍持有的指针捕获。
  function reset() {
    pendingTap = null;
    keys.clear();
    release();
    pinch.reset();
  }
  // 每帧返回新的向量，不泄露控制器内部可变状态。
  function read() {
    // 双指只接管触摸摇杆，不能吞掉 PC 上独立按住的方向键。
    return {
      ...(game.realm?.mode==='race'?{sprint:keys.has('shift')}:{}),
      x:
        joystick.x +
        Number(keys.has('d') || keys.has('arrowright')) -
        Number(keys.has('a') || keys.has('arrowleft')),
      y:
        joystick.y +
        Number(keys.has('s') || keys.has('arrowdown')) -
        Number(keys.has('w') || keys.has('arrowup')),
    };
  }
  scope.on(host, 'keydown', keydown);
  scope.on(host, 'keyup', (event) => keys.delete(movementKey(event)));
  scope.on(frame, 'pointerdown', start);
  scope.on(frame, 'pointermove', move);
  scope.on(frame, 'click', activateTap);
  // 持续按住战场时不弹出浏览器长按菜单。
  scope.on(frame, 'contextmenu', (event) => {
    if (joystick.pointer !== null || pinch.active) event.preventDefault();
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
    scope.on(frame, event, end);
  scope.on(host, 'resize', reset);
  scope.on(host, 'blur', reset);
  scope.on(root, 'visibilitychange', () => { if (root.hidden) reset(); });
  // 清理监听器和拖动状态，让同一页面可以重新挂载应用。
  function dispose() {
    scope.dispose();
    reset();
    pinch.dispose();
  }
  return { read, reset, dispose };
}
