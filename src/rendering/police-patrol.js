// 警察猫制服与森林警车共用柔和藏蓝、奶油白和森林绿描边。
import {box,oval,poly,outline} from './primitives.js';

// 爪印盾徽只作局部身份标记，避免在小尺寸车身堆叠文字。
function badge(c,x,y,scale=1){
 c.save();c.translate(x,y);c.scale(scale,scale);
 poly(c,[[-7,-8],[7,-8],[6,2],[0,8],[-6,2]],'#e6c878',outline,1.3);
 oval(c,0,0,3,2.5,'#537583');
 for(const [px,py] of [[-3,-4],[0,-5],[3,-4]])oval(c,px,py,1.3,1.5,'#537583');
 c.restore();
}

// 制服依附真实帧颈线，帽檐跟随头部；不覆盖脚步、尾巴或眼口。
export function drawPoliceOutfit(c,head){
 c.save();c.translate(head.x,head.neck);
 poly(c,[[-23,1],[-10,-1],[0,8],[10,-1],[23,1],[22,27],[-20,27]],'#577789',outline,2);
 poly(c,[[-11,0],[0,8],[-7,13],[-16,3]],'#f1e6c7',outline,1);
 poly(c,[[11,0],[0,8],[7,13],[16,3]],'#f1e6c7',outline,1);
 box(c,-20,25,41,5,2,'#405b55',outline,1);
 box(c,-3,25,6,5,1,'#dfc477',outline,1);
 badge(c,13,15,.55);
 c.restore();c.save();c.translate(head.x,head.y);
 poly(c,[[-30,-25],[-26,-43],[-10,-48],[18,-46],[29,-36],[28,-25]],'#56788a',outline,2.4);
 box(c,-29,-29,58,8,3,'#e5d29b',outline,1.5);
 c.beginPath();c.ellipse(0,-20,31,7,0,0,Math.PI);c.fillStyle='#3f5d62';c.fill();c.strokeStyle=outline;c.lineWidth=2;c.stroke();
 badge(c,0,-35,.65);c.restore();
}

// 后车体、四轮与警灯先画，车轮只读真实行程相位，停车不会空转。
export function drawPoliceRear(c,phase=0,time=0,reduced=false){
 oval(c,3,35,50,16,'#253c3338');
 for(const x of [-43,43])for(const y of [-25,28]){
  box(c,x-7,y-12,14,24,6,'#465b53',outline,2);oval(c,x,y,5,9,'#bcc6b2',outline,1.3);
  c.beginPath();c.moveTo(x+Math.cos(phase)*4,y+Math.sin(phase)*7);c.lineTo(x-Math.cos(phase)*4,y-Math.sin(phase)*7);c.strokeStyle='#536e67';c.lineWidth=2;c.stroke();
 }
 box(c,-39,-49,78,92,16,'#eee4c3',outline,2.7);
 box(c,-32,-37,64,54,11,'#6d9695',outline,2);
 poly(c,[[-26,-32],[-5,-32],[-21,11],[-27,11]],'#b3cebd');
 for(const x of [-39,31])box(c,x,-25,8,48,3,'#577c8d',outline,1.5);
 for(const x of [-48,40])box(c,x,-7,8,11,3,'#e9dfbd',outline,1.5);
 box(c,-36,-52,72,9,4,'#647c70',outline,1.6);
 // 两侧灯留出驾驶员头部空间；透明亮色按正弦缓变，没有整屏闪烁。
 const glow=reduced?.5:(Math.sin(time*Math.PI)+1)/2;
 for(const [x,color,bright,alpha] of [[-36,'#b87470','#f0ad93',glow],[20,'#668da6','#abd7e4',1-glow]]){
  box(c,x,-55,16,11,4,color,outline,1.5);
  c.save();c.globalAlpha=alpha;box(c,x+2,-53,12,7,2,bright);c.restore();
  box(c,x+4,-53,8,2,1,'#e5e1c8');
 }

}

// 圆车头遮住驾驶员腿部，头部与独立手持武器仍由角色层绘制。
export function drawPoliceFront(c){
 box(c,-38,7,76,37,13,'#eee5c6',outline,2.7);
 box(c,-35,9,70,13,5,'#577c8d',outline,1.5);
 badge(c,0,17,.9);
 for(const x of [-30,19])box(c,x,27,11,8,3,'#fff2be',outline,1.3);
 box(c,-13,31,26,6,2,'#5b776a',outline,1.2);
 box(c,-33,42,66,5,2,'#96a38b',outline,1.5);
}
