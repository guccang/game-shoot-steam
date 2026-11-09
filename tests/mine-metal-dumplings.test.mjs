// 地下外观覆盖全地表团子家族，旧种类与存档仍控制数值和奖励。
import test from 'node:test';
import assert from 'node:assert/strict';
import {MINE_DUMPLINGS,mineDumplingForm,mineDumplingSnapshot} from '../src/config/mine-dumplings.js';
import {MONSTER_FAMILIES} from '../src/config/monster-families.js';
import {MINE_ANIMALS} from '../src/config/mine-ecology.js';
import {advanceMineDumplingMotion,hitMineDumpling} from '../src/combat/mine-dumpling-motion.js';
import {dumplingPose} from '../src/combat/dumpling-motion.js';
import {mineMetalColor,mineMetalContext} from '../src/rendering/mine-metal-palette.js';

test('三类旧生态身份产生十种稳定外观，覆盖八个地表团子兵种',()=>{
 const seen=new Set();for(const kind of Object.keys(MINE_ANIMALS))for(let x=-30;x<40;x++)for(let y=0;y<10;y++){
  const a={kind,key:x+','+y,x:0,y:0,hp:30},form=mineDumplingForm(a);seen.add(form.id);
  assert.equal(form.kind,kind);assert.equal(mineDumplingForm({...a,x:999,y:333}).id,form.id);assert.equal(mineDumplingForm(JSON.parse(JSON.stringify(a))).id,form.id);
 }
 assert.equal(seen.size,10);assert.deepEqual(new Set(MINE_DUMPLINGS.map(f=>f.species)),new Set(MONSTER_FAMILIES.dumpling.members));
});
test('真实位移推进胶体动作，原地停止保留步态相位并衰减，连续受击不锁死',()=>{
 const a={kind:'beetle',key:'1,1',x:100,y:100,hp:48,clock:0};advanceMineDumplingMotion(a,.05);assert.equal(a.gelStep,0);a.x+=3;advanceMineDumplingMotion(a,.05);assert.ok(a.gelStep>0&&a.gelMove>0);
 const step=a.gelStep,move=a.gelMove;for(let i=0;i<20;i++)advanceMineDumplingMotion(a,.05);assert.equal(a.gelStep,step);assert.ok(a.gelMove<move*.01);
 hitMineDumpling(a,{direction:{x:-1,y:0}});advanceMineDumplingMotion(a,.05);hitMineDumpling(a);assert.equal(a.gelHitAge,.05);assert.notEqual(dumplingPose(mineDumplingSnapshot(a)).squash,0);
 assert.deepEqual(dumplingPose(mineDumplingSnapshot(a),true),{squash:0,lift:0,sway:0});
});
test('攻击和死亡读取地下真实时钟，快照不覆盖AI身份及属性',()=>{
 const a={kind:'spore',key:'2,3',x:10,y:30,hp:60,phase:'windup',timer:.5,aimX:110,aimY:30},before=structuredClone(a),s=mineDumplingSnapshot(a);
 assert.equal(s.assault.phase,'windup');assert.ok(s.assault.elapsed>0);assert.equal(s.assault.dirX,1);assert.equal(s.burst,false);assert.deepEqual(a,before);
 a.hp=0;a.death=.3;assert.equal(mineDumplingSnapshot(a).life,.3);assert.equal(mineDumplingSnapshot(a).burst,true);
});
test('金属灰保留透明度与明暗，代理不污染其他实体画笔或产生位图',()=>{
 assert.equal(mineMetalColor('#ffffff80'),'#d1d9d680');assert.equal(mineMetalColor('#000'),'#40534d');assert.notEqual(mineMetalColor('#a9c879'),mineMetalColor('#f4dca0'));
 const c={fillStyle:'#fff',strokeStyle:'#000',marker(){return this===c;}},p=mineMetalContext(c);assert.equal(p,mineMetalContext(c));assert.equal(p.marker(),true);p.fillStyle='#a9c879';assert.equal(c.fillStyle,'#a0aaac');c.fillStyle='#a9c879';assert.equal(c.fillStyle,'#a9c879');
});
