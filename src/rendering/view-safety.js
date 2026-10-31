// 镜头与头顶提示共享可见范围，预留长枪管、角色摆动和换弹徽章的完整空间。
export const RELOAD_BADGE = { offsetY: 80, radius: 23, shadow: 6 };

// 角色相对脚底的保守屏幕包围盒：110 世界单位覆盖两名角色、长枪、后坐抬升与近枪口闪光。
export function playerScreenBounds(zoom) {
  const body = 110 * zoom;
  return {
    left: body,
    right: body,
    top: Math.max(body, RELOAD_BADGE.offsetY + RELOAD_BADGE.radius + RELOAD_BADGE.shadow + 2),
    bottom: body,
  };
}

// 将屏幕留白换算成镜头偏移上限，极小窗口下收缩留白，避免约束区间倒置。
export function cameraOffsetLimits(width, height, zoom) {
  const bounds = playerScreenBounds(zoom),
    padding = 12;
  const left = Math.min(width / 2, bounds.left + padding);
  const right = Math.min(width / 2, bounds.right + padding);
  const top = Math.min(height / 2, bounds.top + padding);
  const bottom = Math.min(height / 2, bounds.bottom + padding);
  return {
    minX: (right - width / 2) / zoom,
    maxX: (width / 2 - left) / zoom,
    minY: (bottom - height / 2) / zoom,
    maxY: (height / 2 - top) / zoom,
  };
}
