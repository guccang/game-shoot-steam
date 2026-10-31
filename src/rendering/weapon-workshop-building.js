// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import {drawBuildingArchitecture} from './building-architecture.js';
import { style } from '../art-styles/config.js';
import { box, poly } from './primitives.js';
import { drawWorldSign } from './world-signs.js';

// 武器工坊独立建筑：低斜顶、开放工作台与工具墙，破败和完好共用底座及正式图集。

// 单块屋面沿同一斜面铺排，施工只移动这块板，不拉伸或旋转整栋房屋。
// 共用绘制与动作输入，风格差异由配置提供。
function roofPanel(c, index, winter = false, night = 0) {
  const x = -50 + index * 30.75,
    y = -116 + index * 4.5;
  poly(
    c,
    [
      [x, y],
      [x + 30.75, y + 4.5],
      [x + 4.75, y + 38.5],
      [x - 26, y + 34],
    ],
    night ? '#587363' : style.weaponWorkshopBuilding.roofPanelColor,
    style.weaponWorkshopBuilding.roofPanelColor2,
    1.6,
  );
  c.strokeStyle = night ? '#829980' : '#b0c19a';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x + 4, y + 3);
  c.lineTo(x - 18, y + 32);
  c.stroke();
  if (winter)
    poly(
      c,
      [
        [x + 1, y - 1],
        [x + 29, y + 3],
        [x + 20, y + 16],
        [x + 8, y + 13],
        [x - 8, y + 18],
      ],
      '#e8efdd',
      null,
    );
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawWeaponWorkshop(c, ruined = false, winter = false) {
  if(!ruined){drawBuildingArchitecture(c,'weapons',winter);return;}
  const line = style.weaponWorkshopBuilding.drawWeaponWorkshopColor,
    wood = ruined ? '#9b9778' : '#d9bc80';
  poly(
    c,
    [
      [-69, -12],
      [49, -6],
      [73, -17],
      [73, -3],
      [48, 9],
      [-69, 3],
    ],
    '#77856d',
    line,
    style.weaponWorkshopBuilding.drawWeaponWorkshopValue,
  );
  poly(
    c,
    [
      [-69, -12],
      [49, -6],
      [73, -17],
      [51, -22],
      [-67, -21],
    ],
    '#b4b89a',
    line,
    1.6,
  );
  poly(
    c,
    [
      [-66, -80],
      [48, -68],
      [48, -2],
      [-66, -8],
    ],
    wood,
    line,
    style.weaponWorkshopBuilding.drawWeaponWorkshopValue,
  );
  poly(
    c,
    [
      [48, -68],
      [72, -81],
      [72, -12],
      [48, -2],
    ],
    ruined ? '#777e65' : '#9a9c74',
    line,
    style.weaponWorkshopBuilding.drawWeaponWorkshopValue,
  );
  box(
    c,
    43,
    -134,
    16,
    38,
    2,
    ruined ? '#929982' : '#b7bca3',
    line,
    style.weaponWorkshopBuilding.drawWeaponWorkshopValue,
  );
  box(
    c,
    39,
    -137,
    24,
    7,
    2,
    ruined ? '#8d9278' : '#d3d5b6',
    line,
    style.weaponWorkshopBuilding.drawWeaponWorkshopValue,
  );
  for (const y of [-126, -115]) {
    c.strokeStyle = '#74816c';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(44, y);
    c.lineTo(58, y);
    c.stroke();
  }
  box(
    c,
    -58,
    -66,
    72,
    58,
    2,
    ruined ? '#4f5e4a' : '#354e3d',
    line,
    style.weaponWorkshopBuilding.drawWeaponWorkshopValue,
  );
  box(c, -53, -59, 62, 45, 1, ruined ? '#66715a' : '#526c52');
  for (const x of [-66, 13, 46]) box(c, x, -71, 6, 65, 1, ruined ? '#7e8062' : '#b68c55', line, 1.5);
  if (ruined) {
    poly(
      c,
      [
        [-57, -51],
        [8, -43],
        [8, -35],
        [-57, -43],
      ],
      '#99906b',
      '#625f48',
      1.5,
    );
    poly(
      c,
      [
        [-53, -19],
        [11, -39],
        [14, -31],
        [-50, -11],
      ],
      '#afa076',
      '#625f48',
      1.5,
    );
    poly(
      c,
      [
        [-48, -27],
        [-8, -30],
        [-4, -24],
        [-24, -20],
        [-46, -21],
      ],
      '#8c8061',
      line,
      1.5,
    );
    poly(
      c,
      [
        [27, -56],
        [34, -47],
        [28, -38],
        [36, -29],
      ],
      'transparent',
      '#686a52',
      2,
    );
    box(c, 24, -58, 17, 28, 2, '#8b8968', line, 1.3);
    poly(
      c,
      [
        [27, -55],
        [35, -52],
        [32, -44],
        [37, -35],
      ],
      'transparent',
      '#4c634c',
      1.8,
    );
  } else {
    box(c, -49, -29, 57, 8, 2, '#dfbd7c', line, 1.6);
    for (const x of [-44, -3]) box(c, x, -21, 5, 12, 1, '#a9804d', line, 1.2);
    // 台上钳口和短炮管独立可辨，木箱沿内墙摆放，不堵门前。
    box(c, -39, -40, 14, 10, 2, '#8b9b84', line, 1.3);
    box(c, -41, -42, 18, 4, 1, '#c3cdb0', line, 1);
    box(c, -15, -37, 20, 5, 1, '#b7c4aa', line, 1.2);
    box(c, -11, -32, 5, 4, 1, '#8b9b84');
    box(c, -48, -14, 26, 7, 1, '#9b8257', line, 1);
    box(c, 24, -61, 17, 32, 2, '#ead39b', line, 1.3);
    for (const x of [28, 36]) {
      box(c, x, -54, 2.5, 20, 1, '#7e907a', line, 0.8);
      poly(
        c,
        [
          [x - 2, -56],
          [x - 2, -61],
          [x + 1, -58],
          [x + 4, -61],
          [x + 4, -55],
        ],
        '#b9c6a8',
        line,
        1,
      );
    }
  }
  poly(
    c,
    [
      [-76, -82],
      [-50, -116],
      [73, -98],
      [50, -65],
    ],
    ruined ? '#4d6050' : style.weaponWorkshopBuilding.roofPanelColor,
    line,
    2.4,
  );
  if (ruined) {
    for (const i of [0, 1, 2, 3, 4]) {
      const x = -50 + i * 30.75,
        y = -116 + i * 4.5;
      poly(
        c,
        [
          [x, y],
          [x + 4, y + 0.6],
          [x - 22, y + 34.6],
          [x - 26, y + 34],
        ],
        '#a29066',
        line,
        1.2,
      );
    }
    roofPanel(c, 0, winter);
    roofPanel(c, 3, winter);
    poly(
      c,
      [
        [-19, -111],
        [3, -108],
        [-1, -97],
        [-8, -101],
        [-15, -90],
        [-29, -96],
      ],
      '#768471',
      line,
      1.4,
    );
  } else for (let i = 0; i < 4; i++) roofPanel(c, i, winter);
  poly(
    c,
    [
      [-76, -82],
      [50, -65],
      [50, -58],
      [-76, -75],
    ],
    ruined ? '#858363' : '#b99861',
    line,
    style.weaponWorkshopBuilding.drawWeaponWorkshopValue,
  );
  poly(
    c,
    [
      [50, -65],
      [73, -98],
      [78, -92],
      [53, -58],
    ],
    ruined ? '#596d56' : '#4f7058',
    line,
    style.weaponWorkshopBuilding.drawWeaponWorkshopValue,
  );
  box(c, -38, -78, 57, 17, 3, ruined ? '#bab18b' : '#f4dfaa', line, 1.5);
  box(c, -26, -73, 30, 5, 1, ruined ? '#74826a' : '#52735b', line, 1);
  poly(
    c,
    [
      [-20, -68],
      [-12, -68],
      [-14, -62],
      [-21, -62],
    ],
    '#9b8057',
    line,
    1,
  );
  if (ruined) {
    for (const x of [-64, 58]) {
      poly(
        c,
        [
          [x, 1],
          [x - 5, -12],
          [x + 2, -5],
          [x + 6, -15],
          [x + 7, 2],
        ],
        winter ? '#b5bfaa' : '#7b9565',
        line,
        1,
      );
    }
    c.save();
    c.translate(0, 0);
    c.rotate(-0.06);
    drawWorldSign(c, '武器工坊', 0, 1);
    c.restore();
  } else drawWorldSign(c, '武器工坊', 0, 1);
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawWeaponWorkshopConstruction(c, progress, night = 0, winter = 0, reduced = false) {
  const timber = night ? '#9c9972' : '#d1b278',
    line = '#536d51';
  for (const x of [-79, 77]) box(c, x, -100, 5, 108, 1, timber, line, 1.4);
  for (const y of [-57, -15]) box(c, -82, y, 165, 5, 1, timber, line, 1.3);
  c.strokeStyle = line;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-76, -52);
  c.lineTo(-60, -16);
  c.moveTo(78, -52);
  c.lineTo(62, -16);
  c.stroke();
  const p = Math.max(0, Math.min(1, progress)) * 4;
  for (let i = 0; i < 4; i++) {
    const stage = Math.max(0, Math.min(1, p - i));
    if (stage <= 0) continue;
    c.save();
    c.translate(0, reduced ? 0 : -16 * (1 - stage) * (1 - stage));
    roofPanel(c, i, winter >= 0.5, night);
    c.restore();
  }
  // 木料堆收在脚手架两侧，施工期间不盖住人物行走的门前区域。
  for (let i = 0; i < 3; i++) box(c, -74 + i * 2, 2 - i * 4, 25, 4, 1, timber, line, 1);
}
