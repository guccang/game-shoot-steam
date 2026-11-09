// 熟练度界面模型与正式获取、报价共用数据，防止展示解锁而实际仍被拦截。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress} from '../src/progression/progress.js';
import {awardAttackMastery} from '../src/progression/player/mastery.js';
import {MASTERY_THRESHOLDS,MASTERY_REWARDS} from '../src/config/weapon-mods.js';
import {workshopMastery} from '../src/ui/workshop/mastery.js';
import {quoteWorkshop,workshopDraft,previewWorkshop,workshopUpgrade} from '../src/progression/workshop/workshop.js';

test('显示真实累计经验、套件解锁缺口和下一级，满级不显示虚构门槛',()=>{
 const p=freshProgress(),selection={kind:'weapons',index:0};
 for(const xp of [0,16,39,40,119,120,280,550]){
  p.mastery[0]=xp;const m=workshopMastery(p,selection);
  assert.equal(m.xp,xp);assert.equal(m.missing,Math.max(0,40-xp));
  assert.equal(m.level,MASTERY_THRESHOLDS.filter(t=>t<=xp).length);
  if(xp<40)assert.ok(m.hint.includes(`还差 ${40-xp} 点`));else assert.ok(m.hint.includes('套件已解锁'));
  if(xp===550){assert.equal(m.next,null);assert.equal(m.count,'已满级');}
 }
});

test('同名手持枪与车载枪共享经验，选中另一炮塔立即读取另一型号',()=>{
 const p=freshProgress();p.vehicleWeapons[3]=1;p.mastery[0]=16;p.mastery[3]=120;
 awardAttackMastery(p,{weaponIndex:3},'enemy');
 const turret=workshopMastery(p,{kind:'vehicle',index:0,turret:3});
 assert.equal(turret.xp,124);assert.equal(turret.level,3);
 assert.equal(workshopMastery(p,{kind:'weapons',index:3}).xp,turret.xp);
 assert.equal(workshopMastery(p,{kind:'vehicle',index:0,turret:0}).xp,16);
 assert.ok(turret.help.some(line=>line.includes('共用熟练度')));
});

test('车体和专属主炮明确无熟练度门槛，不显示虚假的一级进度',()=>{
 const p=freshProgress();
 for(const [index,turret] of [[0,17],[1,18],[2,19],[3,20],[4,null],[5,null]]){
  const m=workshopMastery(p,{kind:'vehicle',index,turret});
  assert.equal(m.supported,false);assert.ok(m.title.includes('无熟练度门槛'));assert.equal(m.xp,undefined);
 }
});

test('获得说明中的数值与击杀奖励相同；熟练度不足只阻止套件，不阻止普通部件',()=>{
 const p=freshProgress();p.coins=p.wood=10000;
 for(const type of ['enemy','boss','tree']){
  const before=p.mastery[0];awardAttackMastery(p,{weaponIndex:0},type);assert.equal(p.mastery[0]-before,MASTERY_REWARDS[type]);
 }
 const m=workshopMastery(p,{kind:'weapons',index:0});assert.equal(m.xp,35);
 const plan=workshopDraft(p,'weapons',0,1),q=quoteWorkshop(p,plan);
 assert.equal(q.ok,false);assert.ok(q.reason.includes('还差 5 点'));assert.ok(q.reason.includes('击败怪物'));
 assert.equal(quoteWorkshop(p,workshopUpgrade(p,'weapons',0,'capacity')).ok,true);
 p.mastery[0]=40;assert.equal(quoteWorkshop(p,plan).ok,true);
});

test('免费试装的解锁副本不污染界面读取的永久熟练度',()=>{
 const p=freshProgress();p.mastery[0]=16;const before=JSON.stringify(p);
 previewWorkshop(p,'weapons',0,1);
 assert.equal(JSON.stringify(p),before);
 assert.equal(workshopMastery(p,{kind:'weapons',index:0}).missing,24);
});
