// 六类形态和自由搭配回归：目录覆盖、真实几何差异、组团留白与资源再生。
import test from 'node:test';
import assert from 'node:assert/strict';
import { MOUNTAIN_VARIANTS, LAKE_VARIANTS, BEACH_VARIANTS, FOREST_VARIANTS, landscapeRecipes,
  lakeContour, beachLobe } from '../src/world/landscape-variants.js';
import { NATURAL_TERRAIN, generateNaturalTerrain, touchesLandform } from '../src/world/natural-terrain.js';
import { LANDSCAPES } from '../src/world/landscape-compositions.js';
import { forestLayout, biomeAt, BIOMES } from '../src/world/biomes.js';
import { FireflyField } from '../src/world/fireflies.js';
import { WORLD, worldDistance } from '../src/world/coordinates.js';

test('生成目录保留六种形态，四境森林按生态区统一主树种',()=>{
  for(const seed of [743,...Array.from({length:24},(_,i)=>i)]) {
    const terrain=generateNaturalTerrain({seed});
    assert.equal(terrain.lakes.length,6,`种子${seed}缺湖`);
    assert.equal(terrain.mountains.length,6,`种子${seed}缺山`);
    for(const [items,key,catalog] of [[terrain.lakes,'variant',LAKE_VARIANTS],[terrain.mountains,'variant',MOUNTAIN_VARIANTS],
      [terrain.lakes,'beachVariant',BEACH_VARIANTS],[terrain.lakes,'forestVariant',FOREST_VARIANTS]])
      assert.deepEqual(new Set(items.map(i=>i[key])),new Set(catalog.map(v=>v.id)));
  }
  const trees=forestLayout();
  for(const zone of BIOMES) {
    const local=trees.filter(t=>t.biome===zone.id);
    assert.ok(local.length>=12);
    assert.ok(local.every(t=>t.variant===zone.tree&&t.palette===zone.palette));
  }
  assert.equal(new Set(trees.map(t=>t.variant)).size,4);
  assert.deepEqual(forestLayout(),trees);
});

test('四类目录支持1296种指定组合，湖形与岸带不靠换色产生差别',()=>{
  const tuples=new Set();
  for(const mountain of MOUNTAIN_VARIANTS)for(const lake of LAKE_VARIANTS)
    for(const beach of BEACH_VARIANTS)for(const forest of FOREST_VARIANTS) {
      const recipe={mountain:mountain.id,lake:lake.id,beach:beach.id,forest:forest.id};
      const result=landscapeRecipes(743,1,[recipe]);assert.deepEqual(result,[recipe]);tuples.add(JSON.stringify(result));
    }
  assert.equal(tuples.size,1296);
  assert.throws(()=>generateNaturalTerrain({combinations:[{lake:'unknown'}]}),/未知/);
  assert.throws(()=>generateNaturalTerrain({combinations:[]}),/不能为空/);
  assert.equal(new Set(LAKE_VARIANTS.map(v=>JSON.stringify(lakeContour(100,80,.3,v.id)))).size,6);
  assert.equal(new Set(BEACH_VARIANTS.map(v=>JSON.stringify(Array.from({length:64},(_,i)=>beachLobe(i/64*Math.PI*2,v.id))))).size,6);
  // 任意三类搭配都经过真实选址生成，水边轮廓与山脚保留实体间距。
  for(let i=0;i<6;i++) {
    const terrain=generateNaturalTerrain({combinations:[{mountain:MOUNTAIN_VARIANTS[i].id,lake:LAKE_VARIANTS[i].id,
      beach:BEACH_VARIANTS[(i+2)%6].id,forest:FOREST_VARIANTS[(i+4)%6].id}]});
    assert.equal(terrain.lakes.length,6);assert.equal(terrain.mountains.length,6);
    for(const lake of terrain.lakes) {
      assert.equal(lake.variant,LAKE_VARIANTS[i].id);
      for(const mountain of terrain.mountains)for(const p of mountain.outline)
        assert.equal(touchesLandform(lake,mountain.x+p.x,mountain.y+p.y,24),false);
    }
  }
});

test('每组山湖草坡相接且林缘有对应树种，萤火虫分布到全部六座湖',()=>{
  const trees=forestLayout(),field=new FireflyField();
  assert.equal(LANDSCAPES.groups.length,6);
  for(const group of LANDSCAPES.groups) {
    const [lake,mountain]=[NATURAL_TERRAIN.lakes,NATURAL_TERRAIN.mountains].map(list=>list.find(i=>i.group===group.id));
    const sites=LANDSCAPES.sites.filter(s=>s.group===group.id);
    assert.equal(group.members.length,2);
    assert.ok(sites[0].bounds.x<sites[1].bounds.x+sites[1].bounds.w&&sites[1].bounds.x<sites[0].bounds.x+sites[0].bounds.w);
    assert.ok(sites[0].bounds.y<sites[1].bounds.y+sites[1].bounds.h&&sites[1].bounds.y<sites[0].bounds.y+sites[0].bounds.h);
    assert.ok(trees.some(t=>t.variant===biomeAt(t.x,t.y).tree&&Math.min(worldDistance(t,lake),worldDistance(t,mountain))<570));
    assert.ok(field.points.some(p=>p.habitat?.startsWith(`${lake.id}-glade`)));
  }
  // 凹湖仍有精确周期镜像，所有轮廓顶点都属于该水界。
  for(const lake of NATURAL_TERRAIN.lakes)for(const p of lake.outline) {
    assert.ok(touchesLandform(lake,lake.x+p.x,lake.y+p.y,.01));
    assert.ok(touchesLandform(lake,lake.x+p.x+WORLD.width,lake.y+p.y-WORLD.height,.01));
  }
});
