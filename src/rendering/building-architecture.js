// 房屋新立面共用木石材料、功能剪影与门槛锚点，不把交互状态烘焙进图片。
import {box,poly,oval} from './primitives.js';
import {drawWorldSign} from './world-signs.js';
const EDGE='#365a48';
const DESIGNS={
 cottage:{w:130,h:135,roof:'#789865',name:'巡林小屋'},
 weapons:{w:146,h:132,roof:'#6c897b',name:'武器工坊'},
 seed:{w:114,h:110,roof:'#82a081',name:'种子小屋'},
 relay:{w:104,h:112,roof:'#718f9a',name:'旧哨站'},
 kitchen:{w:140,h:112,roof:'#b17a59',name:'阿团的厨房'},
 legendary:{w:214,h:158,roof:'#a96751',name:'传奇工坊'},
};
// 墙窗由框、玻璃与独立窗扇组成，夜间只改变窗内颜色。
function windowFrame(c,x,y,w,h,night){
 box(c,x-3,y-3,w+6,h+6,3,'#66846d',EDGE,1.5);box(c,x,y,w,h,2,night?'#efd692':'#a7c9bd',EDGE,1.3);
 c.strokeStyle='#e4e2b7';c.lineWidth=2;c.beginPath();c.moveTo(x+w*.5,y);c.lineTo(x+w*.5,y+h);c.moveTo(x,y+h*.55);c.lineTo(x+w,y+h*.55);c.stroke();
 box(c,x-6,y+h+2,w+12,5,1,'#d9c999',EDGE,1);
}
// 石基和门槛明确房屋占地，通行口放在底座中央并与一秒进屋点对齐。
export function drawBuildingArchitecture(c,kind,winter=false,night=0){
 const d=DESIGNS[kind]||DESIGNS.cottage,w=d.w,h=d.h,left=-w/2,right=w/2,wall=-h*.63;
 c.save();oval(c,7,5,w*.51,12,'#29463832');
 box(c,left,-14,w,20,3,'#849381',EDGE,2);for(let x=left+4;x<right-5;x+=22){c.strokeStyle='#bec4a2';c.lineWidth=1.4;c.beginPath();c.moveTo(x,-12);c.lineTo(x,-3);c.stroke();}
 poly(c,[[left+5,wall],[right-13,wall-8],[right,wall+4],[right,-5],[right-13,1],[left+5,-5]],'#eee0b9',EDGE,2.3);
 poly(c,[[right-13,wall-8],[right,wall+4],[right,-5],[right-13,1]],'#9da788',EDGE,1.6);
 // 木构柱与墙裙让封闭房屋区别于原先可穿行的小棚。
 for(const x of [left+5,right-19])box(c,x,wall+6,6,-wall-8,1,'#9e835d',EDGE,1.3);
 box(c,left+6,-23,w-25,10,1,'#d0bd8d');
 if(kind==='weapons'||kind==='legendary'){
  // 锻造屋使用不对称高低屋面和独立烟囱，重车工坊使用更宽的厂房剪影。
  box(c,right-35,-h+4,16,31,2,'#9eab94',EDGE,2);box(c,right-39,-h+1,24,7,2,'#d7d3b0',EDGE,1.7);
  poly(c,[[left-5,wall],[left+17,-h+10],[right-16,-h+24],[right+5,wall+3]],d.roof,EDGE,2.7);
  poly(c,[[left+17,-h+10],[right-16,-h+24],[right-30,-h+32],[left+27,-h+19]],'#a5b296',EDGE,1.3);
  for(let x=left+25;x<right-26;x+=23){c.strokeStyle='#afc0a5';c.lineWidth=1.6;c.beginPath();c.moveTo(x,-h+18+(x-left)*.13);c.lineTo(x-16,wall-4);c.stroke();}
 }else{
  // 住宅山墙、厨房偏置烟囱、温室玻璃顶和哨站钟楼保持不同轮廓。
  if(kind==='kitchen'){box(c,right-30,-h,18,45,2,'#a48064',EDGE,2);box(c,right-34,-h,26,7,2,'#d4c5a4',EDGE,1.4);}
  poly(c,[[left-8,wall-1],[-10,-h],[right-3,-h+25],[right+8,wall+5]],d.roof,EDGE,2.6);
  poly(c,[[left-8,wall-1],[-10,-h],[2,-h+9],[left+3,wall+2]],'#a4b68a',null);
  for(let row=0;row<3;row++){const y=-h+24+row*13;c.strokeStyle='#456e5944';c.lineWidth=1.4;c.beginPath();c.moveTo(left+30-row*9,y);c.lineTo(right-20+row*5,y+10);c.stroke();}
  if(kind==='seed'){
   poly(c,[[-36,wall-8],[-7,-h+10],[36,-h+33],[42,wall-4]],'#b1cec0',EDGE,1.8);
   for(const t of [.25,.5,.75]){c.strokeStyle='#688e77';c.beginPath();c.moveTo(-7+43*t,-h+10+23*t);c.lineTo(-36+78*t,wall-8+4*t);c.stroke();}
  }
 }
 box(c,left-8,wall-3,w+16,8,2,'#788b71',EDGE,1.8);
 const doorW=kind==='legendary'?64:kind==='weapons'?40:28;
 box(c,-doorW/2-4,-49,doorW+8,52,3,'#baaa7f',EDGE,1.7);box(c,-doorW/2,-46,doorW,48,3,'#54745c',EDGE,1.7);
 for(let x=-doorW/2+7;x<doorW/2;x+=10){c.strokeStyle='#93a482';c.lineWidth=1;c.beginPath();c.moveTo(x,-43);c.lineTo(x,-2);c.stroke();}
 oval(c,doorW/2-6,-20,2.4,2.4,'#e8cf83');box(c,-doorW/2-9,0,doorW+18,7,2,'#c8ccb0',EDGE,1.4);
 if(kind==='seed'){
  for(const side of [-1,1]){windowFrame(c,side<0?left+12:23,-52,22,27,night);box(c,side*37-12,-16,24,15,3,'#b39166',EDGE,1.2);for(const dx of [-5,4]){oval(c,side*37+dx,-20,5,8,'#82a76d',EDGE,1);}}
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
 drawWorldSign(c,d.name,0,kind==='relay'?-54:wall+15);
 if(winter)poly(c,[[left-6,wall-4],[-10,-h-1],[right-3,-h+24],[right, -h+31],[-9,-h+7],[left+2,wall-2]],'#ecf0db',null);
 c.restore();
}
