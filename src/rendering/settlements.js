import {campBoundary} from '../world/camp-boundary.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { SETTLEMENT_FENCES } from '../world/settlements.js';
import { nearest } from '../world/coordinates.js';
import { box, oval, poly } from './primitives.js';
import { canvasFont } from './text-style.js';
import { clearingSite } from '../progression/story/clearing-site.js';

// 木护栏与双扇门参与正式脚底排序，独立门叶绕门柱开启。

// 剧情仍保留原世界边界，独立秘境不带入围栏。
// 共用绘制与动作输入，风格差异由配置提供。
export function settlementObjects(game) {
  return game.mapId === 'forest' && !game.realm
    ? [
        ...(game.campDefense||game.story?SETTLEMENT_FENCES:campBoundary(game.progress).objects),
        ...(game.progress.living.patrolActive
          ? [{ ...clearingSite(game.progress), type: 'story-prop', kind: 'route', label: '清缴场' }]
          : []),
      ]
    : [];
}
// 共用绘制与动作输入，风格差异由配置提供。
function timber(c, a, b, z, height, palette, thickness = 6) {
  const dx = thickness,
    dy = -thickness * 0.5,
    [wood, edge, light, dark] = palette;
  const A = [a.x, a.y - z],
    B = [b.x, b.y - z],
    C = [b.x, b.y - z - height],
    D = [a.x, a.y - z - height];
  poly(c, [A, B, C, D], wood, edge, style.settlements.timberValue);
  poly(c, [B, [B[0] + dx, B[1] + dy], [C[0] + dx, C[1] + dy], C], dark, edge, style.settlements.timberValue2);
  poly(c, [D, C, [C[0] + dx, C[1] + dy], [D[0] + dx, D[1] + dy]], light, edge, style.settlements.timberValue2);
  if (Math.abs(a.x - b.x) < 1)
    poly(c, [A, [A[0] + dx, A[1] + dy], [B[0] + dx, B[1] + dy], B], dark, edge, style.settlements.timberValue2);
}
// 共用绘制与动作输入，风格差异由配置提供。
function post(c, p, palette) {
  const [wood, edge, light, dark] = palette;
  oval(c, p.x + 3, p.y + 3, 9, 5, '#29423540');
  poly(
    c,
    [
      [p.x - 5, p.y],
      [p.x + 5, p.y],
      [p.x + 5, p.y - 43],
      [p.x - 5, p.y - 43],
    ],
    wood,
    edge,
    style.settlements.postValue,
  );
  poly(
    c,
    [
      [p.x + 5, p.y],
      [p.x + 10, p.y - 4],
      [p.x + 10, p.y - 47],
      [p.x + 5, p.y - 43],
    ],
    dark,
    edge,
    style.settlements.postValue2,
  );
  poly(
    c,
    [
      [p.x - 5, p.y - 43],
      [p.x, p.y - 48],
      [p.x + 10, p.y - 47],
      [p.x + 5, p.y - 43],
    ],
    light,
    edge,
    style.settlements.postValue2,
  );
  oval(c, p.x, p.y - 30, 1.3, 1.3, edge);
}
// 共用绘制与动作输入，风格差异由配置提供。
function gateLeaf(c, a, b, palette) {
  timber(c, a, b, 12, 7, palette);
  timber(c, a, b, 32, 7, palette);
  timber(c, b, b, 8, 34, palette, 7);
  const low = { x: a.x, y: a.y - 12 },
    high = { x: b.x, y: b.y - 32 };
  timber(c, low, high, 0, 4, palette, 4);
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawSettlement(c, item, game, night) {
  const finish=item.settlement==='sunleaf'&&!game.story&&!game.campDefense?game.progress.campManagement?.styles[item.type==='settlement-gate'?'gate':'fence']:null;
  const palette = finish?.material==='stone'?['#aeb8a4','#53634d','#d2d6bc','#7c8b77']:finish?.material==='metal'?['#8ba39a','#3e5c51','#c2d1be','#5b7b70']:night > 0.5 ? style.settlements.drawSettlementValue : style.settlements.drawSettlementValue2;
  const half = item.length / 2,
    ends = item.horizontal
      ? [
          { x: -half, y: 0 },
          { x: half, y: 0 },
        ]
      : [
          { x: 0, y: -half },
          { x: 0, y: half },
        ];
  c.save();
  c.translate(item.x, item.y);
  c.save();
  c.strokeStyle = '#29423524';
  c.lineWidth = 9;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(ends[0].x + 9, ends[0].y + 7);
  c.lineTo(ends[1].x + 9, ends[1].y + 7);
  c.stroke();
  c.restore();
  if (item.type === 'settlement-gate') {
    // 宽门按到门洞线段的距离开启，拖挂尚在门口时保持敞开。
    const tail=game.progress?.logistics?.tow&&game.progress.vehicleService?.[game.progress.logistics.tow.target]?.position;
    const distance=Math.min(...[game.player,tail].filter(Boolean).map(body=>{const p=nearest(body,item),along=item.horizontal?Math.abs(p.x-item.x):Math.abs(p.y-item.y),across=item.horizontal?Math.abs(p.y-item.y):Math.abs(p.x-item.x);return Math.hypot(Math.max(0,along-half+20),across);}));
    const open = Math.max(0, Math.min(1, (320 - distance) / 150)),
      angle = open * Math.PI * 0.49,
      span = half - 13;
    for (let i = 0; i < 2; i++) {
      const a = ends[i],
        sign = i === 0 ? 1 : -1,
        // 宽门拆为同源两段折叠木叶，开门不再让整根长门叶扫进院内屋顶。
        fold = item.horizontal
          ? { x: a.x + sign * Math.cos(angle) * span/2, y: a.y - Math.sin(angle) * span/2 }
          : { x: a.x + Math.sin(angle) * span/2, y: a.y + sign * Math.cos(angle) * span/2 },
        b = item.horizontal
          ? { x: a.x + sign * Math.cos(angle) * span, y: a.y }
          : { x: a.x, y: a.y + sign * Math.cos(angle) * span };
      gateLeaf(c, a, fold, palette);gateLeaf(c, fold, b, palette);
      if(finish?.shape==='crest'){const x=(a.x+fold.x)/2,y=(a.y+fold.y)/2-27;oval(c,x,y,10,12,palette[2],palette[1],1.7);poly(c,[[x,y-6],[x+5,y],[x,y+6],[x-5,y]],palette[0],palette[1],1);}
    }
  } else {
    timber(c, ends[0], ends[1], 13, finish?.material==='stone'?23:7, palette);
    timber(c, ends[0], ends[1], 30, 7, palette);
    if(finish?.shape==='picket'||finish?.shape==='lattice')for(let i=1;i<4;i++){const t=i/4,p={x:ends[0].x+(ends[1].x-ends[0].x)*t,y:ends[0].y+(ends[1].y-ends[0].y)*t};timber(c,p,p,8,finish.shape==='picket'?37:28,palette,4);if(finish.shape==='picket')poly(c,[[p.x-3,p.y-44],[p.x+2,p.y-51],[p.x+6,p.y-44]],palette[2],palette[1],1);}
    if(finish?.shape==='lattice'){timber(c,{x:ends[0].x,y:ends[0].y-8},{x:ends[1].x,y:ends[1].y-35},0,3,palette,3);timber(c,{x:ends[0].x,y:ends[0].y-35},{x:ends[1].x,y:ends[1].y-8},0,3,palette,3);}
  }
  for (const end of ends){post(c, end, palette);if(finish?.material==='stone')box(c,end.x-9,end.y-49,21,7,2,palette[2],palette[1],1.6);if(item.type==='settlement-gate'&&finish?.shape==='lantern'){box(c,end.x-2,end.y-70,4,24,1,palette[1]);oval(c,end.x,end.y-72,12,15,'#c47456',palette[1],1.5);oval(c,end.x-2,end.y-73,5,9,'#efc47e');box(c,end.x-1,end.y-57,2,9,0,'#bc7151');}}
  if (item.type === 'settlement-gate' && item.horizontal) {
    box(c, -half - 35, -68, 70, 22, 4, palette[2], palette[1], 1.7);
    c.fillStyle = palette[1];
    c.font = canvasFont(11);
    c.textAlign = 'center';
    c.fillText(item.name, -half, -53);
  }
  c.restore();
}
