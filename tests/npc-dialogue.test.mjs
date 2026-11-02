// 分层交谈使用正式游戏事务，验证现场资格、持久化、线索与原有世界状态边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {NPC_DIALOGUES,SHOP_DIALOGUE_ALIASES} from '../src/config/npc-dialogue.js';
import {MAINLINE_IDS,MAINLINE_NPCS} from '../src/config/mainline.js';
import {RESIDENTS} from '../src/config/living-world.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {WORKSHOP_INTERIORS,interiorShopkeeper} from '../src/config/workshop-interiors.js';
import {TREASURE_SITES} from '../src/config/treasure.js';
import {MONSTER_CAMPS,CAMP_CHARACTERS,campCharacterSite,campSignSite} from '../src/config/monster-camps.js';
import {campResidents} from '../src/core/camp-routines.js';
import {livingResidents} from '../src/core/living-world.js';
import {canConverse,chooseNpcLine,converseWithNpc} from '../src/core/npc-dialogue.js';
import {normalizeNpcDialogue} from '../src/progression/npc-dialogue.js';
import {callNeighbor,navigatePhone} from '../src/core/patrol-phone.js';

// 创建普通森林现场，跳过新手演出但不修改受测对话或存储函数。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);const g=new Game(p,()=>.5);g.state='playing';g.trees=[];g.enemies=[];g.mainlineSpeech=null;g.vehicle.active=false;g.livingPersist=()=>true;return g;}
// 进入指定角色的正式位置，室内按真实售货员位置验证距离。
function approach(g,id){g.cottage=null;const [kind,key]=id.split(':');if(kind==='shop'){g.cottage={kind:key,outside:WORKSHOP_INTERIORS[key].outside};Object.assign(g.player,interiorShopkeeper(g.cottage));}else if(kind==='camp')Object.assign(g.player,campResidents(g).find(r=>r.id===key));else if(kind==='resident')Object.assign(g.player,livingResidents(g).find(r=>r.id===key));else {const camp=MONSTER_CAMPS.find(c=>c.id===(kind==='wild'?CAMP_CHARACTERS.find(n=>n.id===key).camp:key));g.mapId=camp.mapId;Object.assign(g.player,kind==='wild'?campCharacterSite(camp):campSignSite(camp));}}

test('所有常驻伙伴、居民、柜台、具名野外人物和营地讲述者均有职业及三层对白',()=>{
 const ids=[...Object.keys(MAINLINE_NPCS).map(id=>'camp:'+id),...RESIDENTS.map(n=>'resident:'+n.id),...Object.keys(WORKSHOP_INTERIORS).map(id=>SHOP_DIALOGUE_ALIASES[id]||'shop:'+id),...CAMP_CHARACTERS.map(n=>'wild:'+n.id),...MONSTER_CAMPS.map(n=>'camp-story:'+n.id)];
 for(const id of ids){const n=NPC_DIALOGUES[id];assert.ok(n?.name&&n.job,id);assert.equal(new Set(n.lines.map(l=>l.id)).size,n.lines.length,id);for(const stage of [0,1,2])assert.ok(n.lines.some(l=>l.stage===stage&&l.text.length>8),id);}
 assert.notEqual(NPC_DIALOGUES['camp:mint'].name,NPC_DIALOGUES['resident:mint'].name);
});
test('各现场入口均可交谈，且远程、错地图、错误房间、死亡和演出不能增加次数',()=>{
 for(const id of Object.keys(NPC_DIALOGUES)){const g=scene();approach(g,id);assert.equal(canConverse(g,id),true,id);assert.equal(converseWithNpc(g,id).ok,true,id);g.player.x+=1000;assert.equal(converseWithNpc(g,id).ok,false,id);}
 const g=scene();approach(g,'camp:oak');g.player.hp=0;assert.equal(canConverse(g,'camp:oak'),false);g.player.hp=100;g.mainlineSpeech={};assert.equal(canConverse(g,'camp:oak'),false);g.mainlineSpeech=null;g.mapId='jiuzhaigou';assert.equal(canConverse(g,'camp:oak'),false);assert.equal(canConverse(g,'constructor'),false);assert.equal(canConverse(g,null),false);
});
test('三层按独立次数递进，同层轮完前不重复；不断重载不会丢失交情',()=>{
 const g=scene(),id='camp:oak';approach(g,id);const lines=[];
 for(let i=0;i<12;i++){const result=converseWithNpc(g,id,()=>.3);assert.ok(result.ok);assert.equal(result.stage,Math.min(2,Math.floor(i/3)));if(i)assert.notEqual(result.line.id,lines.at(-1));lines.push(result.line.id);g.progress=validateProgress(structuredClone(g.progress));}
 for(const start of [0,3,6,9])assert.equal(new Set(lines.slice(start,start+3)).size,3);
 assert.equal(g.progress.npcDialogue[id].count,12);assert.equal(g.progress.npcDialogue['camp:mint'],undefined);
 const npc=NPC_DIALOGUES[id],record={count:0,seen:[],last:null};assert.notEqual(chooseNpcLine(npc,record,()=>0).line.id,chooseNpcLine(npc,record,()=>.99).line.id);
});
test('六位邻居第七次优先透露各自真实线索，不提前发线索、不发装备、不接任务',()=>{
 for(const site of TREASURE_SITES){const g=scene(),id='resident:'+site.resident;approach(g,id);const before={living:structuredClone(g.progress.living.requests),mainline:structuredClone(g.progress.mainline),coins:g.progress.coins,hulls:[...g.progress.vehicleHulls]};
  for(let i=0;i<6;i++){assert.ok(converseWithNpc(g,id).ok);assert.equal(g.progress.treasure.clues.length,0);}
  const result=converseWithNpc(g,id);assert.equal(result.line.treasure,site.id);assert.ok(result.note.includes('寻宝'));assert.deepEqual(g.progress.treasure.clues,[site.id]);assert.deepEqual(g.progress.treasure.found,[]);assert.deepEqual(g.progress.vehicleHulls,before.hulls);assert.equal(g.progress.coins,before.coins);assert.deepEqual(g.progress.living.requests,before.living);assert.deepEqual(g.progress.mainline,before.mainline);
  for(let i=0;i<12;i++)converseWithNpc(g,id);assert.deepEqual(g.progress.treasure.clues,[site.id]);
 }
});
test('保存拒绝和异常均原子回滚；重试只记一段对白和一个秘密',()=>{
 const g=scene(),id='resident:owl';approach(g,id);for(let i=0;i<6;i++)converseWithNpc(g,id);const before=structuredClone(g.progress);
 for(const persist of [()=>false,()=>{throw Error('磁盘不可用');}]){g.livingPersist=persist;const result=converseWithNpc(g,id);assert.equal(result.ok,false);assert.equal(result.line,undefined);assert.deepEqual(g.progress,before);}
 g.livingPersist=()=>true;assert.ok(converseWithNpc(g,id).ok);assert.equal(g.progress.npcDialogue[id].count,7);assert.deepEqual(g.progress.treasure.clues,['bastion']);
});
test('厨房与哨站分享本人交情，青芽与薄荷的同名键不串档',()=>{
 const g=scene();approach(g,'resident:cook');converseWithNpc(g,'resident:cook');approach(g,'shop:kitchen');converseWithNpc(g,'shop:kitchen');assert.equal(g.progress.npcDialogue['resident:cook'].count,2);assert.equal(g.progress.npcDialogue['shop:kitchen'],undefined);
 approach(g,'camp:mint');converseWithNpc(g,'camp:mint');assert.equal(g.progress.npcDialogue['resident:mint'],undefined);
});
test('野外秘密仅解锁灰堆线索，实际物品与时段清空条件保留',()=>{
 for(const npc of CAMP_CHARACTERS){const g=scene(),id='wild:'+npc.id;approach(g,id);for(let i=0;i<6;i++){assert.ok(converseWithNpc(g,id).ok);assert.deepEqual(g.progress.monsterCamps.clues,[]);}assert.ok(converseWithNpc(g,id).ok);assert.deepEqual(g.progress.monsterCamps.clues,[npc.id]);assert.deepEqual(g.progress.monsterCamps.items,[]);}
});
test('校验丢弃伪造人物、无效计数与越层对白，保留有效记录',()=>{
 const p=normalizeNpcDialogue({'unknown':{count:99},'camp:oak':{count:1,seen:['0-0','0-0','2-0','fake'],last:'2-0'},'resident:owl':{count:Infinity}});assert.deepEqual(p,{'camp:oak':{count:1,seen:['0-0'],last:null}});
});
test('电话与通讯录查询不计入交情，也不绕过熟悉程度赠送秘密',()=>{
 const g=scene(),before=structuredClone(g.progress);for(let i=0;i<8;i++)assert.ok(callNeighbor(g,'owl').ok);assert.deepEqual(g.progress,before);
 assert.ok(navigatePhone(g,'owl').ok);assert.deepEqual(g.progress.npcDialogue,{});assert.deepEqual(g.progress.treasure.clues,[]);
});
