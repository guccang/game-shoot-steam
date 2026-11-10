// Debug资源发放覆盖矿业目录，保持真实库存归属、上限和保存事务。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {debugGrantProgress} from '../src/progression/player/debug-grants.js';
import {INDUSTRY_GOODS} from '../src/config/industry.js';
import {industryStore,industryHomeCapacity} from '../src/progression/industry/industry.js';
import {createProgressController} from '../src/app/progress-controller.js';
import {MATERIAL_KEYS} from '../src/config/materials.js';
// 从正式库存接口读取数量，避免测试把原石和精炼石块当作同一资源。
function count(p,key){const [stock,id]=industryStore(p,key,'home');return stock[id]||0;}
test('每种原矿与矿石制品各增9999，已有金币木材材料不重复，读档保留且不增背包货物',()=>{const p=validateProgress(freshProgress());for(const key of Object.keys(INDUSTRY_GOODS)){const [stock,id]=industryStore(p,key,'home');stock[id]=7;}const before=structuredClone(p),next=debugGrantProgress(p,'resources');for(const key of Object.keys(INDUSTRY_GOODS))assert.equal(count(next,key),10006,key);assert.equal(next.coins,p.coins+9999);for(const key of MATERIAL_KEYS)assert.equal(next.materials[key],p.materials[key]+9999);assert.deepEqual(p,before);assert.deepEqual(next.mining.bagOre,p.mining.bagOre);assert.deepEqual(next.industry.bag,p.industry.bag);assert.deepEqual(next.industry.vehicles,p.industry.vehicles);assert.deepEqual(next.industry.sites,p.industry.sites);assert.deepEqual(validateProgress(next),next);const again=debugGrantProgress(next,'resources');for(const key of Object.keys(INDUSTRY_GOODS))assert.equal(count(again,key),20005,key);});
test('各库存按正式上限封顶，原石保持安全整数，不回退或溢出',()=>{const p=validateProgress(freshProgress());for(const key of Object.keys(INDUSTRY_GOODS)){const [stock,id]=industryStore(p,key,'home');stock[id]=industryHomeCapacity(key)-1;}const next=debugGrantProgress(p,'resources'),again=debugGrantProgress(next,'resources');for(const key of Object.keys(INDUSTRY_GOODS)){assert.equal(count(next,key),industryHomeCapacity(key),key);assert.equal(count(again,key),industryHomeCapacity(key),key);assert.ok(Number.isSafeInteger(count(again,key)));}});
test('正式Debug控制器保存失败不发矿石，成功提交并可重新载入',()=>{const game=new Game(freshProgress()),before=structuredClone(game.progress);let saved;const store={available:true,saveProgress:()=>false},controller=createProgressController({game,store,root:{getElementById:()=>({})},refresh(){}});assert.equal(controller.debugGrant('resources'),false);assert.deepEqual(game.progress,before);store.saveProgress=p=>{saved=structuredClone(p);return true;};assert.equal(controller.debugGrant('resources'),true);const restored=validateProgress(saved);for(const key of Object.keys(INDUSTRY_GOODS)){assert.equal(count(restored,key),count(before,key)+9999,key);assert.equal(count(game.progress,key),count(restored,key),key);}});
