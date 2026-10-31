// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { box, oval, poly, outline } from './primitives.js';
import { heatColor } from '../combat/weapon-heat.js';
import { GATLING_PARTS } from '../config/gatling-art.js';

// 蜂群加特林正式美术：独立壳体、弹鼓和六管束，所有动作读取外部战斗状态。

// 部件自身坐标绘制，同一函数用于装配中的零件、原装枪和升级后的枪。
// 共用绘制与动作输入，风格差异由配置提供。
function drawReinforcedPart(c, key, level = 1) {
  const step = Math.max(0, level - 1),
    tier = Math.floor(step / 5),
    detail = step % 5;
  if (key === 'damage') {
    poly(
      c,
      [
        [-8, -6],
        [-4, -8],
        [7, -6],
        [8, 5],
        [4, 8],
        [-8, 6],
      ],
      '#859b73',
      outline,
      1.6,
    );
    poly(
      c,
      [
        [-8, -6],
        [-4, -8],
        [7, -6],
        [4, -3],
        [-7, -3],
      ],
      '#d2d9a6',
      null,
    );
    box(c, -6, 2, 12, 3, 1, '#617957', null);
    oval(c, 0, 0, 3.8 + tier * 0.35, 3.8 + tier * 0.35, '#d6bd7c', outline, 1);
    oval(c, 0, 0, 1.7, 1.7, '#5c7660');
    for (let i = 0; i <= detail; i++) box(c, -6 + i * 2.5, 5, 1.2, 2, 0.3, '#ead7a0', null);
    for (let i = 0; i < tier; i++) box(c, -6 + i * 5, -6, 2, 3, 0.4, '#ae8753', null);
  } else if (key === 'rate') {
    box(c, -6, -10, 12, 20, 4, '#526e59', outline, 1.7);
    box(c, -4, -8, 8, 3, 1, '#adbf96', null);
    box(c, -4, -3, 8, 10, 2, '#354f43', null);
    for (let i = 0; i < 3 + step; i++) box(c, -3, -2 + i * 1.25, 6, 0.65, 0.2, '#9aad86', null);
    box(c, -4, 7, 8, 2, 0.5, '#bb9b60', null);
  } else if (key === 'capacity') {
    const radius = 9 + step * 0.45;
    box(c, -radius, -7, radius * 1.8, 15, 4, '#5b7355', outline, 1.7);
    oval(c, 2, 0, radius, radius, '#afaa70', outline, 1.8);
    oval(c, 2, -0.5, radius - 2, radius - 2, '#d1c58b', null);
    poly(
      c,
      [
        [-3, 4],
        [3, 7],
        [8, 3],
        [8, 6],
        [3, 9],
        [-4, 6],
      ],
      '#92965e',
      null,
    );
    oval(c, 2, 0, 4, 4, '#688262', outline, 1.1);
    oval(c, 2, -1, 1.6, 1.6, '#e9dbab');
    for (let i = 0; i <= step; i++) box(c, -5 + i * 3, -6, 1.2, 2.8, 0.4, '#78865b', null);
  } else if (key === 'reload') {
    box(c, -4, -5, 8, 10, 2, '#5c7054', outline, 1.5);
    for (let i = 0; i < 2 + step; i++) box(c, -3, -3 + i * 1.2, 6, 0.8, 0.3, '#dfbf76', null);
    box(c, -3, -5, 6, 2, 0.5, '#f0d994', null);
  } else if (key === 'range') {
    // 抱箍属于静止支撑件；只移除此件时仍保留各根枪管的真实运动。
    box(c, -3, -12, 6, 24, 2, '#536e5c', outline, 1.3);
    box(c, -2, -10, 4, 3, 0.8, '#d5c788', null);
    box(c, -1, -6, 2, 13, 0.5, '#92a98d', null);
    for (let i = 0; i <= step; i++) box(c, -2, 7 - i * 2, 4, 1, 0.2, '#d8c78c', null);
  } else if (key === 'accuracy') {
    box(c, -6, -2, 12, 5, 1.3, '#546e59', outline, 1.2);
    box(c, -4, -3, 8, 2, 1, '#d9c78a', outline, 0.7);
    for (let i = 0; i <= step; i++) box(c, -4 + i * 2, -1, 0.8, 2, 0.2, '#b7c7a2', null);
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawReceiver(c, level) {
  if (level <= 5) {
    box(c, -15, -8, 27, 22, 5, '#7b8866', outline);
    if (level > 1) {
      box(c, -12, -6, 19, 3 + (level - 2) * 0.5, 1, '#b7c394', null);
      box(c, -10, 3, 10 + (level - 2), 3, 1, '#5e7757', null);
    }
    return;
  }
  const reinforced = level >= 11;
  poly(
    c,
    [
      [-27, -6],
      [-20, -12],
      [4, -10],
      [11, -4],
      [10, 11],
      [-23, 12],
      [-27, 7],
    ],
    '#657f5e',
    outline,
    2,
  );
  poly(
    c,
    [
      [-25, -6],
      [-19, -10],
      [4, -8],
      [7, -4],
      [-18, -4],
    ],
    '#bfc99b',
    null,
  );
  box(c, -24, 7, 32, 4, 1, '#49664e', null);
  // 开放提把的支柱从同一机匣接出，留空处透明。
  for (const x of [-14, 5]) box(c, x, -17, 3, 9, 1, '#647b59', outline, 1.2);
  box(c, -15, -19, 24, 4, 1.5, '#c8b37b', outline, 1.5);
  if (reinforced) drawReinforcedPart(c, 'damage', level);
  else {
    box(c, -7, -5, 14, 12, 3, '#91a67a', outline, 1.4);
    for (let i = 0; i < level - 5; i++) box(c, -5 + i * 2, 3, 1, 2, 0.3, '#d2d9a6', null);
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawGatlingPart(c, key, level = 1, exposed = false) {
  level = Math.max(1, Math.min(key === 'damage' ? 20 : 5, Math.floor(level)));
  const step = level - 1;
  if (key === 'damage') {
    drawReceiver(c, level);
    return;
  }
  if (key === 'capacity') {
    // 供弹接口不变，鼓体逐级下挂；不用整图缩放伪造体积。
    if (level === 1) {
      oval(c, 3, -10, 11, 10, '#ac9c68', outline);
      return;
    }
    c.save();
    c.translate(0, -(5 - level) * 2.5);
    if (level === 5) drawReinforcedPart(c, key, level);
    else {
      box(c, -9, -7, 16, 14, 4, '#5b7355', outline, 1.7);
      oval(c, 2, 0, 10, 10, '#afaa70', outline, 1.8);
      oval(c, 2, -0.5, 8, 8, '#d1c58b', null);
      if (level >= 3) oval(c, 2, 0, 4, 4, '#688262', outline, 1.1);
      if (level >= 4) {
        oval(c, 2, -1, 1.6, 1.6, '#e9dbab');
        box(c, -3, -7, 2, 4, 0.5, '#78865b', null);
      }
    }
    c.restore();
    return;
  }
  if (key === 'rate') {
    if (level === 1) {
      // 原装驱动被机匣包住，只在工坊拆出或查看旧件时露出内部结构。
      if (exposed) {
        box(c, -3, -5, 6, 10, 2, '#7b8866', outline, 1.3);
        oval(c, 0, 0, 2, 3, '#ac9c68', outline, 1);
      }
      return;
    }
    box(c, 3, -5, 5, 11, 1, '#617957', outline, 1);
    if (level === 5) {
      drawReinforcedPart(c, key, level);
      return;
    }
    const h = 10 + step * 2;
    box(c, -3 - step * 0.75, -h / 2, 9 + step * 0.75, h, 3, '#526e59', outline, 1.7);
    if (level >= 3) box(c, -3, -h / 2 + 2, 7, 2, 1, '#adbf96', null);
    for (let i = 0; i < step + 1; i++) box(c, -2, -3 + i * 2, 6, 1, 0.3, '#9aad86', null);
    return;
  }
  if (key === 'reload') {
    if (level === 1) {
      // 内置供弹片随拆件动作展示，完整原装枪不新增外露盒体。
      if (exposed) {
        box(c, -2, -3, 4, 6, 1, '#ac9c68', outline, 1);
        box(c, -1, -1, 2, 3, 0.5, '#5c7054', null);
      }
      return;
    }
    box(c, 0, -3, 13, 5, 1, '#617957', outline, 1);
    if (level === 5) {
      drawReinforcedPart(c, key, level);
      return;
    }
    box(c, -2, -3, 5 + step * 0.6, 6 + step, 2, '#5c7054', outline, 1.5);
    for (let i = 0; i < step; i++) box(c, -1, -2 + i * 1.5, 4, 0.9, 0.3, '#dfbf76', null);
    return;
  }
  if (key === 'range') {
    if (level === 5) {
      drawReinforcedPart(c, key, level);
      return;
    }
    box(c, 6 - step * 2, -10 - step * 0.4, 4 + step * 0.5, 20 + step * 0.8, 2, '#586e5c', outline, 1.2);
    if (level > 1) box(c, 7 - step * 2, -8, 2 + step * 0.5, 2, 1, '#d5c788', null);
    return;
  }
  if (key === 'accuracy') {
    if (level === 1) {
      box(c, -31, -4, 14, 5, 2, '#ddbc70', outline);
      return;
    }
    if (level === 5) {
      drawReinforcedPart(c, key, level);
      return;
    }
    box(c, -3 - step, -1, 5 + step * 2, 2 + step * 0.6, 1, '#546e59', outline, 1.2);
    box(c, -2, -2, 3 + step, 1.5, 0.6, '#d9c78a', null);
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawGatlingBarrels(c, phase = 0, heat = 0, reinforced = false) {
  if (!reinforced) {
    // 原装六管沿用原版的平涂与比例，前抱箍由射程部件单独绘制。
    oval(c, 9, 0, 5, 11, '#405d4b', outline, 1.6);
    const pipes = Array.from({ length: 6 }, (_, i) => ({ a: phase + (i * Math.PI) / 3 })).sort(
      (a, b) => Math.cos(a.a) - Math.cos(b.a),
    );
    for (const { a } of pipes)
      box(
        c,
        8,
        Math.sin(a) * 7.3 - 1.6,
        35,
        3.2,
        1,
        heatColor(Math.cos(a) > 0 ? '#b8c6a8' : style.gatlingArt.drawGatlingBarrelsColor, '#e98455', heat),
        outline,
        0.8,
      );
    box(c, 18, -10, 4, 20, 2, '#586e5c', outline, 1.2);
    oval(c, 43, 0, 3.5, 10, '#91a58c', outline, 1.4);
    for (let i = 0; i < 6; i++) {
      const a = phase + (i * Math.PI) / 3;
      oval(c, 43 + Math.cos(a) * 2, Math.sin(a) * 7.3, 1.1, 1.6, heat > 0 ? '#f6b279' : '#294f3b');
    }
    oval(c, 43 + Math.cos(phase) * 2, Math.sin(phase) * 7.3, 1.2, 1.7, '#f4dca0');
    return;
  }
  oval(c, 10, 0, 4.5, 11, '#425f50', outline, 1.5);
  const pipes = Array.from({ length: 6 }, (_, i) => ({ a: phase + (i * Math.PI) / 3 }));
  pipes.sort((a, b) => Math.cos(a.a) - Math.cos(b.a));
  for (const { a } of pipes) {
    const depth = Math.cos(a),
      y = Math.sin(a) * 7.1,
      offset = depth * 1.1;
    box(
      c,
      10 + offset,
      y - 1.6,
      32 - offset,
      3.2,
      1.1,
      heatColor(depth > 0 ? '#95ab9f' : '#526f63', '#dd8b5d', heat),
      outline,
      0.7,
    );
    box(c, 12 + offset, y - 1.1, 27, 0.7, 0.3, heatColor(depth > 0 ? '#d6ddc3' : '#8da497', '#f2bf7a', heat), null);
  }
  box(c, 12, -11, 4, 22, 1.5, '#516b58', outline, 1.3);
  box(c, 13, -10, 2, 3, 0.5, '#c5cda4', null);
  oval(c, 42, 0, 3.6, 10.3, '#6d897a', outline, 1.4);
  oval(c, 43, -0.3, 2.8, 8.7, heatColor('#becbb1', '#e8ad70', heat), outline, 0.7);
  for (const { a } of pipes) {
    const x = 43 + Math.cos(a) * 1.8,
      y = Math.sin(a) * 6.8;
    oval(c, x, y, 1, 1.7, '#2f4d40');
    oval(c, x + 0.25, y - 0.4, 0.35, 0.6, heatColor('#91ab99', '#efb775', heat));
  }
  oval(c, 43 + Math.cos(phase) * 2.8, Math.sin(phase) * 9.2, 0.7, 1, '#f2d79a');
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawGatling(c, levels = null, rotor = 0, heat = 0) {
  box(c, -5, 2, 9, 17, 3, '#8f7152', '#3c4b3b', 2.5);
  for (const key of ['damage', 'reload', 'capacity', 'rate', 'range', 'accuracy']) {
    if (key === 'range') drawGatlingBarrels(c, rotor, heat, (levels?.range || 1) >= 4);
    if (levels?.omitted === key) continue;
    const p = GATLING_PARTS[key];
    c.save();
    c.translate(p.x, p.y);
    drawGatlingPart(c, key, levels?.[key] || 1);
    c.restore();
  }
}
