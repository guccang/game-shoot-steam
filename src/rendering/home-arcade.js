// 家园小游戏正式绘制器：真实阳台与原猫复用，飞鸟双翼、枪口、抓钩及矿物分别绘制。
import {drawHomeBalcony} from './home-balcony.js';
import {drawCat} from './characters.js';
import {box,oval,poly} from './primitives.js';
import {arcadeClawPoint} from '../core/home/home-arcade.js';
import {ARCADE_CLAW as C} from '../config/home-arcade.js';
import {calendarView} from '../world/living-calendar.js';
const ink='#365b47';
// 飞鸟主体保持固定比例，近远两侧翼分别绕肩关节展开，受击收翼后下落消散。
function bird(c,b,x,y,scale,reduced){
 c.save();c.translate(x,y);c.scale(scale*b.side,scale);if(b.hit)c.globalAlpha=Math.max(0,b.fall/.5);
 const spread=b.hit?b.fall/.5: .5+.5*Math.sin(b.wing),lift=(reduced?spread*.5:spread)*17;
 poly(c,[[-2,-4],[-15,-10-lift],[-8,0],[3,4]],'#92a28a',ink,1.7);
 poly(c,[[-10,2],[-24,-3],[-20,8],[-9,8]],b.color,ink,1.7);
 oval(c,0,2,b.radius,b.radius*.63,b.color,ink,2);oval(c,8,-4,b.radius*.53,b.radius*.53,b.color,ink,1.8);
 poly(c,[[13,-6],[24,-2],[14,1]],'#e3c17b',ink,1.3);oval(c,11,-6,1.7,1.7,ink);
 poly(c,[[-4,0],[-12,12+lift],[-1,9],[7,1]],b.color,ink,1.8);c.strokeStyle='#f0dbac';c.lineWidth=1.5;c.beginPath();c.moveTo(-4,3);c.lineTo(-9,11+lift*.65);c.stroke();
 if(b.hit)for(let i=0;i<3;i++)oval(c,-16-i*8,(.5-b.fall)*45+i*5,4,1.5,'#f4dfaa');c.restore();
}
// 不规则金块、圆钝岩石和切面宝石使用独立剪影，分值不靠颜色区分。
function mineral(c,item,x=item.x,y=item.y){
 const r=item.radius;oval(c,x+2,y+r*.6,r*.85,4,'#274e3830');
 if(item.kind==='gem'){poly(c,[[x,y-r],[x+r,y-r*.2],[x+r*.65,y+r*.6],[x,y+r],[x-r*.8,y+r*.3],[x-r,y-r*.2]],item.color,ink,2);poly(c,[[x,y-r],[x+r,y-r*.2],[x,y+r],[x-r*.3,y]],'#d7e3c2',ink,1);}
 else if(item.kind==='rock'){oval(c,x,y,r,r*.78,item.color,ink,2);poly(c,[[x-r*.6,y-r*.4],[x,y-r*.65],[x+r*.5,y-r*.3]],'#c2c8a3',ink,1.2);}
 else{poly(c,[[x-r,y+r*.2],[x-r*.7,y-r*.6],[x-r*.1,y-r*.9],[x+r*.65,y-r*.6],[x+r,y+r*.15],[x+r*.5,y+r*.75],[x-r*.5,y+r*.7]],item.color,ink,2);poly(c,[[x-r*.65,y-r*.4],[x,y-r*.65],[x+r*.3,y-r*.2],[x-r*.2,y+r*.1]],'#f0dd94');}
}
// 黄金矿工以同一逻辑端点绘制绳与双爪，携带物绑定钩尖，收回前不冒出得分。
function drawGold(renderer,g,night){
 const {c,width:w,height:h,dpr}=renderer,a=g.cottage.arcade,top=h<500?66:104,bottom=h-(h<500?76:100),scale=Math.min((w-20)/C.width,(bottom-top)/C.height),x=(w-C.width*scale)/2,y=top+(bottom-top-C.height*scale)/2;
 renderer.arcadeView={kind:'gold',x,y,width:C.width*scale,height:C.height*scale,scale};renderer.cottageView=null;
 c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle=night?'#29483d':'#46634b';c.fillRect(0,0,w,h);c.save();c.translate(x,y);c.scale(scale,scale);
 box(c,0,0,360,420,12,night?'#7a8168':'#b4b18a',ink,2);
 for(let j=0;j<5;j++){const yy=95+j*65;poly(c,[[2,yy],[90,yy-10],[175,yy+4],[265,yy-5],[358,yy+7],[358,yy+28],[2,yy+20]],night?'#858a6c':'#c2bb91');}
 for(let i=0;i<13;i++){const xx=22+(i*73)%314,yy=110+(i*47)%292;oval(c,xx,yy,3,2,'#52684b44');}
 box(c,10,76,340,11,3,'#b09569',ink,2);for(const xx of [26,330])box(c,xx,86,7,44,2,'#a08862',ink,1.5);
 drawCat(c,79,75,g.progress.hero,0,.78,0,0,null,renderer.reduced.matches?.35:1,null,0,false,false,g.player.bodyAnimation,0,null,0,true);
 box(c,143,18,74,28,5,'#d8c394',ink,2);box(c,167,9,26,18,4,'#9aad87',ink,2);oval(c,C.x,38,12,12,'#a29063',ink,2);
 const claw=a.claw||{angle:0,length:24,phase:'swing',caught:null},p=arcadeClawPoint(claw);
 c.strokeStyle='#efe0b0';c.lineWidth=4;c.beginPath();c.moveTo(C.x,C.y);c.lineTo(p.x,p.y);c.stroke();c.strokeStyle=ink;c.lineWidth=1.2;c.stroke();
 for(const item of a.items)if(!item.removed&&item.id!==claw.caught)mineral(c,item);
 const caught=a.items.find(i=>i.id===claw.caught);if(caught)mineral(c,caught,p.x,p.y+11);
 c.save();c.translate(p.x,p.y);const closed=!!caught;for(const side of [-1,1]){c.strokeStyle=ink;c.lineWidth=6;c.beginPath();c.moveTo(0,-5);c.lineTo(side*(closed?10:15),7);c.lineTo(side*(closed?5:18),15);c.stroke();c.strokeStyle='#c6d0b2';c.lineWidth=3;c.stroke();}oval(c,0,-3,4,4,'#e7d395',ink,1);c.restore();
 c.restore();
}
// 飞鸟叠加在当前朝向的真实阳台远景中，枪械由阳台内原猫的正式操枪路径绘制。
export function drawHomeArcade(renderer,g){
 const a=g.cottage.arcade,{c,width:w,height:h,dpr}=renderer,night=calendarView(g.progress.living.calendar).id==='night';
 if(a.kind==='gold')drawGold(renderer,g,night);
 else{
  drawHomeBalcony(renderer,g);const v=renderer.cottageView,top=h<500?66:104,bottom=v.y-10,view={kind:'birds',x:16,y:top,width:w-32,height:Math.max(50,bottom-top)};renderer.arcadeView=view;
  c.save();c.setTransform(dpr,0,0,dpr,0,0);c.beginPath();c.rect(view.x,view.y,view.width,view.height);c.clip();
  // 轻色帷幕仅降低真实远景对比，让运动目标仍可辨，地表建筑与朝向保留。
  c.fillStyle=night?'#294b3b35':'#e4e4ad30';c.fillRect(view.x,view.y,view.width,view.height);
  for(const b of a.birds)bird(c,b,view.x+b.x/360*view.width,view.y+b.y/240*view.height,Math.max(.75,view.width/360),renderer.reduced.matches);
  for(const t of a.traces){const x=view.x+t.x/360*view.width,y=view.y+t.y/240*view.height;c.strokeStyle='#f9e5aa';c.lineWidth=2;c.beginPath();c.arc(x,y,8+(1-t.life/.14)*7,0,Math.PI*2);c.moveTo(x-12,y);c.lineTo(x+12,y);c.moveTo(x,y-12);c.lineTo(x,y+12);c.stroke();}c.restore();
  if(a.traces.length){const t=a.traces.at(-1);c.save();c.setTransform(dpr,0,0,dpr,0,0);c.strokeStyle='#f4dc963f';c.lineWidth=1;c.beginPath();c.moveTo(v.x+240*v.zoom,v.y+145*v.zoom);c.lineTo(view.x+t.x/360*view.width,view.y+t.y/240*view.height);c.stroke();c.restore();}
 }
 renderer.arcadeReview={kind:a.kind,phase:a.phase,night,birds:a.birds.map(b=>({id:b.id,wing:b.wing,hit:b.hit})),claw:a.claw?{...a.claw}:null,originalCat:true,newBitmapBytes:0};
}
