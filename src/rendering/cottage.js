// 小屋正式绘制器：家具、窗景和角色共用局部坐标与脚底排序，无独立预览替身。
import {COTTAGE,COTTAGE_FURNITURE} from '../config/cottage.js';
import {box,oval,poly} from './primitives.js';
import {placedDecor} from '../progression/home-decor.js';
import {drawHomeDecor} from './home-decor.js';
import {drawCat} from './characters.js';
import {PLAYER_SCALE} from '../combat/recoil.js';
import {calendarView} from '../world/living-calendar.js';
// 窗景保持形体一致，昼夜只换天空与小光源，窗帘、窗框分层落在墙前。
function drawWindow(c,x,night,curtain=false){
 box(c,x-33,22,66,57,7,'#b68a5d','#795f49',2);
 box(c,x-27,27,54,44,3,night?'#456878':'#b9d5b2','#54705a',1.5);
 oval(c,x+14,38,6,6,night?'#f1e4ae':'#f4df8a');
 poly(c,[[x-27,64],[x-16,44],[x-5,64],[x+7,48],[x+27,67],[x+27,70],[x-27,70]],night?'#476c59':'#80a574');
 box(c,x-2,27,4,44,0,'#b99160');box(c,x-27,49,54,3,0,'#b99160');
 if(!curtain){poly(c,[[x-36,20],[x-17,20],[x-24,54],[x-35,64]],'#d4b18a','#9a835d',1.5);
 poly(c,[[x+36,20],[x+17,20],[x+24,54],[x+35,64]],'#d4b18a','#9a835d',1.5);}
 box(c,x-38,72,76,7,3,'#e4c491','#876d4d',1.5);
}
// 家具底座与碰撞数据共用，阴影不烘焙到角色层。
export function drawFurniture(c,f,night){
 const {x,y}=f;oval(c,x+4,y+8,f.width/2+3,10,'#4f59402b');
 if(f.id==='bed'){
  box(c,x-33,y-71,66,130,7,'#b78e62','#715e47',2);box(c,x-35,y-73,70,17,6,'#caa572','#715e47',2);
  box(c,x-28,y-54,56,101,6,'#efe1b6','#927f5b',1.5);box(c,x-23,y-50,46,22,8,'#fff0cf','#b2a07c',1);
  box(c,x-28,y-22,56,69,4,'#86a68a','#536f59',1.5);box(c,x-28,y-22,56,15,3,'#a7bd98');
  for(const yy of [y+4,y+26])for(const xx of [x-14,x+12])poly(c,[[xx,yy-4],[xx+4,yy],[xx,yy+4],[xx-4,yy]],'#d9dbad');
  box(c,x-35,y+42,70,13,4,'#c19a68','#715e47',2);
 }else if(f.id==='desk'){
  for(const xx of [x-39,x+36])box(c,xx,y-2,6,29,2,'#946e4b','#665a43',1.5);
  box(c,x-50,y-28,100,42,6,'#c9a778','#766347',2);box(c,x-50,y+8,100,7,2,'#ac8558','#766347',1);
  box(c,x-20,y-21,26,19,2,'#e8dfbb','#7d8a6a',1);c.strokeStyle='#a99b78';c.beginPath();c.moveTo(x-7,y-20);c.lineTo(x-7,y-3);c.stroke();
  oval(c,x+30,y-7,10,4,'#7c7854');box(c,x+28,y-32,4,25,1,'#73846a');poly(c,[[x+17,y-32],[x+24,y-47],[x+36,y-47],[x+43,y-32]],night?'#f2d894':'#d6c197','#7d7853',1.5);
  oval(c,x-36,y-10,5,5,'#ecdfbc','#86734e',1);
 }else if(f.id==='chair'){
  box(c,x-14,y-10,28,22,4,'#bb9668','#756248',2);box(c,x-15,y-27,30,15,3,'#cfb181','#756248',2);
  for(const xx of [x-12,x+8])box(c,xx,y+8,4,9,1,'#8a714f');
 }else if(f.id==='cabinet'){
  box(c,x-33,y-44,66,61,5,'#b79266','#756248',2);box(c,x-37,y-49,74,10,3,'#d1b180','#756248',1.5);
  for(const yy of [y-31,y-8]){box(c,x-27,yy,54,19,3,'#c5a276','#8b714e',1);oval(c,x,yy+9,3,2,'#6d7959');}
  for(let i=0;i<4;i++)box(c,x-24+i*8,y-66,7,16+i%2*3,1,['#84a28b','#d5bf8c','#a3bcb3','#c99378'][i],'#6f7b5d',1);
  box(c,x+12,y-72,18,23,2,'#dfc690','#806c4d',1.5);oval(c,x+21,y-61,5,6,'#809d77');
 }else{
  poly(c,[[x-13,y-12],[x+13,y-12],[x+9,y+10],[x-9,y+10]],'#c49470','#756248',1.5);
  for(const [dx,dy] of [[-10,-24],[8,-31],[0,-42],[12,-19]])oval(c,x+dx,y+dy,10,7,'#8aa774','#506e52',1.5);
 }
}
// 房间在正式游戏画布内等比适配，保留实际连续角色帧和前后遮挡。
export function drawCottage(renderer,g=renderer.game){
 const {c,width:w,height:h,dpr}=renderer,night=calendarView(g.progress.living.calendar).id==='night';
 c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle=night?'#344c46':'#506958';c.fillRect(0,0,w,h);
 const zoom=Math.min((w-20)/360,(h-190)/360,1.5),x=(w-360*zoom)/2,y=Math.max(50,(h-360*zoom)/2-24);
 renderer.cottageView={x,y,zoom};renderer.view={x:0,y:0,w:360,h:360,width:w,height:h,zoom};
 c.save();c.translate(x,y);c.scale(zoom,zoom);
 drawCottageRoom(c,g,{night,reduced:renderer.reduced.matches});c.restore();
}
// 装扮预览与实际小屋调用同一房间绘制器，预览只替换候选布局。
export function drawCottageRoom(c,g,{night=calendarView(g.progress.living.calendar).id==='night',reduced=false}={}){
 const items=g.progress.homeDecor?placedDecor(g.progress.homeDecor):COTTAGE_FURNITURE.slice(1);
 box(c,6,18,354,345,13,'#203d353f');box(c,0,0,360,350,8,night?'#c2b38c':'#e2d1a4','#536c51',3);
 box(c,9,82,342,259,3,night?'#af926f':'#c8a77c','#7f7352',2);
 for(let row=0;row<8;row++){const yy=86+row*32;c.strokeStyle='#a487615a';c.lineWidth=1;c.beginPath();c.moveTo(11,yy);c.lineTo(349,yy);c.stroke();for(let xx=30+(row%2)*48;xx<348;xx+=96){c.beginPath();c.moveTo(xx,yy);c.lineTo(xx,yy+30);c.stroke();}}
 box(c,8,76,344,9,2,'#b0956a','#7d7453',1.5);drawWindow(c,81,night,items.some(i=>i.type==='curtain'&&i.x===81));drawWindow(c,271,night,items.some(i=>i.type==='curtain'&&i.x===271));
 for(const item of items.filter(i=>['wall','curtain','rug'].includes(i.layer)))drawHomeDecor(c,item,night,g.progress.living.calendar);
 // 门槛留空，出口地垫与下方出门按钮共同提示路线。
 box(c,143,320,74,22,4,'#8d9c77','#667d5b',1.5);c.fillStyle='#e5dfb6';c.font='12px sans-serif';c.textAlign='center';c.fillText('出门',180,336);
 for(const item of [COTTAGE_FURNITURE[0],...items.filter(i=>!i.layer||i.layer==='floor'),{id:'player',x:g.player.x,y:g.player.y}].sort((a,b)=>a.y-b.y)){
  if(item.id==='player')drawCat(c,item.x,item.y,g.progress.hero,g.player.angle,PLAYER_SCALE,0,0,null,reduced?.35:1,null,0,false,false,g.player.bodyAnimation,0,null,0,true);
  else if(!item.type||['desk','chair','cabinet','plant'].includes(item.type))drawFurniture(c,{...item,id:item.type||item.id},night);
  else drawHomeDecor(c,item,night,g.progress.living.calendar);
 }
 if(g.cottage.sleep){c.fillStyle=`rgba(34,52,51,${Math.sin(Math.min(1,g.cottage.sleep.elapsed/1.2)*Math.PI)*.65})`;c.fillRect(0,0,360,350);c.fillStyle='#fff0c9';c.font='bold 19px sans-serif';c.fillText('好梦',180,183);}
}
