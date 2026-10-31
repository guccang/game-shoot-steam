// 本次有限转向和车载扩容的正式确定性回放；旧整理前基线保留供历史比对。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { replaySummon } from './helpers/summon-parity.mjs';
const baseline=JSON.parse(readFileSync(new URL('./fixtures/summon-turn-parity.json',import.meta.url),'utf8'));
// 角速度、伤害、容量另由行为断言验证；这里检查固定种子在两种步长下持续复现。
for(const index of [12,13])for(const mounted of [false,true])for(const variable of [false,true]) {
  test(`召唤物 ${index} ${mounted?'车载':'手持'} ${variable?'变步长':'定步长'} 与转向扩容基线一致`,()=>{
    assert.equal(replaySummon(index,mounted,variable),baseline[[index,mounted,variable].join('/')]);
  });
}
