// 区域木牌跟随所属设施，覆盖旧布局载入、重复激活和切档恢复。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {CAMP_BUILDINGS} from '../src/config/camp-layout.js';
import {TOWN_SIGNS} from '../src/config/town-layout.js';
import {SCENERY} from '../src/world/scenery.js';
import {activateCampLayout,campLayoutBindings} from '../src/world/camp-layout-bindings.js';
test('五块区域木牌按稳定归属随建筑迁移，正式场景读取同一对象',()=>{activateCampLayout(freshProgress());const before=TOWN_SIGNS.map(s=>({...s}));try{for(const sign of before){const p=freshProgress(),b=CAMP_BUILDINGS.find(b=>b.id===sign.building);assert.ok(b);p.campLayout.positions[b.id]={x:b.x+100,y:b.y+80};const loaded=validateProgress(p);activateCampLayout(loaded);const actual=TOWN_SIGNS.find(s=>s.id===sign.id),position=loaded.campLayout.positions[b.id];assert.equal(actual.x,sign.x+position.x-b.x);assert.equal(actual.y,sign.y+position.y-b.y);assert.ok(campLayoutBindings(b.id).includes(actual));assert.ok(SCENERY.includes(actual));const once={...actual};activateCampLayout(loaded);assert.deepEqual(actual,once);for(const other of before.filter(s=>s.id!==sign.id)){const at=TOWN_SIGNS.find(s=>s.id===other.id);assert.equal(at.x,other.x);assert.equal(at.y,other.y);}activateCampLayout(freshProgress());assert.deepEqual(TOWN_SIGNS,before);}}finally{activateCampLayout(freshProgress());}});
