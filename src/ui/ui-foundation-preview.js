// 通用界面样板只演示交互反馈，不读取或写入游戏存档。
const dialog = document.getElementById('preview-dialog');
const status = document.getElementById('preview-status');
const confirm = document.getElementById('confirm-ok');
let result = '';

// 同一个正式底板承载确认、关闭和危险提示，取消始终先获得焦点。
function openConfirmation(title, copy, action, message, danger = false) {
  dialog.classList.remove('ui-panel--fullscreen');
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-copy').textContent = copy;
  confirm.textContent = action;
  confirm.className = `ui-button ui-button--${danger ? 'danger' : 'primary'}`;
  result = message;
  dialog.showModal();
  document.getElementById('confirm-cancel').focus();
}

// 灯光预览只改变样板外部背景，用于对比同一底板在明暗环境的识别度。
document.getElementById('preview-light').addEventListener('click', event => {
  const night = document.querySelector('.preview-stage').toggleAttribute('data-night');
  event.currentTarget.setAttribute('aria-pressed', String(night));
  event.currentTarget.textContent = night ? '切换日色' : '切换夜色';
});
// 演示操作明确说明结果，避免把样板误当成真实游戏入口。
document.getElementById('preview-go').addEventListener('click', () => {
  openConfirmation('准备出发？', '行装已经备好，随时可以出发。', '确认出发', '出发确认完成。进入游戏即可开始实际巡游。');
});
// 全屏形态复用同一标题和底栏，长屏、短屏及安全区由共享样式处理。
document.getElementById('preview-full').addEventListener('click', () => {
  openConfirmation('巡游准备', '全屏页面保留固定标题与底部操作，中间内容独立滚动。适用于手机上的背包、档案和详细设置。', '完成', '已关闭手机全屏底板。');
  dialog.classList.add('ui-panel--fullscreen');
});
document.getElementById('preview-close').addEventListener('click', () => {
  openConfirmation('收起行装？', '可以先留在营地，准备好了再出发。', '留在营地', '已收起确认窗口，底板样板继续展示。');
});
document.getElementById('preview-danger').addEventListener('click', () => {
  openConfirmation('放弃本次准备？', '这里只演示危险操作的二次确认，不会改变游戏进度。', '确认放弃', '危险操作确认完成，游戏进度未改动。', true);
});
document.getElementById('preview-stay').addEventListener('click', () => { status.textContent = '已选择留在营地。准备好后再出发。'; });
document.querySelectorAll('[data-feedback]').forEach(button => {
  button.addEventListener('click', () => { status.textContent = button.dataset.feedback; });
});
// 使用原生关闭保持 Escape、焦点约束和返回触发按钮的浏览器行为。
for (const id of ['confirm-close', 'confirm-cancel']) {
  document.getElementById(id).addEventListener('click', () => dialog.close());
}
confirm.addEventListener('click', () => { status.textContent = result; dialog.close(); });
