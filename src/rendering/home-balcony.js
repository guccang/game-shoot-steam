// 阳台复用正式营地合成器；仅改变观察点，室内猫猫与栏杆独立使用近景比例。
import {worldPointToView} from '../world/view-projection.js';
import {HOME_BALCONY,HOME_DIRECTIONS} from '../config/home-construction.js';
import {cottageFloor} from '../config/cottage.js';
import {RANGER_COTTAGE} from '../world/workshop.js';
import {nearest,WORLD} from '../world/coordinates.js';
import {CombatCamera} from './camera.js';
import {StoryCamera} from './story-camera.js';
import {box,oval} from './primitives.js';
import {drawCat} from './characters.js';
import {PLAYER_SCALE} from '../combat/recoil.js';
import {calendarView} from '../world/living-calendar.js';

// 所选朝向始终向屏幕上方；右侧轴与前方轴正交，以小屋为起点只取向外的半空间。
export function homeBalconyView(room,width,height){
 const side=HOME_DIRECTIONS[room.balcony],floor=cottageFloor(room),anchor=nearest(RANGER_COTTAGE,room.outside||RANGER_COTTAGE);
 const right={x:-side.dy,y:side.dx},forward={x:side.dx,y:side.dy},near=100;
 // 高楼拉远但不跨过完整循环世界，避免再次看到同一营地；方向变换不增加缓存范围。
 const lateral=side.dx?WORLD.height:WORLD.width,depth=side.dx?WORLD.width:WORLD.height;
 const zoom=Math.max(width/(lateral-400),height/(depth-near-400),.72/(1+.24*Math.log2(floor+1)));
 const span=width/zoom,reach=height/zoom,center={x:anchor.x+side.dx*(near+reach/2),y:anchor.y+side.dy*(near+reach/2)};
 const worldW=Math.abs(right.x)*span+Math.abs(side.dx)*reach,worldH=Math.abs(right.y)*span+Math.abs(side.dy)*reach;
 return {x:center.x-worldW/2,y:center.y-worldH/2,w:worldW,h:worldH,width,height,zoom,anchor,center,side:room.balcony,floor,right,forward,near};
}
// 同一投影用于裁切、脚底排序与实机检查，不能用原地图的y坐标判断前后。
export function balconyProject(view,point){
 return worldPointToView(view,point);
}
// 远景地面直接使用正交基投影，不旋转或拉伸角色动画帧。
export function balconyWorldTransform(c,view){
 c.translate(view.width/2,view.height+view.near*view.zoom);c.scale(view.zoom,view.zoom);
 c.transform(view.right.x,-view.forward.x,view.right.y,-view.forward.y,0,0);c.translate(-view.anchor.x,-view.anchor.y);
}
// 将局部形体恢复直立，世界脚底位置与地面朝向保持一致。
export function balconyUpright(c,view,point){
 c.translate(point.x,point.y);c.transform(view.right.x,view.right.y,-view.forward.x,-view.forward.y,0,0);c.translate(-point.x,-point.y);
}
// 自家房屋和身后物件均不进入阳台实体绘制；边缘留量仅供前方高树伸入画面。
export function balconyObjectVisible(view,item){
 if(item.type==='player'||item.kind==='cottage'&&!item.workshop)return false;
 const dx=item.x-view.anchor.x,dy=item.y-view.anchor.y;
 return dx*view.forward.x+dy*view.forward.y>=view.near;
}

// 观察代理共享真实建筑、树木、作物、居民和停放车辆，私有镜头及玩家副本防止污染战斗坐标。
export function balconySceneGame(game,view){
 return Object.assign(Object.create(Object.getPrototypeOf(game)),game,{cottage:null,balconyScene:{view},player:{...game.player,...view.anchor},vehicle:{...game.vehicle,active:false},mainlineSpeech:null,mainlineRoute:null,cottageEntry:null,vehicleBoarding:null,parking:null});
}

// 原绘制器的缓存可复用，派生镜头和绘制状态留在代理；返回室内或营地不会发生镜头跳变。
export function drawHomeBalcony(renderer,game){
 const {c,width:w,height:h,dpr}=renderer,night=calendarView(game.progress.living.calendar).id==='night',zoom=Math.min((w-24)/HOME_BALCONY.width,1.2,(h-235)/HOME_BALCONY.height),x=(w-HOME_BALCONY.width*zoom)/2,y=h-125-HOME_BALCONY.height*zoom;
 const scenicHeight=y+35*zoom,view=homeBalconyView(game.cottage,w,scenicHeight),scene=balconySceneGame(game,view);
 const outdoor=renderer.balconyRenderer??=Object.assign(Object.create(renderer),{camera:new CombatCamera(),storyCamera:new StoryCamera(),sceneNpcContinuity:null,profiler:null});
 // 景色止于远侧栏杆，平台下面不再透出俯视地图；共享原画布，无额外全屏纹理。
 c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle=night?'#29483f':'#4e6856';c.fillRect(0,0,w,h);
 c.save();c.beginPath();c.rect(0,0,w,scenicHeight);c.clip();outdoor.height=scenicHeight;outdoor.width=w;
 outdoor.light=renderer.light;outdoor.tone=renderer.tone;outdoor.game=scene;outdoor.draw(scene);c.restore();renderer.balconyView=view;
 renderer.cottageView={x,y,zoom,clip:{x,y,width:HOME_BALCONY.width*zoom,height:HOME_BALCONY.height*zoom}};
 renderer.view=view;
 c.save();c.setTransform(dpr,0,0,dpr,0,0);c.translate(x,y);c.scale(zoom,zoom);
 oval(c,240,222,230,16,'#213d3940');
 box(c,8,22,464,207,8,night?'#8e8064':'#c8a879','#385e4a',3);
 box(c,16,31,448,186,4,night?'#ad9671':'#e4c798','#6b7953',2);
 for(let yy=44;yy<215;yy+=22){c.strokeStyle='#8d795c66';c.lineWidth=1;c.beginPath();c.moveTo(18,yy);c.lineTo(462,yy);c.stroke();}
 // 远侧栏杆先画，猫猫的真实连续帧再按脚底绘制，近侧门口保留通路。
 for(let xx=22;xx<470;xx+=32)box(c,xx,8,5,34,2,'#dac497','#47634d',1.5);
 box(c,12,5,456,9,3,night?'#c4b48b':'#f1deb1','#385e4a',2);
 for(const xx of [14,459]){box(c,xx,12,7,205,3,'#d6bd90','#385e4a',2);for(let yy=50;yy<215;yy+=37)box(c,xx-2,yy,11,14,2,'#e8d4a7','#526c50',1.5);}
 box(c,205,191,70,27,5,'#8eab86','#47684f',1.5);c.textAlign='center';c.font='bold 13px sans-serif';c.fillStyle='#304e3f';c.fillText('回到屋内',240,210);
 drawCat(c,game.player.x,game.player.y,game.progress.hero,game.player.angle,PLAYER_SCALE,0,0,null,renderer.reduced.matches?.35:1,null,0,false,false,game.player.bodyAnimation,0,null,0,true);
 for(const [xx,ww] of [[14,183],[283,183]])box(c,xx,216,ww,10,3,'#ddc597','#385e4a',2);
 c.restore();
 // 罗盘说明对应真实世界方位，避免把方向切换误认成随机背景。
 c.save();c.setTransform(dpr,0,0,dpr,0,0);box(c,14,86,Math.min(w-28,280),34,9,night?'#d3c8a5':'#fff4ce','#527357',1.5);c.fillStyle='#315641';c.font='bold 12px sans-serif';c.textAlign='left';c.fillText(`第 ${view.floor+1} 楼 · 朝${HOME_DIRECTIONS[view.side].name}眺望`,25,108);c.restore();
}
