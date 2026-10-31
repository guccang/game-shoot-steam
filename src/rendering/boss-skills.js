// 三招循环的新增特效读取正式危险区，沿用有限平涂、材质描边和有效战斗时钟。
import {oval,poly} from './primitives.js';
import {canvasFont} from './text-style.js';

// 共用技能提示位于原领主标题位置；近身反击窗口保留明确文字。
export function drawBossSkillCue(c,b){
 const a=b.ai;if(!a?.skill||!['windup','recover'].includes(a.phase))return;
 c.save();c.textAlign='center';c.font=canvasFont(13);c.lineWidth=4;c.strokeStyle='#fff6dc';
 const text=a.phase==='windup'?a.skillName+' !':'反击机会';
 c.strokeText(text,b.x,b.y-142);c.fillStyle=a.phase==='windup'?'#a75143':'#315c43';c.fillText(text,b.x,b.y-142);
 if(a.phase==='windup'){
  c.font=canvasFont(10);c.strokeText(a.skillHint,b.x,b.y-125);c.fillStyle='#315c43';c.fillText(a.skillHint,b.x,b.y-125);
 }
 c.restore();
}

// 只接管新几何；原冲锋、羽刃、孢子及重砸继续使用已验证的正式表现。
export function drawBossSkillHazard(c,h,reduced=false){
 if(!['cone','lane','summon'].includes(h.kind)&&h.skill!=='return-tide')return false;
 const warning=h.age<h.warmup,progress=Math.min(1,h.age/h.warmup),active=Math.max(0,h.age-h.warmup);
 const color=h.kind==='cone'?'#ae6548':h.kind==='lane'?'#597e48':h.kind==='summon'?'#698755':'#397f86';
 c.save();c.translate(h.x,h.y);c.lineCap='round';
 if(h.kind==='cone'){
  c.beginPath();c.moveTo(0,0);c.arc(0,0,h.radius,h.angle-h.halfAngle,h.angle+h.halfAngle);c.closePath();
  c.fillStyle=color+(warning?'28':'55');c.fill();c.strokeStyle='#fff6dc';c.lineWidth=5;c.stroke();
  c.setLineDash(warning?[8,6]:[]);c.strokeStyle=color;c.lineWidth=2;c.stroke();c.setLineDash([]);
  if(!warning){
   c.beginPath();c.arc(0,0,h.radius*.78,h.angle-h.halfAngle,h.angle+h.halfAngle);c.strokeStyle='#f6dfb2';c.lineWidth=7;c.stroke();
  }
 }else if(h.kind==='lane'){
  c.beginPath();c.moveTo(0,0);c.lineTo(h.dx*h.length,h.dy*h.length);c.strokeStyle=color+'32';c.lineWidth=(h.radius+12)*2;c.stroke();
  c.setLineDash(warning?[8,6]:[]);c.lineWidth=3;c.strokeStyle=warning?color:'#f6dfb2';c.stroke();c.setLineDash([]);
  if(!warning){
   c.rotate(Math.atan2(h.dy,h.dx));
   for(let i=0;i<7;i++){const x=20+i*(h.length-40)/6;poly(c,[[x-12,9],[x-7,-12],[x+4,-19],[x+13,9]],'#8ba36c','#4d6746',2);}
  }
 }else if(h.kind==='summon'){
  const radius=warning?62+progress*10:72;
  oval(c,0,0,radius,radius*.65,color+'20','#fff6dc',5);
  c.setLineDash(warning?[7,5]:[]);oval(c,0,0,radius,radius*.65,'#00000000',color,2);c.setLineDash([]);
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3+(reduced?0:Math.min(h.age,h.warmup)*.2),x=Math.cos(a)*radius,y=Math.sin(a)*radius*.65;
   oval(c,x,y,7,4,'#e8df9f',color,1.8);
  }
  if(warning){c.beginPath();c.ellipse(0,0,46,30,0,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);c.strokeStyle='#d5b75e';c.lineWidth=4;c.stroke();}
 }else{
  // 回潮预警标出起始环与最终内圈，箭头向内；实线只跟随当前有伤害的环。
  const end=h.radius+h.speed*h.duration,radius=warning?h.radius:h.radius+active*h.speed;
  if(warning){
   c.setLineDash([8,7]);oval(c,0,0,h.radius,h.radius,'#00000000',color,2);oval(c,0,0,end,end,'#00000000',color+'99',2);c.setLineDash([]);
   for(let i=0;i<8;i++){
    c.save();c.rotate(i*Math.PI/4);const x=h.radius-32-progress*18;
    poly(c,[[x+10,-7],[x,0],[x+10,7]],'#fff6dc',color,2);c.restore();
   }
  }else{
   oval(c,0,0,radius,radius,'#00000000',color+'40',h.width+24);
   oval(c,0,0,radius,radius,'#00000000','#d4efdf',h.width);
   oval(c,0,0,radius,radius,'#00000000',color,2);
  }
 }
 c.restore();return true;
}
