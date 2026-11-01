// 祝福展示回归：选择次数与叠加层数独立，刷新保留即时祝福记录，文案对齐实际加成。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
// 开放测试场地，正式入场与祝福选择仍走游戏入口。
function scene(){const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);const g=new Game(p,()=>.4);g.start();return g;}
import { blessingSummary } from '../src/config/blessing-summary.js';
import { realmWeapon } from '../src/config/realms.js';
import { validateRealms } from '../src/progression/realm-progress.js';

// 模拟已经完成的远征关卡，选择仍经过正式校验、开战与保存入口。
function choice(game, key) {
  const r=game.realm;r.phase='choice';r.cleared=r.stage;r.offers=['power','haste','reach'];
  assert.ok(game.chooseRealmBlessing(key));
}

test('首次显示零次与零加成，累计文案对应实际线性加成和五层上限',()=>{
  const g=scene();g.enterRealm('rogue');delete g.realm.loadout;g.realm.phase='combat';
  assert.equal(blessingSummary('power',g.realm).selectionText,'累计选择 0 次');
  assert.equal(blessingSummary('power',g.realm).effect,'所有武器伤害 +0%');
  g.realm.buffs={power:3,haste:4,vitality:2,armor:5,leech:3,reach:2};
  const weapon={interval:1,reloadTime:1,range:100,chargeTime:1,cooldown:1};
  const effective=realmWeapon(weapon,g.realm.buffs);
  assert.equal(Math.round((1-effective.interval)*100),48);
  assert.equal(blessingSummary('haste',g.realm).effect,'射击、蓄能与装填耗时 −48%');
  assert.equal(effective.range,130);assert.equal(blessingSummary('reach',g.realm).effect,'所有武器射程 +30%');
  assert.equal(blessingSummary('power',g.realm).effect,'所有武器伤害 +60%');
  assert.equal(blessingSummary('vitality',g.realm).effect,'生命上限 +60');
  assert.equal(blessingSummary('armor',g.realm).effect,'受到的伤害 −60%');
  assert.equal(blessingSummary('armor',g.realm).capped,true);
  assert.equal(blessingSummary('leech',g.realm).effect,'每次击杀回复 9 点生命');
  g.realm.buffs.vitality=5;assert.match(blessingSummary('vitality',g.realm).nextEffect,/仅回复 30/);
});

test('每次合法选择只计一次，达到上限后累计次数继续记录但不虚增加成',()=>{
  const g=scene();g.enterRealm('rogue');delete g.realm.loadout;g.realm.phase='combat';
  assert.equal(g.chooseRealmBlessing('power'),false);assert.equal(g.realm.blessingCounts.power,undefined);
  for(let n=0;n<6;n++) {choice(g,'power');assert.equal(g.chooseRealmBlessing('power'),false);}
  assert.equal(g.realm.blessingCounts.power,6);assert.equal(g.realm.buffs.power,5);
  const restored=new Game(JSON.parse(JSON.stringify(g.progress)));
  const summary=blessingSummary('power',restored.realm);
  assert.equal(summary.selectionText,'累计选择 6 次');assert.equal(summary.effect,'所有武器伤害 +100%');
  assert.equal(summary.capped,true);
});

test('当前祝福次数独立保存，缺失或非法次数不从层数反推',()=>{
 const g=scene();assert.ok(g.enterRealm('rogue'));delete g.realm.loadout;g.realm.phase='combat';choice(g,'power');
 const run=structuredClone(g.progress.realms.run);
 assert.equal(validateRealms({run}).run.blessingCounts.power,1);
 delete run.blessingCounts;
 let clean=validateRealms({run}).run;assert.equal(clean.buffs.power,1);assert.equal(clean.blessingCounts.power,0);
 assert.equal(blessingSummary('power',clean).selectionText,'累计选择 0 次');
 run.blessingCounts={power:-1,heal:'<script>',mend:Infinity};clean=validateRealms({run}).run;
 assert.equal(clean.blessingCounts.power,0);assert.equal(clean.blessingCounts.heal,0);assert.equal(clean.blessingCounts.mend,0);
 assert.equal(blessingSummary('__proto__',clean),null);
});
