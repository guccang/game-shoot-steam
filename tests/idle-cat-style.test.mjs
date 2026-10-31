// 风格变化仍须保留春秋物候及独立试玩存储，不把展示改动带入正式存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {seasonalLeafColor} from '../src/rendering/season-art.js';
import {CARTOON_LEAF_RAMPS} from '../src/rendering/idle-cat-style.js';
import {createArtPreviewStorage} from '../src/app/idle-cat-preview.js';
import {createSaveStore} from '../src/platform/storage.js';
test('新色阶在春秋变化，针叶常绿且轮廓不被染色',()=>{
 const ramp=CARTOON_LEAF_RAMPS[0];assert.notEqual(seasonalLeafColor(ramp[2],'round','autumn'),ramp[2]);
 assert.notEqual(seasonalLeafColor(ramp[2],'round','spring'),ramp[2]);
 assert.equal(seasonalLeafColor(ramp[2],'pine','autumn'),ramp[2]);
 for(const season of ['summer','spring','autumn','winter'])assert.equal(seasonalLeafColor(ramp[0],'round',season),ramp[0]);
});
test('独立试玩可正常读写，重新创建不继承上次试玩进度',()=>{
 const storage=createArtPreviewStorage(),store=createSaveStore(()=>storage),p=store.loadProgress();
 assert.equal(p.vehicleHulls[0],1);assert.equal(p.vehicleLoadouts[0],17);assert.equal(p.arrival.phase,'complete');
 p.coins=98765;assert.equal(store.saveProgress(p),true);assert.equal(store.loadProgress().coins,98765);
 assert.notEqual(createSaveStore(()=>createArtPreviewStorage()).loadProgress().coins,98765);
});
