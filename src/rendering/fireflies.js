// 卡通萤火虫画层：少量柔光色块与亮芯，仅绘制独立散点，独立于角色及战斗。
import { FireflyField, fireflyOpacity } from '../world/fireflies.js';
import { visibleBodies } from '../world/coordinates.js';
import { oval } from './primitives.js';

export class FireflyRenderer {
  // 每个游戏画面持有自己的散点，避免多实例互相推进环境时钟。
  constructor() {
    this.field = new FireflyField();
  }

  // 基于世界坐标裁切并补画循环镜像，镜头移动时不会重新随机或贴着屏幕漂移。
  draw(c, time, light, view, reduced = false) {
    const opacity = fireflyOpacity(light);
    this.field.advance(time, reduced || opacity < 0.01);
    if (opacity < 0.01) return;
    c.save();
    for (const p of visibleBodies(this.field.points, view, 14)) {
      const brightness = reduced ? 0.65 : 0.65 + 0.25 * Math.sin(this.field.time * 1.2 + p.phase);
      c.globalAlpha = opacity * brightness;
      // 收紧光晕、增强小亮芯，不增加数量或用大范围辉光遮住弹道。
      c.globalCompositeOperation = 'screen';
      oval(c, p.x, p.y, p.size * 3.8, p.size * 3.8, '#dcec8e18');
      oval(c, p.x, p.y, p.size * 2, p.size * 2, '#e5f3a345');
      oval(c, p.x, p.y, p.size * 1.15, p.size * 1.15, '#fff9cd');
    }
    c.restore();
  }
}
