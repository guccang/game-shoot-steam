import {chainsawTip} from '../combat/chainsaw-geometry.js';
import { canvasFont } from './text-style.js';
import { i18nText } from "../i18n/index.js";
// 林间塔防绘制：预设方格、编号支架和正式装备共享世界坐标与森林配色。
import { guardianPads } from '../config/guardian.js';
import { WEAPONS } from '../config/weapons.js';
import { oval, box } from './primitives.js';
import { drawWeapon } from './characters.js';
import { drawVehicleTracks, drawVehicleArmor } from './vehicle.js';
import { vehicleGunPose } from '../combat/vehicle.js';
import { drawFunnelArray, drawFunnelController } from './funnel.js';
import { forestLayout } from '../world/biomes.js';
import { SCENERY } from '../world/scenery.js';
import { visibleBodies } from '../world/coordinates.js';
import { drawForestShadow, drawForestTree } from './forest-art.js';
import { drawScenery } from './scenery.js';
import { gatlingHeat } from '../combat/weapon-heat.js';
import { CAMP_PROP_SIZES } from './camp-props.js';

// 仅在本局显示层清出格位与祭坛，避免房屋、帐篷和麦穗遮住已部署火力；森林原对象不变。
export function guardianScenery(items, realm) {
  if(realm?.mode!=='guardian')return items;
  const targets=[...guardianPads(realm.arena),realm.goddess];
  return items.filter(item=>{
    if(item.kind==='flowers')return true;
    const size=item.size||1, dimensions=CAMP_PROP_SIZES[item.kind];
    const width=(item.kind==='wheat'?item.width+24:dimensions?.[0]||180)*size;
    const height=(item.kind==='wheat'?48:dimensions?.[1]||164)*size;
    return !targets.some(p=>p.x+46>item.x-width/2&&p.x-46<item.x+width/2&&
      p.y+58>item.y+(16*size)-height&&p.y-65<item.y+16*size);
  });
}

// 只在原森林地面叠加预设建造格，不再铺固定道路或绘制单一入侵入口。
export function drawGuardianGround(c, view, realm, time) {
  c.save();
  const pads = guardianPads(realm.arena);
  for (const [slot, pad] of pads.entries()) {
    const occupied = realm.defenses.some(t => t.slot === slot);
    box(c, pad.x - 34, pad.y - 29, 68, 68, 6, '#466a4d40');
    box(c, pad.x - 34, pad.y - 34, 68, 68, 6, occupied ? '#b8bd91' : '#eee8c5', '#55775a', 2);
    box(c, pad.x - 28, pad.y - 28, 56, 56, 3, occupied ? '#b8bd91' : '#eee8c5', '#a2b08c', 1);
    if (!occupied) {
      c.strokeStyle = '#90a079'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(pad.x - 8, pad.y); c.lineTo(pad.x + 8, pad.y); c.moveTo(pad.x, pad.y - 8); c.lineTo(pad.x, pad.y + 8); c.stroke();
    }
    c.font = canvasFont(12); c.textAlign = 'center'; c.fillStyle = '#365644';
    c.fillText(String(slot + 1), pad.x, pad.y + 39);
  }
  c.font = canvasFont(14); c.textAlign = 'center'; c.fillStyle = '#34564c';
  c.fillText(i18nText("rendering.guardian.041703d560"), realm.arena?.x ?? 900, (realm.arena?.y ?? 700) + 43);
  c.restore();
}

// 静置履带保持停驻姿态，直升机主尾旋翼与独立阵列由原绘制器连续采样。
export function drawGuardianDefense(c, tower, time, reduced = false) {
  const local = tower.runtime;
  if (!local) throw Error(i18nText("rendering.guardian.cf8d37a997"));
  const p = local.player, v = local.vehicle, controller = WEAPONS[tower.weaponIndex].controller;
  c.save();
  if (tower.kind === 'vehicle') {
    drawVehicleTracks(c, p, v, reduced, time,local.progress);
    drawVehicleArmor(c, p, v, local.progress, time, reduced);
  } else {
    box(c, p.x - 16, p.y - 3, 32, 18, 5, '#759475', '#34564c', 2);
    oval(c, p.x, p.y + 5, 22, 13, '#f1e5bc', '#34564c', 2);
    if (['mechanical','spider'].includes(controller)) {
      drawWeapon(c,tower.weaponIndex,p.x,p.y,.8,0,0,0,local.weapon().modChoice,local.weapon().parts);
    } else if (controller) {
      c.save(); c.translate(p.x, p.y); drawFunnelController(c, p.recoil.flash); c.restore();
      drawFunnelArray(c, p, local[controller], reduced);
    } else {
      const pose = vehicleGunPose(v, reduced);
      c.save(); c.translate(p.x, p.y + 5); c.rotate(pose.angle);
      drawWeapon(c, tower.weaponIndex, -pose.kick, 0, 0.75, v.recoil.kick * 0.4, reduced ? 0 : v.recoil.flash, gatlingHeat(local.weapon(), v.module.magazine),local.weapon().modChoice,local.weapon().parts,reduced?0:v.module.magazine.rotor||0,tower.weaponIndex===14?chainsawTip(local.weapon().range,.75,true):null); c.restore();
    }
  }
  c.font = canvasFont(11); c.textAlign = 'center';
  box(c, p.x - 23, p.y + 41, 46, 17, 5, '#f4ebc9', '#55775a', 1);
  c.fillStyle = '#34564c'; c.fillText(i18nText("common.level", { p0: tower.level }), p.x, p.y + 53);
  c.restore();
}

// 工作台采样主场景同一份森林与装饰目录，不再维护独立的守护花园。
export function drawGuardianGarden(c, time, night = 0, view = {x:550,y:370,w:700,h:700}) {
  const trees = visibleBodies(forestLayout().map(t => ({type:'tree',hp:55,maxHp:55,...t})), view);
  const scenery=guardianScenery(visibleBodies(SCENERY,view),{mode:'guardian',goddess:{x:900,y:700}});
  for (const tree of trees) drawForestShadow(c, tree, night);
  for (const item of [...trees,...scenery].sort((a,b)=>a.y-b.y)) {
    if(item.type==='tree') drawForestTree(c,item,time,night,false);
    else drawScenery(c,item,night);
  }
}
