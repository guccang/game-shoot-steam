// 现场交互专项：目标绑定、距离、调查完成与取消均通过正式规则验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {storyObjective,interactStory,updateStory} from '../src/core/story/story-manager.js';
import {storyInteractionTarget,storyInteractionNear,storyInteractionReady} from '../src/core/story/story-interaction.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story/story-posts.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {validateStoryDefinition} from '../src/core/story/story-schema.js';
import {storyCast} from '../src/rendering/story-props.js';
import {FARM_SEED_SHOP} from '../src/config/farm.js';
import {TOWN_LAYOUT} from '../src/config/town-layout.js';

// 只构造锚点查询所需状态，逐章核对目标声明不依赖中文名称。
function fixture(chapterId,stageId){
 const def=STORY_CAMPAIGN[chapterId];
 const g={story:{chapterId,stageId,phase:'active',flags:{},readLines:[],combat:{cleared:true}},
  state:'playing',mapId:def.mapId,player:{...def.world.sites[def.nodes[stageId].objective.site]},vehicle:{active:false},storyObjective(){return storyObjective(this);}};
 return g;
}

test('回营交付绑定雪团本体，人物与热点同坐标并避开种子小屋屋顶',()=>{
 let checked=0;
 for(const def of Object.values(STORY_CAMPAIGN))for(const [id,node] of Object.entries(def.nodes)){
  if(def.world.sites.CAMP?.x!==TOWN_LAYOUT.spawn.x||def.world.sites.CAMP?.y!==TOWN_LAYOUT.spawn.y)continue;
  if(!node.campReturn||node.panel?.type!=='claim'||!node.actors?.some(a=>a.actor==='snow'&&a.site==='CAMP'))continue;
  const g=fixture(def.id,id),target=storyInteractionTarget(g),cast=storyCast(g),snow=cast.find(a=>a.kind==='snow');
  assert.equal(node.interactionTarget.actor,'snow');assert.equal(target.kind,'snow');
  assert.equal(target.x,snow.x);assert.equal(target.y,snow.y);
  for(const actor of cast)assert.ok(actor.x+32<FARM_SEED_SHOP.x-FARM_SEED_SHOP.width/2,def.id+'/'+id+' 人物被屋顶遮挡');
  assert.ok(storyInteractionNear(g));assert.ok(storyInteractionReady(g));
  g.story.interacting=1;assert.deepEqual(storyInteractionTarget(g),target);
  // 读档仍按当前出场表定位，旧阶段无需重做任务或移动建筑。
  g.story=JSON.parse(JSON.stringify(g.story));assert.deepEqual(storyInteractionTarget(g),target);checked++;
 }
 assert.ok(checked>=8);
});
test('所有章节可操作节点都解析到现场目标，物品不会误指向陪同者',()=>{
 for(const def of Object.values(STORY_CAMPAIGN))validateStoryDefinition(def);
 for(const def of Object.values(STORY_CAMPAIGN))for(const [id,n] of Object.entries(def.nodes)){
  if(!n.objective.action&&!n.panel)continue;
  const g=fixture(def.id,id),target=storyInteractionTarget(g);
  assert.ok(Number.isFinite(target.x)&&Number.isFinite(target.y),def.id+'/'+id);
 }
 for(const [chapter,node,kind] of [['sunleaf-01','Q20','sign'],['sunleaf-01','Q40','mint'],['sunleaf-01','Q70','relay'],
  ['sunleaf-02','PICKUP','medicine'],['sunleaf-02','DOCK','boatman'],['sunleaf-02','SHORE','riverRanger'],['sunleaf-02','END','snow'],['sunleaf-03','STOP3','crate']]){
  assert.equal(storyInteractionTarget(fixture(chapter,node)).kind,kind);
 }
});
test('内容校验拒绝没有现场实体的点击目标',()=>{
 const def=structuredClone(STORY_CAMPAIGN['sunleaf-02']);def.nodes.PICKUP.interactionTarget={actor:'riverRanger'};
 assert.throws(()=>validateStoryDefinition(def),/点击目标必须在本站点出场/);
});
test('到达原路点或实际人物旁才出现提示，行进、战斗、暂停及对白收起',()=>{
 const g=fixture('sunleaf-02','SHORE'),target=storyInteractionTarget(g);
 assert.ok(storyInteractionReady(g));Object.assign(g.player,target);assert.ok(storyInteractionReady(g));
 g.player.x+=200;assert.equal(storyInteractionNear(g),false);assert.equal(storyInteractionReady(g),false);
 Object.assign(g.player,target);g.story.combat.cleared=false;assert.equal(storyInteractionReady(g),false);
 g.story.combat.cleared=true;g.state='paused';assert.equal(storyInteractionReady(g),false);
 g.state='story';g.story.dialogue='delivery';assert.equal(storyInteractionReady(g),false);
 const travel=fixture('sunleaf-02','HOME');assert.equal(storyInteractionReady(travel),false);
});
test('站在偏移人物前方能完成两秒调查，走远则取消',()=>{
 const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.story.chapters['sunleaf-01'].completed=true;
 const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-02')));
 assert.ok(g.enterStory('sunleaf-02'));g.advanceStoryDialogue(true);g.chooseStoryLoadout(STORY_CAMPAIGN['sunleaf-02'].loadouts[0].id);g.startStoryStage();
 g.story.stageId='DOCK';g.story.phase='active';g.story.dialogue=null;g.state='playing';Object.assign(g.player,storyInteractionTarget(g));
 assert.ok(interactStory(g));g.player.x+=200;updateStory(g,.04);assert.equal(g.story.interacting,0);
 Object.assign(g.player,storyInteractionTarget(g));g.player.y+=90;assert.ok(interactStory(g));
 for(let i=0;i<60&&!g.story.dialogue;i++)updateStory(g,.04);
 assert.equal(g.story.dialogue,'dock');assert.equal(storyInteractionReady(g),false);
});

// 玩家站在目标南侧留出一个身位，所有章节的点击范围与旧赶路范围分别校验。
test('人物与设施前方90单位可显示点击，超出96单位隐藏且不改赶路半径',()=>{
 for(const [chapter,node] of [['sunleaf-01','Q20'],['sunleaf-01','Q40'],['sunleaf-01','Q70'],['sunleaf-02','PICKUP'],['sunleaf-02','DOCK']]){
  const g=fixture(chapter,node),target=storyInteractionTarget(g),def=STORY_CAMPAIGN[chapter],site=def.world.sites[g.storyObjective().site];
  g.story.flags.boss=true;
  g.player={x:target.x,y:Math.max(target.y,site.y)+90};assert.ok(storyInteractionNear(g),chapter+'/'+node);assert.ok(storyInteractionReady(g),chapter+'/'+node);
  g.player.y=Math.max(target.y,site.y)+97;assert.equal(storyInteractionNear(g),false);assert.equal(storyInteractionReady(g),false);
  assert.equal(def.interaction.radius,48);assert.equal(def.interaction.clickRadius,96);
 }
});
