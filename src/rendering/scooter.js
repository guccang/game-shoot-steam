// 正面朝前的巡林电动车：纵向双轮、后座和前罩独立，身体不随车壳旋转。
import {box,oval,poly} from './primitives.js';
const ink='#365a47';
// 正面轮胎用沿胎面滚动的短纹表现真实轮转，停车保留路程相位。
function frontTire(c,x,y,phase,width,height){
  box(c,x-width/2,y-height/2,width,height,width/2,'#4f6155',ink,2);
  c.save();c.beginPath();c.rect(x-width/2+2,y-height/2+2,width-4,height-4);c.clip();
  c.strokeStyle='#91a48b';c.lineWidth=1.5;
  const offset=((phase*5)%7+7)%7;
  for(let dy=-height/2-7;dy<height/2;dy+=7){c.beginPath();c.moveTo(x-width/2+2,y+dy+offset);c.lineTo(x,y+dy+offset+2);c.lineTo(x+width/2-2,y+dy+offset);c.stroke();}
  c.restore();
}
// 后轮和低扁双人鞍座位于人物之后；坐垫使用棕色软包和缝线，不再形成竖直黑挡板。
export function drawScooterRear(c,phase=0){
  oval(c,0,20,29,9,'#30492b30');
  frontTire(c,0,-23,phase,11,23);
  // 后扶手是一根细金属管，坐垫下方留出车架空间。
  c.strokeStyle=ink;c.lineWidth=2.5;c.lineJoin='round';c.beginPath();
  c.moveTo(-20,-42);c.lineTo(-20,-56);c.quadraticCurveTo(0,-62,20,-56);c.lineTo(20,-42);c.stroke();
  poly(c,[[-12,-38],[-7,-16],[-17,2],[17,2],[7,-16],[12,-38]],'#7f9b73',ink,2);
  box(c,-18,-50,36,16,7,'#8f7353',ink,2);
  oval(c,0,-49,18,6,'#bb9568',ink,1.5);
  c.strokeStyle='#dfbd87';c.lineWidth=1.3;c.beginPath();c.moveTo(-12,-48);c.quadraticCurveTo(0,-44,12,-48);c.stroke();
  box(c,-25,1,50,8,4,'#b8c68d',ink,2);
  box(c,-32,5,13,5,2,'#6c8464',ink,1.5);box(c,19,5,13,5,2,'#6c8464',ink,1.5);
}
// 裸露车把、独立圆灯、短前罩与前叉构成无风挡车头，人物胸口上方保持开放。
export function drawScooterFront(c,phase=0){
  // 双前叉和轮胎独立，短挡泥板只覆盖胎顶，轮纹仍清楚可见。
  for(const x of [-9,5])box(c,x,3,4,25,2,'#a9b797',ink,1.5);
  frontTire(c,0,22,phase,13,29);
  poly(c,[[-14,-18],[14,-18],[20,-3],[16,11],[0,15],[-16,11],[-20,-3]],'#dfcf98',ink,2);
  poly(c,[[-12,-14],[-5,-14],[-8,7],[-14,5]],'#f7e8bc');
  box(c,-11,10,22,12,6,'#8da57b',ink,1.7);
  box(c,-7,11,14,3,2,'#bbcd9a');
  // 转向杆连接车架，弯曲细把手不画整块横向挡板。
  box(c,-3,-30,6,15,2,'#7f9b73',ink,1.5);
  c.strokeStyle=ink;c.lineWidth=3;c.lineCap='round';c.beginPath();
  c.moveTo(-30,-30);c.lineTo(-17,-32);c.quadraticCurveTo(0,-25,17,-32);c.lineTo(30,-30);c.stroke();
  box(c,-36,-33,12,5,2,'#526c53',ink,1);box(c,24,-33,12,5,2,'#526c53',ink,1);
  for(const x of [-28,28]){c.beginPath();c.moveTo(x,-32);c.lineTo(x,-42);c.stroke();oval(c,x,-44,6,4,'#c4d6b8',ink,1.5);}
  oval(c,0,-25,11,10,'#92ac80',ink,2);
  oval(c,0,-25,8,7,'#fff0bd',ink,1.4);
  oval(c,-2,-27,3.5,2.5,'#fff8dc');
}
