// 武器强化件只在升级后出现；保留原装主体、活动轴线和每个枪种的材质身份。
import { box, oval, poly, outline } from './primitives.js';

// 按真实结构分族，弹仓、罐体、能源和通信部件使用不同剪影。
export function upgradeFamily(index){
  if([1,4,9,10,11].includes(index))return 'energy';
  if([5,7,20].includes(index))return 'fluid';
  if([12,13,15,16].includes(index))return 'control';
  if(index===14)return 'saw';
  return 'ballistic';
}

// 每个型号沿用自己的中间色；高光、冷阴影与森林绿描边统一。
function palette(index){
  const body={0:'#737d70',1:'#698877',3:'#b27b50',4:'#847799',5:'#65a6b6',6:'#7c8564',7:'#be664b',8:'#55717a',9:'#496b69',10:'#75648f',11:'#608f9c',12:'#bcbfa0',13:'#a0b68d',14:'#c69a55',15:'#90a875',16:'#90a875',17:'#718672',18:'#90a875',19:'#90a875',20:'#83ad9b'}[index]||'#718672';
  const light=[5,11,20].includes(index)?'#bee6dd':[4,10].includes(index)?'#dbd1e7':'#d8dfb4';
  return {body,light,dark:'#476552',metal:'#a8bba4',brass:'#d2b578'};
}

// 两条支架之间保留透明开口，不用实心块遮住枪管、电极或运动零件。
function frame(c,x,y,w,h,color){
  box(c,x,y,w,3,1,color,outline,1.2);box(c,x,y+h-3,w,3,1,color,outline,1.2);
  box(c,x,y+2,3,h-4,1,color,outline,1.1);
}

// 正式战场、工坊小件及拆装共用；返回false时保留原版一级或车体部件。
export function drawUpgradePart(c,index,key,level){
  // 水枪扩容件采用柔软水袋，袋口、底部折边与水滴区别于刚性弹罐。
  if(index===5&&key==='capacity'){
    const h=16+Math.min(4,Math.max(0,level-1))*2;
    c.beginPath();c.moveTo(-4,-h/2);c.lineTo(4,-h/2);
    c.bezierCurveTo(8,-h/2+3,10,h/2-3,8,h/2);c.lineTo(-7,h/2);
    c.bezierCurveTo(-11,h/2-3,-8,-h/2+3,-4,-h/2);c.closePath();
    c.fillStyle='#93bcb4';c.fill();c.strokeStyle=outline;c.lineWidth=1.5;c.stroke();
    box(c,-4,-h/2-3,8,4,1,'#fff6dc',outline,1.2);
    poly(c,[[0,-5],[-3,0],[-2,3],[2,3],[3,0]],'#d8eee2',outline,.8);
    c.beginPath();c.moveTo(-5,h/2-3);c.lineTo(5,h/2-3);c.stroke();return true;
  }
  if(index===2||level<=1||['armor','engine'].includes(key))return false;
  const family=upgradeFamily(index),p=palette(index),n=Math.min(4,level-1),tier=key==='damage'?Math.min(3,Math.floor((level-1)/5)):Math.floor(n/2);
  const detail=key==='damage'?(level-1)%5:n;
  if(key==='damage'){
    // 折面护壳逐级加肩甲与侧锁扣，中央原有核心仍能透出。
    const w=15+tier*2,h=10+tier*2;
    poly(c,[[-w/2,-h/2],[-w/2+3,-h/2-3],[w/2-2,-h/2-3],[w/2,-h/2],[-w/2,-h/2]],p.light,outline,1.1);
    box(c,-w/2,-h/2,3,h,1,p.body,outline,1.2);
    box(c,w/2-3,-h/2,3,h,1,p.body,outline,1.2);
    box(c,-w/2,h/2-2,w,3,1,p.body,outline,1.2);
    if(tier>=1)for(const x of [-w/2-2,w/2-1])box(c,x,-2,3,6,1,p.brass,outline,.8);
    if(tier>=2)box(c,-5,-h/2-6,10,3,1,p.metal,outline,1);
    for(let i=0;i<=detail;i++)box(c,-5+i*2,h/2,1,1.8,.4,p.brass,null);
  }else if(key==='rate'){
    // 径向泵与线圈式散热分开，避免所有武器都变成同一块百叶窗。
    if(family==='fluid'){
      box(c,-5,-5,10,10,3,p.dark,outline,1.3);oval(c,0,0,4+n*.7,4+n*.7,p.body,outline,1.4);
      oval(c,0,0,2,2,p.light,outline,.8);
      if(n>=2)box(c,-7,-7,14,3,1,p.brass,outline,1);
      if(n>=3)box(c,-8,3,3,6,1,p.metal,outline,1);
    }else{
      box(c,-6,-5-n,12,10+n*2,3,p.dark,outline,1.4);
      for(let i=0;i<2+n;i++)box(c,-5,-4-n+i*2,10,1.3,.4,family==='energy'?p.light:p.metal,null);
      if(n>=2)box(c,-8,-4,3,9,1,p.body,outline,1);
      if(n===4)box(c,-5,-11,10,3,1,p.brass,outline,1);
    }
  }else if(key==='capacity'){
    if(family==='fluid'){
      const h=14+n*2;
      box(c,-8,-h/2,16,h,5,p.body,outline,1.7);
      box(c,-6,-h/2+3,4,h-6,2,p.light,null);
      for(const y of [-h/2+2,h/2-4])box(c,-9,y,18,3,1,p.brass,outline,1);
      if(n>=3){box(c,7,-7,5,14,2,p.dark,outline,1.2);box(c,8,-4,2,8,1,p.light,null);}
      box(c,-3,-h/2-3,6,3,1,p.metal,outline,1);
    }else if(family==='energy'){
      const h=11+n*2;
      poly(c,[[-7,-h/2],[-3,-h/2-3],[6,-h/2],[8,h/2-2],[3,h/2+3],[-7,h/2]],p.body,outline,1.5);
      box(c,-3,-h/2+1,6,h-2,2,p.light,outline,1);
      if(n>=2)box(c,-9,-4,4,9,1,p.dark,outline,1);
      if(n>=3)box(c,5,-4,5,9,1,p.brass,outline,1);
    }else if([6,19].includes(index)){
      box(c,-8,-5,14,13,3,p.dark,outline,1.3);
      oval(c,1,2,7+n,7+n,p.brass,outline,1.6);oval(c,1,2,3,3,p.body,outline,1);
      if(n>=3){c.beginPath();c.ellipse(1,2,5+n,5+n,0,0,Math.PI*2);c.strokeStyle=outline;c.lineWidth=1;c.stroke();}
    }else{
      const w=9+n*1.3,h=11+n*2;
      poly(c,[[-w/2,-5],[w/2,-5],[w/2+1,h-6],[w/2-3,h-3],[-w/2,h-4]],p.body,outline,1.6);
      box(c,-w/2-1,-5,w+2,3,1,p.brass,outline,1);
      for(let i=0;i<n;i++)box(c,-w/2+3,-1+i*3,w-5,1.2,.4,p.light,null);
      if(family==='control'&&n>=3)box(c,w/2,-1,4,10,1,p.metal,outline,1);
    }
  }else if(key==='reload'){
    if(family==='fluid'){
      box(c,-5,-3,11,6,2,p.metal,outline,1.2);box(c,2,-7,4,10,1,p.brass,outline,1);
      oval(c,4,-7,3+n*.4,2,p.body,outline,1);
    }else{
      box(c,-5-n*.6,-3,10+n,7,2,p.dark,outline,1.3);
      for(let i=0;i<n+1;i++)box(c,-5+i*2.4,-5,1.8,8,1,family==='energy'?p.light:p.brass,outline,.7);
      if(n>=3)box(c,-7,4,12,3,1,p.body,outline,1);
    }
  }else if(key==='range'){
    if(family==='control'){
      box(c,-4,-3,8,6,2,p.body,outline,1.2);
      box(c,-1,-7-n,2,8+n,1,p.metal,outline,1);
      oval(c,0,-7-n,2+n*.3,2+n*.3,p.light,outline,1);
      if(n>=3)box(c,-6,-7,12,2,1,p.brass,outline,1);
    }else if(family==='saw'){
      // 锯链位于上下±11，强化导板只覆盖中央；齿链仍逐齿运动。
      box(c,-8,-4,15+n,8,3,p.metal,outline,1.2);
      for(let i=0;i<n;i++)oval(c,-4+i*3,0,.9,1,p.dark);
    }else{
      const h=(index===10?28:index===9||index===18?24:12)+n;
      frame(c,-7,-h/2,11+n,h,p.body);
      if(n>=2){box(c,-4,-h/2-2,5,3,1,p.brass,outline,.8);box(c,-4,h/2-1,5,3,1,p.metal,outline,.8);}
      if(n===4)box(c,3,-h/2,3,h,1,p.metal,outline,.9);
    }
  }else if(key==='accuracy'){
    // 顶置镜座不穿过出射轴；从小准星成长为带侧护翼的瞄准组件。
    box(c,-4,0,9,3,1,p.dark,outline,1);
    box(c,-3,-3-n*.7,7+n,4+n*.7,2,p.body,outline,1.2);
    oval(c,3+n,-2-n*.3,1.5,2,p.light,outline,.8);
    if(n>=3)box(c,-6,-5,3,8,1,p.brass,outline,1);
  }else if(key==='coordination'){
    const count=Math.min(13,level);
    box(c,-11,-6,22,12,3,p.dark,outline,1.4);
    for(let i=0;i<count;i++)box(c,-8+(i%7)*2.6,-4+Math.floor(i/7)*5,1.8,3,1,p.light,null);
    for(const side of [-1,1]){box(c,side*11-1,-6-Math.floor(count/3),2,8+Math.floor(count/3),1,p.metal,outline,.8);oval(c,side*11,-6-Math.floor(count/3),1.7,1.7,p.brass,outline,.7);}
  }else return false;
  return true;
}
