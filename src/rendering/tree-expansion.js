// 十种植物共用旧图集脚底与三级平涂，每种独立枝干和树冠结构。
import {oval,poly} from './primitives.js';
import {snowCap} from './winter-art.js';

// 枝条先描边再画木色，分叉与根部保持同一接地坐标。
function limb(c,x,y,tx,ty,w,color,wood='#b99b6a'){
 c.lineCap='round';c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+(tx-x)*.15,ty+18,tx,ty);c.strokeStyle=color('#59684b');c.lineWidth=w+3;c.stroke();c.strokeStyle=color(wood);c.lineWidth=w;c.stroke();
}
// 少量圆叶团叠出连续外轮廓，亮面统一在左上，不生成随机噪纹。
function foliage(c,x,y,rx,ry,color,winter=false){
 c.beginPath();for(let i=0;i<24;i++){const a=i/24*Math.PI*2,r=1+.06*Math.sin(a*6);const px=x+Math.cos(a)*rx*r,py=y+Math.sin(a)*ry*r;i?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.fillStyle=color('#387b54');c.fill();c.strokeStyle=color('#315c43');c.lineWidth=2;c.stroke();c.save();c.clip();oval(c,x-4,y-6,rx*.94,ry*.94,color('#67a85e'));oval(c,x-8,y-ry*.46,rx*.64,ry*.43,color('#a5cb72'));c.restore();if(winter)snowCap(c,x-3,y-ry*.7,rx*.7,6,color);
}
// 羽叶是弧形叶轴和错落小叶，椰树不借用圆冠放大。
function frond(c,x,y,tx,ty,color){
 const dx=tx-x,dy=ty-y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
 c.strokeStyle=color('#315c43');c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+dx*.45,y+dy*.45-10,tx,ty);c.stroke();
 for(let i=1;i<7;i++){const t=i/7,px=x+dx*t,py=y+dy*t-5*Math.sin(t*Math.PI),w=13*(1-t)+3;for(const side of [-1,1]){const ex=px+nx*w*side+dx*.1,ey=py+ny*w*side+dy*.1+3;c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(px+nx*w*side,py+ny*w*side-3,ex,ey);c.quadraticCurveTo(px+dx*.12,py+dy*.12+4,px,py);c.fillStyle=color(side<0?'#82bb7c':'#46976b');c.fill();}}
}
// 正式树图集调用此入口，所有形体都位于旧 128×160 的透明画布内。
export function drawExpandedTree(c,species,variant,color,winter=false){
 const v=variant?1:-1;oval(c,1,4,14,4,color('#314b3952'));
 if(species==='baobab'){
  poly(c,[[-23,4],[-17,-22],[-12,-71],[-5,-91],[9,-91],[15,-70],[17,-23],[25,4],[6,1],[-2,5]],color('#b49b78'),color('#59684b'),2.4);poly(c,[[7,-84],[14,-69],[17,-23],[25,4],[8,1],[3,-32]],color('#8e8063'),null);
  for(const [x,y] of [[-29,-102],[0,-120],[32,-104]]){limb(c,0,-70,x,y,6,color);foliage(c,x,y,21,14,color,winter);}
 }else if(species==='palm'){
  limb(c,-7,3,12+v*3,-105,10,color);for(let i=0;i<8;i++){const t=i/8;limb(c,-7+20*t,-8-87*t,1+20*t,-11-87*t,1,color,'#e1c995');}
  for(const [x,y] of [[-48,-83],[-44,-113],[-20,-134],[25,-135],[51,-113],[48,-78]])frond(c,12,-106,x,y,color);
  for(const x of [5,15,24])oval(c,x,-98,5,6,color('#a48857'));if(winter)snowCap(c,12,-110,15,5,color);
 }else if(species==='cedar'||species==='araucaria'){
  limb(c,0,3,v*2,-126,9,color);const cedar=species==='cedar';
  for(let row=0;row<4;row++){const y=-43-row*23,w=(cedar?45:37)-row*8;for(const side of [-1,1]){limb(c,0,y+7,side*w,y-(cedar?2:13),3,color);if(cedar){foliage(c,side*w*.6,y,w*.62,10,color,winter);limb(c,side*w,y,side*(w+3),y+12,2,color,'#387b54');}else{poly(c,[[0,y-17],[side*w,y-17],[side*(w-9),y-3],[0,y+2]],color('#46976b'),color('#285b4b'),2);poly(c,[[0,y-17],[side*w,y-17],[side*(w-10),y-10],[0,y-7]],color('#82bb7c'),null);if(winter)snowCap(c,side*w*.55,y-15,w*.35,4,color);}}}
  foliage(c,0,-127,9,10,color,winter);
 }else if(species==='acacia'){
  limb(c,0,4,-9,-66,10,color);for(const [x,y]of [[-35,-91],[3,-105],[37,-93]]){limb(c,-8,-44,x,y,5,color);foliage(c,x,y,22,13,color,winter);}foliage(c,0,-94,31,14,color,winter);
 }else if(species==='banyan'){
  for(const x of [-27,24]){limb(c,x,4,x+v*2,-87,3,color,'#b4a079');limb(c,x,1,x-8,-3,3,color);}
  limb(c,0,4,4,-88,15,color);for(const x of [-18,18])limb(c,0,-10,x,0,5,color);
  for(const [x,y,rx,ry]of [[-32,-79,23,21],[30,-84,24,22],[-5,-106,35,23],[1,-76,31,20]])foliage(c,x,y,rx,ry,color,winter);
 }else if(species==='ginkgo'){
  limb(c,0,4,v*4,-91,10,color);for(const [x,y]of [[-28,-62],[26,-70],[-26,-93],[24,-103],[0,-115],[0,-82]]){limb(c,0,-40,x,y,3,color);c.beginPath();c.moveTo(x,y+15);c.bezierCurveTo(x-31,y-5,x-22,y-24,x-2,y-16);c.bezierCurveTo(x+14,y-28,x+34,y-6,x,y+15);c.fillStyle=color('#a5cb72');c.fill();c.strokeStyle=color('#315c43');c.lineWidth=2;c.stroke();c.strokeStyle=color('#67a85e');c.lineWidth=1;for(const d of [-10,3,12]){c.beginPath();c.moveTo(x,y+11);c.lineTo(x+d,y-12);c.stroke();}if(winter)snowCap(c,x-2,y-18,14,5,color);}
 }else if(species==='kapok'){
  for(const x of [-18,17])poly(c,[[0,-43],[x,5],[0,0]],color('#b99b6a'),color('#59684b'),2);limb(c,0,2,0,-105,11,color);
  for(const [x,y]of [[-31,-68],[31,-87],[-19,-114],[16,-124]]){limb(c,0,y+24,x,y,5,color);foliage(c,x,y,18,12,color,winter);for(const dx of [-8,7]){for(let i=0;i<5;i++)oval(c,x+dx+Math.cos(i*1.257)*4,y+Math.sin(i*1.257)*4,4,3,color('#cf7862'));oval(c,x+dx,y,2,2,color('#f2d397'));}}
 }else if(species==='magnolia'){
  for(const [x,y]of [[-24,-66],[23,-80],[0,-104]]){limb(c,0,4,x,y,7,color);foliage(c,x,y,24,25,color,winter);for(const dx of [-10,11]){for(const [px,py,rx,ry]of [[-4,0,4,7],[4,-2,4,7],[0,2,4,6]])oval(c,x+dx+px,y+py,rx,ry,color('#f2dfc3'),color('#b8aa87'),.8);}}
 }else if(species==='beech'){
  limb(c,0,4,3,-99,13,color,'#c3beb0');limb(c,0,-46,-24,-89,5,color,'#c3beb0');for(const [x,y,rx,ry]of [[-19,-76,25,28],[22,-80,25,28],[2,-108,28,26]])foliage(c,x,y,rx,ry,color,winter);limb(c,-1,-12,6,-18,1,color,'#7c8471');
 }else throw Error(`未实现树种：${species}`);
}
