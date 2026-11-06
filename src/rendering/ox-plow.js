// 牛蹄是整组的落地点。猫先在后方绘制，扶柄、犁铧和牛按前后关系叠放。
import {drawLivestock} from './livestock-atlas.js';
import {oxHandler} from '../config/pasture.js';

// 从猫的握位向牛肩连接双木柄，牛身遮住挽具中央。
export function drawOxPlow(c,foot,ox,time=0){
 const yaw=ox?.yaw??(ox?.facing===-1?Math.PI:0);
 c.save();c.translate(foot.x,foot.y);c.lineJoin='round';c.lineCap='round';
 c.fillStyle='#42523838';c.beginPath();c.ellipse(0,-3,33,9,0,0,2*Math.PI);c.fill();
 if(!ox?.unhitched){
  const hand=oxHandler({x:0,y:0},yaw),side=-Math.cos(yaw);
  const bladeX=side*34,bladeY=ox?.held?-10:-17;
  c.strokeStyle='#435d48';c.fillStyle='#d8c9ab';c.lineWidth=2;
  c.beginPath();c.moveTo(bladeX-7,bladeY-9);c.lineTo(bladeX+7,bladeY-4);
  c.lineTo(bladeX+side*8,bladeY+2);c.lineTo(bladeX-6,bladeY);c.closePath();c.fill();c.stroke();
  for(const edge of [-1,1]){
   c.beginPath();c.moveTo(hand.x+edge*12,hand.y-13);c.quadraticCurveTo(edge*43,-41,edge*24,-30);
   c.lineWidth=5;c.strokeStyle='#49563e';c.stroke();c.lineWidth=2.5;c.strokeStyle='#ba9463';c.stroke();
   c.beginPath();c.ellipse(hand.x+edge*12,hand.y-13,4.5,3.5,0,0,2*Math.PI);
   c.fillStyle='#edc78b';c.strokeStyle='#546047';c.lineWidth=1.4;c.fill();c.stroke();
  }
  c.beginPath();c.moveTo(side*30,-38);c.lineTo(bladeX,bladeY-5);c.lineWidth=4;c.strokeStyle='#795c3e';c.stroke();
 }
 drawLivestock(c,'ox',0,0,!!ox?.moving,time);
 c.restore();
}
