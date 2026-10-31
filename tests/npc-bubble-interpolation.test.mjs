// 居民头顶UI与Canvas同帧定位回归，模拟25Hz逻辑和60Hz显示而非额外平滑坐标。
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';
import {createFixedStep} from '../src/platform/fixed-step.js';
import {createCompactSpeech} from '../src/ui/compact-speech.js';
import {placeSceneHit} from '../src/ui/scene-hit.js';
import {sceneResident} from '../src/ui/scene-resident.js';
import {createStoryChatter} from '../src/ui/story-chatter.js';
import {storyCueInfo} from '../src/rendering/story-guidance.js';
import {nearest,WORLD} from '../src/world/coordinates.js';

// 仅替代浏览器尺寸接口，位置计算与插值使用正式实现；实机另验换行和裁切。
function fixture(){
 const rect={left:0,top:0,width:390,height:844},frame={append(){},getBoundingClientRect:()=>rect};
 const root={getElementById:()=>frame,querySelector:()=>null,createElement:()=>({hidden:true,dataset:{},textContent:'',offsetWidth:140,offsetHeight:30,style:{setProperty(k,v){this[k]=v;}},getAttribute(k){return this[k];},setAttribute(k,v){this[k]=v;},remove(){}})};
 const actor={id:'snow',type:'living-resident',name:'雪团',x:1000,y:1100,elevation:0};
 const game={state:'playing',mapId:'forest',player:{x:1000,y:1150},livingActors:new Map([[actor.id,actor]])};
 const renderer={game,canvas:frame,view:null},speech=createCompactSpeech(root,'test'),hit=root.createElement();
 return {game,actor,renderer,speech,hit,frame,root};
}

test('移动、镜头跟随及停止时气泡和交谈轮廓逐帧贴合居民表现位置',()=>{
 const {game,actor,renderer,speech,hit,frame}=fixture(),interpolation=createRenderInterpolation(),clock=createFixedStep();let distinct=0;
 for(let i=0;i<180;i++){
  const timing=clock.advance(1/60,dt=>{interpolation.beforeStep(game);if(i<120){actor.x+=55*dt;actor.y+=25*dt;actor.elevation+=10*dt;game.player.x+=100*dt;game.player.y+=40*dt;}});
  const rendered=interpolation.sample(game,timing.alpha);renderer.renderGame=rendered;const visible=rendered.livingActors.get('snow');
  renderer.view={x:rendered.player.x-195,y:rendered.player.y-480,w:390,h:844,zoom:1};const v=renderer.view;
  assert.ok(speech.show(actor,'热饼留给晚归的人。',renderer));placeSceneHit(hit,actor,renderer,frame,{width:50,height:64});
  assert.ok(Math.abs(Number(speech.node.dataset.anchorX)-(visible.x-v.x))<1e-8);
  assert.ok(Math.abs(Number(speech.node.dataset.anchorY)-(visible.y-visible.elevation-62-v.y))<1e-8);
  assert.ok(Math.abs(parseFloat(hit.style.left)-(visible.x-v.x-25))<1e-8);
  if(Math.abs(actor.x-visible.x)>.1)distinct++;
 }
 assert.ok(distinct>50,'必须覆盖逻辑位置与显示位置不同的中间帧');
});

test('周期接缝、传送和暂停沿用正式插值重置，不拖动旧位置',()=>{
 const {game,actor,renderer}=fixture(),interpolation=createRenderInterpolation();
 interpolation.beforeStep(game);actor.x+=400;renderer.renderGame=interpolation.sample(game,.2);assert.equal(sceneResident(renderer,actor).x,actor.x);
 interpolation.beforeStep(game);actor.x+=4;game.state='paused';renderer.renderGame=interpolation.sample(game,.2);assert.equal(sceneResident(renderer,actor).x,actor.x);
 game.state='playing';actor.x=WORLD.width-1;interpolation.beforeStep(game);actor.x=1;renderer.renderGame=interpolation.sample(game,.5);
 // 最短周期投影由正式nearest处理，不自行取整或生成第二条运动轨道。
 assert.ok(Math.abs(nearest(sceneResident(renderer,actor),{x:0,y:actor.y}).x)<1e-8);
});

test('无表现快照、未注册居民与静态场景目标直接返回原对象',()=>{
 const {actor,renderer}=fixture();assert.equal(sceneResident(renderer,actor),actor);
 const site={id:actor.id,x:20,y:30};assert.equal(sceneResident(renderer,site),site);
 const other={...actor};renderer.renderGame={livingActors:new Map([[actor.id,{...actor,x:1}]])};assert.equal(sceneResident(renderer,other),other);
});

test('玩家步行和骑乘短句使用当前显示帧，移动停止均不追逐逻辑坐标',()=>{
 const {game,renderer,frame,root}=fixture(),interpolation=createRenderInterpolation(),clock=createFixedStep();
 Object.assign(game.player,{x:2000,y:2000});game.vehicle={active:false};game.enemies=[];
 game.story={chapterId:'sunleaf-01',stageId:'Q30',phase:'active',activeCue:{id:'supply-care',speaker:'player',text:'连备用零件都留下了……她一定打算自己回来取。'}};
 let node;const create=root.createElement;root.createElement=()=>node=create();const chatter=createStoryChatter({game,root,renderer});let middleFrames=0;
 for(let i=0;i<180;i++){
  game.vehicle.active=i>=60;
  const timing=clock.advance(1/60,dt=>{interpolation.beforeStep(game);if(i<120){game.player.x+=180*dt;game.player.y+=60*dt;}});
  renderer.renderGame=interpolation.sample(game,timing.alpha);const visible=renderer.renderGame.player;
  renderer.view={x:visible.x-195,y:visible.y-480,w:390,h:844,zoom:1};
  const info=storyCueInfo(renderer.renderGame);chatter.renderFrame();assert.equal(node.hidden,false);
  assert.ok(Math.abs(Number(node.dataset.anchorX)-195)<1e-8);
  assert.ok(Math.abs(Number(node.dataset.anchorY)-(480-info.head))<1e-8);
  assert.equal(game.story.activeCue.visible,true);
  if(Math.abs(game.player.x-visible.x)>.1)middleFrames++;
 }
 assert.ok(middleFrames>50);renderer.renderGame=null;chatter.renderFrame();assert.equal(node.hidden,false);
 chatter.dispose();
});
