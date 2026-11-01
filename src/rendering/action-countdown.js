import {drawResourceIcon} from './resource-icons.js';
// 场景交互与界面自动关闭共用停车徽记，绘制器只读进度、不推进计时。
import {box,oval,poly} from './primitives.js';

// 图标独立于圆环和数字；颜色、比例与原倒车候停提示一致。
function drawIcon(c,icon){
 if(icon==='parking'||icon==='vehicle'){
  box(c,-6,-4,12,9,3,'#82a376','#41664b',1.3);box(c,-4,-7,8,5,2,'#dce5b9','#41664b',1);
  for(const x of [-5,4])oval(c,x,5,1.5,2,'#41664b');
 }else if(icon==='stairs-up'||icon==='stairs-down'){
  // 阶梯和方向箭头独立绘制，上下楼共用同一轮廓与进度环。
  c.strokeStyle='#41664b';c.lineWidth=1.7;c.beginPath();c.moveTo(-7,6);c.lineTo(-2,6);c.lineTo(-2,1);c.lineTo(3,1);c.lineTo(3,-4);c.lineTo(8,-4);c.stroke();
  const d=icon==='stairs-up'?-1:1;c.beginPath();c.moveTo(-5,-d*6);c.lineTo(-5,d*6);c.moveTo(-8,d*3);c.lineTo(-5,d*6);c.lineTo(-2,d*3);c.stroke();
 }else if(icon==='wood'){
  drawResourceIcon(c,'wood',0,0,18);
 }else if(icon==='weapon'){
  // 枪托、枪管与握把独立勾出小型枪械，与停车和候门图标区分。
  box(c,-7,-4,11,6,2,'#82a376','#41664b',1.3);box(c,3,-3,6,3,1,'#dce5b9','#41664b',1);poly(c,[[-4,2],[0,2],[-1,8],[-5,8]],'#dce5b9','#41664b',1.2);
 }else if(icon==='home'){
  box(c,-5,-1,10,8,1,'#dce5b9','#41664b',1.3);poly(c,[[-7,-1],[0,-7],[7,-1]],'#82a376','#41664b',1.3);box(c,-1,2,3,5,0,'#41664b');
 }else if(icon==='exit'){
  box(c,-7,-7,8,15,1,'#dce5b9','#41664b',1.3);poly(c,[[0,-2],[4,-2],[4,-5],[9,0],[4,5],[4,2],[0,2]],'#82a376','#41664b',1);
 }else if(icon==='board'){
  box(c,-7,-6,14,11,2,'#dce5b9','#41664b',1.3);box(c,-1,5,2,4,0,'#41664b');box(c,-4,-3,8,1,0,'#82a376');box(c,-4,0,6,1,0,'#82a376');
 }else if(icon==='shield'){
  poly(c,[[-7,-6],[7,-6],[6,3],[0,8],[-6,3]],'#82a376','#41664b',1.3);poly(c,[[-3,-2],[0,2],[4,-3]],null,'#fff1c9',1.8);
 }else if(icon==='fire'){
  poly(c,[[0,-8],[5,-2],[6,4],[2,8],[-4,6],[-6,1],[-3,-5],[-2,0]],'#c6a36b','#41664b',1.3);poly(c,[[1,0],[3,4],[0,6],[-2,4]],'#fff1c9');
 }else if(icon==='bed'){
  box(c,-7,-2,14,7,1,'#82a376','#41664b',1.3);box(c,-6,-4,5,4,1,'#dce5b9','#41664b',1);
  c.beginPath();c.moveTo(-7,-6);c.lineTo(-7,7);c.moveTo(7,2);c.lineTo(7,7);c.stroke();
 }else if(icon==='build'){
  box(c,-2,-2,4,10,1,'#82a376','#41664b',1);box(c,-6,-6,12,5,1,'#dce5b9','#41664b',1.3);
 }else{
  c.strokeStyle='#41664b';c.lineWidth=1.5;c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.moveTo(0,-4);c.lineTo(0,0);c.lineTo(3,2);c.stroke();
 }
}

// 统一奶油底、森林绿描边、左侧环形图标与右侧数字；坐标原点为徽记中心。
export function drawActionCountdown(c,{progress,label,icon='clock',width=68}){
 c.save();box(c,-width/2,-17,width,34,13,'#fff1c9','#41664b',2);
 c.translate(-width/2+17,0);c.strokeStyle='#d7dfb8';c.lineWidth=2.5;c.beginPath();c.arc(0,0,11,0,Math.PI*2);c.stroke();
 c.strokeStyle='#78956c';c.beginPath();
 c.arc(0,0,11,-Math.PI/2,Math.PI*2*Math.max(0,Math.min(1,progress))-Math.PI/2);c.stroke();
 drawIcon(c,icon);c.translate(width/2-17,0);
 c.fillStyle='#365c44';c.textAlign='center';c.textBaseline='middle';c.font='bold 14px sans-serif';c.fillText(String(label),13,1);c.restore();
}
