// 地下矿物团子采用原团子软体，晶盾、钻冠、炉口和双矿锤独立连接。
import {MINE_SPECIALS} from '../config/mine-specials.js';
import {dumplingPose} from '../combat/dumpling-motion.js';
import {drawDumplingBody} from './dumpling-body.js';
import {oval,poly,box} from './primitives.js';
const ink='#365a47';
// 晶体棱面共用左上亮面及森林绿外轮廓，不添加额外位图缓存。
function crystal(c,x,y,w,h,color){poly(c,[[x,y-h],[x+w,y-h*.55],[x+w*.65,y],[x-w*.65,y],[x-w,y-h*.55]],color,ink,1.8);poly(c,[[x,y-h],[x,y-2],[x-w*.65,y],[x-w,y-h*.55]],'#d4dfbd');}
// 预警落点从实际锁点读取，圈、射线与冲刺方向不会追着玩家改动。
export function drawMineSpecial(c,a,reduced=false){
 const p=MINE_SPECIALS[a.kind];if(!p)return false;if(a.hp<=0&&!a.death)return true;
 const boss=a.kind==='coreking',t=reduced?0:a.clock||0,pose=dumplingPose({...a,type:'enemy',species:'slime'},reduced),wind=a.phase==='windup',pulse=wind?Math.max(0,1-a.timer/p.windup):0;
 if(wind){c.save();c.strokeStyle='#cf9866';c.lineWidth=2;c.setLineDash([6,5]);c.beginPath();if(a.move==='slam')c.arc(a.aimX,a.aimY,boss?62:42,0,Math.PI*2);else if(a.move==='ring')c.arc(a.x,a.y,80+pulse*30,0,Math.PI*2);else{c.moveTo(a.x,a.y);c.lineTo(a.aimX,a.aimY);}c.stroke();c.restore();}
 c.save();c.translate(a.x,a.y);if(a.hp<=0)c.globalAlpha=Math.max(0,a.death/.6);
 oval(c,0,4,p.width*.9,8,'#465c4930');
 const b=drawDumplingBody(c,{width:p.width,height:p.height,color:p.color,accent:'#e3dfb8',motion:Math.sin(t*2)*.65,pose});
 if(a.kind==='crystalguard'){for(const s of [-1,1])crystal(c,s*(p.width-2),b.top+32+Math.sin(t*2+s)*2,10,36,'#8dbeb4');crystal(c,0,b.top+4,8,18,'#aacfc5');}
 if(a.kind==='coalspark'){box(c,-18,b.top-4,36,10,3,'#6e7d70',ink,2);oval(c,0,b.top,12,3,'#d49b68',ink,1);for(const s of [-1,1])oval(c,s*7,b.top-8-Math.sin(t*3+s)*3,4,6,'#e4bc7c',ink,1);}
 if(a.kind==='drill'){poly(c,[[-15,b.top+5],[0,b.top-28-pulse*6],[15,b.top+5]],'#b8c3ae',ink,2);for(let i=0;i<3;i++){const y=b.top-i*7;const sway=Math.sin(t*7+i)*3;c.beginPath();c.moveTo(-12+i*3,y+2);c.quadraticCurveTo(sway,y+6,12-i*3,y-2);c.strokeStyle=ink;c.lineWidth=2;c.stroke();}}
 if(boss){
  for(const s of [-1,0,1])crystal(c,s*19,b.top+8,11,s===0?38:26,'#98bdb2');
  for(const s of [-1,1]){const lift=pulse*22+Math.sin(t*2+s)*3,x=s*(p.width+13),y=b.top+40-lift;c.strokeStyle=ink;c.lineWidth=6;c.beginPath();c.moveTo(s*(p.width-4),b.top+48);c.quadraticCurveTo(s*54,b.top+62,x,y);c.stroke();box(c,x-14,y-17,28,25,5,'#a9b5a0',ink,2);crystal(c,x,y-8,7,17,'#d2d7ad');}
  oval(c,0,b.top+53,12,13,'#e2d295',ink,2);crystal(c,0,b.top+63,7,21,a.hp<a.maxHp/2?'#e7b574':'#a8d5bf');
 }
 const name=boss?`矿心团王·${a.depth||1}层`:p.name;
 const width=boss?100:42,top=b.top-(boss?44:32);box(c,-width/2,top,width,5,2,ink);box(c,-width/2+1,top+1,(width-2)*Math.max(0,a.hp/(a.maxHp||p.hp)),3,1,'#e4cb8d');
 c.font=boss?'bold 13px sans-serif':'11px sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#f0ebd1';c.strokeText(name,0,top-6);c.fillStyle=ink;c.fillText(name,0,top-6);c.restore();return true;
}
