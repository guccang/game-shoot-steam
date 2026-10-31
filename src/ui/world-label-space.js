// 世界门牌遇到固定战斗界面时暂时隐藏，避免移动镜头把建筑入口压到按钮或状态条上。
export function worldLabelBlocked(button, root) {
  const b = button.getBoundingClientRect();
  return [...root.querySelectorAll('.hud-resources,#quest,#boss-hud,.player-hud,.field-menu button,.ranger-arrival:not([hidden]),.arrival-speech:not([hidden])')].some(node => {
    const r = node.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top;
  });
}
