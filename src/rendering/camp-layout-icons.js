import {drawPasture} from './pasture.js';
// 规划缩略图沿用正式房屋立面，其他设施用无文字功能剪影；不改变世界资产。
import {drawBuildingArchitecture} from './building-architecture.js';
import {box,oval,poly} from './primitives.js';
const edge='#42634d',cream='#f4e5b9',roof='#92aa79',wood='#b99c71';
// 以脚底为原点绘制160单位图标，界面负责等比缩放与选择框。
export function drawCampLayoutIcon(c,item){const id=item.sourceId||item.id,kind=({catHome:'cat-home',warehouseDepot:'warehouse-depot'})[id]||id;
 if(['cottage','weapons','warehouse','warehouse-depot','cat-home','furniture','construction','seed','ammo','relay','kitchen','legendary'].includes(kind)){drawBuildingArchitecture(c,kind,false,0,0,false);return;}
 oval(c,0,3,67,9,'#38543b25');
 if(id.startsWith('defense-')){box(c,-5,-130,10,133,2,wood,edge,3);poly(c,[[-48,-125],[48,-125],[43,-50],[0,-25],[-43,-50]],cream,edge,3);poly(c,[[-23,-100],[23,-100],[18,-68],[0,-55],[-18,-68]],roof,edge,3);return;}
 if(id==='plaza'){box(c,-85,-95,170,95,15,'#d8d1a8',edge,3);for(const x of [-60,60])for(const y of [-73,-22])poly(c,[[x,y-5],[x+5,y],[x,y+5],[x-5,y]],roof,edge,1);oval(c,0,-47,24,13,cream,edge,2);return;}
 // 牛栏缩略图直接复用正式前后木栏，保持北门开口。
 if(id==='pasture'){c.save();c.scale(.6,.6);drawPasture(c,{x:0,y:-104,type:'pasture-back'},0);drawPasture(c,{x:0,y:0,type:'pasture-front'},0);c.restore();return;}
 if(id==='north'){box(c,-82,-95,164,94,5,'#aab98a',edge,3);for(const x of [-54,0,54])for(const y of [-72,-29]){c.strokeStyle=cream;c.lineWidth=3;c.strokeRect(x-19,y-15,38,30);}return;}
 if(id==='tent'){poly(c,[[-65,0],[0,-100],[65,0]],roof,edge,3);poly(c,[[-27,0],[0,-82],[27,0]],cream,edge,2);return;}
 if(['football','trade','travel','story','clearing','delivery'].includes(id)){for(const x of [-43,37])box(c,x,-88,7,89,2,wood,edge,2);box(c,-57,-92,114,60,4,cream,edge,3);poly(c,[[-65,-94],[-48,-110],[48,-110],[65,-94]],roof,edge,3);c.strokeStyle=edge;c.lineWidth=4;if(id==='delivery'||id==='story'){c.strokeRect(-25,-77,50,30);c.beginPath();c.moveTo(-25,-77);c.lineTo(0,-59);c.lineTo(25,-77);c.stroke();}else if(id==='travel'){poly(c,[[-28,-68],[8,-68],[8,-77],[30,-61],[8,-45],[8,-54],[-28,-54]],roof,edge,2);}else{for(const x of [-28,6])for(const y of [-77,-57])box(c,x,y,23,12,1,roof,edge,1);}return;}
 if(id==='tower'){for(let i=0;i<3;i++){box(c,-40,-38-i*35,80,38,2,cream,edge,3);poly(c,[[-50,-38-i*35],[0,-55-i*35],[50,-38-i*35]],roof,edge,2);}return;}
 if(id==='rogue'||id==='guardian'){for(const x of [-51,34])box(c,x,-80,17,81,3,'#a2b59c',edge,3);poly(c,[[-56,-77],[0,-116],[56,-77],[40,-69],[0,-98],[-40,-69]],roof,edge,3);oval(c,0,-37,16,28,id==='rogue'?'#b6a2be':cream,edge,2);return;}
 if(['camp','pottery','roost'].includes(id)){box(c,-52,-65,104,27,4,wood,edge,3);for(const x of [-43,35])box(c,x,-38,8,38,1,wood,edge,2);oval(c,0,-67,25,11,cream,edge,2);if(id==='roost')poly(c,[[-25,-69],[0,-98],[25,-69]],roof,edge,2);return;}
 box(c,-65,-86,130,86,4,cream,edge,3);poly(c,[[-76,-85],[-48,-115],[44,-110],[76,-85]],roof,edge,3);
 if(['factory','refinery'].includes(id)){box(c,-48,-140,23,42,2,'#9bab96',edge,3);box(c,-28,-58,56,58,10,wood,edge,3);poly(c,[[-16,-10],[-7,-39],[3,-24],[13,-46],[22,-10]],'#d6a45a',edge,2);}else{box(c,-32,-65,64,66,4,'#6e8a73',edge,3);if(id==='repair'){c.strokeStyle=cream;c.lineWidth=9;c.beginPath();c.moveTo(-17,-30);c.lineTo(20,-63);c.stroke();}else if(id==='outdoor')poly(c,[[-25,-30],[0,-66],[25,-30]],cream,edge,2);else{box(c,-53,-66,16,20,2,'#b4cec0',edge,2);box(c,38,-66,16,20,2,'#b4cec0',edge,2);}}}
