// 昼夜圆环按各自时段计时，验证离线跨期、手动切换和独立环境时钟。
import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_PHASES, DAY_CYCLE_DURATION, normalizeEnvironment, restartDayCycle, advanceEnvironment, nextDayPhase, dayPhaseRemaining } from '../src/world/environment.js';

test('昼夜按白昼黄昏夜晚循环，三个时段分别从满环走到半环和终点',()=>{
  let time='day';
  for(const next of ['dusk','night','day','dusk','night','day']) {time=nextDayPhase(time);assert.equal(time,next);}
  for(const phase of DAY_PHASES) {
    const state=normalizeEnvironment({time:phase.id,autoWeather:false},1000000);
    assert.equal(dayPhaseRemaining(state,1000000),phase.duration);
    assert.equal(dayPhaseRemaining(state,1000000+phase.duration/2),phase.duration/2);
    advanceEnvironment(state,1000000+phase.duration);
    assert.equal(state.time,nextDayPhase(phase.id));
    assert.equal(dayPhaseRemaining(state,1000000+phase.duration),DAY_PHASES.find(p=>p.id===state.time).duration);
  }
});

test('跨多个昼夜周期定位余量，时间回拨、旧锚点和暂停保持有效圆环',()=>{
  const state=normalizeEnvironment({time:'day',autoWeather:false},1000000);
  const now=1000000+DAY_CYCLE_DURATION*8+210000;
  advanceEnvironment(state,now);assert.equal(state.time,'night');assert.equal(dayPhaseRemaining(state,now),90000);
  state.autoTime=false;assert.equal(dayPhaseRemaining(state,now+900000),120000);
  state.autoTime=true;advanceEnvironment(state,100);assert.equal(dayPhaseRemaining(state,100),120000);
  delete state.dayCycleAt;assert.equal(dayPhaseRemaining(state,100),120000);
});

test('手动切换仅重置昼夜时钟，关闭自动后手动仍可前进',()=>{
  const state=normalizeEnvironment({time:'day',autoTime:false,autoWeather:false},1000000);
  const {weatherAt,seasonAt,weather,forestSeason}=state;
  state.time=nextDayPhase(state.time);restartDayCycle(state,1010000);
  assert.equal(state.autoTime,false);assert.equal(dayPhaseRemaining(state,9999999),60000);
  assert.deepEqual({weatherAt:state.weatherAt,seasonAt:state.seasonAt,weather:state.weather,forestSeason:state.forestSeason},{weatherAt,seasonAt,weather,forestSeason});
  state.autoTime=true;restartDayCycle(state,1020000);assert.equal(dayPhaseRemaining(state,1050000),30000);
});
