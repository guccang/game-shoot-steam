// 世界故事入口专项：表内地点、近距权限、跨地图返回和生命周期，不重复测试战斗。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {validateStoryPosts,worldStoryPosts,storyPostApproach,storyPostForChapter,canUseStoryPost,nearbyStoryPost} from '../src/core/story-posts.js';
import {storyPostObjects} from '../src/rendering/story-posts.js';
import {coversScenery} from '../src/world/forest-clearings.js';
import {WORLD} from '../src/world/coordinates.js';
// 独立新档使用正式游戏初始化，不购买或解锁任何故事。
function game(){const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(STORY_POSTS[0]));return g;}

test('入口表可往返JSON，全部八个故事关联真实营地驿牌，绘制共用坐标',()=>{
 const g=game(),p=STORY_POSTS[0];assert.deepEqual(validateStoryPosts(JSON.parse(JSON.stringify(STORY_POSTS))),STORY_POSTS);
 assert.equal(p.chapters.length,8);assert.deepEqual(storyPostApproach(p),{x:p.x+p.approach.dx,y:p.y+p.approach.dy});
 assert.equal(storyPostObjects(g)[0].x,p.x);assert.equal(storyPostObjects(g)[0].y,p.y);assert.equal(nearbyStoryPost(g).id,p.id);
});
test('进入只能来自关联驿牌附近，错误地点、远程、其他地图、领主及秘境均拒绝',()=>{
 const g=game(),p=STORY_POSTS[0];assert.equal(g.enterStory('sunleaf-01','not-a-post'),false);
 Object.assign(g.player,{x:500,y:700});assert.equal(canUseStoryPost(g,p),false);assert.equal(g.enterStory(),false);
 Object.assign(g.player,storyPostApproach(p));g.boss={};assert.equal(g.enterStory(),false);g.boss=null;g.realm={};assert.equal(g.enterStory(),false);g.realm=null;
 g.mapId='jiuzhaigou';assert.equal(g.enterStory(),false);g.mapId='forest';assert.equal(g.enterStory('sunleaf-02',p.id),false);
 assert.equal(g.enterStory('sunleaf-01',p.id),true);
});
test('章节只保留本章管理驿牌，秘境隐藏，暂离后全部恢复且检查点可续接',()=>{
 const g=game();g.progress.restoration.repaired.push('story');Object.assign(g.player,storyPostApproach(STORY_POSTS[0]));assert.equal(g.enterStory(),true);assert.deepEqual(worldStoryPosts(g).map(p=>p.id),[STORY_POSTS[0].id]);g.leaveStory();assert.equal(worldStoryPosts(g).length,STORY_POSTS.length);
 assert.equal(g.enterStory(),true);const restored=new Game(structuredClone(g.progress),()=>.5);assert.equal(restored.story.chapterId,'sunleaf-01');
 restored.leaveStory();assert.equal(worldStoryPosts(restored).length,STORY_POSTS.length);restored.realm={};assert.equal(storyPostObjects(restored).length,0);
});
test('只增加配置即可在另一张地图接取故事，退出与刷新恢复原地点',()=>{
 const post={id:'valley-test',mapId:'jiuzhaigou',name:'湖畔驿牌',x:1485,y:1625,approach:{dx:0,dy:0},radius:90,chapters:['sunleaf-01'],collection:structuredClone(STORY_POSTS[0].collection)};
 STORY_POSTS.push(post);try{
  validateStoryPosts();const g=game();assert.equal(g.switchMap('jiuzhaigou'),true);const before={x:g.player.x,y:g.player.y};
  assert.equal(storyPostForChapter(g,'sunleaf-01').id,post.id);assert.equal(g.enterStory('sunleaf-01',post.id),true);assert.equal(g.mapId,'forest');
  const restored=new Game(structuredClone(g.progress),()=>.5);restored.leaveStory();assert.equal(restored.mapId,'jiuzhaigou');assert.equal(restored.player.x,before.x);assert.equal(restored.player.y,before.y);
  g.leaveStory();assert.equal(g.mapId,'jiuzhaigou');assert.equal(g.player.x,before.x);assert.equal(g.player.y,before.y);
 }finally{STORY_POSTS.pop();}
});
test('地图边缘最近镜像仍可交互，配置新增林间驿牌自动预留树冠空间',()=>{
 const g=game(),p=STORY_POSTS[0];Object.assign(g.player,{x:p.x+WORLD.width,y:p.y+30-WORLD.height});assert.ok(canUseStoryPost(g,p));
 const post={...p,id:'clearing-test',x:1800,y:1600};STORY_POSTS.push(post);try{assert.ok(coversScenery(1800,1650));assert.ok(coversScenery(1800+WORLD.width,1650-WORLD.height));}finally{STORY_POSTS.pop();}
});
test('无效地图、故事、重复ID和非有限坐标在注册时明确失败',()=>{
 const p=STORY_POSTS[0];for(const bad of [{...p,mapId:'missing'},{...p,chapters:['missing']},{...p,x:Infinity},{...p,radius:0}])assert.throws(()=>validateStoryPosts([bad]),/无效故事地点/);
 assert.throws(()=>validateStoryPosts([p,p]),/无效故事地点/);
});
