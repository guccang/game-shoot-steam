// 种地仅隐藏正式导航绘制，任务身份、临时意图与玩家显示偏好不能丢失。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {MAINLINE_IDS,MAINLINE_SITES} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {LIVING_REQUESTS} from '../src/config/living-world.js';
import {setFarmTool} from '../src/core/farm.js';
import {setTaskNavigationEnabled} from '../src/core/task-navigation.js';
import {worldNavigationObjective,requestWorldNavigation} from '../src/core/world-navigation.js';
import {livingRouteStates} from '../src/core/living-route.js';
import {drawStoryGuidance,drawStoryDestination} from '../src/rendering/story-guidance.js';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';

// 使用登塔任务存档，直接调用正式地面与实体上方绘制入口。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('tower'));p.mainline.phase='doing';const g=new Game(p,()=>.5);g.start();g.mainlineSpeech=null;g.vehicle.active=false;Object.assign(g.player,{x:1400,y:850});return g;}
// 记录两层绘制指令，宽视口覆盖目标，隐藏时必须完全没有Canvas调用。
function paint(g){const counts=[];for(const draw of [drawStoryGuidance,drawStoryDestination]){let count=0;const c=new Proxy({},{get:()=>()=>{count++;},set:()=>{count++;return true;}});draw(c,g,{x:0,y:0,w:6000,h:6000,zoom:1},true);counts.push(count);}return counts;}

test('主线、邻里及临时目标在所有农具、暂停和迎敌时均不绘制，退出恢复',()=>{
 for(const kind of ['mainline','living','visit']){
  const g=scene(),frames=createRenderInterpolation();
  if(kind==='living'){const request=LIVING_REQUESTS[0];g.progress.taskTracking={kind:'living',id:request.id};g.progress.living.requests[request.id]={stage:0,completed:false};assert.ok(livingRouteStates(g).length);}
  if(kind==='visit')requestWorldNavigation(g,MAINLINE_SITES.seedShop,'种子小屋',{direct:true});
  const task=structuredClone(g.progress.mainline),tracking=structuredClone(g.progress.taskTracking),objective=worldNavigationObjective(g);
  assert.ok(paint(frames.sample(g,.5)).every(n=>n>0),kind);
  for(const tool of ['hoe','seed','water','harvest','remove']){
   setFarmTool(g,tool);for(const state of ['playing','paused'])for(const defending of [false,true]){g.state=state;g.farmWork.autoCombat=defending;assert.deepEqual(paint(frames.sample(g,.5)),[0,0],`${kind}/${tool}/${state}/${defending}`);}g.state='playing';
  }
  setFarmTool(g,null);assert.ok(paint(frames.sample(g,.5)).every(n=>n>0),kind+'恢复');assert.deepEqual(worldNavigationObjective(g),objective);assert.deepEqual(g.progress.mainline,task);assert.deepEqual(g.progress.taskTracking,tracking);
 }
});

test('玩家关闭寻路后种地再退出，不会重新开启导航',()=>{
 const g=scene();setTaskNavigationEnabled(g,false);setFarmTool(g,'seed');assert.deepEqual(paint(g),[0,0]);setFarmTool(g,null);assert.equal(g.progress.mainline.navigationEnabled,false);assert.equal(worldNavigationObjective(g),null);assert.equal(paint(g)[1],0);
});
