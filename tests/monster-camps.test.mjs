// 营地定向回归：真实战斗入口、永久账本、边界、线索和地图安全空间。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {validateProgress} from '../src/progression/progress.js';
import {MONSTER_CAMPS,CAMP_CHARACTERS,MONSTER_CAMP_RULES as RULES,campVisitorSite,campSignSite,campCharacterSite,campCacheSite} from '../src/config/monster-camps.js';
import {monsterCampObjects,updateMonsterCamps,insideMonsterCamp,monsterCampLevel,monsterCampChatter,talkCampCharacter,inspectCampCache} from '../src/core/monster-camps.js';
import {worldDistance} from '../src/world/coordinates.js';
import {blocked} from '../src/physics/motion.js';
import {forestLayout} from '../src/world/biomes.js';
import {jiuzhaigouTrees} from '../src/world/jiuzhaigou.js';
import {LIVING_PHASES} from '../src/config/living-world.js';
import {FARM_CROPS} from '../src/config/farm.js';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';
import {clearingSiteOpen} from '../src/core/clearing-site.js';
import {updateEncounters} from '../src/core/encounter-manager.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {beginGardeningLesson} from '../src/progression/mainline-gardening.js';
import {ensureWildFarms} from '../src/core/wild-farm.js';
import {campRenderObjects,drawMonsterCampObject,drawMonsterCampGround} from '../src/rendering/monster-camps.js';
import {CAMP_ROSTERS,campResidentHead} from '../src/config/camp-residents.js';
import {RANGED_ENEMIES} from '../src/config/ranged-enemies.js';
import {ARMORED} from '../src/config/armored-enemies.js';
import {updateEnemies} from '../src/core/enemy-manager.js';
import {nearbyInteraction} from '../src/core/nearby-interaction.js';
import {nearbyInteractionAnchor} from '../src/world/interaction-anchors.js';
// 固定随机数、使用隔离内存保存；不替换正式伤害和死亡结算。
function scene(index=0){const p=freshProgress(),c=MONSTER_CAMPS[index];p.mapId=c.mapId;const g=new Game(p,()=>.5);g.start();g.livingPersist=()=>true;g.enemies=[];g.attackTimer=999;Object.assign(g.player,campVisitorSite(c),{y:c.y-RULES.warningRadius-20});updateMonsterCamps(g,.04);return g;}
// 进入正式警戒圈再通过Game.hit清场，检查完整轮次而非直接写完成旗标。
function clear(g,c){Object.assign(g.player,{x:c.x,y:c.y+110});updateMonsterCamps(g,.04);for(const e of [...g.enemies].filter(e=>e.monsterCamp===c.id))g.hit(e,99999);}

// 对照旧半径外的新增区域，森林与湖谷均从正式战斗入口激活五个原名额。
test('全部营地交战距离增加30%，新边界外只预警，新增范围内即可交战',()=>{
 const previous=150*Math.sqrt(1.3);assert.equal(RULES.radius,previous*1.3);assert.equal(RULES.scale,Math.sqrt(1.3));assert.equal(RULES.warningRadius,RULES.radius+35);
 for(const [index,camp] of MONSTER_CAMPS.entries()){
  const g=scene(index);Object.assign(g.player,{x:camp.x,y:camp.y-RULES.radius-1});assert.equal(insideMonsterCamp(g,camp),false);updateMonsterCamps(g,.04);assert.equal(g.enemies.length,0);
  assert.equal(monsterCampObjects(g).filter(e=>e.monsterCamp===camp.id&&e.campState==='alert').length,5);
  Object.assign(g.player,{x:camp.x,y:camp.y-(previous+RULES.radius)/2});assert.ok(worldDistance(g.player,camp)>previous);assert.equal(insideMonsterCamp(g,camp),true);
  updateMonsterCamps(g,.04);assert.equal(g.enemies.length,5,camp.id);assert.ok(g.enemies.every(e=>e.campState==='chasing'));
  const enemy=g.enemies[0],hp=enemy.hp;g.hit(enemy,1);assert.equal(enemy.hp,hp-1);
 }
});

test('所有营地木牌完整位于交战范围外，观察点可安全够到且不落水堵树',()=>{
 const trees={forest:forestLayout(),jiuzhaigou:jiuzhaigouTrees()};
 for(const c of MONSTER_CAMPS){const sign=campSignSite(c);assert.ok(worldDistance(c,sign)>RULES.radius);assert.ok(worldDistance(campVisitorSite(c),sign)<=RULES.interact);
  for(const [dx,dy] of [[0,0],[-54,-56],[54,-56],[-54,-20],[54,-20]]){const p={...sign,x:sign.x+dx,y:sign.y+dy};assert.ok(worldDistance(c,p)>RULES.radius);assert.equal(blocked(p.x,p.y,8,trees[c.mapId],p),false,c.id);}
 }
});

test('木牌入口按真实牌脚判距，牌面锚点与绘制一致，人物和灰堆不变透明热点',()=>{
 const g=scene(2),c=MONSTER_CAMPS[2],sign=campSignSite(c);Object.assign(g.player,campVisitorSite(c));let entry=nearbyInteraction(g);assert.equal(entry.id,sign.id);assert.equal(entry.presentation,'camp-sign');
 const drawn=campRenderObjects(g).find(e=>e.type==='monster-camp-sign'&&e.id===c.id);assert.equal(drawn.x,sign.x);assert.equal(drawn.y,sign.y);assert.deepEqual(nearbyInteractionAnchor(g,entry),{x:drawn.x,y:drawn.y-38,space:'world'});
 Object.assign(g.player,{x:sign.x,y:sign.y-100});assert.notEqual(nearbyInteraction(g)?.id,sign.id);
 Object.assign(g.player,campCharacterSite(c));entry=nearbyInteraction(g);assert.equal(entry.id,c.id+'-character');assert.notEqual(entry.presentation,'camp-sign');
});

test('全部营地固定混编，生活和战斗保留物种、当地等级及兵种碰撞体',()=>{
 for(const [index,c] of MONSTER_CAMPS.entries()){
  const g=scene(index),actors=monsterCampObjects(g).filter(e=>e.monsterCamp===c.id);
  assert.equal(actors.length,5);assert.ok(new Set(actors.map(e=>e.species)).size>=3);assert.deepEqual(actors.map(e=>e.species),CAMP_ROSTERS[c.id]);
  for(const e of actors){assert.equal(e.level,monsterCampLevel(c));assert.ok(Number.isFinite(e.hp)&&e.hp>0);assert.equal(e.radius,e.species===ARMORED.id?ARMORED.radius:RANGED_ENEMIES[e.species]?.bodyRadius||18);assert.equal(!!e.flying,e.species==='leaf-bat');}
  Object.assign(g.player,c);updateMonsterCamps(g,.04);assert.deepEqual(g.enemies.map(e=>e.species),actors.map(e=>e.species));
 }
});

test('混编部分击杀存档恢复原名额物种，整营结算仍只发一份种子',()=>{
 const g=scene(),c=MONSTER_CAMPS[0];Object.assign(g.player,c);updateMonsterCamps(g,.04);g.hit(g.enemies.find(e=>e.campSlot===2),99999);
 const h=new Game(validateProgress(structuredClone(g.progress)),()=>.5);h.start();h.livingPersist=()=>true;h.enemies=[];Object.assign(h.player,c);updateMonsterCamps(h,.04);
 assert.deepEqual(h.enemies.map(e=>[e.campSlot,e.species]),CAMP_ROSTERS[c.id].map((species,slot)=>[slot,species]).filter(([slot])=>slot!==2));
 for(const e of [...h.enemies])h.hit(e,99999);assert.equal(h.progress.monsterCamps.camps[c.id].clears,1);assert.equal(h.progress.monsterCamps.camps[c.id].mask,31);
});

test('混编远程警觉不发弹，入营后正式发射，离屏返营清理在途弹',()=>{
 const g=scene(),c=MONSTER_CAMPS[0];g.arrivalView={width:800,height:800,left:-400,right:400,top:-400,bottom:400};g.player.invincible=999;
 Object.assign(g.player,{x:c.x,y:c.y-RULES.radius-10});
 for(let i=0;i<60;i++){updateMonsterCamps(g,.05);updateEnemies(g,.05,{...g.player});}assert.equal(g.enemyBolts.length,0);assert.equal(g.enemies.length,0);
 Object.assign(g.player,c);let shot=false;for(let i=0;i<80;i++){updateMonsterCamps(g,.05);updateEnemies(g,.05,{...g.player});shot||=g.enemyBolts.length>0;}assert.ok(shot);
 g.player.x-=1500;updateMonsterCamps(g,1);updateEnemies(g,.05,{...g.player});assert.equal(g.enemies.length,0);assert.equal(g.enemyBolts.length,0);assert.equal(g.progress.monsterCamps.camps[c.id].clears,0);
});

test('居民闲走推进车轮和重靴，驻足警觉保留相位且高个预警不压身体',()=>{
 for(const index of [4,5,6]){
  const g=scene(index),c=MONSTER_CAMPS[index];updateMonsterCamps(g,.2);let actors=monsterCampObjects(g).filter(e=>e.monsterCamp===c.id);assert.ok(actors.some(e=>e.rangedWalk>0));
  Object.assign(g.player,{x:c.x,y:c.y-RULES.radius-10});updateMonsterCamps(g,.05);actors=monsterCampObjects(g).filter(e=>e.monsterCamp===c.id);const phases=actors.map(e=>[e.rangedWalk,e.armoredWalk]);updateMonsterCamps(g,.5);assert.deepEqual(monsterCampObjects(g).filter(e=>e.monsterCamp===c.id).map(e=>[e.rangedWalk,e.armoredWalk]),phases);
  for(const e of actors)if(e.species===ARMORED.id)assert.ok(campResidentHead(e)>90);
 }
});
test('站牌等级取营地出生点而不是牌子脚底，地面不绘制警戒圈',()=>{
 const g=scene(),camp=MONSTER_CAMPS[0],sign=campRenderObjects(g).find(e=>e.type==='monster-camp-sign'&&e.id===camp.id),texts=[],arcs=[];
 // 只记录正式绘制器的文字与圆弧调用，其余画布操作交给空接收器。
 const c=new Proxy({fillText:text=>texts.push(text),arc:(...args)=>arcs.push(args)},{get:(object,key)=>object[key]||(()=>{})});
 drawMonsterCampObject(c,sign,g,0,false);assert.deepEqual(texts,[camp.name,monsterCampLevel(camp)+'级']);drawMonsterCampGround(c,g,0,{x:camp.x-400,y:camp.y-400,w:800,h:800});assert.equal(arcs.length,0);
});
test('新路边野田避开营地生活与警戒留白，不挤占居民空间',()=>{
 const g=scene();g.progress.farm.wildMaps=[];g.progress.farm.wildScatterVersion=0;assert.ok(ensureWildFarms(g));assert.ok(g.progress.farm.plots.length>=80);
 for(const p of g.progress.farm.plots)for(const c of MONSTER_CAMPS.filter(c=>c.mapId===p.mapId))assert.ok(worldDistance(p,c)>=310,c.id);
});
test('所有等级带、全部种子都有固定来源，营地和圈外点不落水或堵在树冠中',()=>{
 assert.deepEqual(MONSTER_CAMPS.filter(c=>c.mapId==='forest').map(monsterCampLevel),[2,4,7,10,13,16,20]);
 for(let i=0;i<FARM_CROPS.length;i++)assert.ok(MONSTER_CAMPS.some(c=>c.seeds.includes(i)));
 const trees={forest:forestLayout(),jiuzhaigou:jiuzhaigouTrees()};
 for(const c of MONSTER_CAMPS){assert.equal(blocked(c.x,c.y,240,[],c),false,c.id);for(const p of [campVisitorSite(c),campCacheSite(c),campCharacterSite(c)])assert.equal(blocked(p.x,p.y,20,trees[c.mapId],p),false,c.id);assert.ok(trees[c.mapId].every(t=>worldDistance(t,c)>=310),c.id);}
});
test('具名居民移入营地仍免疫所有命中，不进入五个战斗名额',()=>{
 const g=scene(),c=MONSTER_CAMPS[0];Object.assign(g.player,campCharacterSite(c));updateMonsterCamps(g,.04);const npc=monsterCampObjects(g).find(e=>e.npc==='ash');assert.ok(worldDistance(npc,c)<RULES.radius);assert.equal(g.enemies.length,5);assert.ok(g.enemies.every(e=>!e.campNpc));const kills=g.kills;g.hit(npc,99999);assert.equal(npc.hp,1);assert.equal(g.kills,kills);assert.ok(talkCampCharacter(g,'ash').ok);
});
test('可见追兵远离出生营地仍保留，脱离视野后实际返营而非瞬移刷新',()=>{
 const g=scene(),c=MONSTER_CAMPS[0];Object.assign(g.player,c);updateMonsterCamps(g,.04);const actor=g.enemies[0];Object.assign(g.player,{x:c.x-900,y:c.y});Object.assign(actor,{x:g.player.x+40,y:g.player.y,hp:7});g.viewport={width:320,height:568};g.arrivalView={...g.viewport,left:-160,right:160,top:-284,bottom:284};updateMonsterCamps(g,1);assert.ok(g.enemies.includes(actor));
 g.player.x-=500;const before={x:actor.x,y:actor.y};updateMonsterCamps(g,1);assert.equal(actor.campState,'returning');assert.ok(worldDistance(actor,before)>0&&worldDistance(actor,before)<100);assert.equal(actor.hp,7);assert.equal(g.progress.monsterCamps.camps[c.id].clears,0);
});
test('边缘预警只注视，进入攻击、越界继续追、单只离开视野才返营',()=>{
 const g=scene(),c=MONSTER_CAMPS[0];assert.equal(g.enemies.length,0);assert.equal(monsterCampObjects(g).filter(o=>o.type==='monster-camp-resident').length,5);assert.ok(monsterCampChatter(g));
 assert.ok(Math.abs(RULES.radius/(150*Math.sqrt(1.3))-1.3)<1e-9);g.viewport={width:390,height:844};g.arrivalView={...g.viewport,left:-195,right:195,top:-422,bottom:422};
 Object.assign(g.player,{x:c.x,y:c.y-RULES.radius-10});updateMonsterCamps(g,.04);const alerts=monsterCampObjects(g).filter(o=>o.campState==='alert');assert.equal(alerts.length,5);assert.equal(g.enemies.length,0);assert.ok(alerts.every(e=>e.campLookY<0));updateMonsterCamps(g,.5);assert.deepEqual(monsterCampObjects(g).filter(o=>o.campState==='alert').map(e=>[e.x,e.y]),alerts.map(e=>[e.x,e.y]));
 Object.assign(g.player,{x:c.x,y:c.y+RULES.radius-1});updateMonsterCamps(g,.04);assert.equal(g.enemies.length,5);assert.ok(g.enemies.every(e=>e.level===2));
 const e=g.enemies[0],hp=e.hp;Object.assign(g.player,{x:c.x,y:c.y+RULES.radius+20});updateMonsterCamps(g,.04);g.hit(e,1);assert.ok(e.hp<hp);assert.equal(g.enemies.length,5);
 e.x=g.player.x-300;e.y=g.player.y;updateMonsterCamps(g,.4);assert.ok(g.enemies.includes(e));updateMonsterCamps(g,.5);assert.equal(e.campState,'returning');assert.equal(g.enemies.length,4);const retained=e.hp;g.hit(e,99999);assert.equal(e.hp,retained);
 assert.ok(monsterCampObjects(g).some(a=>a.id===e.id&&a.campState==='returning'));assert.equal(g.progress.monsterCamps.camps[c.id].clears,0);
});
test('完整清场才计次和发种，存档恢复部分名额，重复结算不多领',()=>{
 let g=scene(),c=MONSTER_CAMPS[0];Object.assign(g.player,c);updateMonsterCamps(g,.04);g.hit(g.enemies[0],99999);g.hit(g.enemies[1],99999);assert.equal(g.progress.monsterCamps.camps[c.id].clears,0);
 const saved=JSON.parse(JSON.stringify(g.progress));g=new Game(saved,()=>.5);g.start();g.livingPersist=()=>true;Object.assign(g.player,c);g.enemies=[];updateMonsterCamps(g,.04);assert.equal(g.enemies.length,3);
 const seeds=g.progress.farm.seeds.slice(),victims=[...g.enemies];for(const e of victims)g.hit(e,99999);assert.equal(g.progress.monsterCamps.camps[c.id].clears,1);for(const i of c.seeds)assert.equal(g.progress.farm.seeds[i],seeds[i]+1);
 for(const e of victims)g.hit(e,99999);assert.equal(g.progress.monsterCamps.camps[c.id].clears,1);assert.equal(g.waveKills,0);assert.deepEqual(validateProgress(g.progress).monsterCamps,g.progress.monsterCamps);
});
test('保存失败不发奖励，稍后重试恰好提交一次；远处回收不计击杀',()=>{
 const g=scene(),c=MONSTER_CAMPS[0];g.livingPersist=()=>false;clear(g,c);assert.equal(g.progress.monsterCamps.camps[c.id].clears,0);assert.equal(g.progress.monsterCamps.camps[c.id].mask,0);
 g.livingPersist=()=>true;updateMonsterCamps(g,3.1);assert.equal(g.progress.monsterCamps.camps[c.id].clears,1);updateMonsterCamps(g,.1);assert.equal(g.progress.monsterCamps.camps[c.id].clears,1);
 const h=scene();Object.assign(h.player,{x:c.x+1000,y:c.y});updateMonsterCamps(h,.1);assert.equal(h.progress.monsterCamps.camps[c.id].clears,0);
});
test('冷却不在暂停推进，原地不重刷，离场后下一轮有新名额并记忆闲聊',()=>{
 const g=scene(),c=MONSTER_CAMPS[0];clear(g,c);const cool=g.progress.monsterCamps.camps[c.id].cooldown;g.state='paused';updateMonsterCamps(g,100);assert.equal(g.progress.monsterCamps.camps[c.id].cooldown,cool);
 g.state='playing';updateMonsterCamps(g,100);assert.equal(g.progress.monsterCamps.camps[c.id].mask,31);Object.assign(g.player,{x:c.x+400,y:c.y});updateMonsterCamps(g,.1);Object.assign(g.player,campVisitorSite(c),{y:c.y-RULES.warningRadius-20});updateMonsterCamps(g,.1);assert.equal(monsterCampObjects(g).filter(o=>o.type==='monster-camp-resident').length,5);g.time=0;assert.match(monsterCampChatter(g).text,/1回/);
});
test('品种门槛保留，具名人物安全交谈、夜间线索、永久特殊物品及加种奖励',()=>{
 const locked=scene(1),c1=MONSTER_CAMPS[1];clear(locked,c1);for(const i of c1.seeds)assert.equal(locked.progress.farm.seeds[i],0);
 const g=scene(),npc=CAMP_CHARACTERS[0],destination=MONSTER_CAMPS.find(c=>c.id===npc.destination);assert.equal(talkCampCharacter(g,npc.id).ok,false);Object.assign(g.player,campCharacterSite(MONSTER_CAMPS[0]));assert.ok(talkCampCharacter(g,npc.id).ok);assert.equal(inspectCampCache(g,npc.id).ok,false);
 Object.assign(g.player,campCacheSite(destination));assert.equal(inspectCampCache(g,npc.id).ok,false);g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id==='night').start;
 g.livingPersist=()=>false;assert.equal(inspectCampCache(g,npc.id).ok,false);g.livingPersist=()=>true;assert.ok(inspectCampCache(g,npc.id).ok);assert.equal(inspectCampCache(g,npc.id).ok,false);assert.ok(validateProgress(g.progress).monsterCamps.items.includes(npc.id));
 const before=g.progress.farm.seeds[0];clear(g,MONSTER_CAMPS[0]);assert.equal(g.progress.farm.seeds[0],before+2);
});
test('旧档与损坏输入安全迁移，剧情预览不生成营地',()=>{
 const p=validateProgress({monsterCamps:{camps:{'ember-pot':{clears:-8,mask:999,cooldown:Infinity}},items:['ash'],clues:[]}});assert.deepEqual(p.monsterCamps.camps['ember-pot'],{clears:0,mask:0,cooldown:0});assert.deepEqual(p.monsterCamps.items,[]);assert.deepEqual(validateProgress({monsterCamps:{clues:{},items:42}}).monsterCamps.items,[]);
 const g=scene();g.story={};assert.deepEqual(monsterCampObjects(g),[]);updateMonsterCamps(g,100);assert.equal(g.progress.monsterCamps.camps['ember-pot'].clears,0);
});
test('正式插值快照复用营地居民，休闲步态不因渲染类型丢失',()=>{
 const g=scene(),interpolation=createRenderInterpolation();interpolation.beforeStep(g);updateMonsterCamps(g,.04);const sample=interpolation.sample(g,.5),actors=monsterCampObjects(sample).filter(o=>o.type==='monster-camp-resident');assert.equal(actors.length,5);assert.ok(actors.every(a=>a.kind==='dumpling'&&Number.isFinite(a.gelStep)));
});
test('清缴选点避让常驻营地，观察期间随机遭遇不消耗倒计时',()=>{
 const g=scene(),c=MONSTER_CAMPS[0];assert.equal(clearingSiteOpen(c,[]),false);g.encounterTimer=8;updateEncounters(g,1,true);assert.equal(g.encounterTimer,8);Object.assign(g.player,{x:c.x-600,y:c.y});updateEncounters(g,1,true);assert.equal(g.encounterTimer,7);
});
test('另外两位人物区分昼夜和清场条件，特殊物品只能领取一次',()=>{
 for(const npc of CAMP_CHARACTERS.slice(1)){
  const index=MONSTER_CAMPS.findIndex(c=>c.id===npc.camp),g=scene(index),c=MONSTER_CAMPS.find(c=>c.id===npc.destination);Object.assign(g.player,campCharacterSite(MONSTER_CAMPS[index]));assert.ok(talkCampCharacter(g,npc.id).ok);Object.assign(g.player,campCacheSite(c));g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===npc.phase).start;
  if(npc.requiresClear){assert.equal(inspectCampCache(g,npc.id).ok,false);clear(g,c);Object.assign(g.player,campCacheSite(c));}
  assert.ok(inspectCampCache(g,npc.id).ok);assert.equal(inspectCampCache(g,npc.id).ok,false);assert.ok(validateProgress(g.progress).monsterCamps.items.includes(npc.id));
 }
});
test('定点营地找种同时推进已有找种教学，特殊场景立即撤掉营地敌人',()=>{
 const g=scene(),c=MONSTER_CAMPS[0];g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('neighbor-seeds'));g.progress.mainline.currentId='neighbor-seeds';g.progress.mainline.phase='doing';beginGardeningLesson(g.progress);clear(g,c);assert.equal(g.progress.mainline.gardening.seedDrops,1);
 const h=scene();Object.assign(h.player,c);updateMonsterCamps(h,.04);h.story={};updateMonsterCamps(h,.04);assert.equal(h.enemies.filter(e=>e.monsterCamp).length,0);
});
