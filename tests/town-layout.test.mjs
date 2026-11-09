import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
// 分区迁移使用正式碰撞、寻路与入口，防止布局只移动画面或把旧档留在新围栏里。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {TOWN_LAYOUT as T,TOWN_PATHS,TOWN_COURTS,TOWN_SHIFT_X} from '../src/config/town-layout.js';
import {MAINLINE_IDS,MAINLINE_SITES} from '../src/config/mainline.js';
import {BUILDING_ENTRIES} from '../src/config/building-entries.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {COTTAGE} from '../src/config/cottage.js';
import {planQuestRoute,questLineClear} from '../src/physics/quest-route.js';
import {blocked,moveBody} from '../src/physics/motion.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
import {restoreTownPosition} from '../src/core/camp/town-layout.js';
import {nearbyInteraction} from '../src/core/navigation/nearby-interaction.js';
import {SETTLEMENT_FENCES,settlementAt,settlementBlocked} from '../src/world/settlements.js';
import {NATURAL_TERRAIN} from '../src/world/natural-terrain.js';

// 仅解除教程，路径、入口距离和实际移动仍执行正式逻辑。
function world(){
 const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 const g=new Game(p,()=>.5);g.start();g.enemies=[];g.attackTimer=g.spawnTimer=g.fireClock=999;g.player.livingCollision=true;return g;
}

test('新分区各入口从北门可走到，点击目标独立且任务NPC不落在障碍上',()=>{
 const g=world(),start={...g.player,x:650+TOWN_SHIFT_X,y:220};
 const entries=[...BUILDING_ENTRIES.filter(e=>['realm-tower','realm-guardian','realm-rogue','clearing','post-sunleaf-post'].includes(e.id)),
  ...Object.values(WORKSHOP_INTERIORS).map(r=>({...r.door,id:'room-'+r.id})),{...COTTAGE.door,id:'room-cottage'}];
 for(const e of entries){
  const route=planQuestRoute(start,e,g.trees);assert.ok(route.reachable,e.id);
  const body={...start};
  for(let i=1;i<route.points.length;i++){
   const from=route.points[i-1],to=route.points[i];assert.ok(questLineClear(from,to,body,g.trees),e.id);
   moveBody(body,to.x-body.x,to.y-body.y,WORLD,12,g.trees);
  }
  assert.ok(worldDistance(body,e)<1,e.id+' 实际移动');
  Object.assign(g.player,body);assert.equal(nearbyInteraction(g)?.id,e.id==='room-cottage'?'cottage-entry':e.id.startsWith('room-')?e.id.replace('room-','workshop-'):e.id);
 }
 for(const id of ['camp','weapons','garage','rogue','tower','guardian'])
  assert.equal(blocked(MAINLINE_SITES[id].x,MAINLINE_SITES[id].y,12,g.trees,g.player),false,id);
});

test('主轴和南门双向通行，铺地无树干侵占，任务区不与停车生活区混用',()=>{
 const g=world();
 for(const [from,to] of [[{x:390,y:1100},{x:390,y:1500}],[{x:-150,y:729},{x:790,y:729}]]){
  for(const [a,b] of [[from,to],[to,from]])assert.ok(questLineClear(a,b,g.player,g.trees));
 }
 for(const road of TOWN_PATHS)for(let i=1;i<road.length;i++)assert.ok(questLineClear(road[i-1],road[i],g.player,g.trees));
 for(const court of TOWN_COURTS)assert.ok(!g.trees.some(t=>t.x>court.x-24&&t.x<court.x+court.w+24&&t.y>court.y-24&&t.y<court.y+court.h+24),court.id);
 assert.ok(T.weapons.x<550&&T.garage.x<550);
 assert.ok(T.story.y>800&&T.clearing.y>800&&T.letters.y<600);
 assert.ok(worldDistance(T.story,T.clearing)>180);
 assert.ok([T.guardian,T.rogue,T.tower].every(p=>p.y>1150));
 assert.equal(NATURAL_TERRAIN.mountains.length,10);
});

test('旧档位于新围栏、饭桌或低岩丘时就近恢复，安全坐标与任务资产不变',()=>{
 const mountain=NATURAL_TERRAIN.mountains.find(m=>m.group==='spring');
 for(const position of [{x:900,y:1400},{...T.letters},{x:mountain.x,y:mountain.y},{x:650+TOWN_SHIFT_X,y:220}]){
  const p=freshProgress();p.living.position=position;
  const g=new Game(p,()=>.5);
  assert.equal(blocked(g.player.x,g.player.y,12,g.trees,{mapId:'forest',livingCollision:true}),false);
  assert.ok(worldDistance(g.player,position)<=256);
  assert.equal(g.progress.coins,p.coins);assert.equal(g.progress.wood,p.wood);
  if(position.x===350){assert.equal(g.player.x,position.x);assert.equal(g.player.y,position.y);}
 }
});

// 周期镜像是运行时状态；存档本身始终保存规范坐标。
test('运行时镜像中的旧落点仍只作附近修正',()=>{
 const g=world(),from={x:T.bounds.left+WORLD.width,y:1300-WORLD.height};
 Object.assign(g.player,from);assert.ok(restoreTownPosition(g));
 assert.ok(worldDistance(g.player,from)<100);
 assert.equal(blocked(g.player.x,g.player.y,12,g.trees,g.player),false);
});


// 营地和小院连成一个安全空间，接缝无双排栅栏、门叶或重复门牌。
test('聚落只围外轮廓，整段连接处都能通行并保持安全区',()=>{
 assert.ok(!SETTLEMENT_FENCES.some(f=>f.horizontal&&f.y===1400&&f.x>-180));
 for(let x=-180+30;x<=T.bounds.right-30;x+=30)for(let y=1380;y<=1480;y+=10){
  assert.equal(settlementBlocked(x,y,12),false);assert.ok(settlementAt({x,y}));
 }
 for(const y of [1300,1500])for(const x of [y<1400?T.bounds.left:-180,T.bounds.right])assert.ok(settlementBlocked(x,y));
});
