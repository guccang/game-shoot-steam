import {drawDumplingLord} from './dumpling-lord.js';
import {drawBossSkillHazard,drawBossSkillCue} from './boss-skills.js';
import { canvasFont } from './text-style.js';
import { i18nText } from "../i18n/index.js";
// 四种森林领主的卡通剪影及技能预警，画布只读取战斗状态。
import { bossProfile } from '../config/bosses.js';
import { box, oval, poly, outline } from './primitives.js';
import { applyBossImpact } from './boss-impact.js';

// 圆润眼睛与高光共用描边，减少不同领主之间的风格漂移。
function eyes(c, y, gap, color = '#f9e7ae') {
  for (const side of [-1, 1]) {
    oval(c, side * gap, y, 7, 9, color, outline, 2);
    oval(c, side * gap + 1, y + 1, 3, 5, outline);
    oval(c, side * gap + 2, y - 2, 1.5, 2, '#fffbed');
  }
}
// 铁牙：橡果铠甲、荆棘背鬃、大獠牙与四只短蹄形成低重心轮廓。
function boar(c, phase, motion) {
  const crouch = phase === 'windup' ? 5 : 0;
  c.translate(0, crouch);
  for (const x of [-34, 30]) box(c, x - 10, -12, 22, 24, 8, '#705542', outline, 3);
  oval(c, 0, -39, 55, 44, '#a77850', outline, 3.5);
  for (const [x, y] of [
    [-35, -66],
    [-17, -78],
    [5, -83],
    [27, -73],
  ])
    poly(
      c,
      [
        [x - 10, y + 10],
        [x - 5, y - 20],
        [x + 10, y + 10],
      ],
      '#617855',
      outline,
      3,
    );
  oval(c, 0, -48, 44, 34, '#bd9366', outline, 3);
  for (const s of [-1, 1]) {
    poly(
      c,
      [
        [s * 26, -69],
        [s * 49, -82],
        [s * 44, -49],
      ],
      '#cda171',
      outline,
      3,
    );
    poly(
      c,
      [
        [s * 25, -25],
        [s * 45, -42],
        [s * 38, -10],
        [s * 24, -8],
      ],
      '#fff0c9',
      outline,
      3,
    );
    box(c, s * 30 - 10, -49, 20, 13, 5, '#6d7853', outline, 2);
  }
  eyes(c, -43, 17);
  oval(c, 0, -19, 25, 18, '#d6ac7d', outline, 3);
  for (const x of [-9, 9]) oval(c, x, -19, 4, 6, '#70513d');
  if (phase === 'windup')
    for (const s of [-1, 1]) oval(c, s * 31, -12, 7 + motion * 2, 4, '#f3e2bb99');
}
// 绒伞：宽大花边菌盖、柔软菌柄、孢子灯笼和小蘑菇王冠。
function mushroom(c, phase, motion) {
  for (const s of [-1, 1]) {
    oval(c, s * 40, -22, 12, 24, '#dfc5a4', outline, 3);
    oval(c, s * 48, -37 - motion * 3, 10, 12, '#c294be', outline, 2);
    oval(c, s * 48 - 2, -40 - motion * 3, 3, 4, '#f5dda6');
  }
  oval(c, 0, -25, 33, 42, '#ead7b4', outline, 3.5);
  for (const x of [-18, 18]) oval(c, x, 8, 16, 8, '#cebb9e', outline, 2);
  oval(c, 0, -55, 61, 17, '#c49ab2', outline, 3);
  c.beginPath();
  c.moveTo(-62, -58);
  c.bezierCurveTo(-58, -132, 54, -139, 64, -58);
  c.bezierCurveTo(40, -41, -40, -41, -62, -58);
  c.fillStyle = phase === 'windup' ? '#dba0b8' : '#ba7e9b';
  c.fill();
  c.strokeStyle = outline;
  c.lineWidth = 3.5;
  c.stroke();
  for (const [x, y, r] of [
    [-32, -72, 10],
    [0, -94, 12],
    [33, -74, 9],
    [-11, -61, 6],
  ])
    oval(c, x, y, r, r * 0.65, '#f8dcb7');
  for (const x of [-16, 0, 16]) {
    box(c, x - 3, -119 + Math.abs(x) * 0.3, 6, 13, 3, '#efe0bc', outline, 1.5);
    oval(c, x, -121 + Math.abs(x) * 0.3, 7, 4, '#e7b96d', outline, 1.5);
  }
  eyes(c, -31, 13);
  oval(c, 0, -10, 6, 4, '#925d70');
  for (const x of [-22, 22]) oval(c, x, -21, 6, 3, '#d29ba6');
}
// 枭爵：蓝灰羽毛、奶油面盘和金色眉冠，展开双翼展示扇形齐射方向。
function owl(c, phase, motion) {
  const spread = phase === 'windup' || phase === 'cast' ? 1 : 0.55;
  for (const s of [-1, 1]) {
    c.save();
    c.scale(s, 1);
    for (let i = 0; i < 4; i++) {
      c.save();
      c.translate(24, -54);
      c.rotate((0.7 + i * 0.17) * spread + motion * 0.025);
      oval(c, 10 + i * 6, -16 - i * 3, 12, 35 + i * 3, i % 2 ? '#7794a6' : '#60758e', outline, 2.5);
      c.restore();
    }
    poly(
      c,
      [
        [15, 3],
        [29, 3],
        [35, 12],
        [19, 12],
      ],
      '#d1a965',
      outline,
      2,
    );
    c.restore();
  }
  oval(c, 0, -38, 36, 49, '#71849a', outline, 3.5);
  oval(c, 0, -28, 24, 30, '#c7d2cc', outline, 2);
  for (const y of [-40, -25, -10])
    poly(
      c,
      [
        [-5, y],
        [0, y + 6],
        [5, y],
      ],
      '#8fa7ac',
      null,
    );
  for (const s of [-1, 1])
    poly(
      c,
      [
        [s * 13, -76],
        [s * 35, -112],
        [s * 36, -65],
      ],
      '#5d738c',
      outline,
      3,
    );
  oval(c, 0, -68, 39, 32, '#a7b6bd', outline, 3);
  for (const s of [-1, 1]) oval(c, s * 16, -66, 18, 22, '#f2e5c7', outline, 2);
  eyes(c, -66, 16, '#f5d386');
  poly(
    c,
    [
      [-8, -53],
      [0, -42],
      [8, -53],
    ],
    '#cf9f58',
    outline,
    2,
  );
  for (const s of [-1, 1])
    poly(
      c,
      [
        [s * 4, -84],
        [s * 30, -93],
        [s * 25, -82],
        [s * 8, -77],
      ],
      '#d7b96e',
      outline,
      2,
    );
}
// 河龟：青绿甲壳与六角晶簇，低矮宽厚的形体区别于其他直立领主。
function turtle(c, phase, motion) {
  for (const s of [-1, 1]) {
    oval(c, s * 46, -6, 18, 14, '#789d80', outline, 3);
    for (let i = 0; i < 3; i++) box(c, s * 46 - 8 + i * 6, 0, 4, 7, 2, '#dfd6ab', outline, 1);
  }
  oval(c, 0, -40, 55, 44, '#588f87', outline, 3.5);
  oval(c, 0, -45, 44, 31, '#78aca0', outline, 2);
  for (const [x, y] of [
    [-27, -48],
    [0, -61],
    [27, -48],
    [0, -28],
  ])
    poly(
      c,
      [
        [x - 13, y],
        [x - 7, y - 12],
        [x + 7, y - 12],
        [x + 14, y],
        [x + 7, y + 12],
        [x - 7, y + 12],
      ],
      '#8bb9a7',
      '#49766d',
      2,
    );
  for (const [x, y, h] of [
    [-24, -64, 24],
    [0, -78, 38],
    [25, -63, 25],
  ]) {
    poly(
      c,
      [
        [x - 10, y],
        [x - 7, y - h],
        [x, y - h - 9],
        [x + 10, y - h],
        [x + 11, y],
      ],
      phase === 'windup' ? '#d9f4e5' : '#a3d2c7',
      outline,
      2.5,
    );
    poly(
      c,
      [
        [x, y - h - 9],
        [x + 10, y - h],
        [x + 11, y],
        [x, y],
      ],
      '#65aeb0',
      null,
    );
  }
  oval(c, 0, -7, 28, 24, '#a8c29b', outline, 3);
  eyes(c, -12, 13);
  box(c, -9, 2, 18, 3, 1, '#56775c');
  if (phase === 'windup') oval(c, 0, -75, 8 + motion, 5, '#e9ffe9aa');
}
// 外形随前摇、施法和硬直变化；减少动态模式仅保留姿态与颜色提示。
export function drawNewBoss(c, b, time, reduced = false) {
  const phase = b.ai?.phase || 'chase',
    motion = reduced || b.kind==='dumpling' ? 0 : Math.sin(time * 4);
  c.save();
  c.translate(b.x, b.y);
  oval(c, 0, 9, 60, 20, '#30463235');
  c.translate(0, reduced ? 0 : motion * 2 - (b.z || 0));
  if (phase === 'recover' && !reduced && b.kind!=='dumpling') {
    c.rotate(Math.sin(time * 6) * 0.035);
    c.scale(1.05, 0.94);
  }
  if(b.kind!=='dumpling')applyBossImpact(c, b, reduced);
  if (b.flash && !(b.heavyHit > 0)) c.globalAlpha = 0.68;
  if(b.kind==='dumpling')drawDumplingLord(c,b,time,reduced);
  else (({ boar, mushroom, owl, turtle })[b.kind] || boar)(c, phase, motion);
  c.restore();
  drawBossSkillCue(c,b);
  if (!b.ai?.skill && (phase === 'windup' || phase === 'recover')) {
    c.save();
    c.font = canvasFont(12);
    c.textAlign = 'center';
    c.lineWidth = 4;
    c.strokeStyle = '#fff9e5';
    const label = phase === 'windup' ? `${bossProfile(b).title} !` : i18nText("rendering.bosses.3666e8b383");
    c.strokeText(label, b.x, b.y - 142);
    c.fillStyle = phase === 'windup' ? '#b15346' : '#417e70';
    c.fillText(label, b.x, b.y - 142);
    c.restore();
  }
}
// 胶囊与圆形使用真实伤害范围加玩家半径，虚线始终表示尚未生效。
export function drawBossHazard(c, h, reduced = false) {
  if(drawBossSkillHazard(c,h,reduced))return;
  const warning = h.age < h.warmup,
    progress = Math.min(1, h.age / h.warmup),
    active = Math.max(0, h.age - h.warmup);
  c.save();
  c.translate(h.x, h.y);
  c.lineCap = 'round';
  const color = h.family==='dumpling'?'#62844c':
    h.kind === 'spore'
      ? '#995783'
      : h.kind === 'wave'
        ? '#377f83'
        : h.kind === 'feather'
          ? '#5b72a3'
          : '#ba634b';
  if (h.kind === 'charge' || h.kind === 'feather') {
    const width = (h.radius + 12) * 2;
    if (warning || h.kind === 'charge') {
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(h.dx * h.length, h.dy * h.length);
      c.strokeStyle = color + '26';
      c.lineWidth = width;
      c.stroke();
      c.setLineDash([7, 6]);
      c.strokeStyle = color + 'bb';
      c.lineWidth = 2;
      c.stroke();
      c.setLineDash([]);
      oval(c, 0, 0, 15, 15, '#fff7dc99', color, 2);
      c.beginPath();
      c.arc(0, 0, 15, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      c.lineWidth = 4;
      c.stroke();
      c.save();
      c.translate(h.dx * h.length, h.dy * h.length);
      c.rotate(Math.atan2(h.dy, h.dx));
      poly(
        c,
        [
          [-14, -7],
          [0, 0],
          [-14, 7],
          [-9, 0],
        ],
        color,
        null,
      );
      c.restore();
    } else if (!h.hit) {
      const travel = Math.min(h.length, active * h.speed);
      c.translate(h.dx * travel, h.dy * travel);
      c.rotate(Math.atan2(h.dy, h.dx));
      if (!reduced)
        poly(
          c,
          [
            [-37, -7],
            [-5, -4],
            [0, 0],
            [-5, 4],
            [-37, 7],
          ],
          '#b4cad075',
          null,
        );
      poly(
        c,
        [
          [-19, 0],
          [-5, -11],
          [12, 0],
          [-5, 11],
        ],
        '#dce9da',
        color,
        2.5,
      );
      c.beginPath();
      c.moveTo(-15, 0);
      c.lineTo(10, 0);
      c.strokeStyle = '#d4ae6e';
      c.lineWidth = 2;
      c.stroke();
    }
  } else if (h.kind === 'wave') {
    const radius = warning ? h.radius : h.radius + Math.min(h.duration, active) * h.speed;
    if (warning) {
      c.setLineDash([7, 8]);
      oval(
        c,
        0,
        0,
        h.radius + h.speed * h.duration + 18,
        h.radius + h.speed * h.duration + 18,
        '#65a6a613',
        color + '66',
        2,
      );
      c.setLineDash([]);
      oval(c, 0, 0, 24 + progress * 22, 24 + progress * 22, '#a2d6c343', color, 3);
    } else {
      oval(c, 0, 0, radius, radius, '#ffffff00', color + '40', h.width + 24);
      oval(c, 0, 0, radius, radius, '#ffffff00', '#d4efdf', h.width);
      oval(c, 0, 0, radius + 3, radius + 3, '#ffffff00', color, 2);
    }
  } else {
    const radius = h.radius + 12;
    if (warning) c.setLineDash([6, 4]);
    oval(c, 0, 0, radius, radius, warning ? color + '29' : color + '60', color, 2);
    c.setLineDash([]);
    if (warning) {
      c.beginPath();
      c.arc(0, 0, radius * progress, 0, Math.PI * 2);
      c.strokeStyle = color;
      c.lineWidth = 3;
      c.stroke();
    }
    if(warning&&h.order){c.font=canvasFont(16);c.textAlign='center';c.fillStyle=color;c.fillText(String(h.order),0,6);}
    if (h.kind === 'spore') {
      for (let i = 0; i < 7; i++) {
        const angle = i * 2.4,
          r = 15 + (i % 3) * 13,
          x = Math.cos(angle) * r,
          y = Math.sin(angle) * r;
        oval(
          c,
          x,
          y - (warning || reduced ? 0 : Math.sin(active * 3 + i) * 5),
          4 + (i % 3),
          5,
          '#ecd5e4',
          color,
          1,
        );
      }
      if (warning) {
        c.font = canvasFont(18);
        c.textAlign = 'center';
        c.fillStyle = color;
        c.fillText('!', 0, 6);
      }
    } else if (!warning && h.family!=='dumpling') {
      for (let i = 0; i < 6; i++) {
        c.save();
        c.rotate((i * Math.PI) / 3);
        poly(
          c,
          [
            [10, -4],
            [45, -9],
            [60, 2],
            [26, 7],
          ],
          h.family==='dumpling'?'#b8d18b':'#d7ae79',
          outline,
          1,
        );
        c.restore();
      }
    }
  }
  c.restore();
}
