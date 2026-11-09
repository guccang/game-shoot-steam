// 内容表专项：候选校验、错误关联，以及仅调整数据后的真实解释器行为。
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {CONTENT_DATA,contentCatalog} from '../src/config/content-catalog.js';
import {validateContentConfig} from '../src/config/content-validation.js';

test('内容目录快照隔离，不收录坦克后坐力与相机参数',()=>{
 assert.equal(validateContentConfig(),true);
 const snapshot=contentCatalog();snapshot.data.growth.progress.maxEquipmentLevel=99;
 assert.equal(CONTENT_DATA.growth.progress.maxEquipmentLevel,20);
 assert.doesNotMatch(JSON.stringify(snapshot.sources),/tank-recoil|camera|flight|appearance/);
});

// 逐项制造编辑器常见错误，确保错误路径能定位到配置中的具体内容。
const invalid=[
 ['任务 ID 重复',c=>c.mainline.tasks.push(structuredClone(c.mainline.tasks[0])),/任务 ID 重复/],
 ['解锁引用不存在的任务',c=>c.mainline.gates.push({kind:'weapons',index:1,task:'missing',label:'无效前置'}),/mainline.gates.0.task/],
 ['任务步骤与条件不匹配',c=>c.mainline.tasks[0].guide.steps.pop(),/guide.steps/],
 ['步骤导航地点不存在',c=>c.mainline.tasks[0].guide.steps[0].navigation='missing',/navigation/],
 ['守门指定营门不存在',c=>c.mainline.tasks.find(t=>t.id==='pine-patrol').guide.steps[0].operation.gate='missing',/operation.gate/],
 ['守门记录不存在',c=>c.mainline.tasks.find(t=>t.id==='pine-patrol').guide.steps[0].operation.record='missing',/operation.record/],
 ['任务无效操作',c=>c.mainline.tasks[0].guide.steps[0].operation.type='unknown',/operation.type/],
 ['错误的操作记录',c=>c.mainline.tasks[0].goal.all[0].path='progress.mainline.seen.mpa',/未注册的操作记录/],
 ['负奖励',c=>c.mainline.tasks[0].reward.coins=-1,/reward.coins/],
 ['不存在的战车型号',c=>c.vehicles.rows[0].id='missing',/vehicles.rows/],
 ['怪物字段拼写错误',c=>c.monsters.ranged['reed-archer'].movment=1,/movment/],
 ['未知怪物机制',c=>c.monsters.ranged.dragon={...c.monsters.ranged['reed-archer']},/dragon/],
 ['熟练度阈值倒退',c=>c.growth.masteryThresholds[2]=39,/严格递增/],
 ['套件解锁超过最大熟练度',c=>c.growth.progress.modUnlockLevel=100,/超过熟练度最高等级/],
 ['成长倍率不是数字',c=>c.growth.parts.enginePerLevel='fast',/enginePerLevel/],
 ['最高等级与线性成长冲突',c=>c.growth.progress.maxEquipmentLevel=2,/linearThroughLevel/],
];
for(const [name,change,message]of invalid)test(name,()=>{const candidate=structuredClone(CONTENT_DATA);change(candidate);assert.throws(()=>validateContentConfig(candidate),message);});

test('仅改内容数据可追加主线、扩展成长，并改变正式怪物与战车属性',()=>{
 // 独立进程先编辑同一 JSON 模块，再加载正式执行器，模拟重新加载配置后的游戏启动。
 const result=spawnSync(process.execPath,['--input-type=module','-e',`
  import assert from 'node:assert/strict';
  import {CONTENT_DATA as data} from './src/config/content-catalog.js';
  const task=structuredClone(data.mainline.tasks[0]);task.id='extra-patrol';task.title='追加巡林';
  data.mainline.tasks.push(task);
  data.growth.masteryThresholds.push(900,1400);data.growth.progress.maxEquipmentLevel=25;
  data.vehicles.rows.find(v=>v.id==='pine-tank').baseHp=300;
  data.monsters.ranged['reed-archer'].health=2;data.monsters.rules.ranged.lateChance=.5;
  data.monsters.rules.enemy.baseSpeed=70;
  const {validateContentConfig}=await import('./src/config/content-validation.js');validateContentConfig();
  const {mainlineTask,mainlineSteps}=await import('./src/core/story/mainline-manager.js');
  const {validateMainline}=await import('./src/progression/story/mainline-progress.js');
  const {MAINLINE_IDS}=await import('./src/config/mainline.js');
  const {TOWN_RESTORATIONS}=await import('./src/config/town-restoration.js');
  const progress={restoration:{repaired:TOWN_RESTORATIONS.map(f=>f.id)},mainline:validateMainline({version:7,completed:MAINLINE_IDS.slice(0,-1),phase:'complete',seen:{map:1},distance:80})};
  assert.equal(progress.mainline.phase,'meet');assert.equal(mainlineTask({progress}).id,'extra-patrol');
  assert.ok(mainlineSteps({progress}).every(step=>step.done));
  const {masteryInfo}=await import('./src/config/weapon-mods.js');
  assert.equal(masteryInfo({mastery:[1000]},0).level,6);assert.equal(masteryInfo({mastery:[1000]},0).next,1400);
  const {VEHICLE_MAX_LEVEL,vehicleMaxHp}=await import('./src/config/vehicles.js');
  assert.equal(VEHICLE_MAX_LEVEL,25);assert.equal(vehicleMaxHp({vehicleIndex:0,vehicleHulls:[1]},100),300);
  const {rangedIdentity}=await import('./src/config/ranged-enemies.js');
  const enemy=rangedIdentity({hp:100,damage:10,speed:100,mass:1,rank:0},'reed-archer');
  assert.equal(enemy.hp,200);assert.equal(enemy.speed,95);
  const {GAMEPLAY_VALUES}=await import('./src/config/gameplay-values.js');
  assert.equal(GAMEPLAY_VALUES.enemy.baseSpeed,70);assert.equal(GAMEPLAY_VALUES.realm.baseSpeed,44);
 `],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||result.stdout);
});
