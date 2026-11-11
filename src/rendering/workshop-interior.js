import {drawHomeDecor} from './home-decor.js';
import {drawIndustryMachine} from './industry.js';
import {interiorShopkeeper,interiorCounter} from '../config/workshop-interiors.js';
import {createRenderCanvas} from './canvas-recovery.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { box, oval, poly } from './primitives.js';
import { drawCat } from './characters.js';
import { PLAYER_SCALE } from '../combat/recoil.js';
import { calendarView } from '../world/living-calendar.js';
import { WEAPONS } from '../config/weapons.js';
import { vehicleModel } from '../config/vehicles.js';
import {
  interiorLayout,
  interiorFurniture,
  interiorWeaponDisplays,
  interiorVehicleDisplays,
  VEHICLE_GALLERY,
  WEAPON_GALLERY,
  GARAGE_FURNITURE,
  VEHICLE_BAY,
  garageVehicleRecord,
} from '../config/workshop-interiors.js';
import { drawWorkshopEquipment } from './workshop.js';
import { drawParkedHull } from './parked-vehicles.js';

// 可进入工坊使用正式猫动画、装备画像和停驻车体；家具脚底与角色统一排序。

// 可见展柜复用正式装备画像，交易后刷新；缓存上限固定，不预生成整个目录。
// 共用绘制与动作输入，风格差异由配置提供。
function weaponPortrait(renderer, index) {
  const g = renderer.game;
  if (renderer.interiorArt?.progress !== g.progress) renderer.interiorArt = { progress: g.progress, images: new Map() };
  const cache = renderer.interiorArt.images;
  if (!cache.has(index)) {
    if (cache.size >= WEAPON_GALLERY.portraitLimit) cache.delete(cache.keys().next().value);
    const canvas = createRenderCanvas(renderer.canvas.ownerDocument);
    canvas.width = 192;
    canvas.height = 144;
    drawWorkshopEquipment(canvas.getContext('2d'), g.progress, 'weapons', index, 0, true);
    cache.set(index, canvas);
  }
  return cache.get(index);
}
// 共用绘制与动作输入，风格差异由配置提供。
export function workshopInteriorView(layout, player, w, h) {
  const zoom = Math.min((w - 20) / layout.width, 1.5),
    height = Math.min(layout.height, 780, (h - 195) / zoom);
  const top = Math.max(0, Math.min(layout.height - height, player.y - height * 0.62)),
    x = (w - layout.width * zoom) / 2,
    screenTop = Math.max(90, (h - height * zoom) / 2 - 8);
  return {
    x,
    y: screenTop - top * zoom,
    zoom,
    top,
    bottom: top + height,
    clip: { x, y: screenTop, width: layout.width * zoom, height: height * zoom },
  };
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawWalls(c, garage, night, layout) {
  const { width: w, height: h } = layout;
  box(
    c,
    0,
    0,
    w,
    h,
    10,
    night ? '#b9b299' : style.workshopInterior.drawWallsColor,
    style.workshopInterior.drawWallsColor2,
    3,
  );
  box(
    c,
    10,
    72,
    w - 20,
    h - 82,
    3,
    garage
      ? night
        ? style.workshopInterior.drawWallsColor3
        : style.workshopInterior.drawWallsColor4
      : night
        ? '#a78e6d'
        : style.workshopInterior.drawWallsColor5,
    style.workshopInterior.drawWallsColor6,
    2,
  );
  c.strokeStyle = garage ? '#71857555' : '#94754a50';
  c.lineWidth = 1;
  for (let y = 83; y < h - 11; y += style.workshopInterior.drawWallsValue) {
    c.beginPath();
    c.moveTo(12, y);
    c.lineTo(w - 12, y);
    c.stroke();
    for (
      let x =
        (Math.floor((style.workshopInterior.drawWallsDetail ? y : y - 83) / style.workshopInterior.drawWallsValue) %
          2) *
          style.workshopInterior.drawWallsValue2 +
        20;
      x < w - 11;
      x += style.workshopInterior.drawWallsValue3
    ) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, y + style.workshopInterior.drawWallsValue4);
      c.stroke();
    }
  }
  box(c, 9, 65, w - 18, 10, 2, garage ? '#708d78' : '#b48c59', '#607459', 1.5);
  for (const x of [44, w - 44]) {
    box(c, x - 19, 17, 38, 36, 4, '#aa8f62', style.workshopInterior.drawWallsColor7, 2);
    box(c, x - 14, 21, 28, 27, 2, night ? '#4b7180' : '#b5d4bd');
    poly(
      c,
      [
        [x - 14, 48],
        [x - 3, 32],
        [x + 12, 48],
      ],
      night ? '#59806a' : '#83b081',
    );
    box(c, x - 1, 21, 3, 27, 0, '#d7c997');
  }
  box(c, w / 2 - 67, 22, 134, 30, 7, '#f2dfaa', '#647c59', 2);
  c.fillStyle = '#42634b';
  c.font = 'bold 13px sans-serif';
  c.textAlign = 'center';
  c.fillText(garage ? '载具陈列厅' : '枪匠的陈列架', w / 2, 42);
  for (const x of [w / 2 - 77, w / 2 + 77]) {
    c.strokeStyle = '#687a59';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, 4);
    c.lineTo(x, 16);
    c.stroke();
    poly(
      c,
      [
        [x - 12, 24],
        [x - 7, 15],
        [x + 7, 15],
        [x + 12, 24],
      ],
      '#7b9779',
      style.workshopInterior.drawWallsColor8,
      1.5,
    );
    oval(c, x, 25, 9, 3, night ? '#f5d58a' : '#e4d6a4');
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawRack(c, item, renderer) {
  const { x, y, index } = item;
  oval(c, x + 3, y + 8, 43, 10, '#3b58402b');
  box(c, x - 40, y - 51, 80, 68, 5, '#a5845e', style.workshopInterior.drawRackColor, 2);
  box(c, x - 40, y - 53, 80, 49, 5, style.workshopInterior.drawRackColor2, style.workshopInterior.drawRackColor3, 2);
  box(c, x - 34, y - 47, 68, 34, 3, '#f1e8c7', '#9da786', 1);
  c.drawImage(weaponPortrait(renderer, index), x - 35, y - 58, 70, 52);
  box(c, x - 35, y - 4, 70, 17, 3, '#ead3a2', '#937a55', 1);
  c.fillStyle = '#3c5e47';
  c.font = 'bold 10px sans-serif';
  c.textAlign = 'center';
  c.fillText(WEAPONS[index].name, x, y + 8, 66);
  for (const xx of [x - 32, x + 29]) box(c, xx, y + 16, 4, 7, 1, '#6c694a');
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawVehicleDisplay(c, item, game) {
  drawParkedHull(c, { ...item, y: item.y - VEHICLE_GALLERY.displayLift }, game, item.index, null, true);
  box(c, item.x - 62, item.y + 23, 124, 23, 4, '#eadbb2', '#6d8262', 1.5);
  c.fillStyle = '#42634b';
  c.font = 'bold 12px sans-serif';
  c.textAlign = 'center';
  c.fillText(vehicleModel(item.index).shortName, item.x, item.y + 39, 116);
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawTools(c, item) {
  const { x, y, width: w } = item;
  oval(c, x + 3, y + 9, w * 0.53, 9, '#35553e30');
  if(item.type==='cat-bed'){
    // 两侧软垫猫床保留中央柜台与出口通道。
    oval(c,x,y,w*.5,19,'#b7966e','#4e6b50',2);oval(c,x,y-5,w*.42,13,'#e4cfa2','#879875',1.5);
  }else if(item.type==='counter'){
    box(c,x-w/2,y-25,w,40,5,'#b59668','#4e6b50',2);box(c,x-w/2-4,y-31,w+8,12,4,'#e3cd98','#68714e',2);box(c,x-34,y-22,68,29,4,'#c8ad7b','#9a805a',1);
  }else if (item.type === 'tires') {
    for (const yy of [y + 5, y - 8, y - 21]) {
      oval(c, x, yy, 18, 10, '#576f60', '#3d5b48', 2);
      oval(c, x, yy - 2, 9, 4, '#9fb098', '#3d5b48', 1);
    }
  } else if (item.type === 'cart') {
    for (const xx of [x - 12, x + 12]) oval(c, xx, y + 16, 4, 5, '#47624e');
    box(c, x - 18, y - 23, 36, 35, 4, '#a1b49b', '#4c7054', 2);
    box(c, x - 21, y - 28, 42, 10, 3, '#e0cb94', '#5d7554', 1.5);
    for (const yy of [y - 13, y - 1]) {
      box(c, x - 14, yy, 28, 9, 2, '#bad0aa', '#648066', 1);
      box(c, x - 4, yy + 3, 8, 2, 1, '#60755a');
    }
    box(c, x - 12, y - 37, 6, 9, 1, '#849e9b', '#4d6d59', 1);
    box(c, x + 4, y - 44, 5, 16, 1, '#ba9b6f', '#5c7052', 1);
  } else {
    box(c, x - w / 2, y - 30, w, 44, 4, item.type === 'parts' ? '#8ca58a' : '#b59668', '#4e6b50', 2);
    box(c, x - w / 2 - 3, y - 39, w + 6, 16, 4, '#d8bd88', '#68714e', 2);
    for (const xx of [x - w / 2 + 10, x + w / 2 - 16]) box(c, xx, y + 10, 6, 12, 1, '#5f7153');
    if (item.type === 'parts') {
      for (const dx of [-32, -9, 14]) {
        box(c, x + dx, y - 56, 19, 17, 2, '#bbc8a4', '#526f56', 1.5);
        box(c, x + dx + 6, y - 51, 7, 4, 1, '#657e61');
      }
      box(c, x - 32, y - 15, 64, 19, 3, '#ead5a5', '#697e59', 1);
      c.fillStyle = '#42634b';
      c.font = '11px sans-serif';
      c.textAlign = 'center';
      c.fillText('载具图册', x, y - 1);
    } else {
      box(c, x - 40, y - 87, 80, 44, 4, '#b6ba98', '#5e7657', 2);
      for (const dx of [-25, 0, 25]) {
        c.strokeStyle = '#4e725a';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(x + dx, y - 77);
        c.lineTo(x + dx, y - 54);
        c.stroke();
        oval(c, x + dx, y - 79, 5, 5, '#8fa99b', '#4d6c53', 1.5);
      }
      box(c, x - 27, y - 47, 24, 12, 2, '#6f8b7a', '#4e6c54', 1.5);
      box(c, x - 23, y - 52, 7, 7, 1, '#bec7a6');
    }
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawWorkshopInterior(renderer, g = renderer.game) {
  const { c, width: w, height: h, dpr } = renderer,
    room = g.cottage,
    layout = interiorLayout(room),
    garage = room.kind === 'vehicle',
    night = calendarView(g.progress.living.calendar).id === 'night';
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = night ? '#304c44' : '#506b55';
  c.fillRect(0, 0, w, h);
  const view = workshopInteriorView(layout, g.player, w, h),
    { x, y, zoom, clip } = view;
  renderer.cottageView = view;
  renderer.view = { x: 0, y: view.top, w: layout.width, h: view.bottom - view.top, width: w, height: h, zoom };
  c.save();
  c.beginPath();
  c.rect(clip.x, clip.y, clip.width, clip.height);
  c.clip();
  c.translate(x, y);
  c.scale(zoom, zoom);
  box(c, 6, 10, layout.width - 6, layout.height - 4, 12, '#203d353f');
  drawWalls(c, garage, night, layout);
  if(layout.service){
    c.fillStyle='#f4e8c5';c.fillRect(48,24,layout.width-96,42);c.fillStyle='#405a48';c.font='bold 18px sans-serif';c.textAlign='center';c.fillText(layout.name,layout.width/2,52);
  }
  const record = garageVehicleRecord(g),
    bay = VEHICLE_BAY,
    displays = garage
      ? interiorVehicleDisplays().filter(
          (item) => item.y + 48 >= view.top && item.y - 100 - VEHICLE_GALLERY.displayLift <= view.bottom,
        )
      : [];
  if (garage) {
    // 展示位与分区线先铺在地面，猫走过标签附近时保持正确遮挡。
    for (const item of displays) {
      box(c, item.x - 72, item.y - 92, 144, 144, 8, night ? '#839383' : '#b1b99a', '#789174', 1.5);
      c.setLineDash([6, 5]);
      box(c, item.x - 65, item.y - 85, 130, 106, 5, 'transparent', '#dedbb3', 1.5);
      c.setLineDash([]);
    }
    c.strokeStyle = '#748c70';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(20, VEHICLE_GALLERY.depth + 12);
    c.lineTo(layout.width - 20, VEHICLE_GALLERY.depth + 12);
    c.stroke();
    c.fillStyle = style.workshopInterior.drawWallsDetail ? '#e8dfb9' : night ? '#fff1c4' : '#59402e';
    c.font = 'bold 12px sans-serif';
    c.textAlign = 'center';
    c.fillText('↑ 载具展区', layout.width / 2, VEHICLE_GALLERY.depth - 8);
    c.fillText('维修区', layout.width / 2, VEHICLE_GALLERY.depth + 38);
    const left = bay.x - bay.width / 2 - 8,
      top = bay.y - bay.height / 2 - 20,
      bw = bay.width + 16,
      bh = bay.height + 36;
    box(c, left, top, bw, bh, 7, '#687f7170', '#dfd9a8', 2);
    c.setLineDash([7, 5]);
    box(c, left + 7, top + 8, bw - 14, bh - 16, 3, 'transparent', '#bac9a1', 1.5);
    c.setLineDash([]);
    for (const xx of [left + 4, left + bw - 10]) box(c, xx, top + 30, 6, bh - 54, 2, '#d5bf80', '#6a7855', 1);
    c.fillStyle = style.workshopInterior.drawWallsDetail ? '#e4dfb9' : night ? '#fff1c4' : '#59402e';
    c.font = 'bold 12px sans-serif';
    c.textAlign = 'center';
    c.fillText(record ? vehicleModel(record.hull).shortName : '车位空闲', bay.x, top + bh + 18);
    if (!record) {
      c.font = '11px sans-serif';
      c.fillText('靠近车位，点击停车入位', bay.x, bay.y - 10);
    }
  }
  box(c, layout.exit.x - 37, layout.height - 32, 74, 22, 4, '#829677', '#536e55', 1.5);
  c.fillStyle = '#f1e5bf';
  c.font = '12px sans-serif';
  c.textAlign = 'center';
  c.fillText('出门', layout.exit.x, layout.height - 16);
  const items = garage
    ? [...GARAGE_FURNITURE, ...displays, ...(record ? [{ ...bay, type: 'vehicle' }] : [])]
    : layout.service?interiorFurniture(g):interiorWeaponDisplays().filter((item) => item.y + 25 >= view.top && item.y - 60 <= view.bottom);
  // 展厅也加入售货员柜台，小营业房已由统一家具列表提供，避免重复绘制。
  if(!layout.service)items.push(interiorCounter(room));
  if (!garage && renderer.interiorArt) {
    const visible = new Set(items.map((item) => item.index));
    for (const key of renderer.interiorArt.images.keys())
      if (!visible.has(key)) renderer.interiorArt.images.delete(key);
  }
  items.push(interiorShopkeeper(room));
  items.push({ type: 'player', x: g.player.x, y: g.player.y });
  items.sort((a, b) => a.y - b.y);
  for (const item of items) {
    if (item.type === 'player')
      drawCat(
        c,
        item.x,
        item.y,
        g.progress.hero,
        g.player.angle,
        PLAYER_SCALE,
        0,
        0,
        null,
        renderer.reduced.matches ? 0.35 : 1,
        null,
        0,
        false,
        false,
        g.player.bodyAnimation,
        0,
        null,
        0,
        true,
      );
    else if(item.type==='shopkeeper'){
      drawCat(c,item.x,item.y,4,Math.PI/2,PLAYER_SCALE,0,0,null,1,null,0,false,false,null,0,null,0,true);
      c.fillStyle='#fff2d0';c.strokeStyle='#58765c';box(c,item.x-40,item.y-78,80,23,6,'#fff2d0','#58765c',1);
      c.fillStyle='#3e6049';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText(room.kind==='seWorkshop'?'SE 改装师':room.kind==='refinery'?'提炼管理员':room.kind==='factory'?'加工管理员':room.kind==='warehouse'?'仓库管理员':room.kind==='cat-home'?'猫窝管理员':room.kind==='furniture'?'家具售货员':'售货员',item.x,item.y-62);
    }
    // 分类箱保留中央通道，底座与房间碰撞使用同一尺寸。
    else if(item.type==='warehouse-crate'){box(c,item.x-32,item.y-40,64,56,5,'#b49a70','#365a48',2);box(c,item.x-34,item.y-40,68,12,3,'#d3bf8c','#365a48',2);box(c,item.x-24,item.y-19,48,22,3,'#fff2d0','#58765c',1);c.fillStyle='#365a48';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText(item.label,item.x,item.y-3);}
    else if(item.type==='industry-machine')drawIndustryMachine(c,item,g,night);
    else if(item.type==='furniture-display')drawHomeDecor(c,{...item,type:item.decor},night,g.progress.living.calendar);
    else if (item.type === 'vehicle-display') drawVehicleDisplay(c, item, g);
    else if (item.type === 'vehicle') drawParkedHull(c, item, g, record.hull, record);
    else if (item.type === 'rack') drawRack(c, item, renderer);
    else drawTools(c, item);
  }
  c.restore();
}
