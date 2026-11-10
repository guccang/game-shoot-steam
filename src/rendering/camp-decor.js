import {drawExpandedDecoration} from './camp-decor-expanded.js';
import {drawCampWallFinish} from './camp-building-finish.js';
import {drawRoofSurface} from './building-materials.js';
// 节日摆件与装饰铺共用正式画笔，商品图、编辑器和世界使用相同锚点与独立部件。
import {box,oval,poly} from './primitives.js';
import {CAMP_DECOR_SHOP,campDecorDefinition} from '../config/camp-management.js';
const E='#41614b',WOOD='#b99563',CREAM='#f4e5b8',RED='#bf6650',GREEN='#72946a';
// 五角星保持静态轮廓，不用整图旋转模拟动作。
function star(c,x,y,r){poly(c,Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,s=i%2?r*.45:r;return [x+Math.cos(a)*s,y+Math.sin(a)*s];}),'#e8c776',E,1.3);}
// 花朵采用五片低对比花瓣，图案保持在花箱与树冠内。
function flower(c,x,y,color='#e1a1a0',r=5){for(let i=0;i<5;i++)oval(c,x+Math.cos(i*1.256)*r*.7,y+Math.sin(i*1.256)*r*.7,r*.65,r*.65,color);oval(c,x,y,r*.45,r*.45,'#f2d98b');}
// 红灯笼与流苏为独立局部图元，灯芯沿用暖黄小面积高光。
function lantern(c,x,y,night){box(c,x-2,y-16,4,17,1,WOOD,E,1);oval(c,x,y+9,12,17,RED,E,1.8);oval(c,x-3,y+6,5,11,night?'#f4c47e':'#df916a');box(c,x-8,y-8,16,4,2,'#d6b36a',E,1);box(c,x-7,y+24,14,4,2,'#d6b36a',E,1);for(const dx of [-4,0,4])box(c,x+dx,y+28,1.7,10,0,RED);}
// 所有装饰最多60个实例，由正式脚底队列裁剪和排序。
export function campDecorationObjects(game){if(game.mapId!=='forest'||game.cottage||game.realm||game.story||game.campDefense)return [];return [{...CAMP_DECOR_SHOP,type:'camp-decor-shop'},...(game.progress.campManagement?.items||[]).filter(i=>i.x!==null&&campDecorDefinition(i.type)?.form!=='lamp').map(i=>({...i,kind:i.type,type:'camp-decoration'}))];}
// 实体仅改变局部喷泉水珠；减少动态或暂停时由调用方固定时钟。
export function drawCampDecoration(c,item,night=0,time=0,reduced=false){const d=campDecorDefinition(item.kind||item.type);if(!d)return;c.save();c.translate(item.x||0,item.y||0);if(item.decorScale)c.scale(item.decorScale,item.decorScale);c.lineCap='round';c.lineJoin='round';oval(c,4,3,d.width*.5,d.depth*.32,'#34503a27');
 if(d.form){drawExpandedDecoration(c,d,night,time,reduced);c.restore();return;}
 switch(d.id){
 case 'spring-lantern':box(c,-17,-6,34,10,3,'#9ba487',E,1.8);box(c,-4,-99,8,94,2,WOOD,E,2);box(c,-6,-100,27,6,2,CREAM,E,1.5);lantern(c,12,-78,night);break;
 case 'fortune-screen':for(const x of [-29,29]){box(c,x-4,-70,8,68,2,WOOD,E,1.8);box(c,x-10,-3,20,6,2,WOOD,E,1.5);}box(c,-34,-72,68,7,3,CREAM,E,1.8);box(c,-25,-64,50,51,4,'#e8cea1',E,1.8);poly(c,[[0,-61],[22,-39],[0,-17],[-22,-39]],RED,E,1.5);c.font='bold 24px sans-serif';c.textAlign='center';c.fillStyle=CREAM;c.fillText('福',0,-31);break;
 case 'peach-tree':box(c,-19,-19,38,22,6,'#b38c68',E,2);box(c,-22,-23,44,7,3,CREAM,E,1.5);c.strokeStyle=WOOD;c.lineWidth=8;c.beginPath();c.moveTo(0,-20);c.quadraticCurveTo(-8,-54,1,-85);c.moveTo(-3,-47);c.lineTo(-21,-68);c.moveTo(-1,-57);c.lineTo(22,-78);c.stroke();for(const [x,y,r] of [[-19,-69,19],[3,-85,20],[21,-72,17],[-1,-60,19]]){oval(c,x,y,r,r*.8,'#cda4a1',E,1.6);for(const dx of [-7,6])flower(c,x+dx,y-3,'#edc7b7',4);}break;
 case 'lion-statue':box(c,-27,-7,54,10,4,'#b2b69a',E,2);oval(c,0,-19,22,17,RED,E,2);for(const x of [-18,18]){box(c,x-7,-12,14,11,4,CREAM,E,1.5);oval(c,x,-48,10,12,RED,E,1.6);}oval(c,0,-41,24,22,'#d59b69',E,2);for(const x of [-12,12]){oval(c,x,-46,11,11,CREAM,E,1.5);oval(c,x,-45,4,5,E);oval(c,x,-53,9,3,RED);}oval(c,0,-31,17,8,CREAM,E,1.5);oval(c,0,-38,6,4,RED,E,1.5);star(c,0,-62,6);break;
 case 'christmas-tree':box(c,-8,-19,16,23,3,WOOD,E,1.8);for(const [y,w] of [[-20,35],[-43,28],[-65,20]])poly(c,[[-w,y],[0,y-37],[w,y],[w*.6,y+5],[-w*.6,y+5]],GREEN,E,2);for(const [x,y] of [[-19,-26],[15,-35],[-13,-51],[9,-65],[0,-85]])oval(c,x,y,4,4,x<0?RED:'#e4c978',E,1);star(c,0,-105,10);break;
 case 'snowman':oval(c,0,-18,23,23,'#e6ead9',E,2);oval(c,0,-49,17,17,'#f3efda',E,2);box(c,-20,-68,40,5,2,E);box(c,-13,-82,26,16,3,'#658173',E,1.8);box(c,-13,-72,26,5,1,RED);for(const x of [-6,6])oval(c,x,-53,2,2,E);poly(c,[[0,-48],[15,-44],[0,-42]],'#d1a066',E,1);box(c,-18,-36,37,7,3,RED,E,1.4);box(c,10,-32,7,20,2,RED,E,1.2);for(const y of [-20,-10])oval(c,0,y,2.5,2.5,E);break;
 case 'gift-pile':for(const [x,y,w,h,color] of [[-30,-26,31,28,RED],[0,-37,30,39,GREEN],[-15,-50,25,22,'#d4b279']]){box(c,x,y,w,h,3,color,E,1.8);box(c,x-2,y,w+4,5,2,CREAM,E,1.2);box(c,x+w*.45,y,5,h,1,CREAM);oval(c,x+w*.5-5,y-3,6,3,CREAM,E,1);oval(c,x+w*.5+5,y-3,6,3,CREAM,E,1);}break;
 case 'flower-sleigh':for(const y of [-1,7]){c.strokeStyle=WOOD;c.lineWidth=4;c.beginPath();c.moveTo(-38,y);c.lineTo(25,y);c.quadraticCurveTo(46,y,40,y-17);c.stroke();}box(c,-29,-30,61,27,6,RED,E,2);poly(c,[[-35,-45],[-25,-43],[-20,-10],[-30,-10]],WOOD,E,1.6);for(const x of [-12,4,20]){oval(c,x,-35,9,12,GREEN,E,1);flower(c,x,-41,CREAM,6);}break;
 case 'flowerbed':oval(c,0,-6,37,19,'#b6bda0',E,2);oval(c,0,-12,34,17,'#937e5c',E,1.4);for(const [x,y] of [[-22,-15],[0,-22],[20,-13],[-7,-5]]){oval(c,x,y-4,10,8,GREEN,E,1.2);flower(c,x,y-12,x<0?'#dfaaa0':CREAM,6);}break;
 case 'fountain':oval(c,0,-4,39,23,'#a7b29a',E,2);oval(c,0,-10,34,18,'#9ebdc0',E,1.5);oval(c,0,-12,25,11,'#c3d8cd');box(c,-7,-55,14,43,4,'#bbc5a7',E,1.6);oval(c,0,-49,25,13,'#bbc5a7',E,2);oval(c,0,-53,21,9,'#a1c2c1',E,1.2);oval(c,0,-65,7,9,CREAM,E,1.5);for(let i=0;i<5;i++){const t=reduced?.45:(time*.6+i*.2)%1;c.strokeStyle='#d9ede0';c.lineWidth=2;c.beginPath();c.moveTo(0,-73);c.quadraticCurveTo((i-2)*14,-88,(i-2)*14*t,-53);c.stroke();oval(c,(i-2)*14*t,-53+25*t,1.7,3,'#d9ede0');}break;
 }
 c.restore();}
// 新装饰铺采用花架、挑檐、店名与节日陈列，门前保持独立交互空间。
export function drawCampDecorShop(c,item,night=0){c.save();c.translate(item.x,item.y);oval(c,4,4,61,12,'#34503a27');box(c,-50,-71,100,74,6,'#e5d5a8',E,2);drawCampWallFinish(c,-47,-69,94,68);box(c,-18,-44,36,47,5,'#57725a',E,1.8);for(const x of [-42,23])box(c,x,-49,19,23,3,night?'#f2df9f':'#afc5aa',E,1.6);drawRoofSurface(c,[[-59,-67],[-43,-91],[36,-91],[59,-67]],{base:'#93ac77'});box(c,-40,-67,80,20,4,CREAM,E,1.6);c.fillStyle=E;c.font='bold 12px sans-serif';c.textAlign='center';c.fillText('营地装饰铺',0,-53);lantern(c,-46,-35,night);star(c,41,-25,10);c.restore();}
