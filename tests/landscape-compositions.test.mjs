// 景观组合验证可复现性、道路留白和水界兼容，装饰不可悄悄成为新的阻挡。
import test from 'node:test';
import assert from 'node:assert/strict';
import { LANDSCAPES, generateLandscapeCompositions, inLandscapeBeach, coversLandscape } from '../src/world/landscape-compositions.js';
import { NATURAL_TERRAIN, generateNaturalTerrain, isLakeWater } from '../src/world/natural-terrain.js';
import { pathDistance } from '../src/world/paths.js';
import { WORLD, worldDistance } from '../src/world/coordinates.js';
import { terrainBlocked } from '../src/physics/terrain-navigation.js';
import { forestLayout } from '../src/world/biomes.js';
import { FireflyField, SOLITARY_FIREFLIES } from '../src/world/fireflies.js';

test('景观数据可序列化、按地貌种子复现，空地图不硬塞景点',()=>{
  const before=JSON.stringify(NATURAL_TERRAIN);
  assert.deepEqual(generateLandscapeCompositions(),LANDSCAPES);
  assert.equal(JSON.stringify(NATURAL_TERRAIN),before);
  assert.deepEqual(JSON.parse(JSON.stringify(LANDSCAPES)),LANDSCAPES);
  const other=generateNaturalTerrain({seed:744});
  assert.notDeepEqual(generateLandscapeCompositions(other),LANDSCAPES);
  const empty=generateLandscapeCompositions(generateNaturalTerrain({lakeZones:[],mountainZones:[],beachZones:[]}));
  assert.equal(empty.sites.length+empty.props.length+empty.habitats.length,0);
});

test('每座山有花石草地，每个湖有单侧宽沙滩及少量摆件，所有摆件在可通行地面',()=>{
  for(const site of LANDSCAPES.sites) {
    const props=LANDSCAPES.props.filter(p=>p.site===site.id);
    assert.ok(props.some(p=>p.kind==='flowers'));
    assert.ok(props.some(p=>p.kind==='stones'));
    if(site.kind==='lake') {
      assert.ok(props.some(p=>p.kind==='bench'));
      assert.ok(props.some(p=>p.kind==='driftwood'));
      const lake=NATURAL_TERRAIN.lakes.find(l=>l.id===site.id);
      const widths=site.beach.map((p,i)=>Math.hypot(p.x-lake.outline[i].x,p.y-lake.outline[i].y));
      assert.ok(Math.max(...widths)>85);assert.ok(Math.min(...widths)<12);
    }
    assert.ok(props.length<=16,'不围满整个景点');
  }
  for(const p of LANDSCAPES.props) {
    assert.equal(terrainBlocked(p.x,p.y,20),false);
    assert.ok(pathDistance(p.x,p.y)>64);
  }
});

test('沙岸镜像查询一致，树冠避让新沙滩，小猫和气垫船仍共享原来的水界',()=>{
  for(const lake of NATURAL_TERRAIN.lakes) {
    assert.ok(isLakeWater(lake.x,lake.y));
    const site=LANDSCAPES.sites.find(s=>s.id===lake.id);
    const p=site.beach.reduce((a,b)=>b.y>a.y?b:a);
    const x=lake.x+p.x*.98,y=lake.y+p.y*.98;
    assert.ok(inLandscapeBeach(x,y));
    assert.equal(inLandscapeBeach(x+WORLD.width,y-WORLD.height),true);
  }
  for(const tree of forestLayout())assert.equal(coversLandscape(tree.x,tree.y),false);
});

test('湖岸24只萤火虫有花丛锚点、独立漂浮且总数不增长',()=>{
  const field=new FireflyField(),shore=field.points.filter(p=>p.habitat);
  assert.equal(field.points.length,SOLITARY_FIREFLIES);assert.equal(shore.length,24);
  field.advance(0);for(let i=1;i<=600;i++)field.advance(i/60);
  for(const p of shore) {
    const h=LANDSCAPES.habitats.find(h=>h.id===p.habitat);
    assert.ok(h);assert.ok(worldDistance(p,h)<50,'保持在湖畔花草附近');
  }
});
