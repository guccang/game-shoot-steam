// 画布字体与 fonts.css 的运行字体保持一致，避免路牌、数字和界面混用系统字形。
export const GAME_FONT_FAMILY = '"HYQiHei75S", sans-serif';

// 保留各绘制器的逻辑字号和字重，只统一字体来源。
export function canvasFont(size, weight = 'bold') {
  return `${weight} ${size}px ${GAME_FONT_FAMILY}`;
}
