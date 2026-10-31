// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import {tankPaintContext,drawTankBadge} from './tank-paint.js';
import { style } from '../art-styles/config.js';
import { drawPoliceRear, drawPoliceFront } from './police-patrol.js';
import { chainsawTip } from '../combat/chainsaw-geometry.js';
import { drawJinbeiRear, drawJinbeiFront } from './jinbei-van.js';
import { drawRedWolfRear, drawRedWolfFront } from './red-wolf.js';
import { drawScooterRear, drawScooterFront } from './scooter.js';
import { drawFireTruckRear, drawFireTruckFront } from './fire-truck.js';
import { nativeVehicleWeapon, isVehicleArmament } from '../config/vehicle-armaments.js';
import { drawVehicleArmament } from './vehicle-armaments.js';
import { tankHullPose } from '../config/tank-recoil.js';
import { drawVehicleParts } from './equipment-parts.js';
import { drawPineRear, drawPineFront } from './pine-wheels.js';
import {
  drawHeavyRear,
  drawHeavyFront,
  drawHelicopterRear,
  drawHelicopterFront,
  drawHelicopterRotor,
} from './vehicle-models.js';
import { box, oval, poly, outline } from './primitives.js';
import { drawWeapon } from './characters.js';
import { gatlingHeat } from '../combat/weapon-heat.js';
import { vehicleGunPose, vehicleMuzzle, VEHICLE_GUN_SCALE } from '../combat/vehicle.js';
import { vehicleWeapon } from '../config/vehicles.js';
import { drawPulseCharge } from './pulse.js';
import { drawHovercraftRear, drawHovercraftFront } from './hovercraft.js';

// 卡通载具使用现有平涂、绿色描边与暖金装甲；绘制不推进战斗。

// 车轮、履带和机身在猫咪身后绘制；兼容原入口，绘制只读取运动相位。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawVehicleTracks(c, player, vehicle, reduced = false, time = 0, progress=null) {
  c=tankPaintContext(c,progress,vehicle.index,'rear');
  c.save();
  c.translate(player.x, player.y);
  if (vehicle.index === 8) {
    drawPoliceRear(c, vehicle.wheelPhase || 0, time, reduced);
    c.restore();
    return;
  }
  if (vehicle.index === 7) {
    drawJinbeiRear(
      c,
      reduced ? 0 : vehicle.wheelPhase || 0,
      vehicle.module?.companions?.hatch || 0,
      vehicle.module?.companions?.hatchSide || 1,
    );
    c.restore();
    return;
  }
  if (vehicle.index === 6) {
    drawRedWolfRear(c, reduced ? 0 : vehicle.wheelPhase || 0, tankHullPose(vehicle, reduced));
    c.restore();
    return;
  }
  if (vehicle.index === 5) {
    drawScooterRear(c, reduced ? 0 : vehicle.wheelPhase || 0);
    c.restore();
    return;
  }
  if (vehicle.index === 4) {
    drawFireTruckRear(c, reduced ? 0 : vehicle.wheelPhase || 0);
    c.restore();
    return;
  }
  if (vehicle.index === 3) {
    drawHovercraftRear(c, player, time, reduced);
    c.restore();
    return;
  }
  if (vehicle.index === 1) {
    drawHeavyRear(c, reduced ? 0 : player.walkPhase, tankHullPose(vehicle, reduced));
    c.restore();
    return;
  }
  if (vehicle.index === 2) {
    drawHelicopterRear(c, reduced ? 0 : time * 25);
    c.restore();
    return;
  }
  drawPineRear(c, reduced ? 0 : vehicle.wheelPhase || 0);
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawVehicleArmor(c, player, vehicle, progress, time, reduced = false, assembly = null) {
  const originalContext=c;c=tankPaintContext(c,progress,vehicle.index,'front');
  if (vehicle.index === 5) {
    c.save();
    c.translate(player.x, player.y);
    drawScooterFront(c, reduced ? 0 : vehicle.wheelPhase || 0);
    drawVehicleParts(c, 5, progress, assembly?.kind === 'vehicle' ? assembly.part : null);
    c.restore();
    return;
  }
  const w = vehicleWeapon(progress, vehicle.weaponIndex),
    pose = vehicleGunPose(vehicle, reduced);
  if (w && assembly?.kind === 'turret') w.parts = { ...w.parts, omitted: assembly.part };
  c.save();
  c.translate(player.x, player.y);
  const hull = tankHullPose(vehicle, reduced);
  c.translate(hull.x, hull.y);
  if (vehicle.index === 8) drawPoliceFront(c);
  else if (vehicle.index === 7) drawJinbeiFront(c);
  else if (vehicle.index === 6) drawRedWolfFront(c, vehicle.flash > 0);
  else if (vehicle.index === 4) drawFireTruckFront(c, vehicle.flash > 0);
  else if (vehicle.index === 3) drawHovercraftFront(c, vehicle.flash > 0);
  else if (vehicle.index === 1) drawHeavyFront(c, vehicle.flash > 0);
  else if (vehicle.index === 2) {
    drawHelicopterFront(c, vehicle.flash > 0);
    drawHelicopterRotor(c, time, reduced);
  } else drawPineFront(c, vehicle.flash > 0);
  drawTankBadge(c,progress,vehicle.index);
  drawVehicleParts(c, vehicle.index, progress, assembly?.kind === 'vehicle' ? assembly.part : null);
  if (!w || w.crew) {
    c.restore();
    return;
  }
  c=tankPaintContext(originalContext,progress,vehicle.index,'turret');
  c.translate(0, 5);
  c.rotate(pose.angle);
  box(
    c,
    -13,
    -12,
    28,
    24,
    8,
    vehicle.index === 6
      ? '#ad5e4b'
      : style.vehicle.legacyArmor
        ? '#789574'
        : vehicle.index === 0
          ? '#8b9471'
          : '#789574',
    style.vehicle.legacyArmor ? outline : vehicle.index === 0 ? '#59402e' : outline,
    style.vehicle.legacyArmor ? 2 : vehicle.index === 0 ? 2.6 : 2,
  );
  if (isVehicleArmament(vehicle.weaponIndex)) {
    c.save();
    c.scale(VEHICLE_GUN_SCALE, VEHICLE_GUN_SCALE);
    drawVehicleArmament(c, w, {
      kick: pose.kick / VEHICLE_GUN_SCALE,
      flash: vehicle.recoil.flash,
      rotor: vehicle.rotor,
      reduced,
      tide: vehicle.module?.magazine.tide,
    });
    c.restore();
  } else {
    c.translate(-pose.kick, 0);
    drawWeapon(
      c,
      vehicle.weaponIndex,
      0,
      0,
      VEHICLE_GUN_SCALE,
      vehicle.recoil.kick * 0.4,
      reduced ? 0 : vehicle.recoil.flash,
      gatlingHeat(w, vehicle.module.magazine),
      w.modChoice,
      w.parts,
      reduced ? 0 : vehicle.module.magazine.rotor || 0,
      w.id === 'chainsaw' ? chainsawTip(w.range, VEHICLE_GUN_SCALE, true) : null,
    );
  }
  c.restore();
  if (w.chargeTime)
    drawPulseCharge(
      c,
      {
        kind: 'pulse',
        charge: vehicle.module.pulse.charge / w.chargeTime,
        muzzle: vehicleMuzzle(player, vehicle, reduced),
      },
      1.4,
      time,
      reduced,
    );
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawVehicleIcon(c, index = 0) {
  c.clearRect(0, 0, c.canvas.width, c.canvas.height);
  c.save();
  // 小导航图标和大收藏画像按同一包围盒缩放，耳朵及行走部件都不裁切。
  const scale = Math.min(
    c.canvas.width / ([6, 7].includes(index) ? 175 : 155),
    c.canvas.height / (index === 7 ? 145 : index === 6 ? 135 : 115),
  );
  c.translate(c.canvas.width / 2, c.canvas.height / 2 + 10 * scale);
  c.scale(scale, scale);
  const player = { x: 0, y: 0, walkPhase: 0 };
  drawVehicleTracks(c, player, { index }, true);
  box(c, -16, -38, 32, 31, 8, '#d7bd76', outline, 2.5);
  oval(c, -6, -25, 2, 3, outline);
  oval(c, 7, -25, 2, 3, outline);
  poly(
    c,
    [
      [-16, -35],
      [-16, -45],
      [-5, -38],
    ],
    '#d7bd76',
  );
  poly(
    c,
    [
      [16, -35],
      [16, -45],
      [5, -38],
    ],
    '#d7bd76',
  );
  if (index === 8) drawPoliceFront(c);
  else if (index === 7) drawJinbeiFront(c);
  else if (index === 6) drawRedWolfFront(c, false);
  else if (index === 5) drawScooterFront(c, 0);
  else if (index === 4) drawFireTruckFront(c);
  else if (index === 3) drawHovercraftFront(c, false);
  else if (index === 1) drawHeavyFront(c, false);
  else if (index === 2) drawHelicopterFront(c, false);
  else drawPineFront(c, false);
  const armament = nativeVehicleWeapon(index);
  if (armament && !armament.crew) {
    c.save();
    c.translate(0, 5);
    c.scale(0.75, 0.75);
    drawVehicleArmament(c, armament, { reduced: true });
    c.restore();
  }
  if (index === 2) drawHelicopterRotor(c, 0, true);
  c.restore();
}
