// 球场搬迁覆盖正式保存、入口与任务锚点、道路和读档回滚。
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {CAMP_PLOTS} from '../src/config/camp-land.js';import {CAMP_BUILDINGS} from '../src/config/camp-layout.js';import {TOWN_LAYOUT} from '../src/config/town-layout.js';import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';import {MAINLINE_SITES} from '../src/config/mainline.js';
import {saveCampLayout} from '../src/core/camp/camp-layout.js';import {activateCampLayout} from '../src/world/camp-layout-bindings.js';import {campLayoutRoads} from '../src/world/camp-layout-roads.js';
test('球场保存迁移记分牌、候停点与导航，读档不漂移且恢复默认位置',()=>{
 activateCampLayout(freshProgress());const b=CAMP_BUILDINGS.find(b=>b.id==='football'),f=TOWN_RESTORATIONS.find(f=>f.id==='football');assert.ok(b);
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.phase='complete';p.mainline.trackingPaused=true;p.campLand.owned=CAMP_PLOTS.map(p=>p.id);const g=new Game(p);g.state='playing';g.vehicle.active=false;g.parking=null;g.trees=[];Object.assign(g.player,{x:10000,y:10000});
 const draft={positions:{football:{x:-500,y:-700}}};assert.equal(saveCampLayout(g,draft,()=>false).ok,false);assert.equal(f.x,b.x);
 const r=saveCampLayout(g,draft,()=>true);assert.ok(r.ok,r.message);assert.equal(TOWN_LAYOUT.football.x,-500);assert.equal(f.x,-500);assert.equal(f.y,-700);assert.equal(f.site.x,-500);assert.equal(f.site.y,-670);assert.equal(MAINLINE_SITES.footballEntry.y,-670);
 const road=campLayoutRoads(g.progress).paths.find(p=>p.targetId==='football');assert.ok(road);assert.equal(road.width,24);
 const loaded=validateProgress(g.progress);activateCampLayout(loaded);activateCampLayout(loaded);assert.equal(f.x,-500);activateCampLayout(freshProgress());assert.equal(f.x,b.x);assert.equal(f.site.y,b.y+30);
});
