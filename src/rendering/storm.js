// 雷电合成包含云层散射、场景受光、地面反光和缓存序列帧，界面仍位于独立 DOM 层。
import {worldPointToView,viewPointToWorld} from '../world/view-projection.js';
import { LIGHTNING_ATLAS, getLightningAtlas } from './weather-atlas.js';
import { lightningFrame } from '../world/storm.js';
import { nearest } from '../world/coordinates.js';

// 仅在放电开始时选择初始布局；后续帧使用固定世界落点，避免闪电跟随镜头。
export function stormLayout(width, height, cycle = 0) {
  const x = width * [0.68, 0.3, 0.72][cycle % 3];
  const scale = Math.min(
    (height * 0.6) / LIGHTNING_ATLAS.height,
    (width * 0.76) / LIGHTNING_ATLAS.width,
  );
  return { x, y: height * 0.06, scale, groundY: height * 0.06 + LIGHTNING_ATLAS.anchor[1] * scale };
}

// 每次放电缓存世界落点与尺寸；结束、切换场景或减少动态时释放旧锚点。
export function prepareStormStrike(previous, view, storm, mapId, intensity, reduced = false) {
  const frame = storm?.frame ?? lightningFrame(storm?.age ?? -1);
  if (reduced || intensity < 0.01 || frame < 0) return null;
  if (previous?.cycle === storm.cycle && previous.mapId === mapId) return previous;
  const layout = stormLayout(view.width, view.height, storm.cycle);
  return {
    cycle: storm.cycle, mapId,
    ...viewPointToWorld(view,{x:layout.x,y:layout.groundY}),
    scale: layout.scale / view.zoom,
    glowOffset: (view.height * 0.12 - layout.groundY) / view.zoom,
    glowRadius: view.height * 0.65 / view.zoom,
    reflectionRadius: 95 / view.zoom,
  };
}

// 电弧和地面受光共用最近世界镜像，跨地图边界时保持同一落点。
export function stormStrikePosition(strike, view) {
  return nearest(strike, { x: view.x + view.w / 2, y: view.y + view.h / 2 });
}

// 将固定世界尺寸投影到当前视口；缩放与屏幕旋转不会重新选择落点。
export function projectStormStrike(strike, view) {
  const point = stormStrikePosition(strike, view);
  const {x,y:groundY}=worldPointToView(view,point);
  const scale = strike.scale * view.zoom;
  return { x, groundY, scale, y: groundY - LIGHTNING_ATLAS.anchor[1] * scale,
    glowY: groundY + strike.glowOffset * view.zoom,
    glowRadius: strike.glowRadius * view.zoom,
    reflectionRadius: strike.reflectionRadius * view.zoom };
}

// 地面层先画受光池与背光投影，投影始终背离闪电落点，不改变实体坐标。
export function drawStormGround(c, view, objects, intensity, storm, reduced = false, strike = null) {
  if (reduced || !storm?.flash || intensity < 0.01 || !strike) return;
  const { x, y } = stormStrikePosition(strike, view);
  const power = storm.flash * intensity;
  c.save();
  const pool = c.createRadialGradient(x, y, 0, x, y, 220);
  pool.addColorStop(0, `rgba(199,226,255,${power * 0.35})`);
  pool.addColorStop(1, 'rgba(139,181,255,0)');
  c.fillStyle = pool;
  c.fillRect(x - 220, y - 220, 440, 440);
  for (const item of objects) {
    const dx = item.x - x,
      dy = item.y - y,
      distance = Math.hypot(dx, dy);
    if (distance > 320) continue;
    const tree = item.type === 'tree',
      length = (tree ? 55 : 24) * (1 - distance / 400);
    c.save();
    c.translate(item.x, item.y + 4);
    c.rotate(Math.atan2(dy, dx));
    c.fillStyle = `rgba(18,30,49,${power * 0.28 * (1 - distance / 400)})`;
    c.beginPath();
    c.ellipse(length * 0.65, 0, length, tree ? 12 : 7, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  c.restore();
}

// 云中光幕和低强度环境提亮共用缓变包络，电弧亮芯由序列帧表达，避免全屏白闪。
export function drawStorm(c, width, height, intensity, storm, reduced = false, view = null, strike = null) {
  if (intensity < 0.01) return;
  c.save();
  c.fillStyle = `rgba(25,39,60,${intensity * 0.15})`;
  c.fillRect(0, 0, width, height);
  if (!reduced) {
    // 非放电帧也会预热当前图集，避免首次亮起时才生成贴图。
    const atlas = getLightningAtlas(storm?.cycle || 0);
    const frame = storm?.frame ?? lightningFrame(storm?.age ?? -1);
    if (frame >= 0 && storm?.flash > 0 && strike && view) {
      const layout = projectStormStrike(strike, view);
      const power = storm.flash * intensity;
      c.globalCompositeOperation = 'screen';
      c.fillStyle = `rgba(166,195,244,${power * 0.13})`;
      c.fillRect(0, 0, width, height);
      const glow = c.createRadialGradient(
        layout.x,
        layout.glowY,
        0,
        layout.x,
        layout.glowY,
        layout.glowRadius,
      );
      glow.addColorStop(0, `rgba(210,224,255,${power * 0.42})`);
      glow.addColorStop(1, 'rgba(100,143,221,0)');
      c.fillStyle = glow;
      c.fillRect(0, 0, width, height);
      // 椭圆反光紧贴落点，周围湿地随同一次放电明暗起伏。
      c.save();
      c.translate(layout.x, layout.groundY);
      c.scale(1, 0.3);
      const radius = layout.reflectionRadius;
      const reflection = c.createRadialGradient(0, 0, 0, 0, 0, radius);
      reflection.addColorStop(0, `rgba(219,239,255,${power * 0.65})`);
      reflection.addColorStop(1, '#90b6ff00');
      c.fillStyle = reflection;
      c.fillRect(-radius, -radius, radius * 2, radius * 2);
      c.restore();
      c.globalAlpha = intensity;
      const spec = LIGHTNING_ATLAS;
      c.drawImage(
        atlas,
        (frame % spec.columns) * spec.width,
        Math.floor(frame / spec.columns) * spec.height,
        spec.width,
        spec.height,
        layout.x - spec.anchor[0] * layout.scale,
        layout.y,
        spec.width * layout.scale,
        spec.height * layout.scale,
      );
    }
  }
  c.restore();
}
