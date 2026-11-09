// 浮游炮默认镜头、实际屏幕边界与高级武器首次购买价格的回归检查。
import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatCamera} from '../src/rendering/camera.js';
import {funnelFlightBounds} from '../src/combat/funnel-movement.js';
import {freshProgress,WEAPONS} from '../src/game.js';
import {RECOMMENDED_ECONOMY} from '../src/config/economy.js';
import {equipmentRecipe} from '../src/progression/workshop/equipment-goals.js';
import {quoteWorkshop} from '../src/progression/workshop/workshop.js';
import {transactProgress} from '../src/progression/economy/transactions.js';
import {campProgress} from '../src/progression/camp/camp-level.js';
const prices={pulse:30000,funnel:48000,drone:36000,'mechanical-core':44000,'mechanical-spider':56000,'gravity-gun':20000};

test('浮游炮与默认镜头完全一致，切枪及缩屏不放大视野，狙击和无人机保持专属倍率',()=>{
 for(const [width,height] of [[320,568],[390,844],[580,928]])for(const reduced of [false,true]){
  const normal=new CombatCamera(),funnel=new CombatCamera(),player={x:900,y:700};
  for(let i=0;i<60;i++){
   player.x++;player.y--;
   assert.deepEqual(funnel.update(player,width,height,{kind:'funnel',target:{type:'enemy',hp:100},focus:{x:1900,y:700}},i/60,reduced),normal.update(player,width,height,null,i/60,reduced));
  }
  for(const kind of ['sniper','drone'])assert.equal(funnel.update(player,width,height,{kind},2).zoom,width<500?.6:.75);
  assert.equal(funnel.update(player,width,height,{kind:'funnel'},3).zoom,width<500?.85:1.05);
 }
});

test('炮体边界按默认镜头投影保留左右和上下界面空间',()=>{
 for(const [width,height] of [[320,568],[390,844],[580,568]])for(const margin of [0,25]){
  const player={x:900,y:700},v=new CombatCamera().update(player,width,height,{kind:'funnel'}),b=funnelFlightBounds({width,height},margin);
  assert.ok((player.x+b.minX-v.x)*v.zoom>=40+margin-1e-6);
  assert.ok((player.x+b.maxX-v.x)*v.zoom<=width-94-margin+1e-6);
  assert.ok((player.y+b.minY-v.y)*v.zoom>=150-1e-6);
  assert.ok((player.y+b.maxY-v.y)*v.zoom<=height-225+1e-6);
 }
});

// 仅补齐独立购买前提，使用真实报价与支付验证金币不足时的原子性。
function funded(index){const p=freshProgress();p.arrival=null;p.restoration.repaired=['weapons'];p.bosses=999;
 for(const chapter of Object.values(p.story.chapters))chapter.completed=true;
 const r=equipmentRecipe('weapons',index,p);p.coins=r.coins;p.wood=r.wood;for(const key of ['parts','crystal','core'])p.materials[key]=r[key];return p;}

test('六种高级武器展示、报价和实扣一致，少一金币拒绝购买，精确余额成功扣空',()=>{
 for(const [id,coins] of Object.entries(prices)){
  const index=WEAPONS.findIndex(w=>w.id===id),p=funded(index),plan={kind:'weapons',index,action:'buy'};
  const payable=Math.ceil(coins*campProgress(p).percent/100);
  assert.equal(WEAPONS[index].coins,coins);assert.equal(equipmentRecipe('weapons',index,p).coins,payable);
  const q=quoteWorkshop(p,plan);assert.ok(q.ok,id+': '+q.reason);assert.equal(q.rows.find(r=>r.key==='coins').need,payable);
  p.coins--;const before=structuredClone(p);assert.equal(quoteWorkshop(p,plan).ok,false);assert.equal(transactProgress(p,'weapons',index,'buy'),false);assert.deepEqual(p,before);
  p.coins++;assert.ok(transactProgress(p,'weapons',index,'buy'));assert.equal(p.coins,0);assert.equal(p.weapons[index],1);
 }
});

test('营地折扣应用新价格，独立脉冲炮塔沿用同档定价，基础武器价与材料保持原档',()=>{
 const p=freshProgress();p.campLevel.xp=999999;
 for(const [id,coins] of Object.entries(prices)){
  const i=WEAPONS.findIndex(w=>w.id===id);assert.equal(equipmentRecipe('weapons',i,p).coins,Math.ceil(coins*campProgress(p).percent/100));
 }
 assert.equal(equipmentRecipe('turret',9).coins,Math.ceil(30000*campProgress().percent/100));
 assert.equal(WEAPONS[1].coins,1800);assert.equal(WEAPONS[8].coins,8000);assert.equal(WEAPONS[14].coins,120);
 assert.equal(RECOMMENDED_ECONOMY.weapons[12].wood,2400);assert.equal(RECOMMENDED_ECONOMY.weapons[12].core,16);
});
