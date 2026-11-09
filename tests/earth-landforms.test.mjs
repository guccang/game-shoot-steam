// 新地貌真实世界边界、旧路保留、两栖与树林身份的针对性回归。
import test from 'node:test';import assert from 'node:assert/strict';
import {NATURAL_TERRAIN as T,generateNaturalTerrain,touchesLandform,isNaturalBlocked,isMountainBlocked,isLakeWater,TERRAIN_RESERVES} from '../src/world/natural-terrain.js';
import {EARTH_LANDFORMS,EXTRA_TREE_SPECIES} from '../src/config/earth-biomes.js';
import {visibleEarthLandforms} from '../src/world/earth-landforms.js';
import {WORLD} from '../src/world/coordinates.js';
import {pathBoundsOverlap} from '../src/world/paths.js';
import {blocked,moveBody} from '../src/physics/motion.js';
import {forestLayout} from '../src/world/biomes.js';
import {Game} from '../src/core/game.js';import {freshProgress} from '../src/progression/progress.js';
import {SeasonAtlas} from '../src/rendering/season-raster.js';
import {restoreTownPosition} from '../src/core/camp/town-layout.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
test('五种地貌各两处可复现，不侵占旧山湖道路与营地',()=>{
 assert.equal(T.earth.length,10);assert.deepEqual(generateNaturalTerrain().earth,T.earth);for(const kind of EARTH_LANDFORMS)assert.equal(T.earth.filter(f=>f.kind===kind.id).length,2);
 for(const f of T.earth){assert.equal(pathBoundsOverlap(f.visualBounds,100),false);for(const other of [...T.lakes,...T.mountains]){const a=f.visualBounds,b=other.visualBounds;assert.ok(a.x+a.w+90<=b.x||b.x+b.w+90<=a.x||a.y+a.h+90<=b.y||b.y+b.h+90<=a.y,`${f.id} 侵占 ${other.id}`);}for(const r of TERRAIN_RESERVES)assert.equal(touchesLandform(f,r.x+r.w/2,r.y+r.h/2,100),false);}
});
test('裂谷阻挡步行、车辆、两栖及高速移动，不识别成湖水',()=>{
 for(const f of T.earth.filter(f=>f.kind==='rift'))for(const offset of [0,WORLD.width]){
  const x=f.x+offset,y=f.y;assert.ok(isNaturalBlocked(x,y,12));assert.ok(isMountainBlocked(x,y,12));assert.equal(isLakeWater(x,y),false);
  for(const ability of [{},{amphibious:true},{treePass:true}]){const body={x,y:y-f.ry-80,mapId:'forest',...ability};assert.ok(blocked(x,y,12,[],body));moveBody(body,0,f.ry*2+160,WORLD,12,[]);assert.ok(body.y<y);assert.equal(touchesLandform(f,body.x,body.y,11),false);}
 }
});
test('雨林地面可走，火山雪山沉积岩按底座阻挡，周围可绕行',()=>{
 for(const f of T.earth){assert.equal(isNaturalBlocked(f.x,f.y,12),f.kind!=='rainforest');assert.equal(blocked(f.x,f.y,12,[],{mapId:'forest',amphibious:true}),f.kind!=='rainforest');for(const side of [-1,1])assert.equal(isNaturalBlocked(f.x+side*(f.rx+100),f.y,12),false);}
});
test('高峰与世界镜像按完整视觉范围显示，不依赖底座入屏',()=>{
 const f=T.earth.find(f=>f.kind==='snowpeak'),view={x:f.x-70,y:f.y-f.height-50,w:140,h:100};assert.ok(visibleEarthLandforms(T,view).some(v=>v.id===f.id));const mirrored=visibleEarthLandforms(T,{...view,x:view.x+WORLD.width});assert.equal(mirrored.find(v=>v.id===f.id).x,f.x+WORLD.width);
});
test('十种新树进入正式可采集实体，大小与脚底身份不变',()=>{
 const layout=forestLayout(),g=new Game(freshProgress());for(const species of EXTRA_TREE_SPECIES){const trees=g.trees.filter(t=>t.variant===species.id);assert.ok(trees.length>20,species.id);for(const tree of trees.slice(0,3)){assert.ok(tree.hp>0&&tree.radius>0);assert.ok(tree.size<=1.12);assert.ok(layout.some(t=>t.x===tree.x&&t.y===tree.y&&t.variant===tree.variant));assert.equal(isNaturalBlocked(tree.x,tree.y,tree.radius),false);}}
 for(const f of T.earth.filter(f=>f.kind==='rainforest'))assert.ok(g.trees.filter(t=>Math.hypot((t.x-f.x)/f.rx,(t.y-f.y)/f.ry)<1).length>=10);
});
test('有界季节缓存淘汰时立即释放两端像素，命中保留最近使用项',()=>{
 const atlas=new SeasonAtlas(2),images=[],state={revision:1,target:'winter',from:{summer:1},active:true,progress:1};
 const build=()=>{const c={width:256,height:320};images.push(c);return c;};
 const a=atlas.image('a',state,build),b=atlas.image('b',state,build);atlas.image('a',state,build);atlas.image('c',state,build);
 assert.equal(atlas.stats().count,2);assert.equal(b.width,1);assert.equal(a.width,256);assert.equal(images[3].width,1);assert.equal(atlas.stats().bytes,2*2*256*320*4);atlas.clear();assert.ok(images.every(c=>c.width===1));
});
test('旧存档落在新裂谷时就近移出，玩家与气垫船资产保留',()=>{
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';const g=new Game(p),f=T.earth[0];Object.assign(g.player,{x:f.x,y:f.y});g.progress.campParking.owned=[{hull:3,spot:null,mapId:'forest',x:f.x,y:f.y,hp:.65,ammo:7}];const coins=p.coins,stock=structuredClone(p.logistics);assert.ok(restoreTownPosition(g));assert.equal(blocked(g.player.x,g.player.y,12,g.trees,{...g.player,mapId:'forest'}),false);const car=g.progress.campParking.owned[0];assert.equal(isMountainBlocked(car.x,car.y,30),false);assert.equal(car.hp,.65);assert.equal(car.ammo,7);assert.equal(p.coins,coins);assert.deepEqual(p.logistics,stock);assert.ok(Math.hypot(g.player.x-f.x,g.player.y-f.y)<600);
});
test('十种树砍伐后通过正式树桩计时原位再生，保持树种和尺寸',()=>{
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';const g=new Game(p),trees=EXTRA_TREE_SPECIES.map(s=>g.trees.find(t=>t.variant===s.id));
 g.state='playing';g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.spawnTimer=g.mainlineTalkDelay=g.fireClock=999999;
 for(const t of trees){g.leaveStump(t);t.hp=0;}g.stumps.forEach(s=>s.life=0);g.update(.01,{x:0,y:0});
 for(const old of trees){const tree=g.trees.find(t=>t.x===old.x&&t.y===old.y&&t.hp>0);assert.ok(tree,old.variant);assert.equal(tree.variant,old.variant);assert.equal(tree.size,old.size);assert.equal(tree.maxHp,old.maxHp);}assert.equal(g.stumps.length,0);
});
