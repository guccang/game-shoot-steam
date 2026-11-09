// 护送表现必须与镜头同拍，存档、任务身份和正式马匹动作始终保持权威状态。
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';
import {createFixedStep} from '../src/platform/fixed-step.js';
import {tradeObjects} from '../src/rendering/camp-trade.js';
import {freshProgress} from '../src/progression/progress.js';
import {WORLD,delta} from '../src/world/coordinates.js';

// 最小正式森林场景仍通过商路显隐判断，使用真实进度结构。
function scene(){
 const progress=freshProgress();progress.trade.escort={station:'trade-near',x:100,y:100,hp:97};
 return {state:'playing',mapId:'forest',time:0,player:{x:180,y:100},progress,
  tradeMotion:{index:14,active:true,wheelPhase:0,horseFrame:3,horseMode:'walk'}};
}

test('25Hz逻辑与60Hz镜头下商队同速相对位置稳定，存档不会被插值写回',()=>{
 const game=scene(),interpolation=createRenderInterpolation(),clock=createFixedStep();
 for(let frame=0;frame<120;frame++){
  const timing=clock.advance(1/60,dt=>{interpolation.beforeStep(game);game.player.x+=dt*100;game.progress.trade.escort.x+=dt*100;game.time+=dt;});
  const saved=game.progress.trade.escort.x,view=interpolation.sample(game,timing.alpha),cart=tradeObjects(view).find(o=>o.type==='trade-cart');
  assert.ok(cart);assert.ok(Math.abs(view.player.x-cart.x-80)<1e-8);
  assert.equal(game.progress.trade.escort.x,saved);assert.equal(view.progress,game.progress);assert.equal(cart.hp,97);
 }
});

test('车轮跨整周沿短方向滚动，马匹帧和受损数值仍来自正式动作',()=>{
 const game=scene(),interpolation=createRenderInterpolation();game.tradeMotion.wheelPhase=6.2;interpolation.beforeStep(game);
 game.tradeMotion.wheelPhase=.1;game.tradeMotion.horseFrame=8;game.progress.trade.escort.hp=96;
 const view=interpolation.sample(game,.5);
 assert.ok(Math.abs(delta(view.tradeMotion.wheelPhase-6.2,Math.PI*2))<.1);
 assert.equal(view.tradeMotion.horseFrame,8);assert.equal(view.tradeEscort.hp,96);assert.equal(game.tradeMotion.wheelPhase,.1);
});

test('暂停、移除、读档替换和传送不复活旧车，世界接缝按最近位移插值',()=>{
 const game=scene(),interpolation=createRenderInterpolation();game.progress.trade.escort.x=WORLD.width-2;interpolation.beforeStep(game);game.progress.trade.escort.x=2;
 assert.equal(delta(interpolation.sample(game,.5).tradeEscort.x,WORLD.width),0);
 game.state='paused';assert.equal(interpolation.sample(game,0).tradeEscort.x,2);
 game.state='playing';game.progress.trade.escort={station:'new',x:300,y:400,hp:100};assert.equal(interpolation.sample(game,0).tradeEscort.x,300);
 interpolation.beforeStep(game);game.progress.trade.escort.x+=300;assert.equal(interpolation.sample(game,0).tradeEscort.x,600);
 game.progress.trade.escort=null;assert.equal(tradeObjects(interpolation.sample(game,.5)).some(o=>o.type==='trade-cart'),false);
});
