import {drawTreasureGun} from './treasure-equipment.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { drawCrewModule } from './cat-crew.js';
import { drawWolfCannon } from './red-wolf.js';
import { drawRotaryBarrels } from './rotary-barrels.js';
import { tideKick } from '../config/tide-cannon.js';
import { RECOIL_PROFILES } from '../combat/recoil.js';
import { box, oval, poly, outline } from './primitives.js';
import { equipmentParts } from '../config/equipment-parts.js';
import { drawEquipmentPart } from './equipment-parts.js';

// 车型主炮独立部件绘制；炮架固定，炮管真实伸缩，六管转子逐管旋转。

// 与正式炮口使用同一长度和后坐位移；不拉伸整枪或车体代替动作。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawVehicleArmament(c, weapon, { kick = 0, flash = 0, rotor = 0, reduced = false, tide = null } = {}) {
  if(weapon.treasure){drawTreasureGun(c,weapon,kick);return;}
  if (weapon.crew) {
    drawCrewModule(c);
    return;
  }
  weapon=weapon.artBase?{...weapon,id:weapon.artBase}:weapon;
  const tank = ['tank-125', 'wolf-256'].includes(weapon.id),
    vulcan = weapon.id === 'vehicle-vulcan',
    levels = weapon.parts || {};
  const parts = equipmentParts('turret', weapon.weaponIndex).map((p) =>
    tank && p.key === 'range' ? { ...p, x: p.x - kick } : p,
  );
  c.save();
  c.save();
  if(weapon.id==='heron-cannon'){
    box(c,-13,-10,31,20,5,'#5a827d',outline,2);
    c.translate(-kick,0);
    box(c,12,-5,42,10,2,'#99aca0',outline,2);
    box(c,20,-8,17,16,3,'#cf9a58',outline,2);
    box(c,48,-7,9,14,2,'#526963',outline,2);
  }else if(weapon.regional){drawRegionalGunBody(c,weapon,kick);}
  else if (weapon.id === 'wolf-256') {
    drawWolfCannon(c, kick);
  } else if (tank) {
    poly(
      c,
      [
        [-28, -16],
        [-12, -21],
        [12, -17],
        [21, -9],
        [21, 9],
        [10, 16],
        [-25, 14],
      ],
      style.vehicleArmaments.drawVehicleArmamentColor,
      outline,
      2.2,
    );
    box(c, -20, -13, 30, 7, 3, '#c6cfa1');
    box(c, 0, -10, 30, 20, 5, '#586e5c', outline, 2);
    for (const y of [-12, 12]) {
      box(c, 4, y - 3, 23, 6, 2, '#46604d', outline, 1.5);
      box(c, 20, y - 1.5, Math.max(2, 39 - kick), 3, 1, '#d7d8b4', outline, 1);
      box(c, 55 - kick, y - 4, 5, 8, 2, style.vehicleArmaments.drawVehicleArmamentColor2, outline, 1.2);
    }
    c.save();
    c.translate(-kick, 0);
    box(c, 9, -5, 69, 10, 2, '#9aaa8d', outline, 2);
    box(c, 42, -8, 15, 16, 4, style.vehicleArmaments.drawVehicleArmamentColor3, outline, 1.8);
    box(c, 68, -5, 10, 10, 2, style.vehicleArmaments.drawVehicleArmamentColor4, outline, 1.5);
    box(c, 76, -3, 3, 6, 1, style.vehicleArmaments.drawVehicleArmamentColor5);
    c.restore();
    for (let i = 0; i < 3; i++) box(c, 2 + i * 6, -9, 2, 18, 1, '#bac5a2');
    box(c, -25, 8, 15, 6, 2, style.vehicleArmaments.drawVehicleArmamentColor2, outline, 1.2);
  } else if (weapon.id === 'hover-tide') {
    // 压力罐与炮架固定，双喷管沿独立轴线后坐，不牵动风扇或裙边。
    box(c, -25, -13, 39, 26, 7, style.vehicleArmaments.drawVehicleArmamentColor3, outline, 2);
    for (const y of [-12, 12]) {
      oval(c, -13, y, 13, 8, '#a1c9bb', outline, 1.8);
      box(c, -18, y - 5, 6, 10, 2, '#f4dca0', outline, 1);
    }
    box(c, -6, -7, 19, 14, 4, style.vehicleArmaments.drawVehicleArmamentColor, outline, 1.5);
    oval(c, 2, 0, 4, 4, '#b7ede0', outline, 1.2);
    for (const [i, y] of [-7, 7].entries()) {
      // 固定套筒与露出的活塞杆明确显示每根喷管的独立行程。
      box(c, 7, y - 3, 18, 6, 2, '#466a5a', outline, 1.2);
      c.save();
      c.translate(-tideKick(tide?.ages[i], reduced), 0);
      box(c, 16, y - 4, 30, 8, 3, '#9ac5b8', outline, 1.7);
      box(c, 27, y - 5, 5, 10, 2, '#f4dca0', outline, 1.1);
      oval(c, 46, y, 3, 4, style.vehicleArmaments.drawVehicleArmamentColor5, outline, 1);
      oval(c, 47, y, 1.5, 2.5, '#a6e4dc');
      c.restore();
    }
  } else if (vulcan) {
    oval(c, -12, 8, 14, 16, style.vehicleArmaments.drawVehicleArmamentColor3, outline, 2);
    box(c, -18, -12, 30, 24, 5, style.vehicleArmaments.drawVehicleArmamentColor, outline, 2);
    c.save();
    c.translate(-kick, 0);
    drawRotaryBarrels(c, reduced ? 0 : rotor, 50);
    c.restore();
  } else {
    if (style.vehicleArmaments.legacyGun) {
      {
        box(c, -22, -10, 40, 20, 4, '#718672', outline, 2);
        box(c, -17, -9, 25, 4, 1, '#b8c4a0');
        box(c, -14, 8, 19, 15, 3, '#b6ad77', outline, 1.7);
        for (let i = 0; i < 4; i++) box(c, -10 + i * 4, 10, 2, 8, 1, '#f4dca0', outline, 0.5);
        c.save();
        c.translate(-kick, 0);
        box(c, 9, -5, 34, 10, 2, '#718672', outline, 1.8);
        for (let i = 0; i < 4; i++) box(c, 14 + i * 6, -3, 3, 3, 1, '#315c43');
        box(c, 39, -6, 5, 12, 2, '#b9c4a3', outline, 1.3);
        c.restore();
      }
    } else {
      if (weapon.id === 'vehicle-machinegun') {
        // 松果主炮用少量圆角色块；炮架固定，炮管仍按真实后坐沿原43单位枪口滑动。
        box(c, -22, -10, 40, 20, 5, '#9ba36a', '#59402e', 3.2);
        box(c, -16, -7, 25, 4, 2, '#c6cf8b');
        box(c, -14, 8, 19, 15, 4, '#cfbb7d', '#59402e', 2);
        for (const x of [-9, -3, 3]) box(c, x, 11, 2, 8, 1, '#797b53');
        c.save();
        c.translate(-kick, 0);
        box(c, 9, -5, 34, 10, 3, '#aeb47a', '#59402e', 2.8);
        for (const x of [15, 22, 29, 36]) oval(c, x, -1, 1.5, 1.5, '#59402e');
        box(c, 39, -6, 5, 12, 2, '#ffe1a0', '#59402e', 1.7);
        c.restore();
      } else {
        box(c, -22, -10, 40, 20, 4, '#8b956b', outline, 2);
        box(c, -17, -9, 25, 4, 1, '#d0d99c');
        box(c, -14, 8, 19, 15, 3, '#b6ad77', outline, 1.7);
        for (let i = 0; i < 4; i++) box(c, -10 + i * 4, 10, 2, 8, 1, '#f4dca0', outline, 0.5);
        c.save();
        c.translate(-kick, 0);
        box(c, 9, -5, 34, 10, 2, '#8b956b', outline, 1.8);
        for (let i = 0; i < 4; i++) box(c, 14 + i * 6, -3, 3, 3, 1, '#594b32');
        box(c, 39, -6, 5, 12, 2, '#b9c4a3', outline, 1.3);
        c.restore();
      }
    }
  }
  c.restore();
  for (const p of parts)
    if (levels.omitted !== p.key && (levels[p.key] || 1) > 1)
      drawEquipmentPart(c, weapon.weaponIndex, p, levels[p.key]);
  if (flash > 0 && weapon.id !== 'hover-tide') {
    c.save();
    c.translate(weapon.muzzle - kick, 0);
    if (tank) {
      // 炮口只短促闪亮并连续消退，不给火焰描实体轮廓，避免弹头离开后留下三角形。
      const strength = Math.min(1, flash / RECOIL_PROFILES[weapon.weaponIndex].flash),
        size = (reduced ? 5 : 11) * (0.6 + 0.4 * strength);
      c.globalAlpha *= strength;
      oval(c, size * 0.45, 0, size, size * 0.5, '#f4dca0');
      oval(c, size * 0.25, 0, size * 0.55, size * 0.3, '#fff5cd');
    } else {
      const size = reduced ? 7 : 12;
      poly(
        c,
        [
          [0, -3],
          [size * 0.55, -size * 0.27],
          [size, 0],
          [size * 0.55, size * 0.27],
          [0, 3],
        ],
        '#f4dca0',
      );
      poly(
        c,
        [
          [0, -2],
          [size * 0.65, 0],
          [0, 2],
        ],
        '#fff5cd',
      );
    }
    c.restore();
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawTankShell(c, b, reduced = false) {
  c.save();
  c.translate(b.x, b.y - ((b.z ?? 9) - 9));
  c.rotate(Math.atan2(b.dy, b.dx));
  if (b.kind === 'wolf-256') c.scale(1.5, 1.5);
  if (!reduced)
    poly(
      c,
      [
        [-Math.min(38, b.travelled), -2],
        [-6, -4],
        [-6, 4],
      ],
      (b.color||'#f4dca0')+'66',
    );
  poly(
    c,
    [
      [-9, -3],
      [2, -3],
      [8, 0],
      [2, 3],
      [-9, 3],
    ],
    b.color||'#f4dca0',
    outline,
    1.3,
  );
  box(c, -7, -3, 3, 6, 1, style.vehicleArmaments.drawVehicleArmamentColor2);
  c.restore();
}

// 地方主炮保留固定炮座与独立炮管，轮廓区别通过管数、支架和制退器表达。
function drawRegionalGunBody(c,w,kick){const i=w.weaponIndex-25,heavy=[1,2,4].includes(i);poly(c,[[-26,-15],[-12,-21],[16,-16],[24,0],[12,18],[-24,13]],heavy?'#819680':'#9cae7e',outline,2);box(c,-19,-12,28,8,3,'#e3d7a7',outline,1.4);box(c,-6,-9,26,18,4,'#526d59',outline,2);
 if(i===2)for(const y of [-13,13])box(c,8,y-2,53,4,1,'#b2bea0',outline,1.5);
 if(i===1||i===4)for(const y of [-14,14])box(c,-8,y-3,30,6,2,'#c5b88a',outline,1.4);
 c.save();c.translate(-kick,0);
 if(i===3){for(const y of [-7,7]){box(c,12,y-3,37,6,2,'#bac9a4',outline,1.6);box(c,43,y-4,6,8,1,'#e6d4a2',outline,1.4);}}
 else{const width=i===4?18:i===1?14:8,end=w.muzzle;box(c,10,-width/2,end-10,width,2,'#acbda0',outline,1.8);if(i===1)for(const x of [27,42])box(c,x,-10,7,20,2,'#e1ce99',outline,1.4);if(i===4){box(c,42,-14,16,28,3,'#d9c38f',outline,1.8);for(const y of [-8,0,8])box(c,54,y-2,4,4,1,'#365b43');}else box(c,end-7,-width/2-2,7,width+4,2,'#dfd6a9',outline,1.4);}
 c.restore();}
