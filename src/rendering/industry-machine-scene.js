// 手机工厂操作台：固定炉体与独立送料、火焰、齿轮、压头，状态完全来自实际批次。
import {box,oval,poly} from './primitives.js';
import {drawResourceIcon} from './resource-icons.js';
import {canvasFont} from './text-style.js';
const EDGE='#365b43';
// 料斗、启动柄与出料台坐标也用于页面命中，手机缩放不改变操作含义。
export const INDUSTRY_SCENE={width:360,height:280,hopper:{x:12,y:88,w:105,h:104},start:{x:132,y:220,w:112,h:48},output:{x:265,y:172,w:83,h:92}};
// 传动轮只转动自身，轮缘与辐条共同表达旋转，不旋转整座设备。
function gear(c,x,y,r,phase){c.save();c.translate(x,y);c.rotate(phase);for(let i=0;i<10;i++){c.rotate(Math.PI/5);box(c,-3,-r-4,6,9,1,'#b2bb91',EDGE,1.4);}oval(c,0,0,r,r,'#d2bf88',EDGE,2);for(let i=0;i<4;i++){c.rotate(Math.PI/2);box(c,3,-2,r-5,4,1,'#6f8769');}oval(c,0,0,4,4,'#647d64',EDGE,1.5);c.restore();}
// 货物随独立皮带连续移动；空闲时保留上次姿态，不制造虚假生产。
function belt(c,x,y,w,t,active){box(c,x,y,w,22,8,'#596f59',EDGE,2);for(let k=0;k<5;k++){const px=x+8+(k*18+t*25)%(w-16);box(c,px,y+3,3,14,1,'#a4ad8c');}for(const px of [x+9,x+w-9]){oval(c,px,y+11,6,6,'#c9bb8a',EDGE,1.5);if(active){c.beginPath();c.moveTo(px,y+11);c.lineTo(px+Math.cos(t*4)*4,y+11+Math.sin(t*4)*4);c.strokeStyle=EDGE;c.stroke();}}}
// 画布只有一份；调用者控制像素倍率，所有绘制都在360×280逻辑坐标内。
export function drawIndustryMachineScene(c,{site,recipe,count,loaded=[],job=null,motion={ratio:0,phase:0,running:false},output=0,night=false,reduced=false,hover=false,phase=0}){
 const dark=night,wall=dark?'#72846c':'#dfe7be',floor=dark?'#8c9477':'#e7d6a7',metal=dark?'#8d9e86':'#b7c8a6',active=motion.running,t=reduced?0:job?motion.phase:phase;
 c.clearRect(0,0,360,280);c.save();c.lineJoin=c.lineCap='round';box(c,0,0,360,280,17,floor);box(c,0,0,360,87,17,wall);box(c,0,70,360,20,0,dark?'#586f57':'#a9bc8b');
 // 厂房窗与承重梁降低对比，保持机器为第一视觉焦点。
 box(c,16,15,56,43,6,'#6f8869',EDGE,1.5);box(c,20,19,48,35,4,dark?'#425d68':'#c3ded1');box(c,42,19,4,35,0,'#e5d6a7');box(c,20,34,48,4,0,'#e5d6a7');if(dark)oval(c,59,26,4,4,'#eee4b8');
 for(const y of [112,160,207,260]){c.beginPath();c.moveTo(8,y);c.lineTo(352,y);c.strokeStyle=dark?'#7b856c':'#d4c398';c.lineWidth=1;c.stroke();}
 oval(c,191,205,75,16,'#365b4328');oval(c,58,193,47,11,'#365b4320');
 belt(c,65,166,87,t,active);belt(c,222,188,106,t,active);
 // 左侧料斗与实物预览同层，投料反馈不遮住机器主体。
 poly(c,[[17,119],[106,119],[91,159],[41,159]],hover?'#f4d987':dark?'#9ea78c':'#c8d5ac',EDGE,2.5);poly(c,[[20,119],[33,108],[111,108],[106,119]],'#e8dfba',EDGE,2);box(c,46,159,42,14,3,'#73916e',EDGE,2);
 const inputs=Object.keys(recipe.input);for(const [i,key]of inputs.entries())if(loaded.includes(key)||job)drawResourceIcon(c,key,45+i*37,125,30);
 c.textAlign='center';c.font=canvasFont(12);c.fillStyle=dark?'#f1e8c8':EDGE;c.fillText(hover?'松手投料':'投料口',62,96);
 // 送料在炉体和机架之前绘制，原料进入机器时由实体轮廓自然遮挡。
 if(active&&!reduced){const u=(t*.5)%1;drawResourceIcon(c,inputs[0],103+u*28,159,21);}
 if(site==='refinery'){
  // 炉身、烟囱、窥火窗和导流口各有固定结构；火焰单独变化。
  box(c,132,55,110,144,12,dark?'#9a886d':'#bc9d75',EDGE,2.5);box(c,146,30,27,33,3,metal,EDGE,2);box(c,139,25,40,11,3,'#dfd0a1',EDGE,2);
  for(let y=72;y<190;y+=23){c.beginPath();c.moveTo(137,y);c.lineTo(237,y);c.strokeStyle=dark?'#756e57':'#9b825e';c.lineWidth=1;c.stroke();}
  box(c,145,101,84,79,12,'#dfc28d',EDGE,2);box(c,152,108,70,65,10,'#304c3b',EDGE,2);
  if(active){for(let i=0;i<4;i++){const x=158+i*15,h=23+(reduced?4:Math.sin(t*5+i)*9);poly(c,[[x-3,167],[x,148],[x+6,167-h],[x+13,150],[x+16,167]],i%2?'#f0c676':'#d99b59');}for(let i=0;i<3&&!reduced;i++){const u=(t*.35+i/3)%1;c.globalAlpha=(1-u)*.32;oval(c,159+Math.sin(u*5)*6,23-u*21,5+u*6,4+u*4,'#d3d6bd');}c.globalAlpha=1;}else{box(c,161,153,50,8,3,'#6a6e52');}
  box(c,143,183,89,17,4,metal,EDGE,2);poly(c,[[235,146],[254,146],[254,181],[243,181],[243,157],[235,157]],metal,EDGE,2);oval(c,212,81,12,12,'#f7e9be',EDGE,2);c.beginPath();c.moveTo(212,81);c.lineTo(212+Math.cos(-2.4+motion.ratio*2.7)*8,81+Math.sin(-2.4+motion.ratio*2.7)*8);c.strokeStyle=EDGE;c.lineWidth=2;c.stroke();
 }else{
  // 压床两柱和横梁固定，曲柄带动独立压头，不挤压机器整图。
  box(c,127,188,116,16,4,metal,EDGE,2.5);box(c,137,62,15,130,3,'#7f9a78',EDGE,2);box(c,222,62,15,130,3,'#7f9a78',EDGE,2);box(c,126,45,121,24,5,metal,EDGE,2.5);
  const stroke=!reduced?(1-Math.cos(t*4))*15:0;box(c,180,69,14,40+stroke,3,'#d6c794',EDGE,2);box(c,156,104+stroke,63,21,4,'#aabca0',EDGE,2.5);box(c,153,166,67,15,3,'#d0b882',EDGE,2);
  if(active)drawResourceIcon(c,inputs[0],186,157,32);gear(c,237,59,22,t*2);box(c,166,48,39,15,3,'#e7d5a2',EDGE,1.5);
 }
 // 状态灯与出料器只表达真实生产状态，成品数量来自已提交的库存。
 oval(c,338,17,6,6,output?'#e1bd63':active?'#a8c781':'#7e8f76',EDGE,1.5);c.fillStyle=dark?'#f1e8c8':EDGE;c.textAlign='right';c.font=canvasFont(12);c.fillText(job?(motion.remaining?'运转中':'正在保存产物'):output?'成品可取':'等待投料',326,21);
 if(active&&!reduced&&motion.ratio>.45){const u=(t*.5)%1;drawResourceIcon(c,recipe.output,244+u*63,181,25);}
 box(c,271,205,73,39,5,dark?'#a18d67':'#d8bd86',EDGE,2);box(c,267,202,81,10,3,'#e9d39d',EDGE,2);if(output){drawResourceIcon(c,recipe.output,305,190,39);c.fillStyle=EDGE;c.font=canvasFont(13);c.textAlign='center';c.fillText('×'+output,307,235);}
 // 细进度轨由实际已耗时填充；启动按钮与产物命中区由DOM提供无障碍语义。
 box(c,130,210,116,5,2,dark?'#566b54':'#b1bd91');if(job)box(c,130,210,Math.max(3,116*motion.ratio),5,2,'#e5ba62');
 c.restore();
}
