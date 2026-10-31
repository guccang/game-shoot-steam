// 原生弹窗统一管理暂停归属，嵌套说明不会提前恢复底层设置中的战斗。
import { createEventScope } from '../platform/events.js';
import {prepareMobilePanel} from './mobile-panels.js';
export function createDialogs({ game, root, resetInput, onChange, isGameplayActive = () => true, onEvent = () => {} }) {
  const scope = createEventScope(),
    entries = new Map();
  // 注册关闭回调一次，避免反复打开时堆积监听器。
  function register(id, { onOpen = () => {}, focusId } = {}) {
    const dialog = root.getElementById(id),
      entry = { dialog, onOpen, focusId, resume: false, modal: true };
    entries.set(id, entry);
    prepareMobilePanel(dialog);
    // 底部非模态交谈仍支持Esc关闭，暂停归属与普通面板保持一致。
    scope.on(dialog,'keydown',event=>{if(event.key==='Escape'&&!entry.modal&&dialog.open){event.preventDefault();event.stopPropagation();close(id);}});
    scope.on(dialog, 'close', () => {
      // close 事件异步派发；保存失败同帧重开时，旧事件不能清除新一轮暂停归属。
      if(dialog.open)return;
      if (
        isGameplayActive() && entry.resume &&
        game.state === 'paused' &&
        !root.hidden &&
        !root.querySelector('dialog[open]')
      )
        game.pause();
      entry.resume = false;
      resetInput();
      onChange();
      onEvent('dialog-close',{id,state:game.state});
    });
  }
  // 仅记录本面板引发的暂停，准备、手动暂停和死亡状态原样保留。
  function open(id, {modal=true} = {}) {
    const e = entries.get(id);
    if (!e || e.dialog.open) return;
    e.resume = isGameplayActive() && (game.state === 'playing' || (game.state === 'realm' && game.realm?.phase === 'rest'));
    if (e.resume) game.pause();
    resetInput();
    e.onOpen();
    e.modal=modal;e.dialog.setAttribute('aria-modal',String(modal));
    if(modal)e.dialog.showModal();else e.dialog.show();
    e.dialog.scrollTop = 0;
    // 功能页仅正文滚动，重新进入时回到起点；嵌套关闭不重置下层正文。
    const body=e.dialog.querySelector(':scope > .ui-panel__body');if(body)body.scrollTop=0;
    onChange();
    if (e.focusId) root.getElementById(e.focusId).focus({ preventScroll: true });
    onEvent('dialog-open',{id,state:game.state,modal});
  }
  // 关闭走统一回调，Esc 与按钮保持相同行为。
  function close(id) {
    entries.get(id)?.dialog.close();
  }
  // 切出页面或重置存档时撤销所有自动恢复资格。
  function cancelResume() {
    for (const e of entries.values()) e.resume = false;
  }
  // 查询当前面板是否拥有自动恢复资格，区分临时打开设置与主动暂停。
  function willResume(id) {
    return !!entries.get(id)?.resume;
  }
  // 从追踪详情跳转工坊时转交暂停归属，关闭工坊后仍按进入前状态恢复。
  function transferResume(from, to) {
    const previous = entries.get(from), next = entries.get(to);
    if (previous && next && next.dialog.open) {
      next.resume ||= previous.resume;
      previous.resume = false;
    }
  }
  // 先移除恢复监听器再关闭弹窗，避免卸载时意外开始战斗。
  function dispose() {
    scope.dispose();
    cancelResume();
    for (const e of entries.values()) if (e.dialog.open) e.dialog.close();
    entries.clear();
  }
  return { register, open, close, cancelResume, willResume, transferResume, dispose };
}
