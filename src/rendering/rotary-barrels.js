// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { box, oval, outline } from './primitives.js';
import { heatColor } from '../combat/weapon-heat.js';

// 六根枪管围绕枪轴独立转动；机匣、抱箍与枪口位置保持固定。

// 同一剖面模型用于加特林和火神炮，按深度排序避免后侧管盖住前管。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRotaryBarrels(c, phase = 0, end = 43, heat = 0) {
  const pipes = Array.from({ length: 6 }, (_, i) => ({ a: phase + (i * Math.PI) / 3 })).sort(
    (a, b) => Math.cos(a.a) - Math.cos(b.a),
  );
  oval(c, 9, 0, 5, 11, '#405d4b', outline, 1.6);
  for (const { a } of pipes) {
    const y = Math.sin(a) * 7.3;
    box(
      c,
      8,
      y - 1.6,
      end - 8,
      3.2,
      1,
      heatColor(Math.cos(a) > 0 ? '#b8c6a8' : style.rotaryBarrels.drawRotaryBarrelsColor, '#e98455', heat),
      outline,
      0.8,
    );
  }
  for (const x of [18, end - 10]) box(c, x, -10, 4, 20, 2, '#586e5c', outline, 1.2);
  oval(c, end, 0, 3.5, 10, '#91a58c', outline, 1.4);
  for (let i = 0; i < 6; i++) {
    const a = phase + (i * Math.PI) / 3;
    oval(c, end + Math.cos(a) * 2, Math.sin(a) * 7.3, 1.1, 1.6, heat > 0 ? '#f6b279' : '#294f3b');
  }
  oval(c, end + Math.cos(phase) * 2, Math.sin(phase) * 7.3, 1.2, 1.7, '#f4dca0');
}
