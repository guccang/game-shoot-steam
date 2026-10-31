// 可拆装部件沿用正式枪械的森林绿描边与有限平涂；不改变枪口或整枪比例。
import { box, oval, poly } from './primitives.js';

// 托盘与运行时共用部件形状，两个分支使用不同结构而不只换色。
export function drawWorkshopPart(c, part, standalone = false) {
  if (!part) return;
  const { kind, choice } = part, wide = choice === 2;
  const ink = '#315C43', metal = wide ? '#90A875' : '#C0C3AD', gold = '#F4DCA0';
  c.save();
  if (!standalone) c.translate(part.x, part.y);
  if (['crystal', 'core', 'capacitor', 'chip'].includes(kind)) {
    box(c, -10, -5, 20, 10, 3, metal, ink, 1.5);
    const count = wide ? 1 : 3;
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * 6;
      poly(c, [[x - 3, -5], [x, wide ? -15 : -11], [x + 4, -6], [x, -2]], gold, ink, 1);
    }
    if (kind === 'chip') for (const x of [-12, 12]) for (let y = -3; y < 5; y += 3) box(c, x, y, 3, 1, 0, ink);
  } else if (['coil', 'rotor', 'motor'].includes(kind)) {
    box(c, -10, -6, 20, 12, 4, metal, ink, 1.5);
    for (let x = -7; x <= 8; x += wide ? 6 : 4) box(c, x, -8, wide ? 4 : 2, 16, 2, gold, ink, 1);
    if (wide) oval(c, 0, -10, 5, 3, metal, ink, 1);
  } else if (['barrel', 'nozzle', 'teeth'].includes(kind)) {
    box(c, -8, -6, 20, 12, 3, metal, ink, 1.5);
    for (let i = 0; i < (wide ? 3 : 2); i++)
      box(c, -6 + i * 6, -8, 3, 16, 1, gold, ink, 1);
    if (kind === 'nozzle' && wide) for (const y of [-8, 5]) box(c, 9, y, 7, 3, 1, metal, ink, 1);
    if (kind === 'teeth') for (let x = -6; x < 12; x += 6) poly(c, [[x, -8], [x + 3, -12], [x + 4, -8]], gold, ink, 1);
  } else {
    box(c, wide ? -11 : -7, -7, wide ? 22 : 14, wide ? 20 : 14, 4, metal, ink, 1.5);
    box(c, wide ? -8 : -4, -4, wide ? 16 : 8, 4, 1, gold, ink, 1);
    for (let y = 3; y < (wide ? 10 : 7); y += 4) box(c, -4, y, 9, 2, 1, ink);
  }
  c.restore();
}
