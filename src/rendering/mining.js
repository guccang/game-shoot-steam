// 地下正式绘制器：矿道、轨道、轮毂、矿锄与真实猫身体分层，不新增位图缓存。
import {MINING as M,MINE_DIRECTIONS,mineCell,mineKey,minePoint,mineOre} from '../config/mining.js';
import {mineTarget,parseKey} from '../core/mining.js';
import {box,oval,poly} from './primitives.js';
import {drawCat} from './characters.js';
import {PLAYER_SCALE} from '../combat/recoil.js';
import {calendarView} from '../world/living-calendar.js';

// 小屋梯井在地板层绘制，入口脚底不设置阻挡，踏步保持独立轮廓。
export function drawBasementHatch(c,night){const {x,y}=M.hatch;drawLadder(c,x,y,night,'地下室 ↓');}
// 地表洞口按真实入口排序，低矮石拱留出中间通道，不生成不可穿越的假山墙。
export function drawMineShaft(c,item,night){
 const {x,y}=item;oval(c,x,y+5,43,16,'#36534244');
 poly(c,[[x-40,y+7],[x-37,y-22],[x-20,y-46],[x+12,y-48],[x+35,y-25],[x+39,y+7]],night?'#6d8272':'#a5ad89','#385d47',2.5);
 poly(c,[[x-24,y+5],[x-22,y-20],[x-9,y-33],[x+12,y-31],[x+24,y-14],[x+24,y+6]],'#314c43','#476447',2);
 box(c,x-19,y-10,38,20,5,'#c9b389','#547153',1.5);for(let i=0;i<3;i++)box(c,x-17,y-6+i*6,34,3,1,'#f1d5a2');
 oval(c,x-26,y-28,14,5,night?'#688466':'#92b07b');label(c,'矿洞 ↓',x,y-56,12);
}
// 共用木梯入口，文字由运行时绘制，不烘焙到静态图片。
function drawLadder(c,x,y,night,text){
 box(c,x-30,y-28,60,48,7,night?'#314a43':'#425d48','#2e523f',2);
 for(let i=0;i<4;i++)box(c,x-22+i*2,y-20+i*9,44-i*4,5,2,'#ceae79','#7d704f',1);
 for(const dx of [-27,23])box(c,x+dx,y-29,4,52,2,'#e8cf98','#506949',1);
 label(c,text,x,y+38,12);
}
// 简洁奶油文字牌统一标注梯口与路线，不遮挡猫的身体。
function label(c,text,x,y,size=12){c.font=`bold ${size}px sans-serif`;c.textAlign='center';const w=c.measureText(text).width+16;box(c,x-w/2,y-14,w,21,5,'#f1e5bd','#4c6b50',1.5);c.fillStyle='#315c43';c.fillText(text,x,y+1);}
// 岩壁保持低频块面；铜矿和晶矿用形状数量区分，避免只靠颜色。
function rock(c,cell,night){
 const {x,y}=minePoint(cell),n=mineOre(cell),s=M.tile;
 box(c,x-s/2,y-s/2,s+1,s+1,0,night?'#405b51':'#657c61');
 poly(c,[[x-29,y-27],[x+16,y-30],[x+29,y-17],[x+27,y+20],[x-18,y+24],[x-30,y+10]],night?'#72816c':'#98a17c','#47674f',2);
 poly(c,[[x-29,y+10],[x-18,y+24],[x+27,y+20],[x+27,y+29],[x-21,y+30],[x-30,y+21]],night?'#526b59':'#738463');
 c.strokeStyle=night?'#9da486':'#bbc09a';c.lineWidth=2;c.beginPath();c.moveTo(x-20,y-20);c.lineTo(x+10,y-24);c.stroke();
 if(n>1)for(let i=0;i<(n===4?3:2);i++){const xx=x-12+i*12,yy=y+Math.abs(i-1)*4;poly(c,[[xx-5,yy+5],[xx-4,yy-8],[xx+2,yy-13],[xx+7,yy-4],[xx+4,yy+7]],n===4?'#b4d5c1':'#d4b078','#42684f',1.5);}
}
// 自动接轨使用相邻格共同端点，枕木和双钢轨分别绘制，转弯保持连通。
function rail(c,cell,m){
 const p=minePoint(cell),neighbors=MINE_DIRECTIONS.filter(d=>m.rails[mineKey({x:cell.x+d.x,y:cell.y+d.y})]);
 for(const d of neighbors.length?neighbors:[MINE_DIRECTIONS[1],MINE_DIRECTIONS[3]]){
  const length=neighbors.length?32:18;c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(d.y,d.x));
  for(let x=0;x<length;x+=12)box(c,x-3,-17,6,34,2,'#9c8058','#4a6248',1);
  for(const y of [-10,10]){box(c,-1,y-2,length+2,4,1,'#c5cfba','#4a6650',1);box(c,0,y-2,length,1,0,'#eef0ce');}c.restore();
 }
 oval(c,p.x,p.y,6,6,'#839a7d','#49674f',1);
}
// 灯笼和路牌落在格子左侧，脚底可自由通行，灯光限制为局部范围。
function decoration(c,cell,type,night){
 const p=minePoint(cell),x=p.x-23,y=p.y+8;oval(c,x+3,y+5,10,4,'#2548383d');
 box(c,x-2,y-31,5,37,2,'#a78b60','#436447',1.5);
 if(type==='lamp'){
  if(night)oval(c,x+6,y-23,21,23,'#ead39b22');
  box(c,x-2,y-35,16,22,4,'#e0ba76','#3d6049',2);box(c,x+2,y-31,8,13,2,night?'#ffe3a0':'#f4d79a');
 }else{poly(c,[[x-12,y-35],[x+12,y-35],[x+22,y-27],[x+12,y-19],[x-12,y-19]],'#e4cc94','#426447',2);c.fillStyle='#476549';c.font='10px sans-serif';c.textAlign='center';c.fillText('矿道',x+2,y-24);}
}
// 车轮按真实行驶距离转动，车厢保持固定轮廓，驾驶员沿用原角色图集。
function cartBody(c,cart,front=false){
 const {x,y}=cart;
 if(!front){oval(c,x+2,y+6,29,11,'#294e3a44');for(const dx of [-23,23]){c.save();c.translate(x+dx,y+3);oval(c,0,0,7,9,'#516c57','#2d5140',2);c.rotate(cart.wheel||0);c.strokeStyle='#b9c2a0';c.lineWidth=2;c.beginPath();c.moveTo(-5,0);c.lineTo(5,0);c.moveTo(0,-6);c.lineTo(0,6);c.stroke();c.restore();}box(c,x-25,y-26,50,29,5,'#7f9b80','#315b43',2);box(c,x-20,y-22,40,20,3,'#3e604b');}
 else{poly(c,[[x-24,y-10],[x+24,y-10],[x+20,y+7],[x-20,y+7]],'#b9c497','#365e45',2);box(c,x-27,y-13,54,6,2,'#dfd6a5','#426247',1.5);oval(c,x,y-1,4,3,'#e4ca83','#5f7553',1);}
}
// 矿锄和手独立于身体，挥动只改变手臂与柄的角度，不变形角色图集。
function pickaxe(c,g){
 const room=g.cottage,p=g.player,work=room.dig?.elapsed||room.shaftWork||0,phase=work?Math.sin(work/M.digSeconds*Math.PI*2):0,d=MINE_DIRECTIONS[room.direction],side=d.x<0?-1:1;
 c.save();c.translate(p.x+side*13,p.y-17);c.rotate(side*(-.35+phase*.65));
 box(c,-2,-27,5,39,2,'#bb9767','#466448',1.5);poly(c,[[-15,-26],[-9,-33],[9,-33],[17,-25],[8,-27],[-8,-27]],'#becbb6','#3c624a',2);
 oval(c,1,0,6,5,'#efc997','#4c684d',1.5);c.restore();
}
// 镜头只绘制可见网格，地图再大也不遍历历史矿道，顶部和底部留给手机操作。
export function drawMining(renderer,g=renderer.game){
 const {c,width:w,height:h,dpr}=renderer,night=calendarView(g.progress.living.calendar).id==='night',top=h<500?124:182,bottom=h-154,zoom=Math.min(1.05,w/360),cx=w/2,cy=(top+bottom)/2;
 renderer.cottageView=null;renderer.mineView={x:g.player.x-cx/zoom,y:g.player.y-cy/zoom,zoom,top,bottom,width:w,height:h};
 const v=renderer.mineView,m=g.progress.mining;
 c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle=night?'#263f38':'#3c5945';c.fillRect(0,0,w,h);
 c.save();c.beginPath();c.rect(0,top,w,Math.max(30,bottom-top));c.clip();c.translate(-v.x*zoom,-v.y*zoom);c.scale(zoom,zoom);
 const first=mineCell({x:v.x-64,y:v.y+top/zoom-64}),last=mineCell({x:v.x+w/zoom+64,y:v.y+bottom/zoom+64});let tiles=0;
 for(let y=first.y;y<=last.y;y++)for(let x=first.x;x<=last.x;x++){
  tiles++;const cell={x,y},key=mineKey(cell),p=minePoint(cell);
  if(!m.dug[key]){rock(c,cell,night);continue;}
  box(c,p.x-32,p.y-32,65,65,0,night?'#9d956f':'#c0b18a');
  if(Math.abs(x)<=1&&Math.abs(y)<=1){box(c,p.x-31,p.y-31,62,62,2,night?'#ad9b70':'#d4bd8b','#887e58',1);for(let j=-16;j<32;j+=16)box(c,p.x-31,p.y+j,62,1,0,'#93856166');}
  else{oval(c,p.x-18,p.y+19,4,2,'#8a89634a');oval(c,p.x+14,p.y-18,3,2,'#e7d5a146');}
  if(m.rails[key])rail(c,cell,m);
 }
 const target=minePoint(mineTarget(g));c.strokeStyle='#f6df9b';c.lineWidth=2;c.setLineDash([6,4]);c.strokeRect(target.x-29,target.y-29,58,58);c.setLineDash([]);
 drawLadder(c,M.home.x,M.home.y,night,'小屋 ↑');
 const entities=[];
 for(let y=first.y;y<=last.y;y++)for(let x=first.x;x<=last.x;x++){const cell={x,y},key=mineKey(cell);if(m.decor[key])entities.push({y:minePoint(cell).y+8,kind:'decor',cell,value:m.decor[key]});}
 for(const key of m.shafts){const p=minePoint(parseKey(key));if(p.x>v.x-80&&p.x<v.x+w/zoom+80&&p.y>v.y+top/zoom-80&&p.y<v.y+bottom/zoom+80)drawLadder(c,p.x,p.y,night,'地面 ↑');}
 for(const cart of m.carts)if(Math.abs(cart.x-g.player.x)<w/zoom&&Math.abs(cart.y-g.player.y)<h/zoom)entities.push({y:cart.y,kind:'cart',cart});
 if(!g.cottage.ride)entities.push({y:g.player.y,kind:'player'});
 for(const e of entities.sort((a,b)=>a.y-b.y)){
  if(e.kind==='decor')decoration(c,e.cell,e.value,night);
  else if(e.kind==='player'){drawCat(c,g.player.x,g.player.y,g.progress.hero,g.player.angle,PLAYER_SCALE,0,0,null,renderer.reduced.matches?.35:1,null,0,false,false,g.player.bodyAnimation,0,null,0,true);pickaxe(c,g);}
  else{cartBody(c,e.cart);if(e.cart.id===g.cottage.ride)drawCat(c,e.cart.x,e.cart.y-8,g.progress.hero,0,PLAYER_SCALE,0,0,null,renderer.reduced.matches?.35:1,null,0,false,false,g.player.bodyAnimation,0,null,0,true);cartBody(c,e.cart,true);}
 }
 const work=g.cottage.dig?g.cottage.dig.elapsed/M.digSeconds:g.cottage.shaftWork/M.shaftSeconds;
 if(work){box(c,g.player.x-23,g.player.y-66,46,6,3,'#345841');box(c,g.player.x-22,g.player.y-65,44*Math.min(1,work),4,2,'#f0d48b');}
 c.restore();renderer.mineReview={tiles,night,cartCount:m.carts.length,toolIndependent:true};
}
// 固定范围小地图显示已挖矿道、轨道、洞口和小屋方向，远处小屋以边缘箭头定位。
export function drawMineMap(canvas,g){
 const c=canvas.getContext('2d'),s=112,scale=5,center=mineCell(g.player),m=g.progress.mining;c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,s,s);box(c,1,1,110,110,12,'#efe3bc','#47694e',2);
 c.save();c.beginPath();c.rect(10,21,92,78);c.clip();
 for(let y=-8;y<=8;y++)for(let x=-9;x<=9;x++){const key=mineKey({x:center.x+x,y:center.y+y});if(m.dug[key])box(c,54+x*scale,58+y*scale,scale,scale,0,m.rails[key]?'#80976c':'#c0b38c');}
 for(const key of m.shafts){const p=parseKey(key),x=56+(p.x-center.x)*scale,y=60+(p.y-center.y)*scale;box(c,x-2,y-2,4,4,1,'#527ca0');}c.restore();
 const dx=-center.x,dy=-center.y,factor=Math.min(1,38/Math.max(1,Math.abs(dx*scale)),32/Math.max(1,Math.abs(dy*scale))),hx=56+dx*scale*factor,hy=60+dy*scale*factor;
 poly(c,[[hx-5,hy],[hx,hy-6],[hx+5,hy],[hx+4,hy+5],[hx-4,hy+5]],'#ddaa62','#42644a',1);
 const d=MINE_DIRECTIONS[g.cottage.direction];c.save();c.translate(56,60);c.rotate(Math.atan2(d.y,d.x));poly(c,[[6,0],[-4,-4],[-2,0],[-4,4]],'#345e46');c.restore();
 c.fillStyle='#315c43';c.textAlign='center';c.font='bold 10px sans-serif';c.fillText('北 ↑',56,14);c.fillText('西',7,62);c.fillText('东',105,62);c.fillText('南',56,107);
}
