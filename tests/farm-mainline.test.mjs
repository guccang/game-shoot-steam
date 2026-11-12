// 种田主线验证真实结算、失败回滚、历史进度续接和经济说明，任务不代做任何农活。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {validateMainline} from '../src/progression/story/mainline-progress.js';
import {MAINLINE_IDS,MAINLINE_SITES,currentMainlineTask} from '../src/config/mainline.js';
import {mainlineSteps,mainlineAction,mainlineObjective,updateMainline,completeMainline} from '../src/core/story/mainline-manager.js';
import {farmAction} from '../src/core/farming/farm.js';
import {farmCell} from '../src/config/farm.js';
import {mainlineResourceHint} from '../src/progression/story/mainline-cost.js';
import {RECOMMENDED_ECONOMY,validateEconomy} from '../src/config/economy.js';
// 准备已完成找种和购种前置的新手，确认首次种田继续沿用真实收成与奖励。
function scene(){const p=freshProgress();p.farm.seeds[0]=1;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('first-farm'));p.restoration.repaired.push('clearing');p.mainline.phase='doing';p.coins=0;p.wood=0;const g=new Game(p,()=>.5);g.state='playing';g.enemies=[];g.trees=[];Object.assign(g.player,farmCell(0));return g;}
test('播种浇水后交付，作物未成熟也继续巡护，不预发收成金币',()=>{
 const g=scene(),now=Date.now();assert.equal(mainlineAction(g).type,'farm');assert.equal(mainlineObjective(g).navigation,false);
 assert.deepEqual(mainlineSteps(g).map(s=>s.done),[false,false,false]);
 assert.ok(farmAction(g,'dig',{plot:0,now}).ok);assert.ok(farmAction(g,'plant',{plot:0,crop:0,now}).ok);
 assert.deepEqual(mainlineSteps(g).map(s=>s.done),[true,true,false]);assert.equal(farmAction(g,'harvest',{plot:0,now:now+1}).ok,false);
 assert.ok(farmAction(g,'water',{plot:0,now:now+1000}).ok);updateMainline(g,0);assert.equal(g.progress.mainline.phase,'report');assert.equal(g.progress.farm.harvested,0);assert.equal(g.progress.coins,0);
 Object.assign(g.player,MAINLINE_SITES.camp);g.mainlinePersist=()=>false;assert.equal(completeMainline(g),false);assert.equal(g.progress.wood,0);
 g.mainlinePersist=()=>true;assert.ok(completeMainline(g));assert.equal(g.progress.wood,40);assert.equal(g.progress.farm.seeds[1],2);assert.equal(g.progress.coins,0);
 assert.equal(currentMainlineTask(g.progress.mainline).id,'first-patrol');assert.equal(completeMainline(g),false);
 assert.deepEqual(validateProgress(structuredClone(g.progress)).farm,g.progress.farm);
});
test('保存失败的开地和播种不推进任务，实际完成前不能领奖',()=>{
 const g=scene();g.livingPersist=()=>false;assert.equal(farmAction(g,'dig',{plot:0}).ok,false);assert.equal(mainlineSteps(g)[0].done,false);
 g.livingPersist=()=>true;farmAction(g,'dig',{plot:0});g.livingPersist=()=>false;assert.equal(farmAction(g,'plant',{plot:0,crop:0}).ok,false);assert.equal(mainlineSteps(g)[1].done,false);assert.equal(completeMainline(g),false);
});
test('v5当前任务和领奖阶段保留，旧版全通只补种田，新版重载不切回旧顺序',()=>{
 for(const phase of ['meet','doing','report']){const old=validateMainline({version:5,completed:['first-map'],phase});assert.equal(currentMainlineTask(old).id,'first-patrol');assert.equal(old.phase,phase);assert.deepEqual(validateMainline(old),old);}
 const old=validateMainline({version:5,completed:MAINLINE_IDS.filter(id=>id!=='first-farm'),phase:'complete'});assert.equal(currentMainlineTask(old).id,'first-farm');assert.equal(old.phase,'meet');
 const current=validateMainline({version:6,completed:['first-map'],phase:'doing'});assert.equal(currentMainlineTask(current).id,'first-farm');assert.deepEqual(validateMainline(current),current);
});
test('缺金币指向种田；旧候选经济补新任务而不覆盖既有奖励',()=>{
 const p=freshProgress();p.coins=0;const hint=mainlineResourceHint(p,{path:'progress.weapons.0',min:3});assert.match(hint,/种田收获是主要来源/);assert.match(hint,/怪物不掉金币/);assert.doesNotMatch(hint,/击败1–3级/);
 const old=structuredClone(RECOMMENDED_ECONOMY);delete old.taskRewards['first-farm'];old.taskRewards['first-map'].coins=77;
 const next=validateEconomy(old);assert.equal(next.taskRewards['first-map'].coins,77);assert.equal(next.taskRewards['first-farm'].coins,0);assert.equal(next.taskRewards['first-farm'].wood,40);
});

// 营地入门用正式任务步骤和存档事实检查入口；原有二层小屋、栅栏和告示牌不算施工。
test('营地入门依次引导伐木、开田、播种、浇水和建房',()=>{
 const g=scene();g.progress.mainline.completed=[];g.progress.mainline.currentId='homestead-basics';
 assert.deepEqual(mainlineSteps(g).map(s=>s.done),[false,false,false,false,false]);
 assert.equal(mainlineAction(g).id,'weapons-button');
 const tree={id:32,type:'tree',x:g.player.x+15,y:g.player.y,radius:10,hp:1,maxHp:1};
 g.trees=[tree];g.hit(tree,2,false,{statisticsSource:'farm-saw'});
 assert.equal(mainlineAction(g).type,'farm');
 Object.assign(g.progress.farm,{dug:1,planted:1,watered:1});
 assert.equal(mainlineAction(g).type,'construction');
 const site={x:0,y:680,width:110,height:100};g.progress.campLand.sites.clearing=site;
 assert.equal(mainlineSteps(g).at(-1).done,false);
 g.progress.campLand.sites.warehouse=site;g.progress=validateProgress(g.progress);
 assert.ok(mainlineSteps(g).every(s=>s.done));
 delete g.progress.campLand.sites.warehouse;g.progress.homeDecor.floors++;
 assert.ok(mainlineSteps(g).every(s=>s.done));
});
