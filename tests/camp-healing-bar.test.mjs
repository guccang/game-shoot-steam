// 头顶恢复进度与各兵种预警共用真实锚点，满血无底框，战斗配色保持独立。
import test from 'node:test';
import assert from 'node:assert/strict';
import {enemyHealthBarView} from '../src/rendering/enemies.js';
import {CAMP_ROSTERS,campResidentHead} from '../src/config/camp-residents.js';

test('所有营地兵种的恢复条避开预警，进度对应真实HP',()=>{
 for(const species of new Set(Object.values(CAMP_ROSTERS).flat()))for(const campState of ['idle','alert']){
  const actor={x:100,y:200,hp:40,maxHp:100,monsterCamp:'test',species,campState},bar=enemyHealthBarView(actor);
  assert.equal(bar.color,'#a9d68b');assert.equal(bar.fraction,.4);assert.ok(bar.y+bar.height<actor.y-campResidentHead(actor));
  actor.hp=70;assert.equal(enemyHealthBarView(actor).fraction,.7);
  actor.hp=100;assert.equal(enemyHealthBarView(actor),null);
  actor.hp=0;assert.equal(enemyHealthBarView(actor),null);
 }
});
test('战斗及返程仍显示战斗血条，具名居民无血条',()=>{
 const actor={x:100,y:200,hp:40,maxHp:100,monsterCamp:'test',species:'slime'};
 for(const campState of ['chasing','returning']){const bar=enemyHealthBarView({...actor,campState});assert.equal(bar.color,'#a58aba');assert.equal(bar.y,152);assert.equal(bar.width,30);}
 assert.equal(enemyHealthBarView({...actor,campNpc:true,campState:'idle'}),null);
 assert.equal(enemyHealthBarView({...actor,monsterCamp:undefined,campState:'idle'}).color,'#a58aba');
});
