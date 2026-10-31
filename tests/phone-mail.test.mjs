// 邮件与正式交易、旧档和种子领取联合验证，页面不能成为重复发奖入口。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {sendMail,syncParcelMail,unreadMailCount,normalizeMailbox} from '../src/progression/mailbox.js';
import {readMail,claimMailGift} from '../src/core/mailbox.js';
import {updateFarmDelivery,claimFarmParcel} from '../src/core/farm-delivery.js';
import {FARM_DELIVERY,FARM_STOCK_CAP} from '../src/config/farm.js';
import {Game} from '../src/core/game.js';
import {quoteWorkshop} from '../src/progression/workshop.js';
import {commitWorkshop} from '../src/core/workshop.js';
import {MAINLINE_IDS,MAINLINE_TASKS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {grantMainlineSeeds} from '../src/progression/mainline-seeds.js';
import {awardMainline} from '../src/progression/mainline-reward.js';
import {collectRepairedVehicle} from '../src/core/vehicle-repair.js';
// 使用正式游戏对象与可购买进度，避开入职演出和剧情资格。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.coins=p.wood=100000;p.materials={parts:10000,crystal:10000,core:10000};p.bosses=50;const g=new Game(p);g.state='playing';g.enemies=[];g.boss=null;g.mainlineSpeech=null;g.vehicle.active=false;g.livingPersist=()=>true;g.random=()=>0;return g;}
// 用正式寄送入口生成礼物，暂停手机之前完成寄送。
function parcel(g){g.progress.farm.unlocked[0]=true;g.progress.farm.delivery.nextAt=1;updateFarmDelivery(g,1000);return g.progress.mailbox.items.find(m=>m.parcel);}
test('武器与战车购买手续随交易保存，报价和失败不发邮件，重复购买无新邮件',()=>{
 for(const [kind,index] of [['weapons',1],['vehicle',0]]){
  const g=scene(),plan={kind,index,action:'buy'},before=structuredClone(g.progress),quote=quoteWorkshop(g.progress,plan);assert.ok(quote.ok,quote.reason);assert.deepEqual(g.progress,before);assert.equal(commitWorkshop(g,plan,()=>false).ok,false);assert.deepEqual(g.progress,before);
  let saved;const result=commitWorkshop(g,plan,p=>{saved=structuredClone(p);return true;});assert.ok(result.ok,result.reason);assert.equal(saved.mailbox.items.length,1);assert.match(saved.mailbox.items[0].title,/购买手续/);assert.match(saved.mailbox.items[0].body,/实际支付/);assert.equal(validateProgress(saved).mailbox.items.length,1);assert.equal(commitWorkshop(g,plan,()=>true).ok,false);assert.equal(g.progress.mailbox.items.length,1);
 }
});
test('远程领取先保存；失败、重复点击和柜台再次领取不会多发种子',()=>{
 const g=scene(),mail=parcel(g);assert.ok(mail);g.state='paused';g.player.x=2000;g.player.y=1800;const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(claimMailGift(g,mail.id).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;assert.ok(claimMailGift(g,mail.id).ok);assert.equal(g.progress.farm.seeds[0],3);assert.ok(g.progress.mailbox.items[0].claimed);assert.equal(claimMailGift(g,mail.id).ok,false);g.state='playing';Object.assign(g.player,FARM_DELIVERY);assert.equal(claimFarmParcel(g,mail.parcel).ok,false);assert.equal(g.progress.farm.seeds[0],3);
});
test('柜台先领取会同步手机状态；旧包裹迁移不发奖且刷新不重寄',()=>{
 const g=scene(),mail=parcel(g);delete g.progress.mailbox;const seeds=[...g.progress.farm.seeds];g.progress=validateProgress(g.progress);assert.deepEqual(g.progress.farm.seeds,seeds);assert.equal(g.progress.mailbox.items.length,1);g.progress=validateProgress(g.progress);assert.equal(g.progress.mailbox.items.length,1);Object.assign(g.player,FARM_DELIVERY);assert.ok(claimFarmParcel(g,mail.parcel).ok);assert.equal(g.progress.mailbox.items[0].claimed,true);assert.equal(claimMailGift(g,g.progress.mailbox.items[0].id).ok,false);
});
test('满仓、未解锁、战斗和没有手机时保留附件',()=>{
 for(const change of [g=>g.progress.farm.seeds[0]=FARM_STOCK_CAP,g=>g.progress.farm.unlocked[0]=false,g=>g.livingBattle={},g=>g.progress.arrival={version:3,phase:'bus',keys:false}]){const g=scene(),m=parcel(g);change(g);const before=structuredClone(g.progress);assert.equal(claimMailGift(g,m.id).ok,false);assert.deepEqual(g.progress,before);}
});
test('已读状态保存失败不丢未读，读取与全部已读从不发放物品',()=>{
 const g=scene();sendMail(g.progress,{title:'手续',body:'已到账'});parcel(g);const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(readMail(g,1).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;assert.ok(readMail(g,1).ok);assert.equal(unreadMailCount(g.progress),1);assert.ok(readMail(g).ok);assert.equal(unreadMailCount(validateProgress(g.progress)),0);assert.equal(g.progress.farm.seeds[0],0);assert.equal(g.progress.farm.delivery.parcels.length,1);
});
test('种子谢礼邮件只记实际到账，任务完成与邮件同一次防重',()=>{
 const p=freshProgress(),task=MAINLINE_TASKS.find(t=>t.seedReward);const n=grantMainlineSeeds(p,task);assert.ok(n>0);assert.equal(p.mailbox.items.length,1);assert.equal(grantMainlineSeeds(p,task),0);assert.equal(p.mailbox.items.length,1);assert.match(p.mailbox.items[0].body,/无需再次领取/);const first=MAINLINE_TASKS[0];p.mainline.currentId=first.id;assert.ok(awardMainline(p,first.id));const length=p.mailbox.items.length;assert.match(p.mailbox.items.at(-1).title,/完成通知/);assert.equal(awardMainline(p,first.id),null);assert.equal(p.mailbox.items.length,length);
});
test('维修交车成功才寄完成邮件，多帧调用不会重寄',()=>{
 const g=scene();g.progress.vehicleHulls[0]=1;g.progress.vehicleService[0]={phase:'ready',hp:1};assert.ok(collectRepairedVehicle(g,0).ok);assert.match(g.progress.mailbox.items.at(-1).title,/维修完成/);const count=g.progress.mailbox.items.length;assert.equal(collectRepairedVehicle(g,0).ok,false);assert.equal(g.progress.mailbox.items.length,count);
});
test('损坏存档过滤重复身份和非法附件，保留待领取信件的有界历史',()=>{
 const box=normalizeMailbox({items:[null,{id:-1,title:'坏档'},{id:1,title:'正常',parcel:'1',read:true},{id:1,title:'重复'}]});assert.equal(box.items.length,1);assert.equal(box.items[0].parcel,null);const p=freshProgress();p.farm.delivery.parcels=[{id:1,crop:0,count:3,sender:0,arrivedAt:1}];syncParcelMail(p);for(let i=0;i<650;i++)sendMail(p,{title:'通知',body:String(i)});assert.equal(p.mailbox.items.length,600);assert.equal(p.mailbox.items[0].parcel,1);assert.equal(p.mailbox.serial,651);
});
