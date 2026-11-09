import {drawShieldEmitter} from './energy-shield.js';
import {chainsawRange,chainsawTip} from '../combat/chainsaw-geometry.js';
import {drawGravityGun} from './gravity-gun.js';
import { drawGatling } from './gatling-art.js';
import { drawSpiderController } from './spider.js';
import { drawMechanicalCore } from './mechanical.js';
import { drawWeaponParts } from './equipment-parts.js';
import { drawWorkshopPart } from './workshop-parts.js';
import { workshopPart } from '../config/workshop-parts.js';
// 角色与武器画像，战场和营地共用，调用方提供画布上下文。
import { catSprites } from './cat-animation.js';
import { HEROES } from '../config/heroes.js';
import { CAT_SCARVES } from '../config/cat-scarves.js';
// 静态头像也使用同一主体资源，避免营地与战场显示不同品种。
const portraitMotion = { idleTime: 0, moveTime: 0, moveWeight: 0 };
import { GUN_SCALE, PLAYER_SCALE, RECOIL_PROFILES, weaponPose } from '../combat/recoil.js';

import { drawFunnelController } from './controller.js';
import { box, oval, poly, outline } from './primitives.js';
// 枪械使用独立轮廓、材料和枪口尺寸，营地与实战共用绘制。
// 统一装配外观入口：原枪与附加部件共享坐标，所有展示与战场调用一致。
export function drawWeapon(c, weapon, x = 0, y = 0, scale = 1, slide = 0, flash = 0, heat = 0, modChoice = 0, parts = null, rotor = 0, sawTip = null) {
  c.save();
  try {
    c.translate(x,y); c.scale(scale,scale);
    if(Number(weapon)===18){drawShieldEmitter(c);return;}
    if(Number(weapon)===16){drawSpiderController(c);return;}
    c.save();
    try { drawWeaponBody(c,weapon,0,0,1,slide,flash,heat,rotor,parts,sawTip); }
    finally { c.restore(); }
    if(Number(weapon)!==2)drawWeaponParts(c,Number(weapon),parts,slide);
  } finally { c.restore(); }
  c.save(); c.translate(x, y); c.scale(scale, scale);
  drawWorkshopPart(c, workshopPart(Number(weapon), modChoice));
  c.restore();
}
// 保留原始枪械的独立后坐、枪口和结构。
function drawWeaponBody(c, weapon, x = 0, y = 0, scale = 1, slide = 0, flash = 0, heat = 0, rotor = 0, parts = null, sawTip = null) {
  const index = Number(weapon),
    laser = index === 1;
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  if(index===17){drawGravityGun(c,slide,flash);c.restore();return;}
  if (index === 15) { drawMechanicalCore(c); c.restore(); return; }
  if (index === 14) {
    const tip=sawTip??chainsawTip(chainsawRange(parts));
    // 圆润护罩、封闭把手与外露锯链形成工具剪影；震动时锯齿交错流动。
    box(c, -24, -13, 31, 26, 7, '#e3b75d', outline, 2.5);
    box(c, -30, -18, 12, 31, 5, '#47674d', outline, 2.5);
    box(c, -9, 8, 13, 13, 3, '#587356', outline, 2);
    box(c, 1, -9, tip-1, 18, 9, '#5b6a60', outline, 2.5);
    box(c, 7, -5, tip-13, 10, 5, '#c4d0b6', null);
    const offset = flash > 0 ? (flash * 90) % 7 : 0;
    for (let p = 10; p < tip-13; p += 7) {
      box(c, p + offset, -11, 4, 4, 1, '#e1e4cb', outline, 1);
      box(c, p + 7 - offset, 7, 4, 4, 1, '#e1e4cb', outline, 1);
    }
    for (let p = -17; p < -3; p += 5) box(c, p, -6, 2, 12, 1, '#637653', null);
    oval(c, -3, -1, 3, 3, flash ? '#a9e7a0' : '#749275', outline, 1);
    c.restore();
    return;
  }
  if (index === 12 || index === 13) {
    drawFunnelController(c, flash);
    c.restore();
    return;
  }
  if(index!==2)box(c, -5, 2, 9, 17, 3, '#8f7152', '#3c4b3b', 2.5);
  if (index === 10 || index === 11) {
    // 分叉电极与冰晶储罐采用不同轮廓，使新枪在小尺寸图标中仍可辨认。
    const arc = index === 10,
      body = arc ? '#75648f' : '#608f9c',
      glow = arc ? '#d9c6ff' : '#bcefff';
    box(c, -21, -12, 43, 24, 6, body, outline);
    oval(c, -7, -2, 10, 10, glow, outline, 2);
    if (arc) {
      for (const y of [-11, 7]) {
        box(c, 16, y, 26, 5, 2, '#b9b7cb', outline, 1.5);
        oval(c, 40, y + 2, 4, 4, glow, outline, 1);
      }
      poly(
        c,
        [
          [-5, -8],
          [-11, 0],
          [-4, 0],
          [-8, 6],
          [1, -3],
          [-5, -3],
        ],
        '#fff9d1',
        null,
      );
    } else {
      box(c, 17, -8, 23, 16, 3, '#d2e9e7', outline, 2);
      poly(
        c,
        [
          [-13, -3],
          [-7, -17],
          [0, -3],
          [-7, 10],
        ],
        '#ecfcff',
        '#8abacb',
        1.5,
      );
      for (let i = 0; i < 3; i++) box(c, 22 + i * 6, -11, 3, 22, 1, '#7bb8c6', outline, 1);
    }
  } else if (index === 9) {
    // 厚重双轨炮身、发光线圈与大口径约束环形成独立的能量武器轮廓。
    box(c, -29, -12, 20, 24, 4, '#486970', outline);
    box(c, -17, -15, 43, 27, 6, '#496b69', outline);
    oval(c, -7, -2, 10, 10, '#80eac7', outline, 2);
    oval(c, -7, -2, 5, 5, '#e8ffcb');
    box(c, 17, -10, 43, 7, 2, '#739b97', outline, 2);
    box(c, 17, 3, 43, 7, 2, '#739b97', outline, 2);
    box(c, 19, -2, 39, 4, 1, '#a7ffe4');
    for (let i = 0; i < 3; i++) box(c, 25 + i * 10, -13, 5, 26, 2, '#a6c7b0', outline, 1.5);
    box(c, 54, -14, 6, 28, 2, '#e4c97e', outline, 2);
    box(c, -15, -22, 24, 6, 2, '#a5d7ca', outline, 2);
  } else if (index === 8) {
    // 长枪管、瞄准镜与鹰翼枪托区分远程狙击枪，枪口锚点与后坐配置一致。
    poly(
      c,
      [
        [-28, -6],
        [-12, -8],
        [-4, 0],
        [-15, 7],
        [-28, 11],
      ],
      '#657f86',
      outline,
    );
    box(c, -13, -9, 39, 15, 3, '#55717a', outline);
    box(c, -7, -6, 21, 5, 1, '#b9d4cd', null);
    box(c, 22, -5, 32, 7, 2, '#829c9f', outline, 2);
    box(c, 48, -7, 6, 11, 1, '#4c646d', outline, 1.5);
    box(c, -2, -17, 4, 9, 1, '#d5b16a', outline, 1);
    box(c, -12, -23, 31, 10, 4, '#405f6e', outline, 2);
    oval(c, 18, -18, 3, 4, '#a9f1ee', outline, 1);
    box(c, 7, 5, 10, 13, 2, '#d1b36b', outline, 2);
    box(c, -8 - slide * 0.5, -11, 10, 3, 1, '#e3c780', outline, 1);
  } else if (index === 6) {
    box(c, -16, -11, 34, 21, 5, '#7c8564', outline);
    oval(c, 0, 2, 12, 11, '#bd9a5b', outline);
    for (let i = 0; i < 3; i++) box(c, -9 + i * 7, -6, 4, 13, 2, '#ead18c', outline, 1);
    box(c, 14, -7, 24, 14, 3, '#52695b', outline);
    box(c, 32, -10, 6, 20, 2, '#a0ad85', outline);
    box(c, -10, -17, 12, 5, 2, '#ecbd62', outline);
  } else if (index === 7) {
    box(c, -20, -14, 16, 26, 6, '#be664b', outline);
    box(c, -16, -17, 8, 5, 2, '#d5ad6a', outline);
    box(c, -12, -7, 32, 16, 4, '#8d7654', outline);
    box(c, 12, -6, 27, 12, 2, '#52645a', outline);
    for (let i = 0; i < 3; i++) box(c, 21 + i * 5, -8, 3, 16, 1, '#d6a56a', outline, 1);
    oval(c, 40, -1, 3, 4, '#ffb15f');
  } else if (index === 2) {
    drawGatling(c,parts,rotor,heat);
  } else if (index === 3) {
    box(c, -17, -7, 24, 15, 3, '#b27b50', outline);
    box(c, 4, -8, 34, 6, 2, '#7b8b7c', outline);
    box(c, 4, -1, 34, 6, 2, '#5c7062', outline);
    box(c, 12, -4, 15, 12, 3, '#b99259', outline);
  } else if (index === 4) {
    box(c, -12, -10, 30, 19, 5, '#847799', outline);
    oval(c, 2, -1, 8, 8, '#d9b2f0', outline);
    box(c, 16, -7, 18, 12, 3, '#94a4a5', outline);
    box(c, 27, -10, 6, 18, 2, '#c1add7', outline);
  } else if (index === 5) {
    box(c, -15, -12, 30, 22, 7, '#65a6b6', outline);
    oval(c, -5, -7, 9, 8, '#b0e6dd', outline);
    box(c, 12, -5, 22, 11, 3, '#d4b768', outline);
    box(c, 29, -7, 5, 14, 2, '#5e9eb0', outline);
    box(c, -10, -20, 16, 6, 2, '#e1be75', outline);
  } else if (laser) {
    box(c, -13, -9, 38, 15, 4, '#698877', '#354d44', 2.5);
    box(c, -5, -6, 19, 8, 2, '#b4efac', '#456d50', 1.5);
    box(c, 23, -6, 13, 9, 2, '#b4b8a1', '#354d44');
    box(c, -9, -14, 10, 5, 1, '#e5c36a', '#354d44', 1.5);
  } else {
    box(c, 0, -3, 23, 6, 2, '#4c5c50', '#35493c');
    box(c, -10 - slide, -8, 30, 11, 3, '#737d70', '#35493c', 2.5);
    box(c, 18, -6, 8, 9, 2, '#4c5c50', '#35493c');
    box(c, -5 - slide, -7, 15, 4, 1, '#aeb4a0');
  }
  // 枪口闪光跟随枪身后坐，手枪为短促火焰，激光枪为能量脉冲。
  if (flash > 0) {
    const tip = RECOIL_PROFILES[index].muzzle,
      power = Math.min(1, flash / 0.025);
    c.save();
    c.globalAlpha = power;
    oval(c, tip + 4, -1.5, laser ? 9 : 12, laser ? 6 : 9, laser ? '#b9ff9a44' : '#ffd96544');
    if (index === 9) {
      oval(c, tip + 10, -1.5, 36, 22, '#8affdf55');
      oval(c, tip + 13, -1.5, 23, 10, '#aaffed');
      oval(c, tip + 10, -1.5, 18, 3, '#ffffff');
    } else if (index === 8) {
      oval(c, tip + 9, -1.5, 25, 13, '#a5ddff44');
      poly(
        c,
        [
          [tip, -5],
          [tip + 14, -4],
          [tip + 29, -1.5],
          [tip + 14, 2],
          [tip, 3],
        ],
        '#ffda91',
        null,
      );
      poly(
        c,
        [
          [tip, -3],
          [tip + 22, -1.5],
          [tip, 1],
        ],
        '#f5fdff',
        null,
      );
    } else if (index === 4 || index === 5) {
      oval(c, tip + 5, -1.5, 8, 4, index === 5 ? '#b4efff99' : '#e5c5ff99');
      oval(c, tip + 4, -1.5, 3, 2, '#f0ffff');
    } else if (laser) {
      oval(c, tip + 3, -1.5, 5, 4, '#d4ffae');
      oval(c, tip + 4, -1.5, 2.5, 2, '#fffde0');
    } else {
      poly(
        c,
        [
          [tip, -5],
          [tip + 5, -4],
          [tip + 11, -8],
          [tip + 9, -2],
          [tip + 17, -1],
          [tip + 9, 2],
          [tip + 11, 7],
          [tip + 5, 3],
          [tip, 2],
        ],
        '#ffd67b',
        null,
      );
      poly(
        c,
        [
          [tip, -3],
          [tip + 9, -1],
          [tip, 1],
        ],
        '#fffbe6',
        null,
      );
    }
    c.restore();
  }
  c.restore();
}
// 绘制六品种猫咪伙伴，主体连续帧与小手枪械使用各自独立的姿态。
export function drawCat(
  c,
  x,
  y,
  hero = 0,
  angle = 0,
  scale = 1,
  walk = 0,
  weapon = 0,
  recoil = null,
  motionScale = 1,
  chargePose = null,
  heat = 0,
  sample = false,
  bodyOnly = false,
  animation = null,
  modChoice = 0,
  parts = null,
  rotor = 0,
  unarmed = false, // 驾驶与交接隐藏手持武器，身体仍使用原连续帧。
  gust = 0,
  airborne = false,
) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  const mint = hero === 1,
    fur = hero > 1 ? HEROES[hero].color : mint ? '#d9e8db' : sample ? '#f5d69a' : '#f0cd91',
    dark = sample ? '#574b38' : '#66513b',
    bob = Math.sin(walk) * 1.5;
  const pose = weaponPose(angle, weapon, recoil, motionScale);
  // 导出视频参考首帧时仅保留主体，不把影子、小手或枪械烘焙进素材。
  if (!bodyOnly && !airborne) oval(c, 0, 9, 22, 8, '#30492b25');
  if (sample && !bodyOnly && !airborne) oval(c, 1, 10, 14, 4, '#2d46373b');
  const animated = !bodyOnly && catSprites.draw(c, hero, animation || portraitMotion, pose, motionScale < 1, gust);
  c.translate(0, bob);
  if (!animated) {
    c.save();
    c.rotate(-0.3);
    c.beginPath();
    c.moveTo(-17, 0);
    c.bezierCurveTo(-39, 4, -33, -15, -28, -9);
    c.strokeStyle = dark;
    c.lineWidth = 9;
    c.lineCap = 'round';
    c.stroke();
    c.strokeStyle = fur;
    c.lineWidth = 5;
    c.stroke();
    c.restore();
    oval(c, -9, 8 + Math.sin(walk) * 2, 7, 5, fur, dark);
    oval(c, 9, 8 - Math.sin(walk) * 2, 7, 5, fur, dark);
    // 脚底和影子固定，上半身轻微承接后坐，不推动角色碰撞体。
    c.translate(pose.bodyX, pose.bodyY);
    box(c, -17, -18, 34, 29, 11, mint ? '#6c9680' : '#dca85f', dark, 2.5);
    oval(c, 0, -3, 10, 12, mint ? '#b4c9a5' : '#f8dfaa');
    // 猫耳与脸颊连成一体，保持缩小后的可读性。
    c.beginPath();
    c.moveTo(-20, -23);
    c.lineTo(-19, -44);
    c.quadraticCurveTo(-18, -48, -9, -38);
    c.quadraticCurveTo(0, -42, 10, -38);
    c.quadraticCurveTo(21, -49, 21, -43);
    c.lineTo(22, -23);
    c.bezierCurveTo(26, -5, -26, -5, -20, -23);
    c.fillStyle = fur;
    c.fill();
    c.strokeStyle = dark;
    c.lineWidth = 2.6;
    c.stroke();
    if (sample) {
      // 明亮额头与较暖下颊只增加两块平涂，避免给卡通角色叠加写实高光。
      c.save(); c.clip();
      oval(c, 5, -10, 24, 6, mint ? '#b9cfbd' : '#deba7c');
      oval(c, -7, -34, 9, 3, mint ? '#edf4df' : '#ffebbc');
      c.restore();
    }
    poly(
      c,
      [
        [-16, -40],
        [-10, -35],
        [-16, -32],
      ],
      '#d99e80',
      null,
    );
    poly(
      c,
      [
        [17, -40],
        [11, -35],
        [17, -32],
      ],
      '#d99e80',
      null,
    );
    if (!mint) {
      c.strokeStyle = '#c19762';
      c.lineWidth = 2.5;
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(i * 6, -38);
        c.lineTo(i * 5, -33);
        c.stroke();
      }
    }
    const scarfColor = bodyOnly ? (mint ? '#dac47d' : '#6d9675') : CAT_SCARVES[HEROES[hero].id].cloth;
    const facing = Math.cos(angle) * 2;
    oval(c, -7 + facing, -25, 2, 2.8, dark);
    oval(c, 8 + facing, -25, 2, 2.8, dark);
    oval(c, -13, -21, 3.5, 2, '#e7ac8b');
    oval(c, 14, -21, 3.5, 2, '#e7ac8b');
    c.beginPath();
    c.moveTo(-4 + facing, -20);
    c.quadraticCurveTo(0 + facing, -15, 2 + facing, -21);
    c.quadraticCurveTo(3 + facing, -16, 7 + facing, -20);
    c.strokeStyle = dark;
    c.lineWidth = 1.8;
    c.stroke();
    poly(
      c,
      [
        [-16, -13],
        [0, -8],
        [15, -13],
        [8, -5],
        [-10, -6],
      ],
      scarfColor,
      dark,
      1.5,
    );
    poly(
      c,
      [
        [-10, -7],
        [-16, 4],
        [-4, 0],
      ],
      scarfColor,
      dark,
      1.5,
    );
  } else c.translate(pose.bodyX, pose.bodyY);
  if (!bodyOnly && !unarmed) {
    drawHeldWeapon(c, pose, { weapon, recoil, motionScale, chargePose, heat, modChoice, parts, rotor, fur, dark });
  }
  if (mint && !animated) {
    poly(
      c,
      [
        [-24, -34],
        [-15, -45],
        [18, -45],
        [27, -35],
      ],
      '#688b72',
      dark,
      2,
    );
    box(c, -27, -36, 55, 5, 3, '#76997a', dark, 1.5);
    poly(
      c,
      [
        [13, -44],
        [16, -59],
        [22, -48],
      ],
      '#dfbe68',
      dark,
      1.2,
    );
  }
  c.restore();
}

// 共用手持武器和小手的局部变换，骑乘与步行保持相同后坐与连接关系。
function drawHeldWeapon(c, pose, { weapon, recoil, motionScale, chargePose, heat, modChoice, parts, rotor, fur, dark }) {
    c.save();
    c.translate(pose.gripX, pose.gripY);
    c.scale(pose.flip, 1);
    c.rotate(pose.rotation);
    c.translate(-pose.kick, 0);
    // 蓄能振动仅作用于枪身和握枪的手，不移动脚底、角色碰撞体或实际弹道。
    if (chargePose) {
      c.translate(chargePose.x, chargePose.y);
      c.rotate(chargePose.rotation);
    }
    drawWeapon(
      c,
      weapon,
      8,
      0,
      GUN_SCALE,
      Math.max(0, pose.kick) * 0.7,
      (recoil?.flash || 0) * motionScale,
      heat,
      modChoice,
      parts,
      rotor,
    );
    oval(c, 1, 5, 6, 5, fur, dark, 1.8);
    if (weapon !== 0) oval(c, 17, 5, 5, 4, fur, dark, 1.6);
    c.restore();
}
// 骑手枪械在车前壳上方绘制，避免朝下射击时被车把和挡泥板遮住。
export function drawRiderWeapon(c, player, hero, weapon, options = {}) {
  const { motionScale = 1, chargePose = null, heat = 0, modChoice = 0, parts = null, rotor = 0, sample = false, scale = PLAYER_SCALE } = options;
  const recoil = player.recoil, pose = weaponPose(player.angle, weapon, recoil, motionScale);
  const fur = hero > 1 ? HEROES[hero].color : hero === 1 ? '#d9e8db' : sample ? '#f5d69a' : '#f0cd91';
  const dark = sample ? '#574b38' : '#66513b';
  c.save();
  c.translate(player.x, player.y); c.scale(scale, scale);
  c.translate(pose.bodyX, pose.bodyY + Math.sin(player.walkPhase || 0) * 1.5);
  drawHeldWeapon(c, pose, { weapon, recoil, motionScale, chargePose, heat, modChoice, parts, rotor, fur, dark });
  c.restore();
}
