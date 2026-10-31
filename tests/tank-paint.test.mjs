// 染色渲染协议：只替换填色，保持原生方法接收者与几何参数，缓存不会因切换层而失效。
import test from 'node:test';
import assert from 'node:assert/strict';
import {tankPaintContext} from '../src/rendering/tank-paint.js';
import {freshProgress} from '../src/progression/progress.js';
test('前后层与炮塔共享原生上下文但分别缓存，描边、几何和其他车辆不染色',()=>{
 const p=freshProgress();p.legendaryWorkshop.unlocked=true;p.legendaryWorkshop.designs[6]={hull:3,turret:4,tracks:2,badge:1};
 const calls=[],c={fillStyle:'',strokeStyle:'',fillRect(...args){assert.equal(this,c);calls.push(args);}},rear=tankPaintContext(c,p,6,'rear');
 rear.fillStyle='#a95045';assert.notEqual(c.fillStyle,'#a95045');rear.strokeStyle='#a95045';assert.equal(c.strokeStyle,'#a95045');rear.fillRect(1,2,3,4);assert.deepEqual(calls,[[1,2,3,4]]);
 const front=tankPaintContext(c,p,6,'front'),turret=tankPaintContext(c,p,6,'turret');assert.equal(tankPaintContext(c,p,6,'rear'),rear);assert.equal(tankPaintContext(c,p,6,'front'),front);assert.equal(tankPaintContext(c,p,6,'turret'),turret);assert.equal(tankPaintContext(c,p,2,'front'),c);
 p.legendaryWorkshop.designs[6].hull=5;assert.notEqual(tankPaintContext(c,p,6,'rear'),rear);p.legendaryWorkshop.unlocked=false;assert.equal(tankPaintContext(c,p,6,'rear'),c);
});
