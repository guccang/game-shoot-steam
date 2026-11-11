// 五方营地复用正式建筑和猫连续帧，地面与实体按现有世界层级绘制。
import {REGIONAL_CAMPS,regionalBuildings,regionalNpc,regionalParcel} from '../config/regional-camps.js';
import {visibleBodies} from '../world/coordinates.js';
import {drawCachedCampArchitecture} from './camp-building-cache.js';
import {drawCat} from './characters.js';
import {box,oval} from './primitives.js';
import {canvasFont} from './text-style.js';
// 自由地表显示常住建筑，任务箱只在已接取尚未找到时出现。
export function regionalCampObjects(g){if(g.mapId!=='forest'||g.realm||g.story||g.cottage||g.campDefense)return [];return REGIONAL_CAMPS.flatMap(c=>[...regionalBuildings(c).map(b=>({...b,type:'regional-building',camp:c.id})),{...regionalNpc(c),type:'regional-npc',camp:c.id,hero:c.hero,name:c.npc},...(g.progress.regionalCamps?.[c.id]?.stage===1?[{...regionalParcel(c),type:'regional-parcel',camp:c.id}]:[])]);}
// 五营分别按溪岸、炉土、雪松、雨林与岩地配色。
const regionalGround={mossbrook:'#a9bf91',emberforge:'#c5ad90',snowcedar:'#c1cfb5',rainbell:'#99b59c',stratacove:'#b6b0a0'};
// 十字通道与门洞对齐，实体建筑放在通道两侧；只裁剪可见聚落。
export function drawRegionalCampGround(ctx,g,night,view){if(g.mapId!=='forest'||g.realm||g.story||g.cottage||g.campDefense)return;ctx.save();for(const c of visibleBodies(REGIONAL_CAMPS,view,650)){
 box(ctx,c.x-440,c.y-440,880,880,48,night>.5?'#78856c':regionalGround[c.id]);
 box(ctx,c.x-445,c.y-66,890,132,24,night>.5?'#939679':'#dfd1a0');box(ctx,c.x-66,c.y-445,132,890,24,night>.5?'#939679':'#dfd1a0');
 for(const b of regionalBuildings(c)){box(ctx,Math.min(c.x,b.x)-32,b.y+25,Math.abs(b.x-c.x)+64,47,14,night>.5?'#939679':'#dfd1a0');}
 ctx.font=canvasFont(22);ctx.textAlign='center';ctx.fillStyle=night>.5?'#e5dfba':'#365b43';ctx.fillText(c.name,c.x,c.y+290);
 }ctx.restore();}
// 建筑、人物与任务箱各自以脚底排序，文字不烘焙进静态图片。
export function drawRegionalCamp(ctx,item,g,night,winter){ctx.save();if(item.type==='regional-npc'){
 drawCat(ctx,item.x,item.y,item.hero,0,1,0,0,null,1,null,0,false,false,{idleTime:g.time,moveTime:0,moveWeight:0},0,null,0,true);
 box(ctx,item.x-42,item.y-83,84,22,7,night>.5?'#cfcea9':'#fff0c5','#365b43',1.5);ctx.font=canvasFont(12);ctx.fillStyle='#365b43';ctx.textAlign='center';ctx.fillText(item.name,item.x,item.y-67);
 }else{ctx.translate(item.x,item.y);if(item.type==='regional-building'){drawCachedCampArchitecture(ctx,item.kind,winter,night,false);box(ctx,-65,14,130,24,7,night>.5?'#cfcea9':'#fff0c5','#365b43',1.5);ctx.font=canvasFont(13);ctx.fillStyle='#365b43';ctx.textAlign='center';ctx.fillText(item.label,0,31);}else{oval(ctx,0,4,27,10,'#365b4330');box(ctx,-22,-26,44,31,5,night>.5?'#b6a479':'#dfc48b','#365b43',2);box(ctx,-4,-26,8,31,1,'#60765b');ctx.font=canvasFont(12);ctx.textAlign='center';ctx.fillStyle=night>.5?'#fff0c5':'#365b43';ctx.fillText('委托物品',0,-38);}}ctx.restore();}
