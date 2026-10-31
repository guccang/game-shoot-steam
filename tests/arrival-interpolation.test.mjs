// 入职高速接送回归：25Hz逻辑、60Hz表现下车身与镜头关注的乘客不能错帧。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshRangerProgress} from '../src/progression/progress.js';
import {restoreArrival,updateArrival} from '../src/core/ranger-arrival.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';
import {createFixedStep} from '../src/platform/fixed-step.js';
import {CombatCamera} from '../src/rendering/camera.js';
import {arrivalObjects} from '../src/rendering/ranger-arrival.js';

// 从正式剧情检查点启动，不用自造位移代替实际折线路线与座位关系。
function scene(phase,elapsed=.1){const g=new Game(freshRangerProgress(),()=>.5);g.start();Object.assign(g.progress.arrival,{phase,elapsed});restoreArrival(g);return g;}

test('接送车和公交持续更新同一位置对象，保留表现历史',()=>{
 for(const phase of ['bus','pickup','ride','leave']){
  const g=scene(phase),{bus,scooter}=g.arrivalScene;updateArrival(g,.04);
  assert.equal(g.arrivalScene.bus,bus,phase+'公交身份');assert.equal(g.arrivalScene.scooter,scooter,phase+'接送车身份');
 }
});

test('高速乘车中车身、前后座与跟随镜头没有周期性上下错位',()=>{
 const g=scene('ride',.3),interpolation=createRenderInterpolation(),clock=createFixedStep(),camera=new CombatCamera();let samples=0,maxError=0;
 for(let i=0;i<100;i++){
  const frame=clock.advance(1/60,dt=>{interpolation.beforeStep(g);updateArrival(g,dt);g.time+=dt;});
  const render=interpolation.sample(g,frame.alpha),view=camera.update(render.player,390,844,null,render.time),s=render.arrivalScene;
  const item=arrivalObjects(render).find(item=>item.elderVehicle);
  const screenCar=(item.y-view.y)*view.zoom,screenRider=(render.player.y-view.y)*view.zoom;
  const error=Math.abs(screenCar+RANGER.passengerFootY*view.zoom-screenRider);maxError=Math.max(maxError,error);
  assert.ok(error<1e-7,'车身与镜头角色相差 '+error+'px');assert.ok(Math.abs(s.elder.y-(s.scooter.y-27))<1e-7);
  assert.ok(Math.abs(s.scooter.x-render.player.x)<1e-7);samples++;
 }
 assert.equal(samples,100);assert.ok(maxError<1e-7);
});

test('公交到站同步插值，老人离开保持轮程推进且不写回权威坐标',()=>{
 for(const phase of ['bus','pickup','leave']){
  const g=scene(phase),interpolation=createRenderInterpolation(),before={...g.arrivalScene[phase==='bus'?'bus':'scooter']},wheel=g.arrivalScene.wheelPhase;
  interpolation.beforeStep(g);updateArrival(g,.04);const current=g.arrivalScene[phase==='bus'?'bus':'scooter'],saved={...current};
  const render=interpolation.sample(g,.5),point=render.arrivalScene[phase==='bus'?'bus':'scooter'];
  assert.ok(Math.abs(point.y-(before.y+current.y)/2)<1e-7,phase);assert.deepEqual(current,saved);
  if(phase==='bus'){assert.ok(Math.abs(render.player.y-(point.y-20))<1e-7);}else{assert.ok(Math.abs(render.arrivalScene.elder.y-(point.y-27))<1e-7);assert.notEqual(g.arrivalScene.wheelPhase,wheel);}
 }
});

test('暂停和读档恢复不复用旧场景的车辆插值历史',()=>{
 const g=scene('ride'),interpolation=createRenderInterpolation();interpolation.beforeStep(g);updateArrival(g,.04);g.pause();
 assert.equal(interpolation.sample(g,.2).arrivalScene.scooter.y,g.arrivalScene.scooter.y);
 const previous=g.arrivalScene;restoreArrival(g);assert.notEqual(g.arrivalScene,previous);
 assert.equal(interpolation.sample(g,.2).arrivalScene.scooter.y,g.arrivalScene.scooter.y);
});
