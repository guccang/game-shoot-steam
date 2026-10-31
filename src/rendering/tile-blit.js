// 按设备像素对齐块边界，并从扩展像素中补偿采样，避免缩放后出现一像素细缝。
export function alignedTileRect(matrix, x, y, width, height) {
  const left = (Math.round(x * matrix.a + matrix.e) - matrix.e) / matrix.a;
  const top = (Math.round(y * matrix.d + matrix.f) - matrix.f) / matrix.d;
  const right = (Math.round((x + width) * matrix.a + matrix.e) - matrix.e) / matrix.a;
  const bottom = (Math.round((y + height) * matrix.d + matrix.f) - matrix.f) / matrix.d;
  return { x: left, y: top, w: right - left, h: bottom - top, sx: left - x, sy: top - y };
}

// 背景和河流均只有缩放与平移；源裁切和目标移动同步，保持纹理连续。
export function drawAlignedTile(c, image, pad, x, y, width, height) {
  const rect = alignedTileRect(c.getTransform(), x, y, width, height);
  c.drawImage(image, pad + rect.sx, pad + rect.sy, rect.w, rect.h,
    rect.x, rect.y, rect.w, rect.h);
}
