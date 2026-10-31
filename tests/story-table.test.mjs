import {storyPostForChapter,storyPostApproach} from '../src/core/story-posts.js';
// 表驱动专项：对照重构前轨迹，并证明修改数据即可改变流程、出场和清理规则。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STORY_CHAPTER as def} from '../src/config/story.js';
import {Game,freshProgress} from '../src/game.js';
import {validateStoryDefinition} from '../src/core/story-schema.js';
import {storyObjects,storyCast} from '../src/rendering/story-props.js';
import {storySpeechInfo} from '../src/rendering/story-guidance.js';
import {storyTrace} from './helpers/story-trace.mjs';
import {storyTarget} from '../src/core/story-definition.js';
import {validateStory} from '../src/progression/story-progress.js';
import {updateEnemies} from '../src/core/enemy-manager.js';

test('三套装备的自动道路及旧短路续档使用新生命预算并保留道具和奖励，远行坐标与清树量由新地图专项验证',()=>{
  const baseline=JSON.parse(readFileSync(new URL('./fixtures/story-chapter-baseline.json',import.meta.url)));
  // 原始重构快照早于已上线的 1.5 倍战斗圈、三种奖励和初始电动车；只更新这些明确的历史契约。
  for(const trace of Object.values(baseline))for(const row of trace){
    // 第一章生命增加50%；轨迹在半血再扣1点后采样援兵阶段。
    if(row.boss){row.boss.arena.radius=420;row.boss.hp=row.boss.hp===7200?1725:861.5;}
    // 新流程在对白结束后立即显示道路目标；旧记录只保留战斗和奖励契约。
    if(row.stage==='Q30'){row.phase='active';row.props=row.props.filter(p=>p.kind!=='route');if(row.label==='SIGN-after')row.objective={site:'ROAD1',label:'前往巡护标记，清理沿途怪物',action:null};else row.objective.label=row.objective.site==='MINT'?'前往薄荷所在的位置':'前往巡护标记，清理沿途怪物';}
    if(row.combat?.site==='SIGN')row.combat.cap=6;
    // 全部故事改用短战斗预算，攻击、波次数量、掉落和任务流程仍对照旧基准。
    for(const e of row.enemies||[])e.hp=({90:40,120:48,320:56})[e.hp]??e.hp;
    if(row.label==='complete')Object.assign(row,{hull:120,vehicle:5,turret:null,materials:{parts:6,crystal:0,core:0}});
  }
  for(const [key,expected] of Object.entries(baseline)){const [loadout,route]=key.split('/');assert.deepEqual(combatTrace(storyTrace(loadout,route)),combatTrace(expected),key);}
});

// 新剧情允许改台词与教学方向；地点已重新规划，战斗计时与数值仍与旧基准逐项比较，守点间隔由自然战斗专项验证。
function combatTrace(trace){return trace.flatMap(row=>{
  // 当前每批可同时出生多只，按出生序号展开后仍逐只比较生命、攻击与总配额。
  if(!row.label.endsWith('-spawn'))return [row];
  return row.enemies.map((enemy,i)=>({...row,enemies:[enemy],combat:{...row.combat,spawned:row.combat.spawned-row.enemies.length+i+1}}));
 }).map(row=>{const copy=structuredClone(row);delete copy.speech;delete copy.position;delete copy.clearedTrees;
  // 空间变化单独验收，不覆盖基准中的生命、伤害、人数或资源。
  function stripCoordinates(value){if(!value||typeof value!=='object')return;delete value.x;delete value.y;for(const child of Object.values(value))stripCoordinates(child);}
  stripCoordinates(copy);
  // 多章节新增的绘制身份元数据不属于玩法轨迹，人物形态另行断言。
  for(const prop of copy.props||[])delete prop.actorHero;
  // 任务怪现在出生于可见战斗圈内；数值、配额、流程与奖励继续对照原基准。
  for(const e of copy.enemies){delete e.x;delete e.y;}
  if(copy.stage==='Q50'&&copy.combat?.timer===2)copy.combat.timer=1.2;return copy;});}

// 临时替换配置后务必恢复，修改不影响同进程其他章节测试。
function withDefinition(patch,run){const old={...def};try{Object.assign(def,patch);return run();}finally{Object.assign(def,old);}}
// 使用公开入口创建章节，不跳过配置校验或旧档白名单。
function chapter(){const p=freshProgress();p.restoration.repaired.push('story','garage');const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));assert.equal(g.enterStory(),true);return g;}

test('全部阶段改名后仍可出发、恢复、守点及切换目标，运行器不识别旧编号',()=>{
  const copy=structuredClone(def),names=Object.fromEntries(Object.keys(copy.nodes).map((id,i)=>[id,'step-'+i]));
  // 将所有阶段引用同步改名，保留任务类型与动作序列。
  function rename(v){if(!v||typeof v!=='object')return;for(const [k,x] of Object.entries(v)){
    if(typeof x==='string'&&names[x])v[k]=names[x];else rename(x);
  }}
  rename(copy);copy.nodes=Object.fromEntries(Object.entries(copy.nodes).map(([id,node])=>[names[id],node]));
  withDefinition(copy,()=>{
    validateStoryDefinition(def);const g=chapter();assert.equal(g.story.stageId,'step-0');g.advanceStoryDialogue(true);
    g.chooseStoryLoadout('line-patrol');assert.equal(g.startStoryStage(),true);assert.equal(g.story.stageId,'step-1');
    assert.equal(g.storyObjective().site,'SIGN');g.syncStory();
    const restored=new Game(structuredClone(g.progress),()=>.5);assert.equal(restored.story.stageId,'step-1');
    Object.assign(g.story,{stageId:'step-4',phase:'prepare'});assert.equal(g.startStoryStage(),true);
    assert.equal(storyTarget(g),g.story.relay);assert.equal(g.story.combat.total,10);
    assert.equal(storyCast(g)[0].kind,'mint');
    // 直接走正式敌人更新，改名后的守点仍攻击保护对象，而非玩家。
    g.enemies=[];g.projectiles=[];Object.assign(g.player,{x:700,y:1700});
    const e=g.spawnEnemy(0,0,{x:g.story.relay.x+60,y:g.story.relay.y},{bossOwner:'story'});
    Object.assign(e,{storyTarget:true,species:'slime',damage:10,speed:0});
    const oldHp=g.player.hp;
    for(let i=0;i<40;i++)updateEnemies(g,.05,{...g.player});
    assert.ok(g.story.relay.hp<300);assert.equal(g.player.hp,oldHp);
  });
});

test('只改表即可新增阶段、替换对白、修改人物站位和目标，无需改执行器',()=>{
  const copy=structuredClone(def);copy.dialogues.intro.lines[0][1]='测试配置中的新台词';
  copy.nodes.visit={...copy.nodes.Q40,title:'新增访问',actors:[{actor:'snow',site:'MINT',dx:40,dy:15}],
    objective:{site:'MINT',label:'访问新目标',action:'mint'},task:{type:'idle'}};
  copy.dialogues.sign.after=[{type:'stage',id:'visit'}];
  withDefinition(copy,()=>{
    const g=chapter();assert.equal(storySpeechInfo(g).text,'测试配置中的新台词');
    Object.assign(g.story,{dialogue:'sign',phase:'dialogue'});g.advanceStoryDialogue(true);
    assert.equal(g.story.stageId,'visit');assert.equal(g.storyObjective().label,'访问新目标');
    assert.deepEqual(storyCast(g),[{x:def.world.sites.MINT.x+40,y:def.world.sites.MINT.y+15,kind:'snow',actorHero:4}]);
  });
});

test('清理字段与实体出现条件从表读取，暂离仍恢复原森林引用',()=>{
  const copy=structuredClone(def);copy.cleanup.combat.arrays.push('testTemporary');
  copy.props[0].when={flag:'mint'};
  withDefinition(copy,()=>{
    const g=chapter(),forest=g.storyForest;assert.equal(storyObjects(g).some(p=>p.kind==='mail'),false);
    g.story.flags.mint=true;assert.equal(storyObjects(g).some(p=>p.kind==='mail'),true);
    g.testTemporary=[1];g.advanceStoryDialogue(true);g.chooseStoryLoadout('line-patrol');g.startStoryStage();
    assert.deepEqual(g.testTemporary,[]);g.leaveStory();assert.deepEqual(storyObjects(g),[]);assert.equal(g.trees,forest.trees);
  });
});

test('配置可往返JSON，错误动作、阶段、对白、人物、站点和函数在入口前被拒绝',()=>{
  assert.deepEqual(validateStoryDefinition(JSON.parse(JSON.stringify(def))),def);
  const mutations=[d=>d.nodes.Q10.start[0].id='missing',d=>d.nodes.Q10.start[0].type='script',
    d=>d.nodes.Q20.objective.action='missing',d=>d.nodes.Q10.actors[0].actor='missing',
    d=>d.nodes.Q10.actors[0].site='missing',d=>d.nodes.Q10.prepareWhen=()=>true,
    d=>d.nodes.Q10.task.type='Q10',d=>d.props[0].bind.restored={flag:'missing'}];
  for(const mutate of mutations){const copy=structuredClone(def);mutate(copy);assert.throws(()=>validateStoryDefinition(copy),/章节配置/);}
});

test('第一章旧版本1的所有阶段检查点继续恢复，准备与交互权限保持原规则',()=>{
  const seed=chapter();seed.advanceStoryDialogue(true);seed.chooseStoryLoadout('line-patrol');
  for(const id of Object.keys(def.nodes)){
    Object.assign(seed.story,{stageId:id,phase:'active',dialogue:null,flags:{},routeId:id==='Q30'?null:'road',readLines:[]});seed.syncStory();
    const g=new Game(structuredClone(seed.progress),()=>.5);
    assert.equal(g.story.stageId,id);assert.equal(g.story.definitionVersion,1);
    assert.equal(g.story.phase,['Q10','Q50','Q60'].includes(id)?'prepare':'active');
  }
  for(const stageId of ['missing','toString','__proto__'])assert.equal(validateStory({run:{...seed.story,stageId}}).invalidRun,true);
});
