// 地球地貌使用同源轮廓；裂谷在地面缓存，隆起地貌在正式实体层排序。
import {poly,oval} from './primitives.js';
import {nightColor} from './river.js';

// 只转换当前局部路径，不生成整张世界位图。
function outline(c,points,sx=1,sy=sx,dy=0){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x*sx,p.y*sy+dy):c.moveTo(p.x*sx,p.y*sy+dy));c.closePath();}
// 底座、深谷、湿润林下进入现有分块缓存，镜像与裁剪沿用地面绘制器。
export function drawEarthGround(c,item,winter=false){
 c.save();c.translate(item.x,item.y);const p=item.outline;
 outline(c,p,1.12);c.fillStyle=winter?'#d3dfd6':item.kind==='rainforest'?'#86a77a':'#bcb594';c.fill();
 outline(c,p);c.fillStyle=item.kind==='rift'?'#4b5149':item.kind==='rainforest'?'#77996c':item.kind==='snowpeak'?'#d9e5df':item.kind==='volcano'?'#827f6c':'#c0a885';c.fill();
 if(item.kind==='rift'){
  c.save();c.clip();
  // 岩层不断向内收缩并下移，谷底很窄，明确表现向下的距离。
  for(const [sx,sy,dy,fill]of [[1,1,0,'#a28f73'],[.98,.86,8,'#857660'],[.94,.68,17,'#6d6557'],[.89,.51,29,'#525749'],[.82,.34,41,'#3b4940'],[.75,.18,48,'#283e38']]){outline(c,p,sx,sy,dy);c.fillStyle=fill;c.fill();}
  c.strokeStyle='#beb18c';c.lineWidth=2;for(let i=2;i<15;i+=2){const q=p[i];c.beginPath();c.moveTo(q.x,q.y);c.lineTo(q.x*.92+8,q.y*.68+20);c.lineTo(q.x*.83+10,q.y*.4+35);c.stroke();}
  // 谷底的细碎岩带尺寸远小于上缘岩台，提供深度比例尺。
  c.strokeStyle='#66776a';c.lineWidth=3;c.beginPath();c.moveTo(-item.rx*.65,44);c.bezierCurveTo(-100,32,65,73,item.rx*.64,37);c.stroke();
  for(let i=0;i<8;i++)oval(c,-170+i*43,49+Math.sin(i*2)*7,3,1.5,'#7a826f');c.restore();outline(c,p);c.strokeStyle='#596249';c.lineWidth=3;c.stroke();
 }else if(item.kind==='rainforest'){
  c.save();c.clip();for(let i=0;i<13;i++){const a=i*2.399,x=Math.cos(a)*item.rx*.65,y=Math.sin(a)*item.ry*.65;oval(c,x,y,45+(i%3)*13,19,'#638967');oval(c,x-6,y-6,26,10,'#8dad78');
   // 蕨叶只点缀边缘，不为装饰新增障碍。
   for(const side of [-1,1]){c.strokeStyle='#416d53';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+side*9,y-22,x+side*17,y-19);c.stroke();for(let j=1;j<4;j++)poly(c,[[x+side*j*4,y-j*5],[x+side*(j*4+10),y-j*5-5],[x+side*(j*4+4),y-j*5+2]],'#4c7d59',null);}}
  c.restore();
 }else{oval(c,18,18,item.rx*.95,item.ry*.8,'#3c534333');}
 c.restore();
}
// 山体共享实体底座、右侧冷影与左上亮面，透明区域不会擦除人物。
export function drawEarthLandform(c,item,night=0,player=null){
 if(['rift','rainforest'].includes(item.kind))return;
 c.save();c.translate(item.x,item.y);const col=hex=>nightColor(hex,night),rx=item.rx,h=item.height;
 // 后方人物被山体遮挡时透显，前方人物继续按底座排序。
 if(player&&player.y<item.y&&player.y>item.y-h-50&&Math.abs(player.x-item.x)<rx*.85)c.globalAlpha*=.48;
 if(item.kind==='volcano'){
  const shape=[[-rx,-10],[-rx*.65,-h*.45],[-rx*.3,-h],[-rx*.06,-h-12],[rx*.27,-h+5],[rx*.57,-h*.38],[rx,-5],[rx*.6,38],[-rx*.65,34]];
  poly(c,shape,col('#928770'),col('#54604e'),2.5);poly(c,[[-rx*.06,-h-12],[rx*.27,-h+5],[rx*.57,-h*.38],[rx,-5],[rx*.6,38],[rx*.12,20],[rx*.04,-h*.6]],col('#6f7666'),null);
  poly(c,[[-rx*.3,-h],[-rx*.53,-h*.42],[-rx*.75,-12],[-rx*.4,-30],[-rx*.1,-h*.75]],col('#b0a087'),null);
  oval(c,0,-h,rx*.29,23,col('#c0aa8b'),col('#54604e'),2);oval(c,2,-h+2,rx*.23,15,col('#535949'));oval(c,3,-h+7,rx*.15,7,col('#d48a55'));
  poly(c,[[rx*.1,-h+13],[rx*.08,-h*.7],[rx*.25,-h*.49],[rx*.23,-h*.29],[rx*.37,-h*.22],[rx*.3,-h*.47],[rx*.17,-h*.72],[rx*.18,-h+12]],col('#c98250'),col('#8c7152'),1.5);
  for(const [x,y]of [[-100,-8],[-70,12],[102,13]])poly(c,[[x-12,y],[x-3,y-13],[x+14,y-6],[x+8,y+7]],col('#777d68'),col('#59664e'),1.7);
 }else if(item.kind==='snowpeak'){
  for(const [x,y,w,height]of [[-rx*.53,-18,rx*.55,h*.74],[rx*.45,-4,rx*.61,h*.82],[-rx*.05,20,rx*.65,h]]){
   const shape=[[x-w,y],[x-w*.38,y-height*.66],[x,y-height],[x+w*.25,y-height*.8],[x+w,y],[x+w*.35,y+17],[x-w*.5,y+13]];
   poly(c,shape,col('#abbcaf'),col('#526b5c'),2.5);poly(c,[[x,y-height],[x+w*.25,y-height*.8],[x+w,y],[x+w*.35,y+17],[x-w*.03,y],[x+w*.07,y-height*.51]],col('#748e85'),null);
   poly(c,[[x-w*.38,y-height*.66],[x,y-height],[x+w*.25,y-height*.8],[x+w*.52,y-height*.49],[x+w*.15,y-height*.6],[x+w*.06,y-height*.44],[x-w*.08,y-height*.64],[x-w*.2,y-height*.56]],col('#e8eee0'),col('#a7c3bd'),1.5);
   poly(c,[[x,y-height],[x+w*.25,y-height*.8],[x+w*.52,y-height*.49],[x+w*.15,y-height*.6],[x+w*.06,y-height*.44],[x+w*.02,y-height*.7]],col('#bfd6d2'),null);
  }
 }else if(item.kind==='strata'){
  const shape=[[-rx,-8],[-rx*.92,-h*.58],[-rx*.72,-h*.61],[-rx*.67,-h],[-rx*.15,-h-8],[rx*.2,-h*.85],[rx*.72,-h*.9],[rx*.8,-h*.49],[rx,-h*.4],[rx,12],[rx*.52,32],[-rx*.55,27]];
  poly(c,shape,col('#c4aa82'),col('#666c52'),2.5);c.save();c.beginPath();shape.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
  for(let i=0;i<7;i++){const y=-h+14+i*24;poly(c,[[-rx-5,y],[0,y+13],[rx+5,y-1],[rx+5,y+10],[0,y+25],[-rx-5,y+12]],col(i%2?'#9d8b70':'#e0c49a'),null);}
  poly(c,[[rx*.35,-h],[rx*1.1,-h],[rx*1.1,40],[rx*.24,40],[rx*.39,-45]],col('#655e4c35'),null);c.restore();
  poly(c,[[-rx*.67,-h],[-rx*.15,-h-8],[rx*.2,-h*.85],[rx*.72,-h*.9],[rx*.56,-h*.76],[-rx*.15,-h*.84],[-rx*.67,-h+10]],col('#e4cdab'),col('#797b5e'),1.7);
 }
 c.restore();
}
