// 地层边缘为连续岩床和成组巨石，不新增位图，不用黑色矩形切掉场景实体。
import {mineBounds,mineHash} from '../config/mine-ecology.js';
import {oval,poly} from './primitives.js';
// 巨石保持宽肩轮廓、左上亮面和右侧冷影，种子决定高低与裂隙。
function bedrock(c,x,y,rx,height,hash,night){
 const ink=night?'#425f4e':'#506d52',base=night?'#788b78':'#a0ad91',light=night?'#9eae8b':'#c2c9aa',shade=night?'#5f7565':'#81957b';
 oval(c,x+3,y+1,rx*.96,8,night?'#35534455':'#4d6b4b44');
 const shoulder=.7+(hash%5)*.045;
 poly(c,[[x-rx,y-8],[x-rx*.91,y-height*.5],[x-rx*.48,y-height*.9],[x-rx*.06,y-height],[x+rx*.5,y-height*shoulder],[x+rx,y-height*.4],[x+rx*.92,y-4],[x+rx*.25,y+2],[x-rx*.56,y]],base,ink,2);
 poly(c,[[x-rx*.91,y-height*.5],[x-rx*.48,y-height*.9],[x-rx*.06,y-height],[x+rx*.5,y-height*shoulder],[x+rx*.22,y-height*.58],[x-rx*.28,y-height*.68]],light);
 poly(c,[[x+rx*.5,y-height*shoulder],[x+rx,y-height*.4],[x+rx*.92,y-4],[x+rx*.25,y+2],[x+rx*.22,y-height*.58]],shade);
 c.strokeStyle=ink;c.lineWidth=1.6;c.beginPath();c.moveTo(x-rx*.28,y-height*.68);c.lineTo(x-rx*.12,y-height*.38);c.lineTo(x-rx*.3,y-11);c.stroke();
 if(hash%3===0){oval(c,x-rx*.5,y-height*.29,13,4,night?'#7b966f':'#9eb480');oval(c,x-rx*.4,y-height*.29-3,7,3,night?'#a7b791':'#c9d5a5');}
}
// 只枚举镜头附近的巨石，四边和四角共用固定世界锚点；原地图内的空间保持开放。
export function drawMineBoundary(c,layer,rect,night){
 const b=mineBounds(layer),step=96,seed=layer.seed||1847,pieces=[],left=rect.x-140,right=rect.x+rect.w+140,top=rect.y-140,bottom=rect.y+rect.h+140;
 // 外围深处也有稀疏岩冠，镜头靠近四角时不会露出纯色空洞。
 for(let gy=Math.floor(top/110);gy<=Math.ceil(bottom/110);gy++)for(let gx=Math.floor(left/128);gx<=Math.ceil(right/128);gx++){
  const hash=mineHash(gx,gy,seed),rx=52+hash%16,height=48+(hash>>>8)%30,x=gx*128+(hash>>>16)%24,y=gy*110+(hash>>>22)%25;
  if(x+rx<b.left-60||x-rx>b.right+60||y<b.top-90||y-height>b.bottom+90)pieces.push({x,y,rx,height,hash});
 }
 for(const side of ['top','bottom'])if(b[side]>=top-100&&b[side]<=bottom+100){
  for(let i=Math.floor(left/step);i<=Math.ceil(right/step);i++){
   const x=i*step,hash=mineHash(i,side==='top'?71:73,seed),height=48+(hash>>>8)%34;
   pieces.push({x,y:side==='top'?b.top-6:b.bottom+height+2,rx:58+hash%17,height,hash});
  }
 }
 for(const side of ['left','right'])if(b[side]>=left-100&&b[side]<=right+100){
  for(let i=Math.floor(top/68);i<=Math.ceil(bottom/68);i++){
   const hash=mineHash(side==='left'?79:83,i,seed),rx=49+hash%17;
   pieces.push({x:side==='left'?b.left-rx-2:b.right+rx+2,y:i*68,rx,height:74+(hash>>>8)%25,hash});
  }
 }
 for(const p of pieces.sort((a,b)=>a.y-b.y))bedrock(c,p.x,p.y,p.rx,p.height,p.hash,night);
 return {rocks:pieces.length,bounds:{...b},opaqueMasks:0,newBitmapBytes:0};
}
