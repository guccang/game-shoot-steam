import {dumplingPose} from '../combat/dumpling-motion.js';
// 芽冠团子王的胶质轮廓与三瓣叶冠；直接读取正式跃迁时钟，不创建表现状态。
import {drawDumplingBody,drawDumplingFace} from './dumpling-body.js';
import {oval,poly,outline} from './primitives.js';
import {bossProfile} from '../config/bosses.js';
import {drawGiantRidge,drawGiantBelly,drawGiantFace} from './horde-giant.js';

// 蓄力压低顶部、起跳升空、落地展开腹沿；局部曲线改变，王冠与软足独立运动。
export function drawDumplingLord(c,b,time,reduced=false){
 const p=bossProfile(b),a=b.ai||{},phase=a.phase||'chase',elapsed=a.elapsed||0;
 const crouch=phase==='windup'?Math.min(1,elapsed/(a.timing?.windup||p.windup)):0;
 const flight=phase==='cast'&&!a.skill?Math.min(1,elapsed/p.leap.duration):0;
 const lift=reduced?0:Math.sin(flight*Math.PI)*p.leap.height;
 const pose=dumplingPose(b,reduced);
 // 落地先压宽再弹高，恢复期延续衰减，避免技能阶段切换时突然还原。
 const since=a.skill?-1:phase==='cast'&&flight===1?elapsed-p.leap.duration:phase==='recover'?p.active-p.leap.duration+elapsed:-1;
 if(a.skill&&phase==='cast'&&!reduced)pose.squash+=.1*Math.sin(elapsed*9)*Math.exp(-elapsed);
 if(!reduced&&since>=0&&since<.75)pose.squash+=.28*Math.cos(since*12)*Math.exp(-since*4);
 const motion=pose.sway;
 c.save();c.translate(0,-lift/(p.scale||1));
 for(const side of [-1,1]){
  const weight=b.campDefense?pose.sway*side:0;
  oval(c,side*(40+weight),-Math.max(0,weight),19+weight,9-weight*.5,'#90a875',outline,2.5);
 }
 const body=drawDumplingBody(c,{width:53,height:86-crouch*13,pose,motion,color:'#9fc576',accent:'#dae8af',face:false,flash:!b.campDefense&&b.flash>0});
 const top=body.top;
 // 团山以矿脊与琥珀腹部形成剪影，普通团子王佩戴三瓣叶冠和胸扣。
 if(b.campDefense){
  drawGiantRidge(c,top,motion);
  drawGiantBelly(c,body,pose);
  drawGiantFace(c,body,pose);
 }else{
  for(const [x,h,lean] of [[-30,25,-8],[0,38,1],[30,25,8]]){
   poly(c,[[x-12,top+4],[x-13+lean,top-h*.65],[x+lean,top-h],[x+12+lean,top-h*.6],[x+12,top+5]],'#718f5c',outline,2.5);
   c.beginPath();c.moveTo(x,top+1);c.lineTo(x+lean,top-h+8);c.strokeStyle='#e4d593';c.lineWidth=2;c.stroke();
  }
  oval(c,0,top+3,45,5,'#e6d394',outline,2);
  drawDumplingFace(c,pose.sway*.5,body.face,18);
  oval(c,-28,body.face+16,7,3,'#d7b987');oval(c,28,body.face+16,7,3,'#d7b987');
  poly(c,[[-16,-12],[0,-22],[16,-12],[0,1]],'#f4dca0',outline,2);
  oval(c,0,-11,5,6,'#90a875',outline,1.5);
 }
 c.restore();
}
