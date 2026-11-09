// 西迁专项：真实入口、安全区、循环边界和旧档幂等迁移，保持资产与施工进度。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {TOWN_LAYOUT as T,TOWN_LAYOUT_VERSION} from '../src/config/town-layout.js';
import {SETTLEMENTS} from '../src/config/settlements.js';
import {settlementBlocked,settlementAt,SETTLEMENT_FENCES} from '../src/world/settlements.js';
import {FARM_SEED_SHOP,FARM_SEED_DOOR,FARM_DELIVERY} from '../src/config/farm.js';
import {LIVING_PLACES} from '../src/config/living-world.js';
import {PARKING_SPOTS} from '../src/config/parking.js';
import {WORLD,canonical} from '../src/world/coordinates.js';
import {riverXAt,riverHalfWidth} from '../src/world/river-geometry.js';
import {planQuestRoute} from '../src/physics/quest-route.js';
import {Game} from '../src/game.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {VEHICLE_COOLDOWN} from '../src/config/vehicles.js';
import {updateVehicle} from '../src/combat/vehicle.js';
import {validateFireProgress} from '../src/progression/activities/fire-progress.js';

test('原建筑保留西迁坐标，营地扩建外栏且河岸留出通道',()=>{
 assert.deepEqual(T.spawn,{x:600,y:700});assert.equal(T.weapons.x,50);assert.equal(T.cottage.x,550);
 assert.equal(FARM_SEED_SHOP.x,700);assert.equal(FARM_SEED_DOOR.x,700);assert.equal(FARM_DELIVERY.x,700);
 assert.equal(LIVING_PLACES.kitchen.x,230);assert.equal(LIVING_PLACES.relay.x,490);
 assert.equal(STORY_POSTS.find(p=>p.id==='monster-neighbors').x,350);
 assert.deepEqual(SETTLEMENTS.map(s=>[s.left,s.right]),[[-780,790],[-180,790]]);
 assert.ok(!SETTLEMENT_FENCES.some(f=>f.horizontal&&f.y===1400&&f.x>-180));
 for(const y of [1300,1500])for(const x of [y<1400?-780:-180,790]){
  assert.ok(settlementBlocked(x,y));assert.ok(settlementBlocked(x+WORLD.width,y));
  assert.ok(settlementAt({x:x+(x<0?20:-20),y}));
 }
 for(let y=110;y<=2040;y+=20)assert.ok(riverXAt(y)-riverHalfWidth(y,-1)-790>200,'外栏与河岸间距');
});

test('旧档位置与院内农田只迁移一次，野外田、其他地图和资源不变',()=>{
 const raw=JSON.parse(JSON.stringify(freshProgress()));delete raw.townLayoutVersion;
 raw.living.position={x:200,y:300};raw.living.residents.cook={x:530,y:1810};raw.coins=7654;
 raw.farm.plots=[{id:1,x:865,y:672,mapId:'forest',crop:3,plantedAt:100,readyAt:300,watered:true},{id:2,x:2800,y:2500,mapId:'forest',crop:null},{id:3,x:865,y:672,mapId:'jiuzhaigou',crop:null}];
 raw.farm.nextId=4;raw.restoration.build={id:'cottage',x:850,y:300,elapsed:1};
 const before=JSON.stringify(raw),next=validateProgress(raw);
 assert.equal(JSON.stringify(raw),before);assert.equal(next.townLayoutVersion,TOWN_LAYOUT_VERSION);
 assert.deepEqual(next.living.position,canonical({x:-100,y:300}));assert.deepEqual(next.living.residents.cook,{x:230,y:1810});
 assert.deepEqual(next.farm.plots.map(p=>p.x),[565,2800,865]);assert.equal(next.farm.plots[0].readyAt,300);
 assert.equal(next.restoration.build.x,550);assert.equal(next.restoration.build.elapsed,1);assert.equal(next.coins,7654);
 assert.deepEqual(validateProgress(next),next);
});

test('西侧负坐标车位、邻里与种子店入口使用正式寻路可达',()=>{
 const g=new Game();g.start();const start={...g.player,x:350,y:220};
 for(const target of [...PARKING_SPOTS.map(s=>({x:s.x,y:s.approachY,id:s.id})),FARM_SEED_DOOR,{x:350,y:1840}]){
  assert.ok(planQuestRoute(start,target,g.trees).reachable,target.id||JSON.stringify(target));
 }
});

test('九种车体统一60秒修复，暂停冻结、完成后手动上车，消防存档保留长冷却',()=>{
 assert.equal(VEHICLE_COOLDOWN,60);
 for(let hull=0;hull<9;hull++){
  const p=freshProgress();p.vehicleHulls.fill(0);p.vehicleHulls[hull]=1;p.vehicleIndex=hull;
  const g=new Game(p);g.start();Object.assign(g.player,{x:2800,y:2500});g.trees=[];
  assert.ok(g.summonVehicle());g.hurt(1e9);assert.equal(g.vehicle.cooldown,60);assert.equal(g.vehicle.active,false);
  g.pause();updateVehicle(g,20);assert.equal(g.vehicle.cooldown,60);g.start();updateVehicle(g,59);
  assert.equal(g.vehicle.cooldown,1);assert.equal(g.summonVehicle(),false);updateVehicle(g,1);
  assert.equal(g.vehicle.active,false);assert.ok(g.summonVehicle());assert.equal(g.vehicle.hp,g.vehicle.maxHp);
 }
 const fires=Array.from({length:6},(_,i)=>({x:2000+i*20,y:2200,stop:{x:2000+i*20,y:2240},hp:66}));
 assert.equal(validateFireProgress({run:{phase:'active',fires,truckCooldown:53}}).run.truckCooldown,53);
});
