// 地形配额、通道和跨界几何的专项回归，避免只凭总览颜色宣称面积达标。
import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD} from '../src/world/coordinates.js';
import {NATURAL_TERRAIN as terrain,isLakeWater,isMountainBlocked,isMountainArea,isNaturalBlocked,touchesLandform,visibleMountains,generateNaturalTerrain,TERRAIN_RESERVES} from '../src/world/natural-terrain.js';
import {mountainPeaks} from '../src/world/mountain-peaks.js';
import {landformArea} from '../src/world/regional-landforms.js';
import {forestCoverAt} from '../src/world/forest-cover.js';
import {TERRAIN_COVERAGE} from '../src/config/terrain-coverage.js';
import {MONSTER_CAMPS,campVisitorSite,campCacheSite} from '../src/config/monster-camps.js';
import {PATHS} from '../src/world/paths.js';
import {nearestDryTerrain,terrainBlocked,terrainLineClear,naturalWaypoint} from '../src/physics/terrain-navigation.js';
import {moveBody} from '../src/physics/motion.js';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {restoreTownPosition} from '../src/core/camp/town-layout.js';

test('湖泊与山地按真实多边形面积各达到5%，加载参数复现同一地图',()=>{
 for(const [kind,items] of [['lake',terrain.lakes],['mountain',terrain.mountains]])assert.ok(Math.abs(items.reduce((n,i)=>n+landformArea(i),0)/WORLD.width/WORLD.height-TERRAIN_COVERAGE[kind])<1e-10);
 assert.deepEqual(generateNaturalTerrain(),terrain);
 assert.equal(generateNaturalTerrain({lakeZones:[],mountainZones:[],beachZones:[]}).obstacles.length,0);
});
test('独立错位80单位网格抽样，五类互斥且覆盖率误差低于0.15个百分点',()=>{
 const counts=Object.fromEntries(Object.keys(TERRAIN_COVERAGE).map(k=>[k,0]));let total=0;
 for(let y=27;y<WORLD.height;y+=80)for(let x=19;x<WORLD.width;x+=80){counts[forestCoverAt(x,y)]++;total++;}
 for(const [k,n] of Object.entries(counts))assert.ok(Math.abs(n/total-TERRAIN_COVERAGE[k])<.0015,`${k}: ${n/total*100}%`);
});
test('新地貌不侵占任何道路或野外营地的观察点、宝箱和战斗核心',()=>{
 const regional=terrain.obstacles.filter(i=>i.regional);
 for(const r of [...TERRAIN_RESERVES,{x:WORLD.width-1400,y:0,w:1400,h:2300}])for(let y=r.y;y<=r.y+r.h;y+=100)for(let x=r.x;x<=r.x+r.w;x+=100)assert.ok(!regional.some(i=>touchesLandform(i,x,y,30)),'营地及西侧工业地必须保持干地');
 for(const road of PATHS)for(let j=0;j<road.length;j+=8){const p=road[j];assert.ok(!regional.some(i=>touchesLandform(i,p.x,p.y,45)));}
 for(const camp of MONSTER_CAMPS.filter(c=>c.mapId==='forest'))for(const p of [camp,campVisitorSite(camp),campCacheSite(camp)])assert.ok(!regional.some(i=>touchesLandform(i,p.x,p.y,45)),camp.id);
});
test('大湖仍阻挡步行，岩柱底座保留碰撞，山地内峰间道路可供猫猫与载具穿行',()=>{
 const lake=terrain.lakes.find(i=>i.regional);assert.ok(isLakeWater(lake.x,lake.y));assert.ok(isNaturalBlocked(lake.x,lake.y));assert.equal(isMountainBlocked(lake.x,lake.y),false);
 const mountain=terrain.mountains.find(i=>i.regional&&mountainPeaks(i).length>12),peak=mountainPeaks(mountain)[4];
 assert.ok(isMountainBlocked(peak.x,peak.y));assert.ok(isMountainBlocked(peak.x+WORLD.width,peak.y-WORLD.height));
 const start={x:peak.x-110,y:peak.y+95},end={x:peak.x+110,y:peak.y+95};
 assert.ok(isMountainArea(start.x,start.y));assert.equal(forestCoverAt(start.x,start.y),'mountain');assert.equal(isMountainBlocked(start.x,start.y,30),false);
 assert.ok(terrainLineClear(start,end,30));
 for(const radius of [12,30])for(const mirror of [0,1]){const body={x:start.x+mirror*WORLD.width,y:start.y-mirror*WORLD.height};moveBody(body,220,0,WORLD,radius);assert.ok(Math.abs(body.x-(end.x+mirror*WORLD.width))<.001);}
 assert.deepEqual(nearestDryTerrain(start),start);
});
test('旧存档落在大湖中央时恢复到附近干地，大山中心在屏外仍进入绘制',()=>{
 const lake=terrain.lakes.filter(i=>i.regional).sort((a,b)=>b.ry-a.ry)[0],p=nearestDryTerrain(lake);
 assert.ok(!terrainBlocked(p.x,p.y));assert.ok(Math.hypot(p.x-lake.x,p.y-lake.y)<3600);
 const mountain=terrain.mountains.find(i=>i.regional&&i.rx>500),peak=mountainPeaks(mountain)[0],view={x:peak.x-120,y:peak.y-190,w:240,h:250};
 assert.ok(visibleMountains(view).some(i=>i.parentId===mountain.id&&i.id===peak.id));
});
test('从山地区域外进入峰间走廊，峰旁寻路不绕整片山地，恢复位置保留原地',()=>{
 const mountain=terrain.mountains.find(i=>i.regional&&mountainPeaks(i).length>12),peak=mountainPeaks(mountain)[4];
 const start={x:mountain.x+mountain.bounds.x-40,y:peak.y+95},end={x:peak.x,y:peak.y+95};
 assert.equal(isMountainArea(start.x,start.y),false);assert.ok(isMountainArea(end.x,end.y));assert.ok(terrainLineClear(start,end,30));
 const body={...start};moveBody(body,end.x-start.x,0,WORLD,30);assert.ok(Math.abs(body.x-end.x)<.001);
 const from={x:peak.x-130,y:peak.y},goal={x:peak.x+130,y:peak.y},waypoint=naturalWaypoint(from,goal);
 assert.ok(terrainLineClear(from,waypoint));assert.ok(Math.hypot(waypoint.x-from.x,waypoint.y-from.y)<400);
 const p=freshProgress();p.arrival=null;p.living.position=end;const g=new Game(p);Object.assign(g.player,end);restoreTownPosition(g);
 assert.equal(g.player.x,end.x);assert.equal(g.player.y,end.y);
});
test('局部绕行图能避开大湖，不遍历全地图数百个山湖节点',()=>{
 const lake=terrain.lakes.find(i=>i.regional&&i.rx>800),body={x:lake.x+lake.bounds.x-45,y:lake.y},target={x:lake.x+lake.bounds.x+lake.bounds.w+45,y:lake.y};
 assert.ok(!terrainBlocked(body.x,body.y));assert.ok(!terrainBlocked(target.x,target.y));
 assert.equal(terrainLineClear(body,target),false);const start=performance.now(),waypoint=naturalWaypoint(body,target);
 assert.ok(Math.hypot(waypoint.x-body.x,waypoint.y-body.y)>10);assert.ok(terrainLineClear(body,waypoint));assert.ok(performance.now()-start<1500);
});

test('正式读档迁移湖中的猫猫与旧停车落点，保留货物耐久且再次恢复不漂移',()=>{
 const lake=terrain.lakes.find(i=>i.regional&&i.ry>800),p=freshProgress();p.arrival=null;p.living.position={x:lake.x,y:lake.y};
 p.campParking.owned=[{hull:5,mapId:'forest',spot:null,x:lake.x,y:lake.y,hp:.45,ammo:0}];p.logistics.builds[5].wood=73;
 const g=new Game(p),record=g.progress.campParking.owned[0];
 assert.ok(!terrainBlocked(g.player.x,g.player.y));assert.ok(!terrainBlocked(record.x,record.y,30));assert.equal(record.hp,.45);assert.equal(g.progress.logistics.builds[5].wood,73);
 assert.ok(Math.hypot(g.player.x-lake.x,g.player.y-lake.y)<3600);const before=JSON.stringify([g.player.x,g.player.y,record]);restoreTownPosition(g);assert.equal(JSON.stringify([g.player.x,g.player.y,record]),before);
});
