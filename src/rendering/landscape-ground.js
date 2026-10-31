// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { LANDSCAPES } from '../world/landscape-compositions.js';
import { BEACH_VARIANTS } from '../world/landscape-variants.js';
import { oval } from './primitives.js';

// 景观底层进入现有分块缓存：连贯草坡、宽沙湾与少量沙纹把独立地标接回周围环境。

// 中点曲线柔化草地边缘，地形水界仍由原始折线绘制，不改变可行走边界。
// 共用绘制与动作输入，风格差异由配置提供。
function patch(c, points, scale = 1) {
  c.beginPath();
  const last = points.at(-1),
    first = points[0];
  c.moveTo(((last.x + first.x) / 2) * scale, ((last.y + first.y) / 2) * scale);
  points.forEach((p, i) => {
    const next = points[(i + 1) % points.length];
    c.quadraticCurveTo(p.x * scale, p.y * scale, ((p.x + next.x) / 2) * scale, ((p.y + next.y) / 2) * scale);
  });
  c.closePath();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawLandscapeGround(c, view = null, sites = LANDSCAPES.sites, winter = false, season = 'summer') {
  for (const site of sites) {
    const b = site.bounds;
    if (view && (b.x > view.x + view.w || b.x + b.w < view.x || b.y > view.y + view.h || b.y + b.h < view.y)) continue;
    c.save();
    c.translate(site.x, site.y);
    c.save();
    c.globalAlpha *= style.landscapeGround.drawLandscapeGround_globalAlphaValue;
    patch(c, site.meadow);
    c.fillStyle = winter
      ? '#c6d9d7'
      : season === 'autumn'
        ? '#c4b67b'
        : season === 'spring'
          ? '#bdd595'
          : site.kind === 'lake'
            ? style.landscapeGround.drawLandscapeGround_fillStyleColor
            : style.landscapeGround.drawLandscapeGround_fillStyleColor2;
    c.fill();
    c.translate(-22, 18);
    c.globalAlpha *= 0.65;
    patch(c, site.meadow, 0.81);
    c.fillStyle = winter
      ? '#eef2e7'
      : season === 'autumn'
        ? '#dcc48a'
        : season === 'spring'
          ? '#cbe39e'
          : style.landscapeGround.drawLandscapeGround_fillStyleColor3;
    c.fill();
    c.restore();
    if (site.beach) {
      // 草沙交界保留薄土色，沙滩朝单侧展开，内部大片留白供通行和战斗。
      patch(c, site.beach, 1.018);
      c.fillStyle = winter ? '#f0f4eb' : '#9da97a';
      c.fill();
      patch(c, site.beach, 1.006);
      c.fillStyle = '#ceb47e';
      c.fill();
      patch(c, site.beach);
      c.fillStyle = BEACH_VARIANTS.find((v) => v.id === site.beachVariant)?.sand || '#ebd09a';
      c.fill();
      c.save();
      c.clip();
      if (site.beachVariant === 'dunes')
        for (let n = 0; n < 3; n++) {
          const angle = site.beachAngle + (n - 1) * 0.31,
            p = site.beach[Math.round((angle / (Math.PI * 2)) * 64) % 64];
          c.beginPath();
          c.moveTo(p.x - 35, p.y - 15 - n * 5);
          c.quadraticCurveTo(p.x - 5, p.y - 32 - n * 5, p.x + 30, p.y - 19 - n * 5);
          c.strokeStyle = '#c6a46b65';
          c.lineWidth = 3;
          c.stroke();
          c.strokeStyle = '#fff0c460';
          c.lineWidth = 1;
          c.stroke();
        }
      for (let i = 0; i < site.beach.length; i += style.landscapeGround.drawLandscapeGroundValue) {
        const p = site.beach[i],
          x = p.x * 0.95,
          y = p.y * 0.95;
        oval(c, x, y, 4 + (i % 3), 1.1, '#fae9c1');
        oval(c, x + 8, y + 6, 1.3, 0.8, '#c8ab77');
      }
      c.restore();
    }
    c.restore();
  }
}
