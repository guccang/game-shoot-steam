import {campSurfaceRoads} from '../world/camp-surface-roads.js';
import {drawCampRoadFinish} from './camp-road-finish.js';
// 搬迁后的道路在正式地面层绘制；布局和地契变化才重新生成有界路网。
import {campRoadNetwork} from '../world/camp-layout-roads.js';
import {CAMP_PLOTS,ownsCampPlot} from '../config/camp-land.js';
import {CAMP_BUILDINGS,campBuildingPosition,CAMP_ROAD_WIDTH} from '../config/camp-layout.js';
import {nearest} from '../world/coordinates.js';
import {drawCampGrass} from './ground-depth.js';
import {nightColor} from './river.js';
// 缓存依附游戏实例，存档替换或扩建后只保留当前路网。
export function campRoadView(game){return campRoadNetwork(game.progress);}
// 同一路网叠加草沿接触暗边和土路亮肩，几何与通行宽度保持一致。
export function drawCampLayoutRoads(c,game,view,night,season='summer'){
 if(game.mapId!=='forest'||game.cottage||game.story||game.realm||game.campDefense)return;
 const finish=game.progress.campManagement?.styles.road;const customized=Object.keys(game.progress.campLayout?.positions||{}).length>0||finish&&(finish.material!=='earth'||finish.shape!=='plain');if(!customized)return;
 const moved=Object.keys(game.progress.campLayout?.positions||{}).length>0,roads={paths:campSurfaceRoads(game.progress)},reference={x:view.x+view.w/2,y:view.y+view.h/2};c.save();
 // 已购地覆盖旧院路，保留未开发土地和外部自然地貌；路网与建筑同帧更新。
 if(moved)for(const p of CAMP_PLOTS.filter(p=>ownsCampPlot(game.progress,p.id))){const q=nearest({x:p.left,y:p.top},reference),w=p.right-p.left,h=p.bottom-p.top;if(q.x>view.x+view.w||q.x+w<view.x||q.y>view.y+view.h||q.y+h<view.y)continue;drawCampGrass(c,{...q,w,h},night,season);}
 c.beginPath();for(const p of CAMP_PLOTS.filter(p=>ownsCampPlot(game.progress,p.id))){const q=nearest({x:p.left,y:p.top},reference);c.rect(q.x,q.y,p.right-p.left,p.bottom-p.top);}c.clip();
 if(finish&&(finish.material!=='earth'||finish.shape!=='plain')){drawCampRoadFinish(c,roads.paths,view,finish,night);c.restore();return;}
 c.lineCap='round';c.lineJoin='round';
 for(const [width,color,dx,dy] of [[CAMP_ROAD_WIDTH+10,'#71885c55',2,3],[CAMP_ROAD_WIDTH+4,'#e3d5a1',-1,-1],[CAMP_ROAD_WIDTH,'#d9c48d',0,0],[CAMP_ROAD_WIDTH-9,'#e8d4a1',0,0]]){c.lineWidth=width;c.strokeStyle=nightColor(color,night);c.beginPath();for(const path of roads.paths)path.forEach((p,i)=>{const q=nearest(p,reference);if(i)c.lineTo(q.x+dx,q.y+dy);else c.moveTo(q.x+dx,q.y+dy);});c.stroke();}
 c.restore();
}

// 静态草花、旧田栏和园圃提示不盖到搬迁后的屋体；农田实体由放置校验保护。
export function campLayoutObjectVisible(game,item){if(game.mapId!=='forest'||game.story||game.realm||game.campDefense||!(item.type==='farm-sign'||item.type==='scenery'&&['fence','flowers','stones','logs'].includes(item.kind)))return true;return !CAMP_BUILDINGS.some(base=>{if(!game.progress.campLayout?.positions?.[base.id])return false;const b=campBuildingPosition(game.progress.campLayout,base),p=nearest(item,b);return Math.abs(p.x-b.x)<b.width/2+20&&p.y>b.y-b.height-10&&p.y<b.y+75;});}
