// 建筑公司的木石立面、施工牌与脚手架沿用营地画笔，门口与实体目录一致。
import {CONSTRUCTION_COMPANY,homeExterior} from '../config/home-construction.js';
import {box,poly} from './primitives.js';
// 公司仅在森林世界中出现，不复制到独立战斗场。
export function constructionObjects(game){return game.mapId==='forest'&&!game.cottage&&!game.realm&&!game.story?[{...CONSTRUCTION_COMPANY,type:'construction-company'}]:[];}
// 以底座为脚底排序，正门下方留出候停区，夜间保留小窗暖光。
export function drawConstructionCompany(c,item,night=0){
 c.save();c.translate(item.x,item.y);box(c,-76,-5,152,18,8,'#53694a55');box(c,-66,-92,132,98,5,night?'#b7b18b':'#e9d9a9','#3b6049',3);
 poly(c,[[-79,-87],[-52,-130],[40,-130],[79,-87]],'#608564','#345641',3);
 box(c,-18,-49,36,55,3,'#866b48','#3b6049',2);box(c,28,-62,25,30,3,night?'#efd48b':'#a5c4af','#3b6049',2);
 for(const x of [-83,-45])box(c,x,-104,5,113,1,'#b68b55','#4a6044',1.5);
 for(const y of [-81,-44,-6])box(c,-85,y,46,5,1,'#c59f68','#4a6044',1);
 box(c,-68,13,136,28,5,'#f6e8bb','#3b6049',2);c.font='bold 13px sans-serif';c.textAlign='center';c.fillStyle='#345641';c.fillText('森筑建筑公司',0,32);c.restore();
}

// 层数独立于有限排数的楼身缓存，沿用屋顶中心与真实总层数，不另画第二栋小屋。
export function drawHomeFloorSign(c,floors){
 const view=homeExterior({floors});if(!view.rows)return;
 const text=`${view.floors} 层${view.floors>8?' · …':''}`,top=-159-view.lift;
 c.save();c.font='bold 11px sans-serif';c.textAlign='center';
 const width=Math.max(64,c.measureText(text).width+16);
 box(c,-width/2,top,width,21,4,'#f2e5bb','#41664d',1.5);c.fillStyle='#31543f';c.fillText(text,0,top+14);c.restore();
}
