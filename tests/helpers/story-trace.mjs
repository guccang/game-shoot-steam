import {storyPostForChapter,storyPostApproach} from '../../src/core/story-posts.js';
// 第一章重构前后的行为轨迹：只推进章节任务，击杀夹具不代替正式战斗平衡。
import {Game,freshProgress} from '../../src/game.js';
import {updateStory} from '../../src/core/story-manager.js';
import {STORY_SITES} from '../../src/world/story-sites.js';
import {storyObjects} from '../../src/rendering/story-props.js';
import {storySpeechInfo} from '../../src/rendering/story-guidance.js';

// 记录每个任务边界、出生批次和修复时序，排除时间戳与运行编号。
export function storyTrace(loadout,route){
  const p=freshProgress();p.restoration.repaired.push('story','garage');const g=new Game(p,()=>.5),trace=[];g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));g.enterStory();
  // 拍摄可观察状态，包含真实道具、目标、装备和固定数值。
  function record(label){trace.push(JSON.parse(JSON.stringify({label,stage:g.story?.stageId,phase:g.story?.phase,
    flags:g.story?.flags,group:g.story?.group,objective:g.storyObjective(),props:storyObjects(g),
    speech:storySpeechInfo(g)?.text,position:[g.player.x,g.player.y],hp:g.player.hp,hull:g.vehicle.hp,
    weapon:g.loadout.weapon,vehicle:g.vehicle.index,turret:g.vehicle.weaponIndex,clearedTrees:g.story?.clearedTrees,
    relay:g.story?.relay,repair:g.story?.repair,combat:g.story?.combat,
    boss:g.boss?{kind:g.boss.kind,hp:g.boss.hp,damage:g.boss.damage,speed:g.boss.speed,arena:g.boss.arena}:null,
    enemies:g.enemies.map(e=>({x:e.x,y:e.y,hp:e.hp,damage:e.damage,speed:e.speed,radius:e.radius,target:e.storyTarget})),
    read:g.story?.readLines,coins:g.progress.coins,wood:g.progress.wood,materials:g.progress.materials})) );}
  // 固定步长保持修复和出生计时具有可比性。
  function tick(n=1){for(let i=0;i<n;i++)updateStory(g,.05);}
  // 消耗实际出生名额，最后一只死亡才完成波次。
  function wave(label){record(label+'-start');for(let i=0;i<2000&&!g.story.combat?.cleared;i++){
    tick();if(!g.story.combat)return;
    const living=g.enemies.filter(e=>e.hp>0);if(living.length)record(label+'-spawn');
    for(const e of living)g.hit(e,1e6);g.enemies=g.enemies.filter(e=>e.hp>0);
  }record(label+'-clear');}
  // 使用公开交互和对白接口，保留两秒读条、日志与迁移。
  function talk(site){Object.assign(g.player,STORY_SITES[site]);g.state='playing';g.interactStory();tick(41);record(site+'-talk');g.advanceStoryDialogue(true);record(site+'-after');}
  record('intro');g.advanceStoryDialogue(true);g.chooseStoryLoadout(loadout);g.startStoryStage();record('depart');
  Object.assign(g.player,STORY_SITES.SIGN);tick();wave('sign');talk('SIGN');
  // 短路只作为已选定的旧检查点续接，玩家不再通过选择按钮进入。
  if(route==='short'){g.story.routeId='short';g.syncStory();}record('route');
  for(const site of route==='short'?['SHORT1']:['ROAD1','ROAD2']){Object.assign(g.player,STORY_SITES[site]);tick();wave(site);}
  Object.assign(g.player,STORY_SITES.MINT);tick();talk('MINT');g.startStoryStage();Object.assign(g.player,STORY_SITES.RELAY);tick();g.startStoryStage();
  for(let i=0;i<3;i++){wave('defense-'+i);tick(82);if(i===2){Object.assign(g.player,STORY_SITES.BOSS);tick();}record('repair-'+i);}
  g.advanceStoryDialogue(true);g.startStoryStage();record('boss');g.hit(g.boss,g.boss.maxHp*.5+1);tick();
  for(let i=0;i<200;i++){for(const e of g.enemies)if(e.hp>0)g.hit(e,1e6);g.enemies=g.enemies.filter(e=>e.hp>0);tick();}
  record('support');g.hit(g.boss,1e6);tick();talk('RELAY');talk('CAMP');g.claimStory();record('complete');return trace;
}
