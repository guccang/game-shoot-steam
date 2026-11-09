// 营地优惠目录与正式等级表同源，查看不改变购买价格和存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress} from '../src/progression/progress.js';
import {challengeCatalog} from '../src/progression/realms/challenge-catalog.js';
import {challengeLevelMarkup} from '../src/ui/challenge-feedback.js';
import {CAMP_LEVELS} from '../src/config/camp-level.js';
test('六档营地优惠、下档和满级预览不改变存档',()=>{const p=freshProgress(),before=JSON.stringify(p),m=challengeCatalog(p);assert.equal(m.current,1);assert.equal(m.next,2);assert.deepEqual(m.tiers.map(t=>t.percent),CAMP_LEVELS.map(t=>t.percent));assert.equal(JSON.stringify(p),before);p.campLevel.xp=10800;assert.equal(challengeCatalog(p).next,6);assert.ok(challengeCatalog(p).tiers.every(t=>t.reached));});
test('等级按钮键盘可达，显示优惠与经验而非购买资格',()=>{const p=freshProgress(),html=challengeLevelMarkup(p);assert.match(html,/<button type="button" data-challenge-catalog/);assert.match(html,/9.8折/);assert.match(html,/还差 600 经验/);assert.doesNotMatch(html,/购买需要|清缴次数|挑战等级/);p.campLevel.xp=10800;assert.match(challengeLevelMarkup(p),/营地已满级/);});
