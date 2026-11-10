// 扩展装饰沿用正式森林描边；按独立剪影绘制，目录、编辑器和场景共享。
import {box,oval,poly} from './primitives.js';
const E='#41614b',W='#b99563',C='#f4e5b8',R='#bf6650',G='#72946a',S='#a9b39a';
// 连线只服务独立杆件、藤蔓和机件，不拉伸整体图像。
function line(c,points,color=E,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
// 星形保持固定轮廓，灯具与庆典共用。
function star(c,x,y,r){poly(c,Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,d=i%2?r*.45:r;return [x+Math.cos(a)*d,y+Math.sin(a)*d];}),C,E,1.5);}
// 花盆与花朵均保留脚底锚点。
function pot(c,w=34){poly(c,[[-w/2,-19],[w/2,-19],[w*.38,0],[-w*.38,0]],W,E,2);box(c,-w/2-3,-22,w+6,6,2,C,E,1.5);}
// 小花由独立花瓣组合，不增加高频纹理。
function flower(c,x,y,r=8,color=R){for(let i=0;i<5;i++)oval(c,x+Math.cos(i*1.256)*r*.7,y+Math.sin(i*1.256)*r*.7,r*.6,r*.6,color,E,1);oval(c,x,y,r*.4,r*.4,C);}
// 桌面保持俯视椭圆，食品各自叠放在台面。
function table(c){for(const x of [-24,24])box(c,x-3,-20,6,20,2,W,E,1.5);oval(c,0,-24,36,15,W,E,2);}
// 八种路灯的灯头、横臂和底座不同，光源中心统一在灯杆上方。
export function drawDecorLamp(c,id,lit=0){box(c,-13,-5,26,10,3,S,E,2);box(c,-4,-98,8,94,2,id==='lamp-pagoda'?S:W,E,2);const glow=lit>0?'#ffe3a0':C;
 switch(id){
 case 'lamp-lantern':box(c,-18,-109,36,6,2,W,E,2);oval(c,0,-86,16,20,R,E,2);oval(c,-3,-87,7,14,glow);box(c,-9,-66,18,5,2,W,E,1.5);for(const x of [-5,0,5])line(c,[[x,-61],[x,-49]],R,2);break;
 case 'lamp-globe':oval(c,0,-92,20,20,glow,E,2);oval(c,-6,-98,6,8,'#fff4cc');box(c,-10,-72,20,5,2,S,E,1.5);break;
 case 'lamp-twin':line(c,[[-26,-89],[-26,-109],[26,-109],[26,-89]],E,5);for(const x of [-26,26]){oval(c,x,-82,12,15,glow,E,2);poly(c,[[x-15,-94],[x,-103],[x+15,-94]],G,E,2);}break;
 case 'lamp-lotus':for(const x of [-14,0,14])oval(c,x,-91+(x===0?-5:0),11,18,glow,E,1.5);poly(c,[[-24,-82],[0,-73],[24,-82],[14,-68],[-14,-68]],G,E,2);break;
 case 'lamp-mushroom':box(c,-9,-87,18,27,5,glow,E,2);oval(c,0,-88,29,16,R,E,2);for(const x of [-16,0,16])oval(c,x,-92,4,3,C);break;
 case 'lamp-star':star(c,0,-99,23);box(c,-9,-76,18,5,2,S,E,1.5);break;
 case 'lamp-bamboo':box(c,-5,-111,10,108,3,G,E,2);for(const y of [-24,-49,-74,-99])box(c,-7,y,14,4,2,C,E,1);box(c,4,-107,22,5,2,G,E,1.5);box(c,10,-99,20,26,4,glow,E,2);oval(c,-13,-86,10,4,G,E,1);break;
 case 'lamp-pagoda':box(c,-15,-101,30,32,3,glow,E,2);for(const x of [-18,14])box(c,x,-102,4,38,1,S,E,1.5);poly(c,[[-27,-103],[0,-121],[27,-103]],S,E,2);box(c,-23,-69,46,6,2,S,E,2);break;
 }
}
// 各摆件按结构分支绘制；喷泉外的新动态只驱动水轮独立轮辐。
export function drawExpandedDecoration(c,d,night,time,reduced){const f=d.form;if(f==='lamp'){drawDecorLamp(c,d.id,night);return;}
 switch(f){
 case 'bamboo':pot(c);for(const [x,h]of [[-13,66],[0,88],[13,72]]){box(c,x-3,-h,6,h-20,2,G,E,1.5);for(let y=-h+10;y<-25;y+=17){line(c,[[x-4,y],[x+4,y]],C,2);oval(c,x+9,y-4,11,3,G,E,1);}}break;
 case 'bonsai':pot(c,45);line(c,[[0,-22],[-8,-44],[10,-60]],W,8);for(const [x,y,w]of [[-16,-49,20],[12,-64,24],[24,-43,13]])oval(c,x,y,w,9,G,E,2);break;
 case 'lotus':oval(c,0,-16,28,20,S,E,2);oval(c,0,-29,28,12,'#9cbfc0',E,2);oval(c,-9,-30,12,6,G,E,1);flower(c,11,-37,7,'#dda6a4');break;
 case 'sunflower':box(c,-33,-21,66,23,3,W,E,2);for(const x of [-23,0,23]){line(c,[[x,-21],[x,-49-(x===0?8:0)]],G,3);flower(c,x,-49-(x===0?8:0),10,'#dfbf6c');oval(c,x,-49-(x===0?8:0),4,4,W);}break;
 case 'mushroom':for(const [x,y,r]of [[-20,-7,12],[0,-11,17],[22,-3,9]]){box(c,x-4,y-20,8,21,3,C,E,1.5);oval(c,x,y-23,r,r*.6,R,E,1.5);oval(c,x-4,y-25,3,2,C);}break;
 case 'arch':for(const x of [-39,39])box(c,x-4,-85,8,85,2,W,E,2);c.strokeStyle=G;c.lineWidth=8;c.beginPath();c.arc(0,-82,39,Math.PI,0);c.stroke();for(const [x,y]of [[-38,-79],[-25,-109],[0,-120],[26,-110],[39,-78]])flower(c,x,y,7,'#dba2a0');break;
 case 'bench':for(const x of [-30,30])box(c,x-4,-24,8,24,2,W,E,1.5);box(c,-38,-25,76,12,3,W,E,2);box(c,-38,-48,76,19,3,C,E,2);for(const x of [-31,31])line(c,[[x,-39],[x,-10]],E,3);break;
 case 'table':table(c);box(c,-16,-38,32,17,2,C,E,1);oval(c,15,-32,8,5,R,E,1);break;
 case 'birdhouse':box(c,-4,-76,8,77,2,W,E,2);box(c,-16,-92,32,29,3,C,E,2);poly(c,[[-23,-91],[0,-109],[23,-91]],G,E,2);oval(c,0,-79,7,7,E);line(c,[[-9,-68],[9,-68]],W,3);break;
 case 'chime':box(c,-3,-97,6,96,2,W,E,2);line(c,[[-20,-94],[20,-94]],W,5);for(const [x,h]of [[-16,30],[0,44],[16,33]]){line(c,[[x,-94],[x,-94+h]],E,1);poly(c,[[x-7,-94+h],[x,-83+h],[x+7,-94+h]],C,E,1.5);}break;
 case 'cat':box(c,-23,-7,46,9,3,S,E,2);oval(c,0,-25,18,22,S,E,2);poly(c,[[-18,-49],[-18,-65],[-6,-57],[6,-57],[18,-65],[18,-49]],S,E,2);oval(c,0,-46,20,17,S,E,2);for(const x of [-8,8])line(c,[[x-3,-47],[x+3,-47]],E,2);oval(c,0,-39,3,2,R);line(c,[[18,-28],[24,-40]],E,5);break;
 case 'pagoda':box(c,-18,-70,36,71,3,S,E,2);for(const [y,w]of [[-9,24],[-42,22],[-74,25]])poly(c,[[-w,y],[0,y-18],[w,y]],S,E,2);oval(c,0,-64,5,7,E);break;
 case 'wheel':box(c,-38,-12,76,16,3,W,E,2);oval(c,0,-45,33,33,W,E,3);oval(c,0,-45,26,26,'#a8bdba',E,2);for(let i=0;i<8;i++){const a=i*Math.PI/4+(reduced?0:time*.35);line(c,[[0,-45],[Math.cos(a)*30,-45+Math.sin(a)*30]],W,5);}box(c,-5,-44,10,44,2,S,E,2);oval(c,0,-45,6,6,C,E,2);break;
 case 'well':oval(c,0,-10,35,19,S,E,2);oval(c,0,-19,35,17,S,E,2);oval(c,0,-20,25,10,E);for(const x of [-31,31])box(c,x-3,-75,6,66,1,W,E,2);poly(c,[[-40,-75],[0,-100],[40,-75]],G,E,2);line(c,[[0,-75],[0,-32]],W,2);pot(c,17);break;
 case 'mailbox':box(c,-4,-47,8,48,2,W,E,2);box(c,-20,-72,40,29,7,G,E,2);box(c,-17,-59,30,3,1,E);line(c,[[20,-59],[20,-77],[29,-77]],R,3);flower(c,-12,-6,6);break;
 case 'sign':box(c,-4,-78,8,79,2,W,E,2);poly(c,[[-28,-74],[20,-74],[30,-64],[20,-54],[-28,-54]],C,E,2);poly(c,[[27,-47],[-20,-47],[-30,-37],[-20,-27],[27,-27]],G,E,2);break;
 case 'drum':for(const x of [-20,20])line(c,[[x,-24],[x*1.3,1]],W,5);box(c,-29,-44,58,28,7,R,E,2);oval(c,0,-44,29,13,C,E,2);oval(c,0,-17,29,8,W,E,2);line(c,[[-22,-57],[10,-44]],W,3);line(c,[[22,-57],[-4,-44]],W,3);break;
 case 'knot':box(c,-3,-97,6,98,2,W,E,2);for(const y of [-79,-59])poly(c,[[0,y-12],[14,y],[0,y+12],[-14,y]],R,E,2);for(const x of [-7,0,7])line(c,[[x,-45],[x,-20]],R,3);break;
 case 'orange':pot(c,42);box(c,-4,-67,8,47,1,W,E,2);oval(c,0,-64,28,25,G,E,2);for(const [x,y]of [[-15,-70],[9,-78],[17,-54],[-6,-51]])oval(c,x,y,6,6,'#d9ab5f',E,1);break;
 case 'crackers':for(const x of [-24,24])box(c,x-3,-98,6,99,1,W,E,2);box(c,-28,-99,56,6,2,C,E,2);for(let i=0;i<6;i++)for(const x of [-9,9])box(c,x-5,-83+i*11,9,8,2,R,E,1);break;
 case 'boat':poly(c,[[-48,-26],[-30,-1],[32,-1],[48,-26],[0,-15]],G,E,2);poly(c,[[-45,-25],[-46,-48],[-30,-52],[-24,-43],[-35,-38],[-32,-19]],G,E,2);oval(c,-37,-46,2,2,E);for(const x of [-18,0,18])line(c,[[x,-22],[x+12,-5]],W,3);break;
 case 'sachet':box(c,-3,-72,6,73,2,W,E,2);line(c,[[-23,-70],[23,-70]],W,5);for(const x of [-16,0,16]){line(c,[[x,-69],[x,-49]],E,1);poly(c,[[x,-51],[x+9,-40],[x,-27],[x-9,-40]],x===0?R:G,E,1.5);line(c,[[x,-27],[x,-17]],C,2);}break;
 case 'rabbit':oval(c,0,-20,20,23,C,E,2);for(const x of [-9,9])oval(c,x,-59,7,18,C,E,2);oval(c,0,-40,20,17,C,E,2);for(const x of [-7,7])oval(c,x,-43,2,3,E);oval(c,0,-36,3,2,R);break;
 case 'mooncake':table(c);for(const [x,y]of [[-14,-29],[13,-30],[0,-40]]){oval(c,x,y,10,6,'#d2ab69',E,1.5);oval(c,x,y-2,6,3,C,E,1);}break;
 case 'bridge':poly(c,[[-44,-9],[-22,-29],[22,-29],[44,-9],[44,0],[20,-18],[-20,-18],[-44,0]],W,E,2);for(const x of [-38,-19,19,38])box(c,x-2,-36,4,25,1,W,E,1.5);line(c,[[-40,-34],[-20,-49],[20,-49],[40,-34]],G,4);star(c,0,-58,8);break;
 case 'pumpkin':box(c,-32,-22,64,18,3,W,E,2);for(const x of [-26,26])oval(c,x,-3,10,10,S,E,2);for(const x of [-17,16]){oval(c,x,-34,17,19,'#cb9b59',E,2);line(c,[[x,-54],[x+3,-60]],G,4);poly(c,[[x-8,-38],[x-2,-38],[x-5,-44]],E);poly(c,[[x+2,-38],[x+8,-38],[x+5,-44]],E);}break;
 case 'cauldron':oval(c,0,-20,26,23,'#6d8171',E,2);oval(c,0,-38,26,10,E);for(const [x,y]of [[-15,-39],[0,-43],[15,-38]]){oval(c,x,y,7,5,x?R:C,E,1);line(c,[[x-9,y-3],[x-7,y],[x-9,y+3]],C,2);}break;
 case 'eggs':c.strokeStyle=W;c.lineWidth=5;c.beginPath();c.ellipse(0,-28,23,28,0,Math.PI,Math.PI*2);c.stroke();for(const [x,y,color]of [[-14,-27,R],[0,-34,C],[14,-26,G]]){oval(c,x,y,9,14,color,E,1.5);line(c,[[x-7,y],[x+7,y]],C,2);}poly(c,[[-25,-24],[25,-24],[19,0],[-19,0]],W,E,2);break;
 case 'harvest':poly(c,[[-35,-9],[-10,-37],[23,-30],[37,-7],[5,0]],W,E,2);for(const x of [-10,4,18]){oval(c,x,-19,10,9,'#d3ad62',E,1.5);line(c,[[x,-27],[x+3,-35]],G,2);}break;
 case 'stove':box(c,-23,-47,46,47,5,S,E,2);box(c,-13,-34,26,25,3,E);poly(c,[[-9,-12],[-7,-25],[0,-18],[7,-28],[10,-12]],'#e3b86d');box(c,12,-69,9,24,2,S,E,2);oval(c,0,-48,18,6,C,E,1.5);break;
 case 'wreath':box(c,-3,-90,6,91,2,W,E,2);c.strokeStyle=G;c.lineWidth=12;c.beginPath();c.arc(0,-66,22,0,Math.PI*2);c.stroke();for(const x of [-15,15])oval(c,x,-77,4,4,R);poly(c,[[0,-43],[-17,-52],[-14,-33],[0,-43],[17,-52],[14,-33]],R,E,1.5);break;
 case 'firework':box(c,-27,-25,54,28,3,W,E,2);for(const x of [-18,0,18]){box(c,x-5,-41,10,26,2,R,E,1.5);poly(c,[[x-7,-41],[x,-50],[x+7,-41]],C,E,1.5);}star(c,0,-10,7);break;
 default:throw new Error('缺少装饰画笔：'+d.id);
 }
}
