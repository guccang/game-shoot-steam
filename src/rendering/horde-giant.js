// 兽潮团山的矿脊、琥珀腹部与爆散战利品，全部以正式实体脚底为原点。
import {oval,poly} from './primitives.js';
import {drawResourceIcon} from './resource-icons.js';
const spoilsMaterials=['wood','parts','crystal','core'];

// 矿石半陷在软体里，岩脊随背部起伏。小树给三倍体量提供近景参照。
export function drawGiantRidge(c,top,sway){
  c.save();
  c.translate(sway,top+5);
  for(const [x,y,h,w] of [[-29,9,15,10],[-13,3,29,11],[4,1,36,13],[20,5,22,10],[33,10,12,8]]){
    poly(c,[[x-w,y],[x-w*.7,y-h*.72],[x+2,y-h],[x+w*.8,y-h*.76],[x+w,y]],'#78aa95','#416655',1.2);
    poly(c,[[x+2,y-h],[x+w*.8,y-h*.76],[x+w,y],[x+2,y-2]],'#568574',null);
    poly(c,[[x-w*.65,y-h*.7],[x+1,y-h+2],[x-2,y-h*.57]],'#daecc0',null);
  }
  poly(c,[[-40,12],[-30,5],[-18,6],[-4,0],[12,4],[23,3],[39,12],[31,15],[14,11],[0,12],[-19,10],[-33,16]],'#8fa95c','#537447',1);
  for(const [x,y,h] of [[-25,8,14],[17,6,10]]){
    poly(c,[[x-1,y],[x-1,y-6],[x-6,y-5],[x-3,y-10],[x-5,y-10],[x,y-h-5],[x+4,y-10],[x+2,y-10],[x+6,y-5],[x+1,y-6],[x+1,y]],'#436e54','#41634b',.8);
  }
  c.restore();
}

// 两侧沉积的金粒与腹内晶核随不同深度移动，露出简洁的大块胶质亮面。
export function drawGiantBelly(c,body,pose){
  // 背部通向腹沿的连续冷影，使近景胶体有厚度，沉在腹内的琥珀留在亮影交界。
  c.save();
  c.translate(0,body.bottom);
  c.scale(body.width,body.height);
  c.beginPath();c.moveTo(.43,-.87);
  c.bezierCurveTo(.84,-.77,.98,-.40,.97,-.09);
  c.bezierCurveTo(.68,.015,-.52,.035,-.94,-.065);
  c.bezierCurveTo(-.61,-.15,-.22,-.08,.22,-.21);
  c.bezierCurveTo(.77,-.35,.77,-.65,.43,-.87);
  c.fillStyle='#789d70';c.fill();c.restore();
  const y=body.face+body.height*.24;
  c.save();
  c.translate(pose.sway*.45,y);
  oval(c,0,1,body.width*.6,body.height*.115,'#87a675');
  for(const [x,dy,r] of [[-23,0,4],[-16,3,3],[17,1,4],[24,-2,2.5]]){
    oval(c,x,dy,r,r*.75,'#ddbd70','#8d945a',.8);
    oval(c,x-1,dy-1,r*.4,.7,'#f6dfa1');
  }
  poly(c,[[-8,2],[-5,-5],[1,-8],[8,-3],[7,4],[0,8]],'#f4cf76','#849057',1.2);
  poly(c,[[-5,-5],[1,-8],[3,-2],[-3,1]],'#fff2b4',null);
  c.restore();
}

// 宽眉下的金瞳和扁平嘴线压低重心，保留团子家族的豆眼与柔软腮部。
export function drawGiantFace(c,body,pose){
  c.save();c.translate(pose.sway,body.face);
  for(const side of [-1,1]){
    c.save();c.scale(side,1);
    oval(c,18,0,4.1,4.7,'#f6d77e','#49664b',1.4);
    oval(c,17.5,.3,1.7,3,'#385843');
    poly(c,[[11,-2],[12,-5],[26,-10],[25,-6],[20,-3]],'#70925f','#49664b',1);
    oval(c,31,6,4,1.5,'#ceb47b');c.restore();
  }
  c.beginPath();c.moveTo(-5,7);c.quadraticCurveTo(0,5,5,7);c.strokeStyle='#49664b';c.lineWidth=1.5;c.stroke();
  c.restore();
}

// 固定36枚战利品分两层喷出、弹地停稳。使用图标缓存和玩法时钟，不创建拾取实体。
export function drawGiantSpoils(c,burst,reduced){
  const t=burst.elapsed;
  c.save();
  c.translate(burst.x,burst.y);
  if(t<.45 && !reduced){
    c.globalAlpha=1-t/.45;
    oval(c,0,-6,48+180*t,14+52*t,'#00000000','#f5dfa1',5-7*t);
    for(let i=0;i<12;i++){
      const angle=i*2.4;
      const x=Math.cos(angle)*(58+200*t),y=-90+Math.sin(angle)*50-160*t+260*t*t;
      oval(c,x,y,(18+i%3*4)*(1-t/.48),14*(1-t/.48),'#b6d393','#587b59',1.8);
    }
    c.globalAlpha=1;
  }
  for(let i=0;i<36;i++){
    const angle=i*2.39996, radius=32+(i*i*17+i*53)%127;
    const age=Math.max(0,t-(i%4)*.035), flight=.56+(i%5)*.065;
    const p=reduced?1:Math.min(1,age/flight), after=Math.max(0,age-flight);
    const bounce=reduced?0:Math.max(0,1-after/.32)*Math.abs(Math.sin(Math.min(1,after/.32)*Math.PI))*15;
    const spread=1-(1-p)*(1-p);
    const x=Math.cos(angle)*radius*spread, ground=Math.sin(angle)*radius*.48*spread;
    const y=ground-63*(1-p)-(64+i%6*9)*4*p*(1-p)-bounce;
    oval(c,x,ground,6,2,'#435c4535');
    const material=i%4===1;
    drawResourceIcon(c,material?spoilsMaterials[(i>>2)%4]:'coins',x,y,material?25:18+i%4);
  }
  c.restore();
}
