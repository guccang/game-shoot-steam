// 靠近登乘的目标、候停与回吸保护，复用真实地下碰撞和原子保存。
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';import {freshProgress} from '../src/progression/progress.js';import {openBasement} from '../src/progression/mining/mining.js';
import {MINING as M,minePoint,mineKey} from '../src/config/mining.js';
import {rideMineCart,updateMineCartBoarding,mineCartBoardingTarget,updateMining,selectMineTool} from '../src/core/mining/mining.js';
// 清空干扰，提供两格宽已开掘矿道和真实矿车，不使用玩家存档。
function scene(){const p=freshProgress();openBasement(p.mining);for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++){const k=mineKey({x,y});p.mining.dug[k]=true;p.mining.bridges[k]=true;p.mining.rails[k]=true;}p.mining.carts=[{id:1,...M.home,heading:1,wheel:0}];const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;g.cottage={kind:'mine',depth:1,direction:1,ride:null,scanWait:999,hurtWait:999};Object.assign(g.player,{x:M.home.x+25,y:M.home.y,vx:0,vy:0});return g;}
// 连续模拟一秒，首帧只建立候停，不累计靠近前的时间。
function tick(g,n=21){for(let i=0;i<n;i++)updateMineCartBoarding(g,.05);}
test('靠近满一秒正式上车，长帧不能跳过倒计时',()=>{const g=scene();updateMineCartBoarding(g,99);assert.equal(g.cottage.cartBoarding.elapsed,0);tick(g,19);assert.equal(g.cottage.ride,null);tick(g,1);assert.equal(g.cottage.ride,1);assert.equal(g.player.x,M.home.x);assert.equal(g.progress.production.rodeCart,true);assert.equal(g.cottage.cartBoarding,null);});
test('走开、换目标、删除车辆与跨层取消，暂停不累计',()=>{const g=scene();tick(g,8);const elapsed=g.cottage.cartBoarding.elapsed;g.state='paused';tick(g,40);assert.equal(g.cottage.cartBoarding.elapsed,elapsed);g.state='playing';g.player.x+=70;tick(g,1);assert.equal(g.cottage.cartBoarding,null);g.player.x-=70;tick(g,1);assert.equal(g.cottage.cartBoarding.elapsed,0);g.progress.mining.carts[0].id=2;tick(g,1);assert.equal(g.cottage.cartBoarding.elapsed,0);g.cottage.cartBoarding.depth=2;tick(g,1);assert.equal(g.cottage.cartBoarding.depth,1);assert.equal(g.cottage.cartBoarding.elapsed,0);g.progress.mining.carts=[];tick(g,1);assert.equal(g.cottage.cartBoarding,null);});
test('下车不会立即吸回，走开再靠近恢复候停；失败只保存一次',()=>{const g=scene();tick(g);assert.ok(rideMineCart(g));tick(g,50);assert.equal(g.cottage.ride,null);g.player.x+=70;tick(g,1);g.player.x-=45;let saves=0;g.livingPersist=()=>{saves++;return false;};tick(g,60);assert.equal(saves,1);assert.equal(g.cottage.ride,null);g.player.x+=70;tick(g,1);g.player.x-=70;g.livingPersist=()=>true;tick(g);assert.equal(g.cottage.ride,1);g.livingPersist=()=>false;assert.equal(rideMineCart(g),false);assert.equal(g.cottage.ride,1);});
test('只接近可达的任意车厢，施工、钓鱼、死亡和驾驶不抢操作',()=>{const g=scene();for(const [object,key,value]of [[g,'fishing',{}],[g,'mainlineSpeech',{}],[g.cottage,'tool','rail'],[g.cottage,'tool','shaft'],[g.cottage,'shaftWork',.1],[g.cottage,'combatWork',{}],[g.cottage,'weaponTarget','enemy'],[g.vehicle,'active',true],[g.player,'hp',0]]){const old=object[key];object[key]=value;assert.equal(mineCartBoardingTarget(g),null,key);object[key]=old;}g.player.x=M.home.x;const c=g.progress.mining.carts[0];g.progress.mining.carts.push({id:2,...minePoint({x:-1,y:0})},{id:3,...minePoint({x:1,y:0}),leader:1});c.leader=2;assert.equal(mineCartBoardingTarget(g).id,1);c.leader=2;g.progress.mining.carts=[c,{id:2,...minePoint({x:1,y:0})}];c.target='1,0';assert.equal(mineCartBoardingTarget(g).id,1);c.target=null;assert.equal(mineCartBoardingTarget(g).id,1);g.player.x=NaN;assert.equal(mineCartBoardingTarget(g),null);});
test('选矿镐或自动开采时也候停上车，上车后清理挖掘进度',()=>{
 for(const tool of ['pick',null]){const g=scene();Object.assign(g.cottage,{tool,autoDig:true,dig:{key:'1,0',elapsed:.4},rockWork:{key:'1,0',elapsed:.4}});
  assert.equal(mineCartBoardingTarget(g).id,1);tick(g,20);assert.equal(g.cottage.ride,null);assert.equal(g.cottage.tool,tool);tick(g,1);
  assert.equal(g.cottage.ride,1);assert.equal(g.cottage.tool,null);assert.equal(g.cottage.autoDig,false);assert.equal(g.cottage.dig,null);assert.equal(g.cottage.rockWork,null);
 }
});
test('挖矿自动登车保存失败保留作业，走开重试后正式帧循环登车',()=>{
 const g=scene();selectMineTool(g,'pick');const before=structuredClone(g.progress);let saves=0;g.livingPersist=()=>{saves++;return false;};tick(g,40);
 assert.equal(saves,1);assert.equal(g.cottage.ride,null);assert.equal(g.cottage.tool,'pick');assert.equal(g.cottage.autoDig,true);assert.deepEqual(g.progress,before);
 g.player.x+=70;tick(g,1);g.player.x-=70;g.livingPersist=()=>true;for(let i=0;i<24;i++)updateMining(g,.05,{x:0,y:0});
 assert.equal(g.cottage.ride,1);assert.equal(g.cottage.autoDig,false);assert.equal(g.cottage.tool,null);
});
test('正式地下帧循环触发登乘，下车后仍按正常步行动画与碰撞移动',()=>{const g=scene();for(let i=0;i<24;i++)updateMining(g,.05,{x:0,y:0});assert.equal(g.cottage.ride,1);rideMineCart(g);for(let i=0;i<15;i++)updateMining(g,.05,{x:1,y:0});assert.equal(g.cottage.ride,null);assert.ok(g.player.x>M.home.x+40);});
