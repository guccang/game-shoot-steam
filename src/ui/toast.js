// 独立短提示组件，卸载时取消计时器。
export function createToast(element) {
  let timer;
  // 新提示替换旧提示，并重新计算显示时长。
  function show(text,duration=2600) {
    element.textContent = text;
    element.classList.add('visible');
    clearTimeout(timer);
    timer = setTimeout(() => element.classList.remove('visible'), duration);
  }
  // 避免旧页面计时器影响下一次挂载的提示。
  function dispose() {
    clearTimeout(timer);
    element.classList.remove('visible');
    element.textContent = '';
  }
  return { show, dispose };
}
