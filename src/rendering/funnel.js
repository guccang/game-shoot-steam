import {chainsawTip} from '../combat/chainsaw-geometry.js';
import { drawFunnelController } from './controller.js';
export { drawFunnelController } from './controller.js';
import { drawWeapon } from './characters.js';
import { drawWeaponParts } from './equipment-parts.js';
import { RECOIL_PROFILES } from '../combat/recoil.js';
import { drawWorkshopPart } from './workshop-parts.js';
import { workshopPart } from '../config/workshop-parts.js';
// 星环阵列只读取战斗姿态；装甲、核心、锁线及充能反馈不驱动任何攻击。
import { drawPulseCharge, pulseChargePose } from './pulse.js';
import { drawDrone } from './drone.js';
import { box, oval, poly } from './primitives.js';
import { gatlingHeat } from '../combat/weapon-heat.js';

import { drawFunnelGather, drawFunnelFlash, drawFunnelReturn } from './funnel-effects.js';
import { drawFunnelFlight } from './funnel-flight.js';

const INK = '#34564c';

// 炮体半径不超过 23 单位；飞控为出击锚点预留后坐、推进与核心光效的可见边距。
export function drawFunnelCannon(c, folded = false, flash = 0, reduced = false) {
  const wing = folded ? 7 : 13;
  for (const sign of [-1, 1])
    poly(
      c,
      [
        [-14, sign * 4],
        [-17, sign * wing],
        [-3, sign * (wing - 1)],
        [5, sign * 5],
      ],
      '#e5d8ae',
      INK,
      1.7,
    );
  box(c, -14, -7, 26, 14, 6, '#f7f1d7', INK, 2);
  box(c, 9, -4, 8, 8, 2, '#739b90', INK, 1.5);
  box(c, 13, -4, 3, 8, 1, '#dabb76', INK, 1);
  oval(c, -4, 0, 6, 5, folded ? '#6b9c93' : '#87e5da', INK, 1.5);
  oval(c, -5, -1, 2, 2, folded ? '#a6c9b6' : '#ecfff3');
  drawFunnelFlash(c, flash / 0.14, reduced);
}

// 工坊展示三炮编队；控制器仅作为下方的小型连接核心。
export function drawFunnelIcon(c, x, y, scale = 1, kind = 'funnel', parts = null) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  for (const [dx, dy, a] of [
    [-27, 0, -0.45],
    [0, -21, -Math.PI / 2],
    [27, 0, -2.7],
  ]) {
    c.save();
    c.translate(dx, dy);
    c.rotate(a);
    (kind === 'drone' ? drawDrone : drawFunnelCannon)(c);
    c.save(); c.scale(.6,.6); drawWeaponParts(c, kind === 'drone' ? 13 : 12, parts); c.restore();
    c.restore();
  }
  c.translate(0, 26);
  c.scale(0.8, 0.8);
  drawFunnelController(c);
  c.restore();
}

// 只在新锁定时显示短线；有限粒子用时钟解析计算，无额外粒子队列或持久灯光。
export function drawFunnelArray(c, player, state, reduced = false) {
  if (!state) return;
  c.save();
  if ((state.charging || state.nodes.some((n) => n.charging)) && !reduced)
    drawFunnelReturn(c, player, state);
  for (const node of state.nodes) {
    if (!reduced) drawFunnelFlight(c, player, node);
    const x = player.x + node.x,
      y = player.y + node.y;
    if (
      !state.charging &&
      !node.charging &&
      state.deploy <= 0 &&
      node.targetPoint &&
      node.lockFlash > 0 &&
      node.lockFlash <= 0.25 - node.index * 0.06 &&
      !reduced
    ) {
      c.globalAlpha = Math.min(0.45, node.lockFlash * 2);
      c.strokeStyle = '#d3fff0';
      c.lineWidth = 1;
      c.setLineDash([4, 7]);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(node.targetPoint.x, node.targetPoint.y);
      c.stroke();
      c.setLineDash([]);
      c.globalAlpha = 1;
    }
    c.save();
    c.translate(x, y);
    const module = node.weapon;
    const charge = module?.chargeTime ? (node.pulse?.charge || 0) / module.chargeTime : 0;
    const vibration = pulseChargePose(charge, state.time, reduced);
    c.translate(vibration.x, vibration.y);
    c.rotate(node.angle + vibration.rotation);
    c.translate(reduced ? 0 : -node.recoil.kick, 0);
    // 开火前炮口短暂聚光，减少动态时关闭这一装饰动画。
    if (
      !reduced &&
      !state.charging &&
      !node.charging &&
      state.primed &&
      node.targetPoint &&
      node.cooldown > 0 &&
      node.cooldown < 0.28 &&
      (!module || ['funnel', 'drone'].includes(module.id))
    ) {
      drawFunnelGather(c, 1 - node.cooldown / 0.28, state.time, node.index);
    }
    (state.kind === 'drone' ? drawDrone : drawFunnelCannon)(
      c,
      state.charging || node.charging || !node.targetPoint,
      !module || ['funnel', 'drone'].includes(module.id) ? node.recoil.flash : 0,
      reduced,
      state.time,
    );
    // 挂载普通枪使用正式枪械结构，枪口对齐炮体出射点，炮体和控制器不混合。
    if (module && !['funnel', 'drone'].includes(module.id)) {
      const scale = .42, muzzle = RECOIL_PROFILES[module.weaponIndex].muzzle;
      drawWeapon(c,module.weaponIndex,17-muzzle*scale,0,scale,0,node.recoil.flash,gatlingHeat(module,node.magazine),module.modChoice,module.parts,reduced?0:node.magazine?.rotor||0,module.id==='chainsaw'?chainsawTip(module.range,scale,true):null);
    } else if (module) {
      c.save(); c.scale(.6,.6); drawWeaponParts(c,module.weaponIndex,module.parts);
      if(module.modChoice) drawWorkshopPart(c,workshopPart(module.weaponIndex,module.modChoice));
      c.restore();
    }
    c.restore();
    if (charge > 0 && !node.charging) {
      drawPulseCharge(
        c,
        {
          kind: 'pulse',
          charge,
          angle: node.angle,
          muzzle: { x: x + Math.cos(node.angle) * 17, y: y + Math.sin(node.angle) * 17 },
        },
        1.7,
        state.time,
        reduced,
      );
    }
    // 单炮供给环跟随该炮显示，不占用角色中央头顶，也不掩盖其他炮的攻击。
    if (node.charging) {
      const fill =
        node.flight.mode === 'dock'
          ? 1 - node.magazine.remaining / (module?.reloadTime || state.reloadTime)
          : 0;
      c.strokeStyle = '#34564c99';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x, y, 25, 0, Math.PI * 2);
      c.stroke();
      if (fill > 0) {
        c.strokeStyle = '#c5ffea';
        c.beginPath();
        c.arc(x, y, 25, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2);
        c.stroke();
      }
    }
    if (node.completion > 0 && !reduced) {
      c.globalAlpha = node.completion / 0.45;
      c.strokeStyle = '#b8ffdf';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(x, y, 12 + (1 - node.completion / 0.45) * 18, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 1;
    }
  }
  if (state.completion > 0 && !reduced) {
    c.globalAlpha = (state.completion / 0.45) * 0.5;
    c.strokeStyle = '#c2ffe5';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(player.x, player.y - 42, 20 + (1 - state.completion / 0.45) * 34, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
}
