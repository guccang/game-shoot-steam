import {clipEraSeat} from './vehicle-eras.js';
import {drawEnergyShield} from './energy-shield.js';
import {drawGravityFields} from './gravity-gun.js';
import { riderPosition,frontRider } from '../config/vehicle-rider.js';
import { PLAYER_SCALE } from '../combat/recoil.js';
import { isVehicleArmament } from '../config/vehicle-armaments.js';
import { drawVehicleArmament } from './vehicle-armaments.js';
import { drawSpiderPreview, drawSpiderPack } from './spider-armed.js';
import { drawArmedMechanicalCat } from './mechanical-armed.js';
import { vehicleCompanionContext } from '../combat/vehicle-companions.js';
import { createRecoil } from '../combat/recoil.js';
import { drawMechanicalPreview, drawMechanicalPack } from './mechanical.js';
import { createVehicle } from '../combat/vehicle.js';
// 工作台和靶场只调用正式装备、角色、弹道及特效绘制器。
import { drawWeapon, drawCat, drawRiderWeapon } from './characters.js';
import { drawVehicleTracks, drawVehicleArmor } from './vehicle.js';
import { drawFunnelIcon, drawFunnelArray } from './funnel.js';
import { drawBallistics } from './projectiles.js';
import { drawCombatFX } from './particles.js';
import { effectiveWeapon } from '../config/weapon-mods.js';
import { vehicleWeapon } from '../config/vehicles.js';
import { box, oval } from './primitives.js';
import { drawWorkshopPart } from './workshop-parts.js';
import { workshopPart } from '../config/workshop-parts.js';

// 舞台绘制和可点击热点共用布局，缩放后零件仍准确落在自身连接点。
export function workshopLayout(width, height, kind, index) {
  // 二十小蛛双环预留足尖边距，热点仍使用同一缩放，不能只缩绘图。
  const spider = kind !== 'vehicle' && index === 16;
  const scale = Math.min(width / (spider ? 250 : 220), height / (spider ? 200 : 170)) * (kind === 'vehicle' ? 1.5 : 1);
  // 电锯为最高范围保留固定展示倍率，升级只增长锯链，不改变机身显示大小。
  return { scale, x: width / 2, y: height / 2 + 10 * scale,
    gunScale: index === 14 ? 1.4 : index === 16 ? 1 : index === 15 ? 1.15 : index === 0 ? 3.4 : index >= 8 ? 1.8 : 2.4,
    shift: index === 14 ? -50 : [15,16].includes(index) ? 0 : index === 0 ? -27 : -30 };
}

// 按真实包围盒居中展示，套件不改变画布比例，也不使用固定炮管示意图。
export function drawWorkshopEquipment(c, progress, kind, index, time = 0, reduced = false, assembly = null) {
  // 清除异常绘制遗留的裁剪和保存栈，下一次选择能完整恢复。
  if(c.reset)c.reset();else c.canvas.width=c.canvas.width;
  c.clearRect(0, 0, c.canvas.width, c.canvas.height);
  c.save();
  try {
  const layout = workshopLayout(c.canvas.width, c.canvas.height, kind, index);
  const { scale } = layout;
  c.translate(layout.x, layout.y); c.scale(scale, scale);
  if (kind === 'weapons' || kind === 'turret') {
    const w = kind === 'weapons' ? effectiveWeapon(progress, index) : vehicleWeapon(progress, index);
    if(w && assembly)w.parts={...w.parts,omitted:assembly.part};
    if(kind==='turret'&&isVehicleArmament(index)){c.scale(1.8,1.8);drawVehicleArmament(c,w,{reduced});}
    else if(w.controller==='spider')drawSpiderPreview(c,w,time,reduced,progress);
    else if ([12, 13].includes(index)) {
      drawFunnelIcon(c, 0, -4, 1.4, index === 12 ? 'funnel' : 'drone', w?.parts);
      c.translate(0, 33);
      drawWorkshopPart(c, workshopPart(index, w?.modChoice || 0));
    } else {
      if (w.controller === 'mechanical') drawMechanicalPreview(c,w,time,reduced,drawArmedMechanicalCat,Number.isInteger(progress.mechanicalLoadout)?{weapon:effectiveWeapon(progress,progress.mechanicalLoadout),angle:0,recoil:createRecoil()}:null);
      c.translate(layout.shift, 0); c.scale(layout.gunScale, layout.gunScale);
      drawWeapon(c, index, 0, 0, 1, 0, 0, 0, w?.modChoice || 0, w?.parts);
    }
  } else {
    const player = { x: 0, y: 0, walkPhase: 0 };
    const vehicle = createVehicle(progress, index); vehicle.angle = -.18;
    drawVehicleTracks(c, player, vehicle, reduced, time,progress);
    drawVehicleArmor(c, player, vehicle, progress, time, reduced, assembly);
  }
  } finally { c.restore(); }
}

// 靶场背景是有限平涂的试射道，弹道、伤害闪光与枪械动作都来自真实会话。
export function drawWorkshopTrial(c, session, reduced = false) {
  const g = session.game;
  // 清除异常绘制遗留的裁剪和保存栈，下一次选择能完整恢复。
  if(c.reset)c.reset();else c.canvas.width=c.canvas.width;
  c.clearRect(0, 0, c.canvas.width, c.canvas.height);
  c.save(); c.scale(c.canvas.width / 560, c.canvas.height / 270);
  box(c, 0, 0, 560, 270, 0, '#d6d6ad');
  for (let x = 30; x < 560; x += 65) {
    c.strokeStyle = '#9ca880'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, 15); c.lineTo(x, 255); c.stroke();
  }
  // 飞行阵列预留侧向出击和枪口安全区，车载与手持使用同一固定取景。
  const flying=['funnel','drone'].includes(g.weapon().controller)||g.vehicle.active&&[12,13].includes(g.vehicle.weaponIndex);
  if(flying){c.translate(180,150);c.scale(.78,.78);c.translate(-900,-750);}
  else c.translate((['mechanical','spider'].includes(g.weapon().controller)||g.vehicle.active&&[15,16].includes(g.vehicle.weaponIndex)?140:80) - 900, 150 - 750);
  drawGravityFields(c,g,reduced);
  for (const e of g.enemies) {
    box(c, e.x - 3, e.y - 12, 6, 30, 2, '#795F3F');
    oval(c, e.x, e.y - 15, 15, 18, e.flash > 0 ? '#fff2c6' : '#F4DCA0', '#315C43', 2);
    oval(c, e.x, e.y - 15, 8, 10, '#B68A51', '#315C43', 1);
    oval(c, e.x, e.y - 15, 3, 4, '#315C43');
  }
  drawTrialPlayer(c,g,reduced);drawTrialCompanions(c,g,reduced);
  c.restore();
}

// 独立演练与原试射共用猫、骑手和载具正式绘制，部件与动作时钟不另建。
export function drawTrialPlayer(c,g,reduced=false){
    drawEnergyShield(c,g,g.player,reduced,'back');
  if (g.vehicle.active) drawVehicleTracks(c, g.player, g.vehicle, reduced, g.time,g.progress);
  c.save();clipEraSeat(c,g.player,g.vehicle);
  drawCat(c, g.player.x, riderPosition(g.player, g.vehicle).y, g.progress.hero, g.player.angle, g.progress.weapon===14 || frontRider(g.vehicle) ? PLAYER_SCALE : 0.8, g.player.walkPhase,
    g.progress.weapon, g.player.recoil, reduced ? 0.35 : 1, null, 0, true,
    g.vehicle.active && !frontRider(g.vehicle), g.player.bodyAnimation, g.weapon().modChoice, g.weapon().parts,reduced?0:g.magazines[g.progress.weapon]?.rotor||0, frontRider(g.vehicle));
  c.restore();
  if (g.vehicle.active) drawVehicleArmor(c, g.player, g.vehicle, g.progress, g.time, reduced);
  if (frontRider(g.vehicle))
    drawRiderWeapon(c, riderPosition(g.player, g.vehicle), g.progress.hero, g.progress.weapon, {
      scale: PLAYER_SCALE, motionScale: reduced ? 0.35 : 1, sample: true, modChoice: g.weapon().modChoice,
      parts: g.weapon().parts, rotor: reduced ? 0 : g.magazines[g.progress.weapon]?.rotor || 0,
    });
}

// 独立召唤物、弹道和受击特效保持正式运行时表现。
export function drawTrialCompanions(c,g,reduced=false){
    drawEnergyShield(c,g,g.player,reduced);
  if(g.weapon().controller==='spider')drawSpiderPack(c,g.spider,g.weapon(),reduced);
  else if (g.weapon().controller === 'mechanical') drawMechanicalPack(c,g.mechanical,g.weapon(),reduced,drawArmedMechanicalCat);
  else if (g.weapon().controller) drawFunnelArray(c, g.player, g[g.weapon().controller], reduced);
  const mounted=vehicleCompanionContext(g);
  if(mounted?.weapon().controller==='spider')drawSpiderPack(c,mounted.spider,mounted.weapon(),reduced);
  else if(mounted?.weapon().controller==='mechanical')drawMechanicalPack(c,mounted.mechanical,mounted.weapon(),reduced,drawArmedMechanicalCat);
  else if(mounted)drawFunnelArray(c,g.player,mounted[mounted.weapon().controller],reduced);
  drawBallistics(c, g.projectiles, reduced); drawCombatFX(c, g.fx.items, reduced);
}
