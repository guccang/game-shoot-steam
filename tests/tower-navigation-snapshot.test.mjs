// 任务栏读取正式进度，地面导航读取插值快照；两者必须选择同一步骤与终点。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {MAINLINE_IDS,MAINLINE_SITES} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {mainlineStep} from '../src/core/mainline-manager.js';
import {worldNavigationObjective} from '../src/core/world-navigation.js';
import {storyGuidanceState} from '../src/rendering/story-guidance.js';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';

// 使用当前登塔任务与正式设施权限，保留尚未完成的三层目标。
function fixture(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
 p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('tower'));p.mainline.phase='doing';p.weapons[0]=9;
 const g=new Game(p);g.start();g.mainlineSpeech=null;return g;
}

test('同一快照从升级切换为登塔时，任务栏与地面终点立即一致',()=>{
 const g=fixture(),interpolation=createRenderInterpolation();interpolation.beforeStep(g);
 const before=interpolation.sample(g,.5);assert.equal(worldNavigationObjective(before).key,'weaponsEntry');
 g.progress.weapons[0]=10;
 const view=interpolation.sample(g,.5);assert.equal(view,before);assert.equal(mainlineStep(g).label,'通过时空塔3层');
 assert.equal(worldNavigationObjective(view).key,'towerEntry');
 assert.deepEqual(storyGuidanceState(view).target,MAINLINE_SITES.towerEntry);
 assert.deepEqual(worldNavigationObjective(view),worldNavigationObjective(g));
});

test('保存替换进度、读档与不同插值比例都读取最新完成条件',()=>{
 const g=fixture(),interpolation=createRenderInterpolation();interpolation.beforeStep(g);interpolation.sample(g,0);
 g.progress=structuredClone(g.progress);g.progress.weapons[0]=10;
 for(const alpha of [0,.25,.75,1]){
  const view=interpolation.sample(g,alpha);assert.equal(view.progress,g.progress);assert.equal(worldNavigationObjective(view).key,'towerEntry');
 }
 const restored=new Game(JSON.parse(JSON.stringify(g.progress)));restored.start();restored.mainlineSpeech=null;
 assert.equal(worldNavigationObjective(createRenderInterpolation().sample(restored,.5)).key,'towerEntry');
 g.progress.mainline.phase='report';assert.equal(worldNavigationObjective(interpolation.sample(g,.5)).key,'tower');
});
