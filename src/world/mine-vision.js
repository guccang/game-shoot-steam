// 地下视野采用世界尺寸；只查询当前视窗附近光源，不遍历历史矿道。
import {mineCell,mineKey,minePoint} from '../config/mining.js';
import {mineCellOpen,mineTerrain} from '../config/mine-ecology.js';
import {mineEntrancePlatform} from './mine-entrances.js';
import {mineLandscapeAnchor} from './mine-surface.js';
export const MINE_VISION={player:138,lamp:116,flora:68,maxLights:16,opacity:.985,scale:.5};

// 仅真实存在、未采集且未被设施替换的荧菇发光，保持稳定脚底与再生时钟。
export function mineGlow(cell,layer){
 const key=mineKey(cell),t=mineTerrain(cell,layer);
 if(!t.prop||t.biome.id!=='mushroom'||t.safe||t.water||!mineCellOpen(cell,layer)||mineEntrancePlatform(cell,layer)||layer.rails?.[key]||layer.decor?.[key]||(layer.harvested?.[key]||0)>layer.age)return null;
 const p=mineLandscapeAnchor(cell,t.hash,layer);return {x:p.x+8,y:p.y-42,radius:MINE_VISION.flora,kind:'flora'};
}

// 玩家灯随显示插值移动；矿灯和植物从同一层真实记录投影，最多保留十六个灯源。
export function mineLightSources(game,layer,view){
 const lights=[{x:game.player.x,y:game.player.y-20,radius:MINE_VISION.player,kind:'player'}],lamps=[],flora=[];
 const pad=MINE_VISION.lamp,first=mineCell({x:view.x-pad,y:view.y-pad}),last=mineCell({x:view.x+view.w+pad,y:view.y+view.h+pad});
 for(let y=first.y;y<=last.y;y++)for(let x=first.x;x<=last.x;x++){
  const cell={x,y},key=mineKey(cell);
  if(layer.decor?.[key]==='lamp'){const p=minePoint(cell);lamps.push({x:p.x-17,y:p.y-16,radius:MINE_VISION.lamp,kind:'lamp'});}
  else {const glow=mineGlow(cell,layer);if(glow)flora.push(glow);}
 }
 const distance=p=>Math.hypot(p.x-game.player.x,p.y-game.player.y);
 lamps.sort((a,b)=>distance(a)-distance(b));flora.sort((a,b)=>distance(a)-distance(b));
 return lights.concat(lamps,flora).slice(0,MINE_VISION.maxLights);
}

// 热点仅在光圈里接受点击，不能透过远雾点中尚不可见的梯口。
export function minePointLit(point,lights){return lights.some(p=>Math.hypot(p.x-point.x,p.y-point.y)<p.radius*.83);}
