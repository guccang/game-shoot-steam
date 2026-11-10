// 快递面板的文字与空白也属于界面，不能作为摇杆或双指缩放的起点。
// 整块战场 UI 都独立处理交互，包含面板空白、文字、卡片间隙和原生滚动条。
export const BATTLEFIELD_UI_SELECTOR = '#farm-mail, .guardian-build-panel, .guardian-wave-controls, .task-route-anchor, button, a, input, select, textarea, summary, [role="button"], [tabindex], [contenteditable]';
