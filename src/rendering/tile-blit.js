// 按设备像素对齐块边界，并从扩展像素中补偿采样，避免缩放后出现一像素细缝。
export function alignedTileRect(matrix, x, y, width, height) {
  // 四向阳台会交换屏幕轴；沿每条实际投影轴对齐，避免90度时除以零漏画整片地形。
  const sx=matrix.a||matrix.b,sy=matrix.d||matrix.c,ox=matrix.a?matrix.e:matrix.f,oy=matrix.d?matrix.f:matrix.e;
  const left = (Math.round(x * sx + ox) - ox) / sx;
  const top = (Math.round(y * sy + oy) - oy) / sy;
  const right = (Math.round((x + width) * sx + ox) - ox) / sx;
  const bottom = (Math.round((y + height) * sy + oy) - oy) / sy;
  return { x: left, y: top, w: right - left, h: bottom - top, sx: left - x, sy: top - y };
}

// 背景和河流支持平移、缩放及四向轴变换；源裁切和目标移动同步，保持纹理连续。
export function drawAlignedTile(c, image, pad, x, y, width, height) {
  const rect = alignedTileRect(c.getTransform(), x, y, width, height);
  c.drawImage(image, pad + rect.sx, pad + rect.sy, rect.w, rect.h,
    rect.x, rect.y, rect.w, rect.h);
}
