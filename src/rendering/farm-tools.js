// 农具主体与菜单图标共用绘制，电锯直接复用正式武器与独立操枪接口。
import {drawWeapon,drawRiderWeapon} from './characters.js';
import {farmToolPose,FARM_ACTION_TIMING} from '../config/farm-tools.js';
import {farmWorking} from '../core/farm.js';
import {nearest} from '../world/coordinates.js';
import {effectiveWeapon} from '../config/weapon-mods.js';
import {box,oval,poly} from './primitives.js';
import {drawWaterCan,drawWatering} from './farm-water-tool.js';
const edge='#435d48',wood='#b48752',metal='#aebfb6';

// 木柄有弧度和包缠握位，钢片呈厚面；刃口局部坐标与动作采样共用。
export function drawFarmHoe(c){
 c.save();c.lineJoin='round';c.lineCap='round';
 c.strokeStyle=edge;c.lineWidth=7;c.beginPath();c.moveTo(-10,2);c.quadraticCurveTo(10,-3,33,-2);c.stroke();
 c.strokeStyle=wood;c.lineWidth=4;c.stroke();c.strokeStyle='#e2c18b';c.lineWidth=1.2;c.beginPath();c.moveTo(-8,0);c.quadraticCurveTo(9,-3,28,-3);c.stroke();
 box(c,-9,-2,13,7,3,'#6b7755',edge,1.2);for(let x=-6;x<3;x+=3){c.strokeStyle='#b4bc89';c.lineWidth=1;c.beginPath();c.moveTo(x,-1);c.lineTo(x-1,4);c.stroke();}
 poly(c,[[27,-7],[40,-5],[43,0],[40,13],[26,10],[28,2]],metal,edge,2.1);
 poly(c,[[40,-5],[43,0],[40,13],[37,11],[39,0]],'#778f85',null);
 poly(c,[[26,7],[39,10],[40,13],[26,10]],'#e5ebd8',edge,1);
 box(c,25,-5,6,8,2,'#c8ad6b',edge,1.4);oval(c,28,-1,1,1,'#f4dfaa');c.restore();
}

// 镰刀使用弧木柄、护箍和厚背薄刃的月牙钢片，握把与刃口分别辨识。
export function drawFarmSickle(c){
 c.save();c.lineJoin='round';c.lineCap='round';c.strokeStyle=edge;c.lineWidth=8;c.beginPath();c.moveTo(-10,4);c.quadraticCurveTo(9,5,28,0);c.stroke();c.strokeStyle=wood;c.lineWidth=5;c.stroke();
 box(c,-9,0,13,8,3,'#687451',edge,1.3);for(let x=-6;x<3;x+=3){c.strokeStyle='#c3bd87';c.lineWidth=1;c.beginPath();c.moveTo(x,1);c.lineTo(x-1,6);c.stroke();}
 c.fillStyle=metal;c.strokeStyle=edge;c.lineWidth=2.2;c.beginPath();c.moveTo(26,4);c.bezierCurveTo(20,-19,31,-33,54,-28);c.quadraticCurveTo(38,-18,36,-2);c.lineTo(32,9);c.closePath();c.fill();c.stroke();
 c.fillStyle='#e7edda';c.beginPath();c.moveTo(54,-28);c.quadraticCurveTo(38,-18,36,-2);c.lineTo(32,9);c.lineTo(32,-1);c.quadraticCurveTo(34,-19,54,-28);c.fill();
 c.strokeStyle='#718d82';c.lineWidth=2;c.beginPath();c.moveTo(27,2);c.bezierCurveTo(24,-15,31,-27,43,-28);c.stroke();
 box(c,24,-3,8,9,2,'#b5a56c',edge,1.6);oval(c,28,1,1.3,1.3,'#efe0ad');c.restore();
}

// 图标只在初始化和风格切换时绘制，始终调用与手持相同的主体。
export function paintFarmToolIcon(canvas,tool){
 const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.save();c.scale(canvas.width/44,canvas.height/44);
 if(tool==='water'){c.translate(17,23);c.scale(.85,.85);drawWaterCan(c);}
 else if(tool==='saw'){c.translate(15,26);c.rotate(-.38);drawWeapon(c,14,0,0,.34);}
 else if(tool==='sickle'){c.translate(10,33);c.rotate(-.35);c.scale(.66,.66);drawFarmSickle(c);}
 else{c.translate(12,33);c.rotate(-1);c.scale(.82,.82);drawFarmHoe(c);}c.restore();
}

// 小臂和两只手连接木柄，只移动局部关节，猫身体与脚底保持真实动作。
function drawToolArms(c,player,pose){
 c.strokeStyle=edge;c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(player.x+12,player.y-21);c.lineTo(pose.x,pose.y);c.stroke();
 c.strokeStyle='#e7c68f';c.lineWidth=4;c.stroke();
}
// 握点分别贴合尾握把和前段木柄，不能把工具画在没有手的位置。
function drawToolHands(c){oval(c,0,3,4.6,3.6,'#f0cfa0','#775e42',1.2);oval(c,16,2,3.8,3.2,'#f0cfa0','#775e42',1.1);}

// 只在快速切割阶段画短弧线，弧线来自同一把镰刀前几帧的真实刃口轨迹。
function drawCutArc(c,player,target,t){
 if(t<.28||t>.465)return;c.save();c.strokeStyle='#f5ebbbcc';c.lineWidth=3;c.lineCap='round';c.beginPath();
 for(let i=0;i<=6;i++){const p=farmToolPose('harvest',Math.max(.18,t-.065+i*.065/6),player,target).contact;if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}c.stroke();c.restore();
}
// 小量土粒与碎叶只活在接触后的收势阶段，不创建常驻粒子或推动镜头。
function drawFarmImpact(c,action,target,t){
 const age=t-FARM_ACTION_TIMING[action].hit;if(age<0||age>.24)return;
 c.save();c.globalAlpha*=1-age/.24;
 for(let i=0;i<6;i++){const a=i*2.4,dist=6+age*(35+i*5),x=target.x+Math.cos(a)*dist,y=target.y+Math.sin(a)*dist*.5-Math.sin(age/.24*Math.PI)*7;
  if(action==='harvest'){c.strokeStyle=i%2?'#c5cb7e':'#6e9252';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*5,y+Math.sin(a)*3);c.stroke();}
  else oval(c,x,y,2.5,1.6,i%2?'#8d6d48':'#d8b880');
 }c.restore();
}

// 小种袋放在腰侧，三粒种子沿低弧落入田中，不穿过整张猫脸。
function drawSowing(c,player,target,t,active){
 box(c,player.x-23,player.y-23,13,16,4,'#bca16d','#6e6544',1.5);box(c,player.x-24,player.y-24,15,4,2,'#7c9060','#50674b',1);
 const hand={x:player.x+15+(active?Math.sin(Math.min(1,t/.34)*Math.PI)*5:0),y:player.y-17};
 oval(c,hand.x,hand.y,4,3,'#f0cfa0','#775e42',1.2);
 if(active&&t>.12&&t<.42)for(let i=0;i<3;i++){const u=Math.max(0,Math.min(1,(t-.12-i*.025)/.19));if(!u||u>=1)continue;
  oval(c,hand.x+(target.x-hand.x)*u+(i-1)*2,hand.y+(target.y-hand.y)*u-10*Math.sin(u*Math.PI),1.4,2,'#e8d398','#8c7948',.6);
 }
}

// 农活只提供持握姿态和动作时钟，电锯沿用正式武器14及其范围升级部件。
export function drawFarmTool(c,game,player){
 if(!farmWorking(game))return;const work=game.farmWork,job=work.job,t=job?.farmPoseTime??job?.elapsed??0,active=!!job&&t>0;
 // 平整土地复用锄头关节和接触点，作物移除仍由独立事务命中时提交。
 const action=(job?.action==='remove'?'dig':job?.action)||({seed:'plant',harvest:'harvest',saw:'saw',water:'water'}[work.tool]||'dig'),target=job?nearest(job.point,player):{x:player.x+40,y:player.y-10};
 c.save();
 if(action==='saw'){
  const weapon=effectiveWeapon(game.progress,14),actor={...player,recoil:{...player.recoil,flash:active ? .02+t%.08 : 0},walkPhase:player.walkPhase||0};
  drawRiderWeapon(c,actor,game.progress.hero,14,{modChoice:weapon.modChoice,parts:weapon.parts});
  if(active&&t<.95){c.save();c.fillStyle='#d8b880';for(let i=0;i<5;i++){const d=(t*40+i*5)%18;oval(c,target.x+d*(i%2?1:-1),target.y-d*.6,2,1);}c.restore();}
 }else if(action==='plant')drawSowing(c,player,target,t,active);
 else if(action==='water')drawWatering(c,game,player,target,job,t);
 else{
  const pose=farmToolPose(action,t,player,target,active);if(action==='harvest'&&active)drawCutArc(c,player,target,t);
  drawToolArms(c,player,pose);c.save();c.translate(pose.x,pose.y);c.rotate(pose.angle);
  if(action==='dig')drawFarmHoe(c);else drawFarmSickle(c);drawToolHands(c);c.restore();if(active)drawFarmImpact(c,action,target,t);
 }c.restore();
}
