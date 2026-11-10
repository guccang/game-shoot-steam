import {campBuildingFinish,drawCampWallFinish} from './camp-building-finish.js';
// 房屋沿用树冠的圆润轮廓与三个大明暗面，所有细节只在静态图集生成时绘制。
import {box,oval} from './primitives.js';
const EDGE='#536047';
// 保持原屋顶四角锚点，以局部曲线柔化转折，不缩放整栋建筑或改变门位。
function roofPoint(points,u,v){const [a,b,d,e]=points;return [(b[0]+(d[0]-b[0])*u)*(1-v)+(a[0]+(e[0]-a[0])*u)*v,(b[1]+(d[1]-b[1])*u)*(1-v)+(a[1]+(e[1]-a[1])*u)*v];}
// 圆脊和下垂厚檐共用完整闭合轮廓，屋面不会拆成互相压住的卡片。
function roofOutline(c,p){
 const shape=campBuildingFinish()?.shape;
 if(shape==='gable'){c.beginPath();c.moveTo(...p(0,1));c.lineTo(...p(.08,.28));c.lineTo(...p(.48,-.12));c.lineTo(...p(.91,.26));c.lineTo(...p(1,1));c.closePath();return;}
 if(shape==='terrace'){c.beginPath();for(const [i,q] of [[0,[0,1]],[1,[0,.62]],[2,[.08,.62]],[3,[.08,.3]],[4,[.18,.3]],[5,[.18,0]],[6,[.82,0]],[7,[.82,.3]],[8,[.92,.3]],[9,[.92,.62]],[10,[1,.62]],[11,[1,1]]]){if(i)c.lineTo(...p(...q));else c.moveTo(...p(...q));}c.closePath();return;}
 c.beginPath();c.moveTo(...p(.07,0));c.quadraticCurveTo(...p(.5,-.10),...p(.93,0));c.quadraticCurveTo(...p(1,0),...p(1,.12));c.quadraticCurveTo(...p(.98,.55),...p(1,.88));c.quadraticCurveTo(...p(1.03,1.04),...p(.94,1.04));c.quadraticCurveTo(...p(.5,1.16),...p(.06,1.04));c.quadraticCurveTo(...p(-.03,1.04),...p(0,.88));c.quadraticCurveTo(...p(.02,.5),...p(0,.12));c.quadraticCurveTo(...p(0,0),...p(.07,0));c.closePath();
}
// 屋顶使用受光顶、主苔色、檐下暗部；少量弧形搭接提示材料，不铺网格纹。
export function drawRoofSurface(c,points,{base='#9bb477',light='#c7d694',shade='#789760',snow=false}={}){
 const finish=campBuildingFinish();if(finish){base=finish.material==='stone'?'#899f99':'#af936e';light=finish.material==='stone'?'#c5cdb8':'#d8bd8c';shade=finish.material==='stone'?'#617e77':'#8f7759';if(finish.shape==='gable')points=points.map((q,i)=>[q[0],q[1]-(i===1||i===2?9:0)]);}
 const p=(u,v)=>roofPoint(points,u,v);c.save();roofOutline(c,p);c.fillStyle=base;c.fill();c.save();c.clip();
 if(finish?.shape==='terrace'){for(const v of [.27,.55,.81]){c.beginPath();c.moveTo(...p(0,v));c.lineTo(...p(1,v));c.strokeStyle=light;c.lineWidth=5;c.stroke();}}
 c.beginPath();c.moveTo(...p(-.1,.58));c.bezierCurveTo(...p(.22,.88),...p(.38,.50),...p(.64,.70));c.quadraticCurveTo(...p(.82,.86),...p(1.1,.59));c.lineTo(...p(1.1,1.5));c.lineTo(...p(-.1,1.5));c.closePath();c.fillStyle=shade;c.fill();
 c.beginPath();c.moveTo(...p(-.1,-.2));c.lineTo(...p(.90,-.2));c.quadraticCurveTo(...p(.91,.15),...p(.66,.25));c.bezierCurveTo(...p(.50,.28),...p(.59,.52),...p(.31,.51));c.quadraticCurveTo(...p(.03,.60),...p(-.1,.34));c.closePath();c.fillStyle=light;c.fill();
 c.strokeStyle=shade;c.lineWidth=1.35;c.lineCap='round';
 for(const [u,v,w] of [[.16,.40,.12],[.50,.59,.15],[.77,.45,.12]]){c.beginPath();c.moveTo(...p(u,v));c.quadraticCurveTo(...p(u+w*.5,v+.12),...p(u+w,v+.02));c.stroke();}
 c.restore();
 // 檐底是一条圆润暗唇，与屋顶同体，深度不靠附加矩形横梁表达。
 c.beginPath();c.moveTo(...p(.03,1.02));c.quadraticCurveTo(...p(.50,1.16),...p(.97,1.02));c.strokeStyle=shade;c.lineWidth=4;c.lineCap='round';c.stroke();
 roofOutline(c,p);c.strokeStyle=EDGE;c.lineWidth=2.2;c.lineJoin='round';c.stroke();
 c.restore();if(snow){c.save();c.globalAlpha*=Math.max(0,Math.min(1,Number(snow)));drawRoofSnow(c,points);c.restore();}
}
// 积雪沿同一圆屋脊铺开，保留下缘苔色与厚檐，昼夜轮廓一致。
export function drawRoofSnow(c,points){
 const p=(u,v)=>roofPoint(points,u,v);c.save();roofOutline(c,p);c.clip();c.beginPath();c.moveTo(...p(-.1,-.2));c.lineTo(...p(1.1,-.2));c.lineTo(...p(1.1,.22));c.bezierCurveTo(...p(.84,.50),...p(.76,.13),...p(.63,.34));c.bezierCurveTo(...p(.45,.55),...p(.23,.20),...p(-.1,.44));c.closePath();c.fillStyle='#edf0da';c.fill();c.restore();
}
// 弧顶与圆脚用于同一套木门窗，避免多层直角框互相贴叠。
function arch(c,x,y,w,h){
 c.beginPath();c.moveTo(x,y+h-3);c.lineTo(x,y+9);c.bezierCurveTo(x,y-2,x+w,y-2,x+w,y+9);c.lineTo(x+w,y+h-3);c.quadraticCurveTo(x+w,y+h,x+w-4,y+h);c.lineTo(x+4,y+h);c.quadraticCurveTo(x,y+h,x,y+h-3);c.closePath();
}
// 窗户用暖木外框和大块玻璃，细节数量与树冠内部曲线相近。
export function drawInsetWindow(c,x,y,w,h,night=false){
 c.save();arch(c,x-3,y-3,w+6,h+6);c.fillStyle='#bba071';c.fill();c.strokeStyle=EDGE;c.lineWidth=1.8;c.stroke();
 arch(c,x+1,y+1,w-2,h-2);c.fillStyle=night?'#ffe4a0':'#8eac91';c.fill();c.save();c.clip();
 c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y);c.lineTo(x+w,y+h*.42);c.quadraticCurveTo(x+w*.45,y+h*.70,x,y+h*.50);c.closePath();c.fillStyle=night?'#fff2c1':'#c3d6af';c.fill();c.restore();
 c.strokeStyle='#c8b17f';c.lineWidth=2.4;c.lineCap='round';c.beginPath();c.moveTo(x+w*.5,y+1);c.lineTo(x+w*.5,y+h-1);if(h>22){c.moveTo(x+1,y+h*.56);c.lineTo(x+w-1,y+h*.56);}c.stroke();
 box(c,x-5,y+h+1,w+10,4,2,'#a18e65',null);c.restore();
}
// 墙体使用微弧转角与连续暖色立面，保留原底座、侧墙和高层高度。
export function drawHouseWall(c,left,right,top){
 c.save();c.beginPath();c.moveTo(left+12,top);c.lineTo(right-15,top-6);c.quadraticCurveTo(right+1,top-1,right,top+15);c.lineTo(right-1,-8);c.quadraticCurveTo(right,1,right-13,2);c.quadraticCurveTo(0,6,left+11,0);c.quadraticCurveTo(left+3,-1,left+4,-12);c.lineTo(left+5,top+12);c.quadraticCurveTo(left+5,top,left+12,top);c.closePath();c.fillStyle='#efdfb1';c.fill();c.save();c.clip();drawCampWallFinish(c,left,top-8,right-left,-top+18);
 c.beginPath();c.moveTo(right-25,top-10);c.quadraticCurveTo(right-28,top*.5,right-25,3);c.lineTo(right+10,10);c.lineTo(right+10,top-10);c.closePath();c.fillStyle='#8d9b78';c.fill();
 c.beginPath();c.moveTo(left,top);c.lineTo(right,top-8);c.lineTo(right,top+20);c.quadraticCurveTo(0,top+9,left,top+23);c.closePath();c.fillStyle='#a7ab7d';c.fill();
 c.beginPath();c.moveTo(left,-17);c.quadraticCurveTo(-12,-10,right,-15);c.lineTo(right,10);c.lineTo(left,10);c.closePath();c.fillStyle='#dac99a';c.fill();c.restore();
 c.strokeStyle=EDGE;c.lineWidth=2.2;
 // 外轮廓重新勾画，不给亮面与暗面再加一圈硬边。
 c.beginPath();c.moveTo(left+5,top+3);c.lineTo(left+4,-12);c.quadraticCurveTo(left+3,-1,left+11,0);c.quadraticCurveTo(0,6,right-13,2);c.quadraticCurveTo(right,1,right-1,-8);c.lineTo(right,top+5);c.stroke();c.restore();
}
// 弧顶厚木门沿用中央入口宽度；门板仅留一条轻木纹及圆把手。
export function drawHouseDoor(c,w){
 c.save();arch(c,-w/2-4,-49,w+8,52);c.fillStyle='#a78d61';c.fill();c.strokeStyle=EDGE;c.lineWidth=2;c.stroke();arch(c,-w/2,-44,w,46);c.fillStyle='#718b5b';c.fill();
 c.save();c.clip();c.beginPath();c.moveTo(-w/2,-44);c.lineTo(w/2,-44);c.lineTo(w/2,-30);c.quadraticCurveTo(0,-24,-w/2,-32);c.closePath();c.fillStyle='#9db372';c.fill();c.restore();
 c.strokeStyle='#536d48';c.lineWidth=1.1;c.beginPath();c.moveTo(-w*.15,-37);c.quadraticCurveTo(-w*.22,-19,-w*.14,-4);c.stroke();oval(c,w/2-5,-19,2,2,'#f0d38a');
 box(c,-w/2-10,1,w+20,6,3,'#a6ae82',EDGE,1.4);c.restore();
}
// 圆石基像树根一样压住地面，只保留少量明暗块，不铺砖缝网格。
export function drawStoneFoot(c,left,right){
 c.save();c.beginPath();c.moveTo(left+9,-13);c.quadraticCurveTo(0,-17,right-7,-11);c.quadraticCurveTo(right+5,-8,right+2,4);c.quadraticCurveTo(0,13,left+2,6);c.quadraticCurveTo(left-4,-3,left+9,-13);c.closePath();c.fillStyle='#95a17c';c.fill();c.strokeStyle=EDGE;c.lineWidth=1.8;c.stroke();
 oval(c,left+17,-7,12,4,'#c0c9a0');oval(c,right-22,-5,16,4,'#b7c398');c.restore();
}
