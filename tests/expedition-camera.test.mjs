// 肉鸽远征始终采用默认战斗取景；跨模式仍恢复各自原镜头规则。
import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatCamera} from '../src/rendering/camera.js';

test('远征所有武器引导均与默认战斗镜头一致，包含移动与短横屏',()=>{
 for(const [width,height]of [[320,568],[390,844],[844,390]])for(const kind of ['sniper','pulse','funnel',undefined]){
  const camera=new CombatCamera(),baseline=new CombatCamera(),player={x:900,y:700};
  for(let frame=0;frame<30;frame++){
   player.x+=2;player.y+=1;
   const guide={kind,target:{type:'boss',hp:100},focus:{x:player.x+450,y:player.y-300}};
   assert.deepEqual(camera.update(player,width,height,guide,frame/60,false,{mode:'rogue'}),baseline.update(player,width,height,null,frame/60));
  }
 }
});

test('远征不会继承守护缩放，退出后恢复森林专用武器倍率',()=>{
 const player={x:900,y:700},camera=new CombatCamera();
 camera.update(player,390,844,null,0,false,{mode:'guardian',arena:{...player,radius:600}});camera.setZoomStep(0);
 assert.equal(camera.update(player,390,844,{kind:'sniper'},1,false,{mode:'rogue'}).zoom,.85);
 assert.equal(camera.zoomStep,0);
 assert.equal(camera.update(player,390,844,{kind:'sniper'},2).zoom,.6);
 assert.equal(camera.update(player,390,844,{kind:'pulse'},3).zoom,.85/1.2);
 assert.equal(camera.update(player,390,844,{kind:'funnel'},4,false,{mode:'rogue'}).zoom,.85);
});
