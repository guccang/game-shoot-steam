// 牧栏分前后两层，羊的卷毛、面部及四蹄独立绘制。
import {drawLivestock} from './livestock-atlas.js';
import {PEN_RAILS} from '../config/pasture.js';
// 三支金穗从同一个根部伸出；压低叶丛，方便小屏玩家从普通地被里辨认。
function drawSweetGrass(c){
 c.fillStyle='rgba(58,74,45,.20)';c.beginPath();c.ellipse(2,1,20,5,0,0,Math.PI*2);c.fill();
 c.strokeStyle='#466549';c.lineWidth=1.8;
 for(const [x,y] of [[-24,-16],[-13,-26],[21,-22],[25,-10]]){
  c.fillStyle=x<0?'#96b66e':'#75995b';c.beginPath();c.moveTo(0,1);
  c.quadraticCurveTo(x*.7,-1,x,y);c.quadraticCurveTo(x*.23,y+4,0,1);c.fill();c.stroke();
 }
 for(const [x,y,angle] of [[-14,-23,-.48],[1,-31,.08],[15,-24,.56]]){
  c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(x*.65,-12,x,y);c.stroke();
  c.fillStyle='#e6c777';c.beginPath();c.ellipse(x,y,3.7,7.6,angle,0,Math.PI*2);c.fill();c.stroke();
 }
}
export function drawPasture(c,item,time){
 c.save();c.translate(item.x,item.y);c.lineCap='round';c.lineJoin='round';
 if(item.type==='wild-ox'){
  drawLivestock(c,'ox',0,0,false,time);
 }else if(item.type==='sweet-grass'){
  drawSweetGrass(c);
 }else if(item.type==='pasture-sheep'){
  // 在栏内短距离走动、驻足和换向；羊蹄随步行片段推进。
  const t=time%12;
  const offset=t<3?0:t<5?(t-3)*9:t<9?18:t<11?(11-t)*9:0;
  drawLivestock(c,'sheep',offset,0,t>=3&&t<5||t>=9&&t<11,time);
 }else{
  const front=item.type==='pasture-front';c.translate(0,front?-52:52);
  for(const [x1,y1,x2,y2] of PEN_RAILS.filter((_,i)=>front?i>=3:i<3)){
   for(const h of [10,24]){c.beginPath();c.moveTo(x1,y1-h);c.lineTo(x2,y2-h);c.lineWidth=7;c.strokeStyle='#705b42';c.stroke();c.lineWidth=3;c.strokeStyle='#c79967';c.stroke();}
   const n=Math.ceil(Math.hypot(x2-x1,y2-y1)/45);
   for(let i=0;i<=n;i++){const x=x1+(x2-x1)*i/n,y=y1+(y2-y1)*i/n;c.fillStyle='#bd9565';c.strokeStyle='#625b41';c.lineWidth=2;c.beginPath();c.roundRect(x-3,y-31,7,33,2);c.fill();c.stroke();}
  }
 }
 c.restore();
}
