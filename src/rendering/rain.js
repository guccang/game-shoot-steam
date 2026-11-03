// 分层降雨：世界坐标雨滴与连续落点、表面水花、远处细雨和近镜头风雨。
import {worldPointToView} from '../world/view-projection.js';
import { rainSample, RAIN_CELL, weatherNoise, precipitationPresence, rainVisibility } from '../world/precipitation.js';
import { RainSurfaces } from '../world/rain-surfaces.js';
import { getRainAtlas } from './weather-atlas.js';

export class RainRenderer {
  // 图集只创建一次，逐帧只保留视口附近雨滴，离开雨天立即释放本帧记录。
  constructor() {
    this.atlas = getRainAtlas();
    this.drops = [];
    this.surfaces = new RainSurfaces();
  }

  // 只查询可见网格和附近树冠，拒绝将水面涟漪画到桥面或树冠下面。
  prepare(time, view, trees, intensity, storm, reduced) {
    this.drops.length = 0;
    if (intensity < 0.01 || reduced) return;
    const nearby = trees.filter(
      (t) =>
        t.hp > 0 &&
        t.x > view.x - 100 &&
        t.x < view.x + view.w + 100 &&
        t.y > view.y - 100 &&
        t.y < view.y + view.h + 150,
    );
    this.surfaces.setTrees(nearby);
    for (
      let row = Math.floor((view.y - 80) / RAIN_CELL.height);
      row <= Math.ceil((view.y + view.h + 360) / RAIN_CELL.height);
      row++
    ) {
      for (
        let col = Math.floor((view.x - 160) / RAIN_CELL.width);
        col <= Math.ceil((view.x + view.w + 160) / RAIN_CELL.width);
        col++
      ) {
        const drop = rainSample(col, row, time, storm);
        // 狙击拉远时按屏幕覆盖面积控制雨滴密度，避免世界可见面积放大导致粒子暴增。
        const density = Math.min(1, ((view.zoom || 1) / 0.85) ** 2);
        const coverage=(.43+storm*.57)*density;
        drop.visibility=precipitationPresence(intensity,drop.seed)*Math.max(0,Math.min(1,(coverage-drop.n)/(.06*density)));
        if(drop.visibility<=0)continue;
        const tree = this.surfaces.canopyAt(drop);
        drop.surface = tree ? 'canopy' : this.surfaces.groundAt(drop);
        if (tree) {
          drop.canopyHeight=75*tree.size;
          drop.y -= 75 * tree.size;
          drop.dropY -= 75 * tree.size;
        }
        this.drops.push(drop);
      }
    }
  }

  // 地表湿润反光与落水圆波先于实体绘制，因此会被树干、怪物和角色正确遮挡。
  drawGround(c, intensity, flash = 0) {
    c.save();
    for (const drop of this.drops) {
      if (drop.surface === 'canopy') continue;
      const wet=intensity*drop.visibility;
      if (drop.surface === 'path') {
        c.fillStyle = `rgba(155,190,197,${wet * (0.11 + flash * 0.15)})`;
        c.beginPath();
        c.ellipse(drop.x, drop.y, 11 + drop.n * 15, 2 + drop.n * 4, drop.n * 0.3, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = `rgba(220,239,245,${wet * (0.1 + flash * 0.3)})`;
        c.beginPath();
        c.ellipse(
          drop.x - 2,
          drop.y - 1,
          8 + drop.n * 13,
          1 + drop.n * 2,
          0,
          Math.PI,
          Math.PI * 1.85,
        );
        c.stroke();
      }
      if (drop.splash >= 0 && drop.splash < 1) this.drawSplash(c, drop, intensity, false);
    }
    c.restore();
  }

  // 表面序列帧将水面圆波、地面细溅和树叶滴水区分开，避免铺满同样的空心圆。
  drawSplash(c, drop, intensity, canopy) {
    const frame = Math.min(7, Math.floor(drop.splash * 8));
    const water = drop.surface === 'water',
      scale = water ? 1.15 : drop.surface === 'path' ? 0.65 : 0.4;
    c.globalAlpha = intensity * (drop.visibility ?? 1) * (water ? 0.8 : canopy ? 0.9 : 0.8);
    c.drawImage(
      this.atlas.splash,
      frame * 64,
      water || drop.surface === 'path' ? 0 : 40,
      64,
      40,
      drop.x - 32 * scale,
      drop.y - 28 * scale,
      64 * scale,
      40 * scale,
    );
    c.globalAlpha = 1;
  }

  // 雨丝使用有亮头的透明贴图，长度、宽度、风向和速度共同表现降水深度。
  streak(c, x, y, width, length, wind, alpha) {
    c.save();
    c.translate(x, y);
    c.rotate(Math.atan(wind));
    c.globalAlpha = Math.min(1, alpha);
    c.drawImage(this.atlas.streak, -width * 4, -length, width * 8, length);
    c.restore();
  }

  // 世界雨滴在实际落点终止，另加视差近景和细密远雨，中心保持足够战斗辨识度。
  drawAir(c, time, width, height, view, intensity, storm, flash, reduced, focus = null) {
    if (intensity < 0.01 || reduced) return;
    c.save();
    const wind = 0.17 + storm * 0.12 + Math.sin(time * 0.75) * 0.045;
    // 雨势由雨丝、落点和湿地表达，取消覆盖整屏的灰蓝雾层，保持战斗轮廓清楚。
    for (let layer = 0; layer < 2; layer++) {
      const count = Math.min(
        layer ? 60 : 190,
        Math.ceil((width * height) / (layer ? 7000 : 2200)),
      );
      for (let i = 0; i < count; i++) {
        const seed = i * 17 + layer * 701,
          n = weatherNoise(seed);
        const population=Math.max(0,Math.min(1,((.35+storm*.65)*count-i)/6));
        const presence=precipitationPresence(intensity,seed)*population;
        if(presence<=0)continue;
        const speed = (layer ? 880 : 300) + n * 220;
        const spanX = width + 180,
          spanY = height + 140;
        const travel = time * speed;
        const x = ((((n * spanX - travel * .17) % spanX) + spanX) % spanX) - 90;
        const y = ((((weatherNoise(seed + 1) * spanY + travel) % spanY) + spanY) % spanY) - 70;
        this.streak(
          c,
          x,
          y,
          layer ? 1.2 + n * 0.8 : 0.5,
          layer ? 28 + n * 27 : 8 + n * 10,
          wind,
          intensity * presence * rainVisibility(x,y,focus) * (layer ? 0.48 : 0.25) * (1 + flash * 0.9),
        );
      }
    }
    c.scale(view.zoom, view.zoom);
    if(!view.forward)c.translate(-view.x, -view.y);
    for (const drop of this.drops) {
      // 阳台雨滴先投影地面落点，再沿屏幕竖轴下落，不能随朝向横着飘。
      let display=drop;
      if(view.forward){
        const ground=worldPointToView(view,{x:drop.x,y:drop.y+(drop.canopyHeight||0)}),x=ground.x/view.zoom,y=ground.y/view.zoom-(drop.canopyHeight||0);
        display={...drop,x,y,dropX:x+drop.dropX-drop.x,dropY:y+drop.dropY-drop.y};
      }
      if (drop.falling)
        this.streak(
          c,
          display.dropX,
          display.dropY,
          drop.width,
          drop.length,
          drop.wind,
          intensity * drop.visibility * rainVisibility((display.dropX-(view.forward?0:view.x))*view.zoom,(display.dropY-(view.forward?0:view.y))*view.zoom,focus) * (0.5 + drop.n * 0.25) * (1 + flash * 0.5),
        );
      else if (drop.surface === 'canopy' && drop.splash < 1)
        this.drawSplash(c, display, intensity, true);
    }
    c.restore();
  }
}
