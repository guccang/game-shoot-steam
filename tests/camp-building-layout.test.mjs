// 营地建筑布局专项：核对实体留距、同源命中和门前可通行，不重复装备和剧情战斗测试。
import test from 'node:test';
import assert from 'node:assert/strict';
import {WORKSHOP,workshopAt} from '../src/world/workshop.js';
import {REALM_ENTRANCES} from '../src/world/realm-entrances.js';
import {COTTAGES} from '../src/world/scenery.js';
import {REGION_SIGNPOSTS} from '../src/world/signposts.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {forestLayout} from '../src/world/biomes.js';
import {terrainBlocked} from '../src/physics/terrain-navigation.js';
import {WORLD} from '../src/world/coordinates.js';

// 尺寸覆盖屋顶至门牌和门前，不只比较脚底中心。
const sites=[{...WORKSHOP,id:'workshop'},...REALM_ENTRANCES.map(e=>({...e,id:e.mode})),
 {...STORY_POSTS[0],id:'post',width:128,height:112},
 {...REGION_SIGNPOSTS[0],id:'sign',width:168,height:108}];

test('建筑主体和门前预留空间互不交叠，中央保留可战斗的空地',()=>{
 for(let i=0;i<sites.length;i++)for(const b of sites.slice(i+1)){
  const a=sites[i],apart=Math.abs(a.x-b.x)>(a.width+b.width)/2+35 || a.y+85<b.y-b.height || b.y+85<a.y-a.height;
  assert.ok(apart,`${a.id} 与 ${b.id} 挤占主体或门前空间`);
 }
 assert.ok(!sites.some(e=>Math.abs(e.x-900)<e.width/2&&700>e.y-e.height&&700<e.y));
});

test('全部建筑底座和门前可以步行及驾驶，树冠不会盖住新入口',()=>{
 const trees=forestLayout();
 for(const e of sites){
  for(const dx of [-e.width/2,0,e.width/2])for(const dy of [0,40,85])assert.equal(terrainBlocked(e.x+dx,e.y+dy,24),false,e.id);
  assert.ok(!trees.some(t=>t.x+56>e.x-e.width/2&&t.x-56<e.x+e.width/2&&t.y+12>e.y-e.height&&t.y-140<e.y+60),e.id+'树冠遮挡');
 }
});

test('工坊显示与命中使用同一配置，旧位置不误触，周期镜像仍可用',()=>{
 const house=COTTAGES.find(e=>e.workshop);assert.equal(house.x,WORKSHOP.x);assert.equal(house.y,WORKSHOP.y);
 assert.ok(workshopAt({x:house.x,y:house.y-50}));assert.ok(workshopAt({x:house.x+WORLD.width,y:house.y-50-WORLD.height}));
 assert.equal(workshopAt({x:1010,y:530}),false);
});
