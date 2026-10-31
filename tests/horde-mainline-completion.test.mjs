// 兽潮主线只认现场正式胜利，装备自由；覆盖结算、导航、读档和保存失败。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {MAINLINE_IDS,MAINLINE_SITES,currentMainlineTask} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {CAMP_GATES} from '../src/config/camp-defense.js';
import {startCampDefense,updateCampDefense,claimCampDefense,syncCampDefense} from '../src/core/camp-defense.js';
import {worldNavigationObjective,requestWorldNavigation} from '../src/core/world-navigation.js';
import {completeMainline} from '../src/core/mainline-manager.js';
import {recordMainlineCombat} from '../src/progression/mainline-combat.js';

// 只准备已接取任务和开放建筑，不伪造主线战绩或主炮使用记录。
function scene(id,gate='left'){
 const p=freshProgress();p.arrival=null;p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
 Object.assign(p.mainline,{completed:MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id)),currentId:id,phase:'doing'});
 const g=new Game(p,()=>.5);g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=99999;
 Object.assign(g.player,CAMP_GATES.find(v=>v.id===gate));return g;
}
// 正式生成并清完十波，再击败真实领主；大伤害仅缩短测试，不代替自然战斗难度验收。
function win(g,gate='left'){
 assert.ok(startCampDefense(g,gate));const r=g.campDefense;
 for(let wave=1;wave<=10;wave++){
  r.timer=0;
  for(let i=0;r.cleared<wave&&i<500;i++){updateCampDefense(g,.2);for(const e of g.enemies)if(e.hp>0)g.hit(e,1e9);g.enemies=g.enemies.filter(e=>e.hp>0);}
  assert.equal(r.cleared,wave);
 }
 assert.ok(g.boss);g.hit(g.boss,1e9);assert.equal(r.phase,'result');
}

for(const id of ['hover-horde','controller-horde'])for(const mode of ['walk','pine-tank','switch-before-claim'])test(id+' '+mode+'胜利结算立即转为交付且不再指向营门',()=>{
 let g=scene(id);const key=currentMainlineTask(g.progress.mainline).guide.steps[0].operation.record;
 if(mode==='pine-tank'){g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.vehicle.active=true;g.vehicle.index=0;}
 if(mode==='switch-before-claim'){g.progress.weapons[12]=1;g.progress.weapon=12;}
 requestWorldNavigation(g,{...MAINLINE_SITES.westGate,x:MAINLINE_SITES.westGate.x-300},'旧西门路线',{direct:true});
 win(g);assert.equal(g.progress.mainline.combatPractice,null);assert.equal(g.progress.mainline.seen[key],0);
 if(mode==='switch-before-claim'){g.progress.weapon=0;syncCampDefense(g);g=new Game(validateProgress(JSON.parse(JSON.stringify(g.progress))),()=>.5);}
 assert.ok(claimCampDefense(g));assert.equal(g.progress.mainline.phase,'report');assert.equal(g.progress.mainline.seen[key],1);
 assert.equal(worldNavigationObjective(g).key,'garage');assert.equal(worldNavigationObjective(g).phase,'report');
 assert.equal(claimCampDefense(g),false);
 const loaded=new Game(validateProgress(g.progress),()=>.5);loaded.start();loaded.mainlineTalkDelay=99999;
 assert.equal(loaded.progress.mainline.phase,'report');Object.assign(loaded.player,MAINLINE_SITES.garage);loaded.vehicle.active=false;loaded.enemies=[];
 assert.ok(completeMainline(loaded));assert.ok(loaded.progress.mainline.completed.includes(id));assert.equal(completeMainline(loaded),false);
});

test('错误营门、未接任务、救场与保存失败不能冒充正式获胜',()=>{
 for(const id of ['hover-horde','controller-horde']){
  const g=scene(id),key=currentMainlineTask(g.progress.mainline).guide.steps[0].operation.record;
  assert.equal(recordMainlineCombat(g.progress,'camp-defense',{gate:'top'}),false);
  g.progress.mainline.phase='meet';assert.equal(recordMainlineCombat(g.progress,'camp-defense',{gate:'left'}),false);g.progress.mainline.phase='doing';
  assert.equal(recordMainlineCombat(g.progress,'camp-defense',{gate:'left',won:false}),false);
  win(g);const before=structuredClone(g.progress);g.campDefensePersist=()=>false;
  assert.equal(claimCampDefense(g),false);assert.deepEqual(g.progress,before);
  g.campDefensePersist=()=>true;assert.ok(claimCampDefense(g));assert.equal(g.progress.mainline.seen[key],1);
 }
});

test('旧配置残留武器或驾驶要求也不能拦截正式兽潮结算',()=>{
 for(const id of ['hover-horde','controller-horde']){
  const g=scene(id),op=currentMainlineTask(g.progress.mainline).guide.steps[0].operation,original={...op};
  try{Object.assign(op,id==='hover-horde'?{kind:'vehicle',index:3}:{kind:'weapons',indices:[12,15,16]});assert.ok(recordMainlineCombat(g.progress,'camp-defense',{gate:'left'}));}
  finally{for(const key of Object.keys(op))delete op[key];Object.assign(op,original);}
 }
});
