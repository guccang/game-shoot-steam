// 建筑公司的木石立面、施工牌与脚手架沿用营地画笔，门口与实体目录一致。
import {CONSTRUCTION_COMPANY,homeExterior} from '../config/home-construction.js';
import {box,poly} from './primitives.js';
import {campBuildingCache} from './camp-building-cache.js';
import {drawBuildingArchitecture} from './building-architecture.js';
// 公司仅在森林世界中出现，不复制到独立战斗场。
export function constructionObjects(game){return game.mapId==='forest'&&!game.cottage&&!game.realm&&!game.story?[{...CONSTRUCTION_COMPANY,type:'construction-company'}]:[];}
// 以底座为脚底排序，正门下方留出候停区，夜间保留小窗暖光。
export function drawConstructionCompany(c,item,night=0){
 c.save();c.translate(item.x,item.y);const dark=!!night;campBuildingCache.draw(c,'construction:'+dark,[-96,-144,192,196],ctx=>paintConstructionCompany(ctx,dark));c.restore();
}
// 公司外墙没有动作，只缓存有限昼夜两种外观；施工与楼层提示仍由原入口绘制。
function paintConstructionCompany(c,night){
 c.save();drawBuildingArchitecture(c,'construction',false,night);
 for(const x of [-83,-45])box(c,x,-104,5,113,1,'#b68b55','#4a6044',1.5);
 for(const y of [-81,-44,-6])box(c,-85,y,46,5,1,'#c59f68','#4a6044',1);
 // 斜撑连接原脚手架，施工身份由结构表达；门前留空，招牌随正式立面绘制。
 poly(c,[[-80,-78],[-77,-80],[-43,-12],[-46,-10]],'#b49b6a',null);c.restore();
}

// 层数独立于有限排数的楼身缓存，沿用屋顶中心与真实总层数，不另画第二栋小屋。
export function drawHomeFloorSign(c,floors){
 const view=homeExterior({floors});if(!view.rows)return;
 const text=`${view.floors} 层${view.floors>8?' · …':''}`,top=-159-view.lift;
 c.save();c.font='bold 11px sans-serif';c.textAlign='center';
 const width=Math.max(64,c.measureText(text).width+16);
 box(c,-width/2,top,width,21,4,'#f2e5bb','#41664d',1.5);c.fillStyle='#31543f';c.fillText(text,0,top+14);c.restore();
}
