// 野外家具、竿身、鱼线、浮漂及鱼尾分层绘制，全部使用正式世界坐标与动作时钟。
import {nearest} from '../world/coordinates.js';
import {FISH_SPECIES,OUTDOOR_RULES} from '../config/outdoors.js';
const ink='#315c43',cream='#f6e6b6';
// 钓鱼镜头为底部完整操作条预留空间，短屏仍同时看清猫手、竿梢和真实落漂点。
export function outdoorFishingView(game,normal,width,height){
 const f=game.fishing;if(!f)return normal;
 const p=game.player,water=nearest(f.shore.water,p),top=game.cottage?.kind==='mine'?86:136,space=Math.max(80,height-top-(game.cottage?.kind==='mine'?(height<500?220:310):320));
 const zoom=Math.min(normal.zoom,(width-36)/(Math.abs(water.x-p.x)+110),space/(Math.abs(water.y-p.y)+95));
 return {...normal,zoom,w:width/zoom,h:height/zoom,x:(p.x+water.x)/2-width/zoom/2,y:(p.y-27+water.y)/2-(top+space/2)/zoom};
}
// 圆角物件共用清晰描边，夜晚由场景统一调色，营灯保留局部暖光。
function box(c,x,y,w,h,color,r=4){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();c.stroke();}
// 有限平涂多边形保留帐篷布面的结构，不使用整图旋转模拟风摆。
function poly(c,points,color){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();c.stroke();}
// 营地组件各自进入深度队列，猫猫可以从桌椅、帐篷和前侧天幕杆之间走过。
export function outdoorObjects(game){
 const camp=game.progress.outdoors?.camp;if(!camp||camp.mapId!==game.mapId||game.realm||game.story)return [];
 const parts=camp.kit?[['tent',-52,-12],['canopy',48,-15],['table',45,8],['chair',20,35],['chair',83,35],['stove',70,-2],['cooler',-8,26],['lamp',-6,-17]]:[['cot',-30,0],['table',30,0],['lamp',0,-20]];
 return parts.map(([part,dx,dy])=>({type:'outdoor-camp',part,x:camp.x+dx,y:camp.y+dy,depthOffset:part==='canopy'?44:0}));
}
// 脚底投影和草地垫先于人物绘制，不烘焙成不透明地板。
export function drawOutdoorGround(c,game,view,night=0){
 const camp=game.progress.outdoors?.camp;if(!camp||camp.mapId!==game.mapId||game.realm||game.story)return;
 const p=nearest(camp,game.player);
 c.save();c.translate(p.x,p.y);c.strokeStyle=ink;c.lineWidth=1.8;c.fillStyle=`rgba(38,67,47,${.12+night*.06})`;c.beginPath();c.ellipse(8,12,112,55,0,0,Math.PI*2);c.fill();
 poly(c,[[-91,-16],[-15,-16],[0,45],[-83,45]],'#b7bd87');c.restore();
}
// 帐篷、天幕、桌椅与炉具各有独立剪影；天幕局部摆动只影响布边。
export function drawOutdoorObject(c,item,game,night=0){
 c.save();c.translate(item.x,item.y);c.strokeStyle=ink;c.lineWidth=2.3;c.lineJoin='round';c.lineCap='round';
 const t=game.time||0;
 if(item.part==='tent'){
  poly(c,[[-42,20],[-10,-62],[37,-42],[49,25]],'#899c6d');poly(c,[[-42,20],[-10,-62],[24,25]],cream);
  poly(c,[[-26,21],[-8,-28],[11,23]],'#3d6650');poly(c,[[-8,-28],[2,18],[12,23]],'#d4bd83');
  c.beginPath();c.moveTo(-40,19);c.lineTo(-51,32);c.moveTo(48,24);c.lineTo(60,33);c.stroke();
  box(c,2,-17,15,13,'#c9d6ad',2);c.fillStyle=cream;c.fillRect(8,-13,2,6);
 }else if(item.part==='canopy'){
  const sway=Math.sin(t*.8)*1.8;c.globalAlpha=worldDistanceLocal(game.player,item)<70?.62:1;
  for(const [x,y] of [[-46,21],[48,23]]){c.beginPath();c.moveTo(x,y);c.lineTo(x,-53);c.stroke();}
  poly(c,[[-49,-53],[-13,-73],[52,-54+sway],[47,-30],[-40,-32+sway]],'#d7d49b');
  c.beginPath();c.moveTo(-13,-73);c.lineTo(8,-33);c.stroke();
 }else if(item.part==='table'){box(c,-24,-20,48,27,'#d9bd83');for(const x of [-18,18]){c.beginPath();c.moveTo(x,7);c.lineTo(x,18);c.stroke();}c.strokeStyle='#a58c59';c.beginPath();c.moveTo(-20,-8);c.lineTo(20,-8);c.stroke();box(c,-12,-16,9,8,cream,2);}
 else if(item.part==='chair'){poly(c,[[-13,-23],[11,-23],[14,-2],[-11,-2]],'#8da580');box(c,-12,-1,26,11,'#b9c68c',2);c.beginPath();c.moveTo(-12,9);c.lineTo(10,23);c.moveTo(13,9);c.lineTo(-8,23);c.stroke();}
 else if(item.part==='stove'){box(c,-10,-6,23,12,'#7a9182',3);box(c,-7,-19,17,13,'#c8d1ac',4);c.beginPath();c.moveTo(-7,-17);c.lineTo(10,-17);c.stroke();c.strokeStyle='#e6e3cd';c.globalAlpha=.5;c.beginPath();c.moveTo(0,-23);c.quadraticCurveTo(Math.sin(t*2)*5,-31,2,-38);c.stroke();}
 else if(item.part==='cooler'){box(c,-15,-14,31,24,'#8aafa2');box(c,-17,-17,35,7,cream,3);c.beginPath();c.moveTo(-6,-3);c.lineTo(7,-3);c.stroke();}
 else if(item.part==='cot'){box(c,-40,-14,77,31,'#a3ae83',7);box(c,-35,-10,17,22,cream);c.beginPath();c.moveTo(-31,18);c.lineTo(-31,26);c.moveTo(30,18);c.lineTo(30,26);c.stroke();}
 else if(item.part==='lamp'){
  if(night>.1){c.fillStyle=`rgba(255,220,128,${night*.16})`;c.beginPath();c.ellipse(0,0,48,32,0,0,Math.PI*2);c.fill();}
  c.beginPath();c.moveTo(0,12);c.lineTo(0,-51);c.quadraticCurveTo(15,-61,17,-40);c.stroke();box(c,10,-40,15,21,'#f8d685',4);box(c,8,-44,19,5,'#718b68',2);
 }c.restore();
}
// 已映射到同一屏幕镜像的局部距离只用于透明度，不参与业务碰撞。
function worldDistanceLocal(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
// 鱼尾逐节摆动而非旋转整张图片，鱼影和上岸实体使用同一形体。
export function drawOutdoorFish(c,x,y,angle,time,color,scale=1,appearance=null){
 const length=appearance?.bodyLength||14,height=appearance?.bodyHeight||6,fin=appearance?.fin||0,tail=Math.sin(time*9)*3;
 c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);c.strokeStyle=ink;c.lineWidth=1.4;
 // 尾鳍单独摆动；躯干、背鳍和触须保持各自结构，不拉伸整张鱼图。
 poly(c,[[-length+3,0],[-21,-7+tail],[-18,tail],[-21,7+tail]],color);
 c.fillStyle=color;c.beginPath();c.ellipse(0,0,length,height,0,0,Math.PI*2);c.fill();c.stroke();
 poly(c,fin===1?[[4,-height+2],[-2,-11],[-9,-height+2]]:fin===2?[[5,-height+2],[0,-10],[-4,-7],[-8,-10],[-11,-height+2]]:[[0,-height+2],[-6,-10],[-10,-height+2]],color);
 if(appearance){c.lineWidth=.8;c.globalAlpha=.6;
  if(appearance.pattern===0){for(let i=-6;i<5;i+=5){c.beginPath();c.arc(i,0,1.1,0,7);c.fillStyle=ink;c.fill();}}
  else if(appearance.pattern===1){for(let i=-6;i<5;i+=5){c.beginPath();c.moveTo(i,-height*.6);c.lineTo(i+2,height*.6);c.stroke();}}
  else{c.beginPath();c.moveTo(-length*.6,1);c.lineTo(length*.5,1);c.stroke();}c.globalAlpha=1;
  if(appearance.whiskers){c.beginPath();c.moveTo(length-1,2);c.quadraticCurveTo(19,5,18,8);c.moveTo(length-2,3);c.quadraticCurveTo(14,8,11,9);c.stroke();}
  if(appearance.lure){c.beginPath();c.moveTo(6,-height);c.quadraticCurveTo(12,-12,16,-9);c.stroke();c.fillStyle='#eee6ab';c.beginPath();c.arc(16,-9,1.5,0,7);c.fill();}
 }
 c.fillStyle=ink;c.beginPath();c.arc(length*.6,-1,1.3,0,7);c.fill();c.restore();
}
// 钓线连接真实手部与弯曲竿梢，浮漂试探、黑漂、溜鱼和出水均连续过渡。
export function drawOutdoorFishing(c,game,player,night=0){
 const f=game.fishing,s=game.campSleep;if(!f&&!s)return;
 c.save();c.strokeStyle=ink;c.lineWidth=2;c.lineCap='round';
 if(s){box(c,player.x-17,player.y-6,34,21,'#b7c695',8);c.fillStyle=cream;c.font='bold 18px sans-serif';c.fillText('Z z',player.x+13,player.y-55-Math.sin(s.elapsed*2)*3);c.restore();return;}
 const origin={x:player.x+12,y:player.y-27},target=nearest(f.water||f.shore.water,player),dx=target.x-player.x,dy=target.y-player.y,len=Math.hypot(dx,dy)||1;
 const swing=f.phase==='charging'?-22*f.charge:f.phase==='casting'?Math.sin(Math.min(1,f.elapsed/OUTDOOR_RULES.flightSeconds)*Math.PI)*23:0;
 const fighting=['fight','landed'].includes(f.phase),bend=fighting?f.tension*23:Math.sin(f.clock*1.4)*2;
 const tip={x:origin.x+dx/len*55+f.lean*16-swing,y:origin.y+dy/len*42-28+bend-swing};
 let bob={x:target.x+(fighting?(f.behavior?.motion||0):Math.sin(f.clock*1.5)*2),y:target.y+(fighting?(f.behavior?.depth||0):Math.cos(f.clock*1.2))};
 if(['ready','charging'].includes(f.phase))bob={x:tip.x,y:tip.y+19};
 if(f.phase==='casting'){const q=Math.min(1,f.elapsed/OUTDOOR_RULES.flightSeconds);bob={x:tip.x+(target.x-tip.x)*q,y:tip.y+(target.y-tip.y)*q-Math.sin(q*Math.PI)*48};}
 if(f.phase==='landed')bob={x:player.x+26,y:player.y+10};
 const nibble=f.phase==='nibble'?Math.sin(f.elapsed*18)*3:0,sink=f.phase==='bite'?Math.min(12,f.elapsed*30):0;
 if(!['ready','charging','landed'].includes(f.phase)){
  c.fillStyle='#183d3e';c.globalAlpha=.18;drawOutdoorFish(c,fighting?bob.x:target.x+Math.sin(f.clock)*20,fighting?bob.y+12:target.y+17,fighting&&f.direction<0?Math.PI:Math.sin(f.clock)*.4,f.clock,FISH_SPECIES[f.species]?.color||'#466c64',.82,FISH_SPECIES[f.species]);c.globalAlpha=1;
  c.strokeStyle='#e3f3d5';c.globalAlpha=.5;c.lineWidth=1;for(let i=0;i<2;i++){const r=5+((f.clock*9+i*8)%19);c.beginPath();c.ellipse(bob.x,bob.y,r,r*.36,0,0,7);c.stroke();}c.globalAlpha=1;
 }
 c.strokeStyle=night>.3?'#e4eacb':'#f7f1cd';c.lineWidth=1.1;c.beginPath();c.moveTo(tip.x,tip.y);c.quadraticCurveTo((tip.x+bob.x)/2,(tip.y+bob.y)/2+(fighting?3:18),bob.x,bob.y+sink);c.stroke();
 c.strokeStyle=ink;c.lineWidth=4;c.beginPath();c.moveTo(origin.x,origin.y);c.quadraticCurveTo(origin.x+dx/len*32,origin.y-34,tip.x,tip.y);c.stroke();c.strokeStyle='#c9ad72';c.lineWidth=2;c.stroke();
 c.fillStyle='#e7b269';c.beginPath();c.arc(origin.x,origin.y,4,0,7);c.fill();c.strokeStyle=ink;c.stroke();
 c.beginPath();c.arc(origin.x+4,origin.y+7,5,0,7);c.stroke();c.beginPath();c.moveTo(origin.x+4,origin.y+7);c.lineTo(origin.x+4+Math.cos(f.clock*(f.reeling?20:0))*6,origin.y+7+Math.sin(f.clock*(f.reeling?20:0))*6);c.stroke();
 if(f.phase==='landed')drawOutdoorFish(c,bob.x,bob.y,Math.sin(f.clock*3)*.1,f.clock,FISH_SPECIES[f.species].color,1.15,FISH_SPECIES[f.species]);
 else{c.save();c.translate(bob.x,bob.y+nibble);c.globalAlpha=1-sink/16;c.strokeStyle=ink;c.lineWidth=1.4;box(c,-2,-14+sink,4,11,'#efb572',2);box(c,-3,-5+sink,6,8,cream,3);c.restore();}
 c.restore();
}
