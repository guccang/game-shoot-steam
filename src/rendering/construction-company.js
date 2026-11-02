// 建筑公司的木石立面、施工牌与脚手架沿用营地画笔，门口与实体目录一致。
import {CONSTRUCTION_COMPANY,homeFloors} from '../config/home-construction.js';
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

// 营地小比例外观展示扩建楼身；超高层采用压缩立面和真实层数牌，绘制成本不随层数增长。
export function drawHomeExpansion(c,item,home,night,player){
 const floors=homeFloors(home);if(floors<=2)return;
 const rows=Math.min(6,floors-2),top=-116-rows*30;
 c.save();c.translate(item.x,item.y);
 if(player&&Math.abs(player.x-item.x)<72&&player.y<item.y-80&&player.y>item.y+top-30)c.globalAlpha*=.42;
 box(c,-52,top,104,rows*30+22,4,night?'#afa78b':'#e1cea3','#3b6049',2);
 for(let row=0;row<rows;row++){
  const y=-116-row*30;box(c,-53,y-3,106,5,1,'#9e926a','#48654e',1);
  for(const x of [-34,16]){box(c,x,y-25,18,18,3,night?'#e6cc8e':'#a3c8b2','#42674f',1.5);box(c,x+8,y-25,2,18,0,'#72876a');}
 }
 poly(c,[[-62,top+3],[0,top-25],[62,top+3]],night?'#4d6c58':'#72956c','#365d47',2);
 box(c,-47,top-12,94,21,4,'#f2e5bb','#41664d',1.5);c.fillStyle='#31543f';c.font='bold 11px sans-serif';c.textAlign='center';c.fillText(`${floors} 层${floors>8?' · …':''}`,0,top+3);c.restore();
}
