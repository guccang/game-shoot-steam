// 家具小铺复用正式房屋、商店和存档；验证迁店后购买与家中摆放各自权限。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {FURNITURE_SHOP,FURNITURE_SHOP_DISPLAYS} from '../src/config/furniture-shop.js';
import {PARKING_SPOTS} from '../src/config/parking.js';
import {WORKSHOP_INTERIORS,interiorShopkeeper,interiorFurniture} from '../src/config/workshop-interiors.js';
import {COTTAGE} from '../src/config/cottage.js';
import {HOME_CATALOG} from '../src/config/home-decor.js';
import {updateCottage,leaveCottage,enterCottage,cottageBlocked} from '../src/core/home/cottage.js';
import {buyDecor,moveDecor} from '../src/core/home/home-decor.js';
import {blocked} from '../src/physics/motion.js';
import {planQuestRoute} from '../src/physics/quest-route.js';
import {farmLandReason} from '../src/world/farm-land.js';
import {WORLD} from '../src/world/coordinates.js';
// 使用完整森林和正式旧档格式，排除入职和战斗演出。
function setup(){const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.coins=10000;p.restoration.repaired=TOWN_RESTORATIONS.map(r=>r.id);const g=new Game(p);g.state='playing';g.livingPersist=()=>true;g.mainlineSpeech=null;g.vehicle.active=false;return g;}
// 门口等待通过正式倒计时逐帧推进，不调用跳过计时的入口。
function enterShop(g){Object.assign(g.player,WORKSHOP_INTERIORS.furniture.door,{vx:0,vy:0});for(let i=0;i<20;i++)updateCottage(g,.05,{x:0,y:0});assert.equal(g.cottage?.kind,'furniture');}

test('新店实体与入口同步，不占北场泊位或主路，循环镜像也不能种田穿墙',()=>{
 const g=setup(),body={mapId:'forest',livingCollision:true},room=WORKSHOP_INTERIORS.furniture;
 assert.ok(planQuestRoute({...body,x:350,y:220},room.door,g.trees,24000).reachable);
 for(const s of PARKING_SPOTS.filter(s=>s.building==='north'))assert.equal(blocked(s.x,s.approachY,32,g.trees,body),false,s.id);
 for(const shift of [0,WORLD.width]){assert.ok(blocked(FURNITURE_SHOP.x+shift,FURNITURE_SHOP.y-40,12,g.trees,body));assert.equal(blocked(room.door.x+shift,room.door.y,12,g.trees,body),false);assert.equal(blocked(room.outside.x+shift,room.outside.y,12,g.trees,body),false);}
 assert.match(farmLandReason(g,{...FURNITURE_SHOP,y:FURNITURE_SHOP.y-40}),/建筑|路面/);
});

test('售货员只在新店，样品有碰撞，入口与柜台前保留行走空间',()=>{
 const g=setup();enterShop(g);assert.equal(interiorShopkeeper({kind:'cottage'}),null);assert.equal(interiorShopkeeper(g.cottage).label,'家具售货员');
 assert.equal(interiorFurniture(g).length,FURNITURE_SHOP_DISPLAYS.length+1);
 for(const p of FURNITURE_SHOP_DISPLAYS)assert.ok(cottageBlocked(p.x,p.y,g));
 for(let y=250;y<=326;y+=8)assert.equal(cottageBlocked(180,y,g),false);
 Object.assign(g.player,WORKSHOP_INTERIORS.furniture.exit);for(let i=0;i<20;i++)updateCottage(g,.05,{x:0,y:0});assert.equal(g.cottage,null);assert.equal(g.cottageDoorLatch,'furniture');
});

test('店内购买保存入收纳，失败不扣费，回家可摆放且不能继续远程购买',()=>{
 const g=setup();assert.equal(buyDecor(g,'sofa').ok,false);enterShop(g);const price=HOME_CATALOG.find(p=>p.id==='sofa').price,before=g.progress.coins;
 g.state='paused';const bought=buyDecor(g,'sofa');assert.ok(bought.ok);assert.equal(g.progress.coins,before-price);assert.equal(g.progress.homeDecor.items.find(i=>i.uid===bought.uid).x,null);assert.equal(moveDecor(g,bought.uid,180,240).ok,false);
 const snapshot=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(buyDecor(g,'pot').ok,false);assert.deepEqual(g.progress,snapshot);g.livingPersist=()=>true;g.state='playing';assert.ok(leaveCottage(g));
 Object.assign(g.player,COTTAGE.door);assert.ok(enterCottage(g));assert.equal(buyDecor(g,'pot').ok,false);assert.ok(moveDecor(g,bought.uid,180,228).ok);assert.equal(validateProgress(g.progress).homeDecor.items.find(i=>i.uid===bought.uid).x,180);
});
