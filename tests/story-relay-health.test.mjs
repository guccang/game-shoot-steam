// 中继站血量专项：正式出生、机枪弹道与击退结算，独立验证阶段范围和旧档恢复。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {STORY_CHAPTER,STORY_SITES,STORY_DEFENSE} from '../src/config/story.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story-posts.js';
import {beginStoryWave,spawnStoryEnemy,updateStoryWave} from '../src/core/story-encounters.js';
import {validateStoryDefinition} from '../src/core/story-schema.js';

// 隔离存档只开放相关设施，通过正式章节入口和借装进入守点。
function relay(){
  const p=freshProgress();p.arrival=null;p.restoration.repaired.push('story','garage');
  const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));
  assert.ok(g.enterStory());g.advanceStoryDialogue(true);g.chooseStoryLoadout('line-patrol');
  Object.assign(g.story,{stageId:'Q50',phase:'prepare'});assert.ok(g.startStoryStage());return g;
}

test('守点三波采用低血量，厚甲属性和波次配额保留',()=>{
  const g=relay();
  for(const [group,wave] of STORY_DEFENSE.entries()){
    g.story.group=group;beginStoryWave(g,'RELAY',wave.total,wave.cap,wave.heavy);
    for(const heavy of [false,true]){
      g.enemies=[];assert.ok(spawnStoryEnemy(g,STORY_SITES.RELAY,0,heavy));const e=g.enemies[0];
      assert.equal(e.hp,heavy?56:48);assert.equal(e.maxHp,e.hp);assert.equal(e.tough,heavy);
      assert.equal(e.damage,heavy?16:10);assert.equal(e.speed,heavy?42:52);assert.equal(e.storyTarget,true);
    }
    assert.equal(g.story.combat.total,wave.total);assert.equal(g.story.combat.cap,wave.cap);
  }
  // 其他阶段读取新的章节血量预算，教程更轻，守点专属覆盖仍然生效。
  for(const [stage,site,tutorial,hp] of [['Q20','SIGN',true,40],['Q30','ROAD1',false,48],['Q60','BOSS',false,48]]){
    g.story.stageId=stage;g.story.group=0;Object.assign(g.player,STORY_SITES[site]);beginStoryWave(g,site,6,4);
    assert.ok(spawnStoryEnemy(g,STORY_SITES[site],0,false,tutorial));assert.equal(g.enemies[0].hp,hp);
    g.enemies=[];assert.ok(spawnStoryEnemy(g,STORY_SITES[site],0,true));assert.equal(g.enemies[0].hp,56);
  }
  for(const def of Object.values(STORY_CAMPAIGN))if(def.id!=='sunleaf-01'){
    assert.equal(def.encounters.enemies.normal.hp,48);assert.equal(def.encounters.enemies.heavy.hp,56);
    assert.ok(Object.values(def.nodes).every(node=>!node.encounter?.enemyHp));
  }
});

test('单独车载机枪可快速击杀守点敌人，保留真实移动、腾空、击退和装填',t=>{
  for(const heavy of [false,true]){
    const g=relay();assert.ok(spawnStoryEnemy(g,STORY_SITES.RELAY,0,heavy));const e=g.enemies[0];
    // 关闭角色武器并停止补充波次，目标和车炮仍走完整正式更新。
    g.attack=()=>{};g.updateWeaponAbility=()=>{};g.story.combat.spawned=g.story.combat.total;
    let elapsed=0,first=null,hits=0;const hit=g.hit.bind(g);
    // 只观测命中时间，不替换实际伤害或物理效果。
    g.hit=(target,amount,...rest)=>{if(target===e){first??=elapsed;hits++;}return hit(target,amount,...rest);};
    while(e.hp>0&&elapsed<10){g.update(1/120);elapsed+=1/120;}
    const seconds=elapsed-first;t.diagnostic(`${heavy?'厚甲':'普通'}：${hits}次命中，首次命中至击杀${seconds.toFixed(2)}秒`);
    assert.ok(first!==null&&e.hp<=0);assert.ok(seconds>0&&seconds<=(heavy?3.5:2.2));
  }
});

test('旧检查点恢复与重试后重新出生的怪物采用新血量',()=>{
  const g=relay();g.syncStory();const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);
  assert.equal(restored.story.stageId,'Q50');assert.ok(restored.startStoryStage());
  restored.story.combat.timer=0;updateStoryWave(restored,.01);assert.equal(restored.enemies[0].hp,48);
  restored.hurtStoryTarget(300);assert.ok(restored.retryStory());assert.ok(restored.startStoryStage());
  restored.story.combat.timer=0;updateStoryWave(restored,.01);assert.equal(restored.enemies[0].maxHp,48);
});

test('阶段生命配置拒绝非正数和不存在的敌人类型，合法章节可序列化',()=>{
  for(const def of Object.values(STORY_CAMPAIGN))validateStoryDefinition(JSON.parse(JSON.stringify(def)));
  for(const enemyHp of [{normal:0},{normal:-1},{normal:NaN},{normal:Infinity},{normal:'48'},{missing:48}]){
    const def=structuredClone(STORY_CHAPTER);def.nodes.Q50.encounter.enemyHp=enemyHp;
    assert.throws(()=>validateStoryDefinition(def),/章节配置/);
  }
});
