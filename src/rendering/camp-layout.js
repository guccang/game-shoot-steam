// 搬迁后的道路在正式地面层绘制；布局和地契变化才重新生成有界路网。
import {campRoadNetwork} from '../world/camp-layout-roads.js';
import {CAMP_PLOTS,ownsCampPlot} from '../config/camp-land.js';
import {CAMP_BUILDINGS,campBuildingPosition,CAMP_ROAD_WIDTH} from '../config/camp-layout.js';
import {nearest} from '../world/coordinates.js';
// 缓存依附游戏实例，存档替换或扩建后只保留当前路网。
export function campRoadView(game){return campRoadNetwork(game.progress);}
export function drawCampLayoutRoads(c,game,view,night){
 if(game.mapId!=='forest'||game.cottage||game.story||game.realm||game.campDefense)return;
 const customized=Object.keys(game.progress.campLayout?.positions||{}).length>0;if(!customized)return;
 const roads=campRoadView(game),reference={x:view.x+view.w/2,y:view.y+view.h/2};c.save();
 // 已购地覆盖旧院路，保留未开发土地和外部自然地貌；路网与建筑同帧更新。
 for(const p of CAMP_PLOTS.filter(p=>ownsCampPlot(game.progress,p.id))){const q=nearest({x:p.left,y:p.top},reference),w=p.right-p.left,h=p.bottom-p.top;if(q.x>view.x+view.w||q.x+w<view.x||q.y>view.y+view.h||q.y+h<view.y)continue;c.fillStyle=night>.5?'#879174':'#cdd797';c.fillRect(q.x,q.y,w,h);}
 c.lineCap='round';c.lineJoin='round';
 for(const [width,color] of [[CAMP_ROAD_WIDTH+8,night>.5?'#969779':'#c4bd8c'],[CAMP_ROAD_WIDTH,night>.5?'#b0ad88':'#eee0ae']]){c.lineWidth=width;c.strokeStyle=color;c.beginPath();for(const path of roads.paths)path.forEach((p,i)=>{const q=nearest(p,reference);if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);});c.stroke();}
 c.restore();
}

// 静态草花、旧田栏和园圃提示不盖到搬迁后的屋体；农田实体由放置校验保护。
export function campLayoutObjectVisible(game,item){if(game.mapId!=='forest'||game.story||game.realm||game.campDefense||!(item.type==='farm-sign'||item.type==='scenery'&&['fence','flowers','stones','logs'].includes(item.kind)))return true;return !CAMP_BUILDINGS.some(base=>{if(!game.progress.campLayout?.positions?.[base.id])return false;const b=campBuildingPosition(game.progress.campLayout,base),p=nearest(item,b);return Math.abs(p.x-b.x)<b.width/2+20&&p.y>b.y-b.height-10&&p.y<b.y+75;});}
