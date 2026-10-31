import { canvasFont } from './text-style.js';
import { i18nText } from "../i18n/index.js";
// 狙击辅助线在实体上方绘制，标记预计贯穿顺序；线宽与文字按屏幕像素保持清晰。
export function drawSniperGuide(c, guide, zoom, firing = false) {
  if (!guide) return;
  c.save();
  c.strokeStyle = firing ? '#fff0ba' : '#c4f5ff';
  c.lineWidth = 1.3 / zoom;
  c.globalAlpha = guide.target ? 0.85 : 0.3;
  c.setLineDash([7 / zoom, 5 / zoom]);
  c.beginPath();
  c.moveTo(guide.muzzle.x, guide.muzzle.y);
  c.lineTo(guide.end.x, guide.end.y);
  c.stroke();
  c.setLineDash([]);
  // 按武器的贯穿上限标记交点，树干也占一个序号，帮助理解穿透并非无限。
  guide.hits.forEach((hit, index) => {
    c.beginPath();
    c.arc(hit.x, hit.y, 4 / zoom, 0, Math.PI * 2);
    c.stroke();
    c.font = canvasFont(10 / zoom);
    c.textAlign = 'left';
    c.lineWidth = 3 / zoom;
    c.strokeStyle = '#294838';
    c.strokeText(String(index + 1), hit.x + 7 / zoom, hit.y - 4 / zoom);
    c.fillStyle = '#defaff';
    c.fillText(String(index + 1), hit.x + 7 / zoom, hit.y - 4 / zoom);
    c.strokeStyle = '#c4f5ff';
    c.lineWidth = 1.3 / zoom;
  });
  if (guide.point) {
    const x = guide.point.x,
      y = guide.point.y - 14,
      r = Math.max(13 / zoom, guide.target.radius + 5);
    c.strokeStyle = firing ? '#ffedb4' : '#c4f5ff';
    c.lineWidth = 1.6 / zoom;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      c.beginPath();
      c.arc(x, y, r, angle + 0.15, angle + 0.75);
      c.stroke();
    }
    const text = i18nText("rendering.aim-guide.a812887808", { p0: (Math.round(guide.distance)) });
    c.font = canvasFont(10 / zoom);
    c.textAlign = 'center';
    c.lineWidth = 3 / zoom;
    c.strokeStyle = '#294838';
    c.strokeText(text, x, y - r - 7 / zoom);
    c.fillStyle = '#efffff';
    c.fillText(text, x, y - r - 7 / zoom);
  }
  c.restore();
}
