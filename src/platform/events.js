// 事件作用域统一收集解绑操作，组件卸载后不会重复响应旧监听器。
export function createEventScope() {
  const removers = [];
  // 记录准确的监听器与选项，兼容浏览器事件和测试中的 EventTarget。
  function on(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    removers.push(() => target.removeEventListener(type, listener, options));
  }
  // 可重复销毁，适用于页面切换和应用重新挂载。
  function dispose() {
    for (const remove of removers.splice(0)) remove();
  }
  return { on, dispose };
}
