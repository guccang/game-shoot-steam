// 车型专属装甲和机组只在升级后叠装，活动轮架与旋翼仍由原绘制器输出。
import {box,oval,poly,outline} from './primitives.js';
const COLORS=[['#90a875','#d6d9a7'],['#839768','#cbd2a0'],['#71a89b','#d6e1bb'],['#70b5a0','#c9dec0'],['#c76a55','#f5df9e'],['#89a87b','#e4d39b'],['#ba6250','#e8ae83'],['#c5b783','#f2e1b3'],['#577c8d','#eee5c6']];

// 装甲等级在2/6/11/16形成结构阶段，其余级别以独立锁扣增加厚度细节。
function armor(c,index,level){
 const [body,light]=COLORS[index]||COLORS[0],tier=Math.min(3,Math.floor((level-1)/5)),detail=(level-1)%5;
 if(index===2){
  // 流线舱侧护壳保留滑橇与驾驶员开口。
  poly(c,[[-10,-10],[5,-12],[12,-4],[10,8],[2,12],[-9,5]],body,outline,1.8);
  poly(c,[[-8,-8],[4,-10],[8,-5],[-6,-3]],light,null);
  if(tier>=1)box(c,-10,2,18,4,2,'#507b6b',outline,1);
  if(tier>=2)poly(c,[[-13,-9],[-10,-13],[-8,-2],[-11,6],[-14,2]],light,outline,1.2);
  if(tier>=3)box(c,6,-7,6,12,3,'#d4ba79',outline,1.2);
 }else if(index===3){
  // 舷边护板压在甲板上方，不封住橡胶裙边的下缘。
  poly(c,[[-14,-8],[5,-12],[15,-4],[12,9],[-9,12],[-15,4]],body,outline,1.8);
  poly(c,[[-12,-6],[4,-9],[12,-3],[9,0],[-10,-2]],light,null);
  if(tier>=1)box(c,-13,5,25,4,2,'#daba73',outline,1.2);
  if(tier>=2)for(const x of [-11,8])box(c,x,-4,4,11,1,'#476d60',outline,1);
  if(tier>=3)poly(c,[[-14,-10],[3,-14],[14,-7],[13,-3],[3,-9],[-13,-6]],light,outline,1.2);
 }else if(index===5){
  // 电动车强化前罩保持窄立面，不能长成履带车装甲。
  poly(c,[[-8,-12],[7,-10],[10,10],[3,15],[-10,10]],body,outline,1.8);
  poly(c,[[-6,-10],[1,-9],[-1,8],[-7,9]],light,null);
  if(tier>=1)box(c,-10,8,21,4,2,'#d7c591',outline,1.2);
  if(tier>=2)for(const x of [-11,8])box(c,x,-7,3,17,2,'#526c53',outline,1);
  if(tier>=3)box(c,-7,-14,15,4,2,light,outline,1.2);
 }else{
  // 轮车短护板、重坦复合侧甲和消防车折面防护各用自己的宽高。
  const w=[1,6].includes(index)?29:index===4?26:23,h=[1,6].includes(index)?22:17;
  poly(c,[[-w/2,-h/2+3],[-w/2+4,-h/2],[w/2-3,-h/2],[w/2,h/2-2],[w/2-5,h/2],[-w/2,h/2-2]],body,outline,1.9);
  poly(c,[[-w/2+3,-h/2+3],[w/2-4,-h/2+2],[w/2-5,-1],[-w/2+4,0]],light,null);
  if(tier>=1)box(c,-w/2-1,h/2-2,w+2,4,1,'#546f56',outline,1.1);
  if(tier>=2)for(const x of [-w/2-2,w/2-2])box(c,x,-h/2+3,4,h-4,1,index===4?'#eed49b':'#b9c393',outline,1.2);
  if(tier>=3){box(c,-w/2,-h/2-4,w,5,2,light,outline,1.4);box(c,-8,2,16,5,1,body,outline,1.2);}
 }
 for(let i=0;i<=detail;i++)oval(c,-6+i*3,6,1,1,'#f4dca0',outline,.55);
}

// 动力级别增加机舱、散热、供能和外侧管路，不旋转完整发动机假装运动。
function engine(c,index,level){
 const n=Math.min(4,level-1),[body,light]=COLORS[index]||COLORS[0];
 if(index===2){
  // 双涡轮舱位于驾驶舱两侧，避开主轴与尾桨。
  box(c,-8,-10,16,22,6,body,outline,1.9);oval(c,0,-7,6,4,'#355b50',outline,1.2);oval(c,0,-7,3,2,light);
  box(c,-6,0,12,6,2,light,outline,1);
  if(n>=2)box(c,-11,-4,4,14,2,'#d4ba79',outline,1);
  if(n>=3)box(c,6,-5,6,17,3,'#507b6b',outline,1.3);
  if(n===4){box(c,-8,-16,16,5,2,light,outline,1.2);oval(c,9,10,3,2,'#355b50',outline,1);}
 }else if(index===3){
  box(c,-11,-7,22,15,4,body,outline,1.7);box(c,-9,-5,7,9,2,light,outline,1);
  if(n>=2)box(c,8,-12,5,20,2,'#daba73',outline,1.2);
  if(n>=3)box(c,-15,-4,5,12,2,'#3f8776',outline,1.2);
  if(n===4)box(c,-8,7,18,5,2,light,outline,1.2);
 }else if(index===5){
  box(c,-13,-7,26,14,3,'#526c53',outline,1.7);box(c,-10,-5,20,7,2,light,outline,1);
  if(n>=2)for(const x of [-10,6])box(c,x,-8,4,16,1,body,outline,1);
  if(n>=3)box(c,-8,7,18,5,2,body,outline,1.2);
  if(n===4){box(c,-16,-3,4,8,1,'#d7c591',outline,1);box(c,12,-3,4,8,1,'#d7c591',outline,1);}
 }else{
  const w=index===1?23:20;box(c,-w/2,-10,w,22,4,body,outline,1.8);box(c,-w/2+3,-7,w-6,11,2,'#3f5948',outline,1.1);
  for(let k=0;k<3;k++)box(c,-w/2+4,-6+k*3,w-8,1.5,.5,light,null);
  if(n>=2)box(c,-w/2-4,-5,5,16,2,index===4?'#eed49b':'#b9c393',outline,1.2);
  if(n>=3){box(c,w/2-1,-16,6,22,2,'#546f56',outline,1.3);box(c,w/2-2,-17,8,4,1,'#d4ba79',outline,1);}
  if(n===4){box(c,-8,7,16,8,2,light,outline,1.3);for(let k=0;k<3;k++)box(c,-5+k*4,9,2,4,.5,body,null);}
 }
 for(let k=0;k<n;k++)box(c,-5+k*3,2,1.5,3,.5,'#e8d29a',null);
}

// 一级返回原部件图卡；升级后正式车体、图卡、装配飞入均复用此入口。
export function drawVehicleUpgradePart(c,index,key,level){
 if(level<=1||!['armor','engine'].includes(key))return false;
 if(key==='armor')armor(c,index,level);else engine(c,index,level);return true;
}
