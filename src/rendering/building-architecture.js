// 房屋新立面共用木石材料、功能剪影与门槛锚点，不把交互状态烘焙进图片。
import {box,poly,oval} from './primitives.js';
import {drawWorldSign} from './world-signs.js';
import {drawRoofSurface,drawRoofSnow,drawInsetWindow,drawStoneFoot,drawHouseWall,drawHouseDoor} from './building-materials.js';
const EDGE='#536047';
const DESIGNS={
 warehouse:{w:144,h:124,roof:'#9eb477',name:'小屋仓库'},
 ammo:{w:144,h:128,roof:'#77928b',name:'弹药补给铺'},
 'cat-home':{w:144,h:132,roof:'#a6ba7c',name:'猫窝'},
 furniture:{w:136,h:120,roof:'#a0b878',name:'家具小铺'},
 cottage:{w:130,h:135,roof:'#94af70',name:'巡林小屋'},
 weapons:{w:146,h:132,roof:'#6c897b',name:'武器工坊'},
 seed:{w:114,h:110,roof:'#91ad78',name:'种子小屋'},
 relay:{w:104,h:112,roof:'#718f9a',name:'旧哨站'},
 kitchen:{w:140,h:112,roof:'#b17a59',name:'阿团的厨房'},
 legendary:{w:214,h:158,roof:'#a96751',name:'传奇工坊'},
 construction:{w:132,h:130,roof:'#99b278',name:'森筑建筑公司'},
};
// 平顶储货库以宽滑门和装卸台为中心，货箱沿墙码放，通道保持开放。
function drawStorageDepot(c,winter,night){
 const edge='#586047';
 c.save();
 oval(c,4,7,93,9,'#34533d29');
 drawStoneFoot(c,-86,86);drawHouseWall(c,-88,88,-60);
 // 折边金属屋面为水平板，近檐压住门轨，远檐与侧墙形成俯视深度。
 poly(c,[[-91,-57],[-79,-91],[77,-91],[91,-59],[88,-52],[-89,-50]],winter?'#e0e5d1':'#a5b79d',edge,2.4);
 for(const x of [-61,-28,5,38,64]){
  c.beginPath();c.moveTo(x,-87);c.lineTo(x+(x/12),-60);c.strokeStyle=winter?'#b9c7bb':'#879c88';c.lineWidth=1.7;c.stroke();
 }
 box(c,-91,-58,182,7,2,'#768c77',edge,2);
 // 小型屋顶采光窗压低高度，保留平顶轮廓。
 poly(c,[[-52,-70],[-46,-84],[-14,-84],[-17,-70]],night?'#e1c891':'#c3d5c5',edge,1.7);
 box(c,-52,-70,35,3,1,'#849680',edge,1);
 box(c,-68,-46,89,45,2,'#776f54',edge,2);
 for(const x of [-65,-23]){
  box(c,x,-44,39,42,2,'#adba91',edge,1.6);
  for(let y=-35;y<=-10;y+=9)box(c,x+3,y,33,1,0,'#859777');
 }
 box(c,-26,-27,3,9,1,'#f5e4b9',edge,1);
 box(c,-73,-49,100,4,2,'#7b8170',edge,1.4);
 drawInsetWindow(c,36,-44,32,13,night);
 // 三只板条箱共用木托盘，交叉封条和阴影在手机尺度仍然清楚。
 box(c,25,-2,54,6,1,'#937955',edge,1.5);
 for(const [x,y] of [[29,-18],[52,-18],[39,-34]]){
  box(c,x,y,21,16,2,'#c49c6a',edge,1.7);
  c.beginPath();c.moveTo(x+3,y+3);c.lineTo(x+18,y+13);c.moveTo(x+18,y+3);c.lineTo(x+3,y+13);c.strokeStyle='#8a744f';c.lineWidth=1.4;c.stroke();
 }
 box(c,-71,0,96,5,1,'#c1b898',edge,1.4);c.restore();
}
// 墙窗由框、玻璃与独立窗扇组成，夜间只改变窗内颜色。
function windowFrame(c,x,y,w,h,night){
 drawInsetWindow(c,x,y,w,h,night);
}
// 石基和门槛明确房屋占地，通行口放在底座中央并与一秒进屋点对齐。
export function drawBuildingArchitecture(c,kind,winter=false,night=0,extraRows=0,showLabel=true){
 if(kind==='warehouse-depot'){drawStorageDepot(c,winter,night);return;}
 const d=DESIGNS[kind]||DESIGNS.cottage,w=d.w,lift=kind==='cottage'?extraRows*32:0,h=d.h+lift,left=-w/2,right=w/2,wall=-d.h*.63-lift;
 c.save();oval(c,7,6,w*.51,11,'#29463826');oval(c,1,4,w*.44,5,'#29463829');
 drawStoneFoot(c,left,right);
 drawHouseWall(c,left,right,wall);
 // 加盖与首层共用完整墙面、侧墙和立柱，楼层之间只有腰线，不插入旧屋顶。
 if(lift)for(let row=0;row<extraRows;row++){
  const y=-d.h*.63-row*32;
  c.beginPath();c.moveTo(left+9,y);c.quadraticCurveTo(0,y+2,right-20,y);c.strokeStyle='#bcad7d';c.lineWidth=1.4;c.stroke();
  for(const x of [left+13,right-43])windowFrame(c,x,y-25,22,17,night);
 }
 if(kind==='weapons'||kind==='legendary'){
  // 锻造屋使用不对称高低屋面和独立烟囱，重车工坊使用更宽的厂房剪影。
  box(c,right-35,-h+4,16,31,2,'#9eab94',EDGE,2);box(c,right-39,-h+1,24,7,2,'#d7d3b0',EDGE,1.7);
  drawRoofSurface(c,[[left-5,wall],[left+17,-h+10],[right-16,-h+24],[right+5,wall+3]],{base:d.roof,light:kind==='legendary'?'#d8b57f':'#afc594',shade:kind==='legendary'?'#936849':'#68835d'});
 }else{
  // 住宅山墙、厨房偏置烟囱、温室玻璃顶和哨站钟楼保持不同轮廓。
  if(kind==='kitchen'){box(c,right-30,-h,18,45,2,'#a48064',EDGE,2);box(c,right-34,-h,26,7,2,'#d4c5a4',EDGE,1.4);}
  // 猫耳长在屋顶后缘，避免画在屋面前方形成两片悬浮三角形。
  if(kind==='cat-home')for(const side of [-1,1]){const x=side*43;c.beginPath();c.moveTo(x-13,-h+27);c.quadraticCurveTo(x-8,-h+3,x-3,-h-4);c.quadraticCurveTo(x,-h-9,x+3,-h-4);c.quadraticCurveTo(x+10,-h+9,x+13,-h+27);c.closePath();c.fillStyle=d.roof;c.fill();c.strokeStyle=EDGE;c.lineWidth=2.2;c.stroke();oval(c,x,-h+11,4,9,'#d4c391');}
  drawRoofSurface(c,[[left-8,wall-1],[-10,-h],[right-3,-h+25],[right+8,wall+5]],{base:d.roof,light:kind==='kitchen'?'#d9bc83':'#c7d694',shade:kind==='kitchen'?'#946e52':'#7e9b61'});
  if(kind==='seed'){
   poly(c,[[-36,wall-8],[-7,-h+10],[36,-h+33],[42,wall-4]],'#b1cec0',EDGE,1.8);
   for(const t of [.25,.5,.75]){c.strokeStyle='#688e77';c.beginPath();c.moveTo(-7+43*t,-h+10+23*t);c.lineTo(-36+78*t,wall-8+4*t);c.stroke();}
  }
 }
 // 厚檐投影随弯曲屋口落到墙上，保持完整大块面。
 c.beginPath();c.moveTo(left+5,wall+8);c.quadraticCurveTo(0,wall+19,right-3,wall+13);c.strokeStyle='#64754832';c.lineWidth=5;c.stroke();
 const doorW=kind==='legendary'?64:kind==='weapons'?40:28;
 drawHouseDoor(c,doorW);
 if(kind==='ammo'){
  // 双弹筒与侧箱提供清晰的补给功能剪影，不增加独立碰撞点。
  windowFrame(c,-57,-56,25,27,night);box(c,29,-36,28,32,3,'#9c946c',EDGE,1.7);for(const x of [-13,8]){box(c,x,-92,10,22,2,'#d6bc79',EDGE,1.4);poly(c,[[x,-92],[x+5,-101],[x+10,-92]],'#e4d3a1',EDGE,1.2);}
 }else if(kind==='seed'){
  for(const side of [-1,1]){windowFrame(c,side<0?left+12:23,-52,22,27,night);box(c,side*37-12,-16,24,15,3,'#b39166',EDGE,1.2);for(const dx of [-5,4]){oval(c,side*37+dx,-20,5,8,'#82a76d',EDGE,1);}}
 }else if(kind==='cat-home'){
  // 猫耳轮廓与软垫窗区别于普通住宅，爪印不覆盖中央入口。
  for(const side of [-1,1]){windowFrame(c,side<0?left+13:25,-55,25,28,night);oval(c,side*40,-25,12,4,'#c9b17f',null);}
  oval(c,0,-h+27,9,6,'#e8d3a8');for(const dx of [-9,-3,4,10])oval(c,dx,-h+15,3,4,'#e8d3a8');
 }else if(kind==='warehouse'){
  // 宽木仓门、交叉加固货箱和侧边原木形成仓储剪影，中央门前不摆货。
  windowFrame(c,31,-57,24,23,night);
  for(const [x,y] of [[-48,-13],[-32,-13],[-40,-27]]){box(c,x-8,y-7,16,14,4,'#b49a70',EDGE,1.4);oval(c,x,y,5,5,'#e0c794',EDGE,1);}
  box(c,27,-25,34,27,2,'#b49a70',EDGE,1.5);c.strokeStyle=EDGE;c.beginPath();c.moveTo(30,-22);c.lineTo(58,-1);c.moveTo(58,-22);c.lineTo(30,-1);c.stroke();
 }else if(kind==='furniture'){
  // 软垫橱窗与小木凳标识家具店，保持中央门槛可进入。
  for(const x of [left+12,24]){windowFrame(c,x,-55,26,30,night);box(c,x+2,-34,22,10,3,'#95ac78',EDGE,1);box(c,x,-29,26,7,2,'#b2c28c',EDGE,1);}
  c.beginPath();c.moveTo(-55,-63);c.quadraticCurveTo(0,-61,55,-63);c.lineTo(59,-53);c.quadraticCurveTo(0,-48,-59,-53);c.closePath();c.fillStyle='#e5cea1';c.fill();c.strokeStyle=EDGE;c.lineWidth=1.6;c.stroke();
 }else if(kind==='weapons'){
  windowFrame(c,left+14,-58,27,29,night);box(c,29,-50,26,28,2,'#8a9b7b',EDGE,1.4);c.strokeStyle='#e9dca8';c.lineWidth=3;c.beginPath();c.moveTo(34,-42);c.lineTo(50,-29);c.moveTo(35,-31);c.lineTo(48,-44);c.stroke();
 }else{
  const ww=kind==='legendary'?38:22;for(const x of [left+13,right-ww-21])windowFrame(c,x,-54,ww,27,night);
 }
 if(kind==='relay'){
  box(c,-17,-h+3,34,28,3,'#e7d9af',EDGE,1.6);oval(c,0,-h+16,10,10,'#fff1cc',EDGE,1.4);c.strokeStyle=EDGE;c.lineWidth=1.7;c.beginPath();c.moveTo(0,-h+9);c.lineTo(0,-h+16);c.lineTo(5,-h+19);c.stroke();
 }else if(kind==='cottage'){
  poly(c,[[-24,wall-12],[0,wall-38],[24,wall-12]],'#d9c58f',EDGE,1.8);windowFrame(c,-10,wall-27,20,17,night);
 }else if(kind==='kitchen'){
  box(c,-30,wall+6,60,16,3,'#c49569',EDGE,1.4);oval(c,0,wall+14,10,4,'#e7dcb5',EDGE,1.3);
 }
 if(showLabel)drawWorldSign(c,d.name,0,kind==='relay'?-54:wall+lift+15);
 if(winter)drawRoofSnow(c,kind==='weapons'||kind==='legendary'?[[left-5,wall],[left+17,-h+10],[right-16,-h+24],[right+5,wall+3]]:[[left-8,wall-1],[-10,-h],[right-3,-h+25],[right+8,wall+5]]);
 c.restore();
}
