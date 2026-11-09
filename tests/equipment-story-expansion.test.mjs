// 以扩写前的正文长度核对范围，同时验证盾检测真实消耗及任务载具画像完整性。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as lore from '../src/config/equipment-stories.js';
import {EQUIPMENT_QUESTS} from '../src/config/equipment-quests.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {Game,freshProgress} from '../src/game.js';
import {storyPostApproach,storyPostForChapter} from '../src/core/story/story-posts.js';
import {runStoryActions,updateStory} from '../src/core/story/story-manager.js';
const BASE={ARMAMENT_STORIES:{'vehicle-machinegun':63,'tank-125':64,'vehicle-vulcan':63,'hover-tide':62,'wolf-256':109,'cat-crew':102},VEHICLE_STORIES:{'pine-tank':127,'heavy-tank':122,helicopter:127,hovercraft:124,'fire-truck':120,'ranger-scooter':111,'red-wolf':347,'jinbei-van':171,'police-car':126},WEAPON_STORIES:{pistol:127,laser:116,gatling:108,shotgun:119,ricochet:131,water:110,grenade:123,flame:125,sniper:118,pulse:115,arc:120,frost:121,funnel:112,drone:121,chainsaw:122,'mechanical-core':116,'mechanical-spider':122,'energy-shield':226,'gravity-gun':130}};
const DIALOGUE_BASE={'equipment-gravity':157,'equipment-water':217,'equipment-frost':164,'equipment-spider':194,'equipment-red-wolf':168,'equipment-jinbei':212};

test('34份原档案逐篇扩写约50%，6条装备支线仍保留完整对白结构',()=>{
 let count=0;
 for(const [group,entries] of Object.entries(BASE))for(const [id,before] of Object.entries(entries)){
  const ratio=lore[group][id].story.join('').length/before;assert.ok(ratio>=1.47&&ratio<=1.54,`${id}: ${ratio}`);count++;
 }
 assert.equal(count,34);
 for(const [id,before] of Object.entries(DIALOGUE_BASE)){
  const after=Object.values(STORY_CAMPAIGN[id].dialogues).flatMap(d=>d.lines).reduce((n,line)=>n+line[1].length,0);
  assert.ok(after/before>=1.47&&after/before<=1.54,id);
 }
});

test('所有任务载具绑定独立画像，PNG实际尺寸与声明一致且两张新增图解码不超过8MiB',()=>{
 const paths=new Set();let bytes=0;
 for(const quest of EQUIPMENT_QUESTS.filter(q=>q.kind==='vehicle')){
  const item=lore.VEHICLE_STORIES[quest.equipment],art=item.illustration;assert.ok(art?.alt&&art.caption,quest.equipment);
  assert.ok(!paths.has(art.src));paths.add(art.src);
  const png=readFileSync(new URL('../'+art.src,import.meta.url));assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),art.width);assert.equal(png.readUInt32BE(20),art.height);
  if(quest.equipment!=='red-wolf')bytes+=art.width*art.height*4;
 }
 assert.equal(paths.size,3);assert.ok(bytes<=8*1024*1024);
});

// 只定位到检测阶段；交互、护盾吸收、暂停和离开取消全部使用正式状态机。
function calibration(){
 const p=freshProgress();p.arrival=null;p.restoration.repaired=['story'];const g=new Game(p,()=>.5);g.start();
 Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'equipment-shield')));
 assert.ok(g.enterStory('equipment-shield'));g.advanceStoryDialogue(true);assert.ok(g.chooseStoryLoadout('equipment-shield-loan'));assert.ok(g.startStoryStage());
 runStoryActions(g,[{type:'stage',id:'CHECK',phase:'active'}]);const site=STORY_CAMPAIGN['equipment-shield'].world.sites.RELAY;
 Object.assign(g.player,{x:site.x,y:site.y+45});g.state='playing';assert.ok(g.interactStory());return g;
}

test('护盾检测扣除真实容量和充能延迟，不伤角色车体，暂停与离开取消有效',()=>{
 const g=calibration(),m=g.magazines[18],hp=g.player.hp,hull=g.vehicle.hp;
 updateStory(g,.1);assert.equal(m.ammo,400);assert.equal(m.remaining,3);assert.equal(g.player.hp,hp);assert.equal(g.vehicle.hp,hull);
 const remaining=g.story.interacting;g.state='paused';updateStory(g,1);assert.equal(g.story.interacting,remaining);assert.equal(m.ammo,400);
 g.state='playing';g.player.x+=300;updateStory(g,.1);assert.equal(g.story.interacting,0);assert.equal(g.story.dialogue,null);
 assert.equal(g.progress.story.chapters['equipment-shield'].completed,false);
});

test('护盾不足不能完成检测，恢复后才推进；领取借装不写入永久所有权',()=>{
 const g=calibration(),m=g.magazines[18];m.ammo=0;const remaining=g.story.interacting;
 updateStory(g,2);assert.equal(g.story.interacting,remaining);assert.equal(g.story.dialogue,null);
 m.ammo=480;for(let i=0;i<21;i++)updateStory(g,.1);
 assert.equal(g.story.dialogue,'checked');assert.equal(m.ammo,240);assert.equal(g.progress.weapons[18],0);
 assert.ok(g.leaveStory());assert.equal(g.loadout.weapon,g.progress.weapon);assert.equal(g.progress.story.chapters['equipment-shield'].completed,false);
});
