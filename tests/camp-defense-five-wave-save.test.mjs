// 十波旧档一次迁移为五波检查点，已完成奖励和场次不因刷新重复缩减。
import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMP_GATES,CAMP_DEFENSE,CAMP_DEFENSE_GROWTH_VERSION,campDefenseReward,campDefenseGrade} from '../src/config/camp-defense.js';
import {validateCampDefense} from '../src/progression/camp/camp-defense.js';

test('旧十波按进度折算，重复校验不再迁移且保留伤势与击杀',()=>{
 for(let oldWave=1;oldWave<=10;oldWave++){
  const result=validateCampDefense({runs:7,run:{gateId:CAMP_GATES[0].id,growthVersion:3,rounds:7,wave:oldWave,cleared:oldWave-1,waveKills:12,kills:170,gateHp:840,bossHp:1200,phase:'waves'}});
  assert.equal(result.run.wave,Math.ceil(oldWave/2));assert.equal(result.run.cleared,Math.floor((oldWave-1)/2));
  assert.equal(result.run.waveKills,12);assert.equal(result.run.kills,170);assert.equal(result.run.gateHp,840);assert.equal(result.run.bossHp,1200);
  assert.equal(result.run.growthVersion,CAMP_DEFENSE_GROWTH_VERSION);assert.equal(result.runs,7);assert.deepEqual(validateCampDefense(result),result);
 }
});

test('旧领主与待领奖检查点仍可获得完整奖励，旧六波获救保留A级',()=>{
 for(const phase of ['boss-ready','boss','spoils','result']){
  const bossDefeated=['spoils','result'].includes(phase);
  const result=validateCampDefense({runs:2,run:{gateId:CAMP_GATES[0].id,wave:10,cleared:10,waveKills:63,kills:405,gateHp:1000,bossHp:700,phase,bossDefeated}});
  assert.equal(result.run.wave,5);assert.equal(result.run.cleared,5);assert.equal(result.run.waveKills,58);assert.equal(result.run.bossHp,700);
  assert.equal(result.run.phase,phase==='spoils'?'result':phase);assert.deepEqual(validateCampDefense(result),result);
  if(bossDefeated)assert.equal(campDefenseReward(result.run).coins,CAMP_DEFENSE.grades.S.coins+CAMP_DEFENSE.spoils.bonus.coins);
 }
 const result=validateCampDefense({run:{gateId:CAMP_GATES[0].id,growthVersion:3,wave:7,cleared:6,phase:'result',reason:'death'}});
 assert.equal(result.run.cleared,3);assert.equal(campDefenseGrade(result.run),'A');
});
