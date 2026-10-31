import {createRenderCanvas,canvasRecoveryRevision} from './canvas-recovery.js';
import {recoverSharedRenderCaches} from './render-cache-recovery.js';
// 手机演练场按世界坐标绘制，角色、怪物、植被和火力直接复用正式模块。
import {drawTrialPlayer,drawTrialCompanions} from './workshop.js';
import {drawSlime,drawEnemyWarning} from './enemies.js';
import {drawTreeSprite} from './tree-art.js';
import {drawGravityFields} from './gravity-gun.js';
import {TRIAL_ORIGIN as O,TRIAL_RADIUS} from '../config/weapon-trial-scenes.js';
import {box,oval,poly} from './primitives.js';
import {canvasFont} from './text-style.js';
// 林缘树木只做外围衔接，真采集树来自会话，不以装饰树充当可砍目标。
const borderTrees=Array.from({length:16},(_,i)=>({id:900+i,x:O.x+Math.cos(i*Math.PI/8)*520,y:O.y+Math.sin(i*Math.PI/8)*520,type:'decoration',variant:i%3?'round':'pine',palette:0,size:1}));
const sceneTrees=new WeakMap();
// 只在进入时借用正式树绘制生成四张小图，避免与暂停中的森林季节图集每帧互相清空。
function treeImage(session,tree,night,root){
 if(session.treeCanvasRevision!==canvasRecoveryRevision()){releaseTrialSceneGraphics(session);session.treeCanvasRevision=canvasRecoveryRevision();}
 let cache=sceneTrees.get(session);if(!cache){cache=new Map();sceneTrees.set(session,cache);}
 const species=tree.variant==='pine'?'pine':'round',key=species+':'+night;
 if(!cache.has(key)){const canvas=createRenderCanvas(root);canvas.width=128;canvas.height=160;const c=canvas.getContext('2d');c.translate(64,145);drawTreeSprite(c,{id:0,variant:species,palette:0},night,0,false,'summer');cache.set(key,canvas);}
 return cache.get(key);
}
// 关闭时主动释放最多四张128×160植被图，不常驻多份场景资源。
export function releaseTrialSceneGraphics(session){const cache=sceneTrees.get(session);if(cache)for(const image of cache.values()){image.width=1;image.height=1;}sceneTrees.delete(session);}
// 视口使用等比世界投影，不把横向小画布拉伸成手机；远射场保留纵向长射线。
export function trialSceneView(session,width,height){
 const g=session.game,zoom=Math.min(width/560,height/(session.spec.long?1040:690));
 return {zoom,x:g.player.x-width/zoom/2,y:g.player.y-height/zoom*(session.spec.long?.78:.72),width:width/zoom,height:height/zoom};
}
// 稀疏地面线与布阵点帮助理解武器距离，不画不能真实挡弹的掩体。
export function drawWeaponTrialScene(c,session,{night=false,reduced=false,stick=null}={}){
 recoverSharedRenderCaches();
 const {width,height}=c.canvas,g=session.game,view=trialSceneView(session,width,height),n=night?1:0;
 c.setTransform(1,0,0,1,0,0);c.fillStyle=night?'#526d60':'#9dbb78';c.fillRect(0,0,width,height);
 c.save();c.scale(view.zoom,view.zoom);c.translate(-view.x,-view.y);
 oval(c,O.x,O.y,535,540,night?'#65785f':'#bdd08c','#557754',3);
 // 土色射道与分散脚印保持低对比，主攻击区域开阔。
 const kind=g.weapon().id,summon=!!g.weapon().controller,spread=['shotgun','flame','chainsaw'].includes(kind),area=['grenade','arc','ricochet','gravity-gun'].includes(kind);
 const sand=night?'#8a8b72':'#ddd1a0';
 if(summon)oval(c,O.x,session.spawn.y-70,280,285,sand);
 else if(area)oval(c,O.x,session.spawn.y-230,240,210,sand);
 else if(spread)poly(c,[[O.x-85,session.spawn.y+100],[O.x+85,session.spawn.y+100],[O.x+240,session.spawn.y-320],[O.x-240,session.spawn.y-320]],sand);
 else poly(c,[[O.x-170,O.y+490],[O.x+125,O.y+490],[O.x+100,O.y-470],[O.x-115,O.y-470]],night?'#8a8b72':'#ddd1a0');
 c.strokeStyle=night?'#9da38a':'#879e70';c.lineWidth=2;
 c.setLineDash([12,14]);c.beginPath();c.arc(O.x,O.y,TRIAL_RADIUS,0,Math.PI*2);c.stroke();c.setLineDash([]);
 for(let distance=100;distance<=(session.spec.long?700:area||summon||spread?300:400);distance+=100){
  const y=session.spawn.y-distance;if(y<O.y-520)continue;
  c.beginPath();if(area||summon||spread)c.ellipse(session.spawn.x,session.spawn.y,distance,distance,0,-Math.PI*.85,-Math.PI*.15);else{c.moveTo(O.x-95,y);c.lineTo(O.x+95,y);}c.stroke();
  c.font=canvasFont(14,600);c.fillStyle=night?'#e1dec0':'#52694c';c.textAlign='left';c.fillText(distance+'米',O.x+105,y+4);
 }
 for(const [x,y] of session.spec.points)oval(c,session.spawn.x+x,session.spawn.y+y,26,15,night?'#77856d':'#c7c697','#84946b',1.4);
 drawGravityFields(c,g,reduced);
 for(const e of g.enemies)drawEnemyWarning(c,e);
 const objects=[...borderTrees,...g.trees.filter(t=>t.hp>0),...g.enemies,...g.remnants,{...g.player,type:'trial-player'}].sort((a,b)=>a.y-b.y);
 for(const item of objects){
  if(item.x<view.x-130||item.x>view.x+view.width+130||item.y<view.y-50||item.y>view.y+view.height+180)continue;
  if(item.type==='trial-player')drawTrialPlayer(c,g,reduced);
  else if(item.type==='enemy')drawSlime(c,item,g.time,reduced);
  else{
   c.save();c.translate(item.x,item.y);c.scale(item.size||1,item.size||1);
   if(g.player.y<item.y&&Math.abs(g.player.x-item.x)<65&&item.y-g.player.y<140)c.globalAlpha=.45;
   c.drawImage(treeImage(session,item,n,c.canvas.ownerDocument||document),-64,-145);c.restore();
  }
 }
 drawTrialCompanions(c,g,reduced);
 // 耐久条只贴目标头顶，既能观察范围命中，也不会挡住脚底与射线。
 for(const e of g.enemies)if(e.hp>0){box(c,e.x-19,e.y-48,38,4,2,'#3f5e4b');box(c,e.x-18,e.y-47,36*e.hp/e.maxHp,2,1,'#f1da95');}
 // 使用正式命中产生的数字与寿命，保持战场字体、描边和暴击反馈。
 c.save();c.textAlign='center';c.strokeStyle='#41503a';c.lineWidth=3;c.lineJoin='round';
 for(const number of g.numbers){
  c.globalAlpha=Math.min(1,number.life*2);c.font=canvasFont(number.big?22:17,900);
  c.strokeText(number.text,number.x,number.y);c.fillStyle=number.color;c.fillText(number.text,number.x,number.y);
 }
 c.restore();
 c.restore();
 // 摇杆仅在手指按住时出现，屏幕空间反馈不参与物理坐标。
 if(stick){const ratio=width/c.canvas.getBoundingClientRect().width;c.save();c.scale(ratio,ratio);oval(c,stick.x,stick.y,38,38,'#fff1c54d','#e5e9c3',2);oval(c,stick.x+stick.dx,stick.y+stick.dy,15,15,'#e6d6a2','#4e7155',2);c.restore();}
 return view;
}
