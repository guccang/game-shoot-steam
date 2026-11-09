// 购买合同白名单与正式交易联合验证，清理通知不影响包裹与业务奖励。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {sendMail,unreadMailCount,normalizeMailbox} from '../src/progression/camp/mailbox.js';
import {readMail} from '../src/core/camp/mailbox.js';
import {updateFarmDelivery,claimFarmParcel} from '../src/core/farming/farm-delivery.js';
import {FARM_DELIVERY,FARM_STOCK_CAP} from '../src/config/farm.js';
import {Game} from '../src/core/game.js';
import {quoteWorkshop} from '../src/progression/workshop/workshop.js';
import {commitWorkshop} from '../src/core/workshop/workshop.js';
import {MAINLINE_IDS,MAINLINE_TASKS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {grantMainlineSeeds} from '../src/progression/story/mainline-seeds.js';
import {awardMainline} from '../src/progression/story/mainline-reward.js';
import {collectRepairedVehicle} from '../src/core/vehicles/vehicle-repair.js';
// 使用正式游戏对象与可购买进度，避开入职演出和剧情资格。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.coins=p.wood=100000;p.materials={parts:10000,crystal:10000,core:10000};p.bosses=50;const g=new Game(p);g.state='playing';g.enemies=[];g.boss=null;g.mainlineSpeech=null;g.vehicle.active=false;g.livingPersist=()=>true;g.random=()=>0;return g;}
// 用正式寄送入口生成包裹，快递站保留唯一领取入口。
function parcel(g){g.progress.farm.unlocked[0]=true;g.progress.farm.delivery.nextAt=1;updateFarmDelivery(g,1000);return g.progress.farm.delivery.parcels[0];}

test('武器与载具购买合同随交易保存，报价、失败和重复购买不寄信',()=>{
 for(const [kind,index] of [['weapons',1],['vehicle',0]]){
  const g=scene(),plan={kind,index,action:'buy'},before=structuredClone(g.progress),quote=quoteWorkshop(g.progress,plan);assert.ok(quote.ok,quote.reason);assert.deepEqual(g.progress,before);assert.equal(commitWorkshop(g,plan,()=>false).ok,false);assert.deepEqual(g.progress,before);
  let saved;const result=commitWorkshop(g,plan,p=>{saved=structuredClone(p);return true;});assert.ok(result.ok,result.reason);assert.equal(saved.mailbox.items.length,1);assert.match(saved.mailbox.items[0].title,/购买合同/);assert.match(saved.mailbox.items[0].body,/实际支付/);assert.equal(validateProgress(saved).mailbox.items.length,1);assert.equal(commitWorkshop(g,plan,()=>true).ok,false);assert.equal(g.progress.mailbox.items.length,1);
 }
});

test('只接收稳定交易键的购买合同，标题伪装与其他通知不增加序号和未读',()=>{
 const p=freshProgress();for(const key of ['', 'parcel:1','seed-reward:task','repair:0','purchase:ammo:1','purchase:weapons:bad'])assert.equal(sendMail(p,{key,title:'武器购买合同',body:'通知'}),false);
 assert.deepEqual(p.mailbox,{serial:0,items:[]});
 for(const kind of ['vehicle','weapons','turret'])assert.ok(sendMail(p,{key:'purchase:'+kind+':1',title:'合同',body:'实际支付'}));
 assert.equal(unreadMailCount(p),3);assert.equal(sendMail(p,{key:'purchase:vehicle:1',title:'重复合同'}),false);assert.equal(p.mailbox.serial,3);
});

test('清理历史通知仍保留合同的正文、已读与种子包裹，不自动发奖或重寄',()=>{
 const g=scene(),gift=parcel(g);sendMail(g.progress,{key:'purchase:vehicle:0',title:'载具购买手续',body:'历史实际支付',at:123});g.progress.mailbox.items[0].read=true;
 g.progress.mailbox.items.push({id:2,key:'parcel:'+gift.id,title:'种子邮件',parcel:gift.id,read:false},{id:3,key:'repair:0',title:'维修通知',read:false});g.progress.mailbox.serial=3;
 const seeds=[...g.progress.farm.seeds],delivery=structuredClone(g.progress.farm.delivery);g.progress=validateProgress(g.progress);assert.equal(g.progress.mailbox.items.length,1);assert.equal(g.progress.mailbox.items[0].body,'历史实际支付');assert.equal(g.progress.mailbox.items[0].at,123);assert.equal(unreadMailCount(g.progress),0);assert.deepEqual(g.progress.farm.delivery,delivery);assert.deepEqual(g.progress.farm.seeds,seeds);assert.equal(validateProgress(g.progress).mailbox.items.length,1);
 Object.assign(g.player,FARM_DELIVERY);assert.ok(claimFarmParcel(g,gift.id).ok);assert.equal(g.progress.farm.seeds[0],3);assert.equal(claimFarmParcel(g,gift.id).ok,false);assert.equal(g.progress.mailbox.items.length,1);
});

test('快递到达不寄邮件，领取保存失败和满仓仍保留种子',()=>{
 const g=scene(),gift=parcel(g);assert.ok(gift);assert.equal(g.progress.mailbox.items.length,0);Object.assign(g.player,FARM_DELIVERY);const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(claimFarmParcel(g,gift.id).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;g.progress.farm.seeds[0]=FARM_STOCK_CAP;assert.equal(claimFarmParcel(g,gift.id).ok,false);assert.equal(g.progress.farm.delivery.parcels.length,1);g.progress.farm.seeds[0]=0;assert.ok(claimFarmParcel(g,gift.id).ok);assert.equal(g.progress.mailbox.items.length,0);
});

test('合同已读保存失败不丢未读，读取及全部已读不发放物品',()=>{
 const g=scene();for(const kind of ['vehicle','weapons'])sendMail(g.progress,{key:'purchase:'+kind+':0',title:'合同',body:'实际支付'});parcel(g);const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(readMail(g,1).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;assert.ok(readMail(g,1).ok);assert.equal(unreadMailCount(g.progress),1);assert.ok(readMail(g).ok);assert.equal(unreadMailCount(validateProgress(g.progress)),0);assert.equal(g.progress.farm.seeds[0],0);assert.equal(g.progress.farm.delivery.parcels.length,1);
});

test('种子谢礼与任务正常结算和防重，不产生通知邮件',()=>{
 const p=freshProgress(),task=MAINLINE_TASKS.find(t=>t.seedReward);const n=grantMainlineSeeds(p,task);assert.ok(n>0);assert.equal(grantMainlineSeeds(p,task),0);const first=MAINLINE_TASKS[0];p.mainline.currentId=first.id;assert.ok(awardMainline(p,first.id));assert.equal(awardMainline(p,first.id),null);assert.equal(p.mailbox.items.length,0);
});

test('维修交车正常入库，不寄送完成邮件',()=>{
 const g=scene();g.progress.vehicleHulls[0]=1;g.progress.vehicleService[0]={phase:'ready',hp:1};assert.ok(collectRepairedVehicle(g,0).ok);assert.ok(g.progress.campParking.owned.some(r=>r.hull===0));assert.equal(collectRepairedVehicle(g,0).ok,false);assert.equal(g.progress.mailbox.items.length,0);
});

test('历史合同先过滤通知再限制数量，非法身份去重且序号不复用',()=>{
 const box=normalizeMailbox({items:[null,{id:-1,key:'purchase:vehicle:0',title:'坏档'},{id:1,key:'purchase:vehicle:0',title:'正常',read:true},{id:1,key:'purchase:vehicle:1',title:'重复'},...Array.from({length:650},(_,i)=>({id:i+2,title:'通知'}))]});assert.equal(box.items.length,1);assert.equal(box.items[0].read,true);
 const p=freshProgress();for(let i=0;i<650;i++)sendMail(p,{key:'purchase:weapons:'+i,title:'合同',body:String(i)});assert.equal(p.mailbox.items.length,600);assert.equal(p.mailbox.items[0].id,51);assert.equal(p.mailbox.serial,650);
});
