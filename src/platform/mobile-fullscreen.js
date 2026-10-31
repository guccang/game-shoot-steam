// 启动入口和正式应用共用本次访问记录，异步接管后也不会重复申请。
const attemptedDocuments=new WeakSet();
// 手机首次真实点击时申请根节点全屏，保留原生弹窗和手动退出能力。
export function bindMobileFullscreen({root,host,scope,button}) {
  if (!root.fullscreenEnabled || typeof root.documentElement?.requestFullscreen !== 'function') return;
  const mobile=host.matchMedia?.('(pointer: coarse)').matches || host.navigator?.userAgentData?.mobile;
  const standalone=host.navigator?.standalone || host.matchMedia?.('(display-mode: standalone)').matches || host.matchMedia?.('(display-mode: fullscreen)').matches;
  if (!mobile || standalone || root.fullscreenElement || attemptedDocuments.has(root)) return;
  // 捕获阶段同步调用，避免开始游戏的异步加载耗尽本次用户激活。
  scope.on(root,'click',event=>{
    if (attemptedDocuments.has(root) || !event.isTrusted) return;
    attemptedDocuments.add(root);
    // 手动全屏按钮自行处理进入与退出，不能和自动申请竞争。
    if (root.fullscreenElement || button?.contains(event.target)) return;
    try {
      Promise.resolve(root.documentElement.requestFullscreen({navigationUI:'hide'})).catch(()=>{});
    } catch {
      // 不支持或拒绝全屏时保留现有动态视口布局，不阻断开始游戏。
    }
  },{capture:true});
}
