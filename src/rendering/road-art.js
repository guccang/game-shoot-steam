// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import {WORLD} from '../world/coordinates.js';
import { style } from '../art-styles/config.js';
import { consumeDrawSteps } from './draw-steps.js';
import { LIVING_ROADS } from '../config/living-world.js';
import { PATHS, pathDistance } from '../world/paths.js';

// 土路使用渐薄的色带和零散草缘，仅在地面缓存构建时绘制，不增加逐帧滤镜。

// 沿统一路网预计算草缘法线；全部地块共享同一份主支路几何。
// 西侧支路跨周期接缝时补画正坐标镜像，保证路面与寻路留白同址。
const roads = [...PATHS, ...LIVING_ROADS].flatMap(path=>path.some(p=>p.x<0)?[path,path.map(p=>({...p,x:p.x+WORLD.width}))]:[path]).map((path) =>
  path.map((p, i) => {
    const last = path.length - 1,
      a = path[Math.max(0, i - 1)];
    const b = path[Math.min(last, i + 1)];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    return { ...p, nx: -(b.y - a.y) / length, ny: (b.x - a.x) / length };
  }),
);
const verges = roads.slice(0, PATHS.length).flatMap((road, index) =>
  road.flatMap((p, i) => {
    if (i % 3 !== index || i === 0 || i === road.length - 1) return [];
    return [-1, 1].flatMap((side) => {
      const offset = side * (31 + Math.sin(i * 2.7 + side) * 4);
      const x = p.x + p.nx * offset,
        y = p.y + p.ny * offset;
      return pathDistance(x, y) < 26
        ? []
        : [{ x, y, angle: Math.atan2(p.ny, p.nx) + Math.PI / 2, radius: 6 + (i % 4) * 2, grass: i % 4 === 0 }];
    });
  }),
);
// 共用绘制与动作输入，风格差异由配置提供。
function roadPath(c, road) {
  c.moveTo(road[0].x, road[0].y);
  for (let i = 1; i < road.length - 1; i++) {
    const p = road[i],
      next = road[i + 1];
    c.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
  }
  const last = road.at(-1);
  c.lineTo(last.x, last.y);
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawSoftRoads(c, view) {
  consumeDrawSteps(drawSoftRoadsSteps(c, view)); // 小地图同步消费原图元。
}
// 共用绘制与动作输入，风格差异由配置提供。
export function* drawSoftRoadsSteps(c, view) {
  c.save();
  // 路肩受光与浅凹暗缘复用完全相同的曲线，防止视觉道路偏离寻路几何。
  c.lineCap='round';c.lineJoin='round';
  for(const [width,color,dx,dy] of [[59,'#506c4930',2,3],[54,'#f0e3b5',-1,-1],[51,'#b9a77b',0,0]]){
    c.save();c.translate(dx,dy);c.lineWidth=width;c.strokeStyle=color;c.beginPath();for(const road of roads)roadPath(c,road);c.stroke();c.restore();yield;
  }
  for (const [width, alpha] of style.roadArt.drawSoftRoadsStepsValue) {
    c.strokeStyle = style.roadArt.drawSoftRoadsSteps_strokeStyleColor;
    c.globalAlpha = alpha;
    c.lineWidth = width * 2;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    for (const road of roads) roadPath(c, road);
    c.stroke();
    yield;
  }
  for (const p of verges) {
    if (view && (p.x < view.x - 18 || p.x > view.x + view.w + 18 || p.y < view.y - 18 || p.y > view.y + view.h + 18))
      continue;
    c.globalAlpha = 0.25;
    c.fillStyle = '#99ad83';
    c.beginPath();
    c.ellipse(p.x, p.y, p.radius, 3.5, p.angle, 0, Math.PI * 2);
    c.fill();
    if (!p.grass) continue;
    c.globalAlpha = 0.38;
    c.strokeStyle = '#819b6f';
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(p.x - 3, p.y - 2);
    c.lineTo(p.x, p.y + 1);
    c.lineTo(p.x + 1, p.y - 4);
    c.moveTo(p.x, p.y + 1);
    c.lineTo(p.x + 4, p.y - 1);
    c.stroke();
  }
  c.restore();
}
