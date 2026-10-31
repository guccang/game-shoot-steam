// 营地成长与首次购买专项，独立验证共享数值和正式事务。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress,upgradeCost} from '../src/progression/progress.js';
import {CAMP_LEVELS,CAMP_ACTIVITY_XP} from '../src/config/camp-level.js';
import {campProgress,campPurchasePrice,awardCampXp,countCampActivity} from '../src/progression/camp-level.js';
import {equipmentRecipe,equipmentRequirements,canPurchaseEquipment} from '../src/progression/equipment-goals.js';
import {transactProgress} from '../src/progression/transactions.js';
import {transactVehicle} from '../src/progression/vehicles.js';
import {quoteWorkshop} from '../src/progression/workshop.js';
import {HEROES} from '../src/config/heroes.js';
import {awardMainline} from '../src/progression/mainline-reward.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {Game} from '../src/core/game.js';
import {updateRealm,syncRealm} from '../src/core/realm-manager.js';
import {finishFootball} from '../src/core/slime-football.js';
import {rewardReceipt} from '../src/progression/reward-receipt.js';
import {RECOMMENDED_ECONOMY,validateEconomy} from '../src/config/economy.js';
// 富裕玩家不具备任何旧挑战或主线资格。
function funded(){const p=freshProgress();p.coins=p.wood=99990000;p.materials={parts:99999,crystal:99999,core:99999};return p;}
// 固定随机数稳定测试中的世界生成。
function game(){const g=new Game(freshProgress(),()=>.42);g.start();return g;}
test('六档累计门槛、折扣与向上取整，零价和材料不变',()=>{
 const p=freshProgress();for(const [i,row] of CAMP_LEVELS.entries()){
  p.campLevel.xp=row.xp;assert.equal(campProgress(p).tier,i+1);assert.equal(campProgress(p).percent,row.percent);
  if(row.xp){p.campLevel.xp--;assert.equal(campProgress(p).tier,i);p.campLevel.xp++;}
  assert.deepEqual(campPurchasePrice(p,{coins:101,wood:0,parts:17}),{coins:Math.ceil(101*row.percent/100),wood:0,parts:17});
 }
 assert.equal(campProgress(p).nextXp,null);
});
test('伐木与野怪余数跨存档累计，资源满额仍给经验，满级封顶',()=>{
 let p=funded();countCampActivity(p,'trees',29);countCampActivity(p,'enemies',29);assert.equal(p.campLevel.xp,0);
 p=validateProgress(JSON.parse(JSON.stringify(p)));countCampActivity(p,'trees');countCampActivity(p,'enemies');assert.deepEqual(p.campLevel,{xp:100,trees:0,enemies:0});
 countCampActivity(p,'trees',95);assert.equal(p.campLevel.xp,130);assert.equal(p.campLevel.trees,5);
 p.campLevel.xp=10799;awardCampXp(p,'clearing');assert.equal(p.campLevel.xp,10800);assert.equal(awardCampXp(p,'horde'),0);assert.equal(p.coins,99990000);
});
test('旧档无经验补偿，损坏值归零，战绩不会抬高营地等级',()=>{
 const p=funded();delete p.campLevel;p.bosses=999;p.realms.records.tower.best=99;
 assert.deepEqual(validateProgress(p).campLevel,{xp:0,trees:0,enemies:0});p.campLevel={xp:Infinity,trees:-3,enemies:NaN};assert.equal(validateProgress(p).campLevel.xp,0);
 assert.equal(campProgress(p).tier,1);
});
test('所有正式购入类别使用折后价格，无等级和主线门槛，失败不扣费',()=>{
 for(const [kind,index] of [['weapons',16],['turret',9],['vehicle',1],['vehicle',2],['vehicle',4],['vehicle',5]]){
  const p=funded();if(kind==='vehicle')p.vehicleHulls[index]=0;const cost=equipmentRecipe(kind,index,p);assert.ok(cost);
  assert.ok(canPurchaseEquipment(p,kind,index));assert.ok(equipmentRequirements(p,kind,index).every(r=>r.key!=='bosses'));
  p.wood=cost.wood-1;const before=JSON.stringify(p);assert.equal(quoteWorkshop(p,{kind,index,action:'buy'}).ok,false);assert.equal(JSON.stringify(p),before);
  p.wood=cost.wood;p.coins=cost.coins;const q=quoteWorkshop(p,{kind,index,action:'buy'});assert.ok(q.ok);assert.equal(q.next.coins,0);assert.equal(q.next.wood,0);
  assert.equal(q.next.materials.parts,p.materials.parts-cost.parts);assert.equal(q.next.campLevel.xp,0);assert.equal(q.next.bosses,0);
  if(index===4&&kind==='vehicle'){assert.equal(q.next.vehicleLoadouts[4],0);assert.equal(q.next.vehicleWeapons[0],1);}
  if(index===5&&kind==='vehicle')assert.equal(q.next.vehicleLoadouts[5],null);
 }
});
test('英雄购买享折扣，升级不享营地折扣，不重复购入',()=>{
 const p=funded(),cost=campPurchasePrice(p,HEROES[1]),before=p.coins;assert.ok(transactProgress(p,'heroes',1,'buy'));assert.equal(before-p.coins,cost.coins);
 const saved=JSON.stringify(p);assert.equal(transactProgress(p,'heroes',1,'buy'),false);assert.equal(JSON.stringify(p),saved);
 const upgrade=upgradeCost(1,p,'heroes',1);p.campLevel.xp=10800;assert.deepEqual(upgradeCost(1,p,'heroes',1),upgrade);
});
test('主线经验和收据只在首次交付发放，完整旧候选补齐新增车型',()=>{
 const p=funded(),before=structuredClone(p);assert.ok(awardMainline(p,MAINLINE_IDS[0]));assert.equal(p.campLevel.xp,30);assert.equal(awardMainline(p,MAINLINE_IDS[0]),null);assert.equal(p.campLevel.xp,30);
 assert.equal(rewardReceipt(before,p,'任务').challenge.gained,30);
 const config=structuredClone(RECOMMENDED_ECONOMY);config.vehicles.length=4;assert.equal(validateEconomy(config).vehicles.length,6);
});
test('采集与真实野外击杀不因重复致命命中多计，清缴怪不计野怪经验',()=>{
 const g=game();g.progress.campLevel.trees=29;const tree={type:'tree',x:g.player.x+120,y:g.player.y+120,hp:1,maxHp:1,radius:15};g.hit(tree,99);g.hit(tree,99);assert.equal(g.progress.campLevel.xp,10);
 g.progress.campLevel.enemies=29;const enemy=g.spawnEnemy(0,0,{x:1800,y:1200},{ambient:true});g.hit(enemy,1e9);g.hit(enemy,1e9);assert.equal(g.progress.campLevel.xp,100);
 g.progress.living.patrolActive=true;const taskEnemy=g.spawnEnemy(0,0,{x:1800,y:1200});taskEnemy.wave=g.wave;g.hit(taskEnemy,1e9);assert.equal(g.progress.campLevel.enemies,0);
});
test('足球提前退出与零球不给经验，完整且进球只结算30一次',()=>{
 for(const [time,score,xp] of [[30,3,0],[0,0,0],[0,2,30]]){const g=game();g.enterRealm('football');g.startFootball();g.realm.remaining=time;g.realm.score=score;finishFootball(g);assert.equal(g.progress.campLevel.xp,xp);finishFootball(g);assert.equal(g.progress.campLevel.xp,xp);}
});
test('秘境普通层与领主层同为30，重复更新与恢复不重复结算',()=>{
 const g=game();g.enterRealm('tower');g.continueRealm();
 for(let i=1;i<=5;i++){const r=g.realm;r.kills=r.spec.total;g.enemies=[];g.boss=null;updateRealm(g,0);assert.equal(g.progress.campLevel.xp,i*30);updateRealm(g,0);assert.equal(g.progress.campLevel.xp,i*30);if(i<5)g.continueRealm();}
 syncRealm(g);const restored=new Game(validateProgress(JSON.parse(JSON.stringify(g.progress))),()=>.42);assert.equal(restored.progress.campLevel.xp,150);
});
test('玩法统一配置使用最新确认的奖励数量',()=>{assert.deepEqual(CAMP_ACTIVITY_XP,{clearing:180,horde:210,realm:30,fire:50,football:30,living:60,mainline:30});});
