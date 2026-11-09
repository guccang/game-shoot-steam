// 售货员候停替代废弃展品点击测试，全部营业房共享一秒距离与暂停规则。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {WORKSHOP_INTERIORS,interiorLayout,interiorCounter,interiorShopkeeper,SHOPKEEPER_ENTRY} from '../src/config/workshop-interiors.js';
import {shopkeeperApproach,updateWorkshopDisplayEntry,requestShopkeeperService} from '../src/core/workshop/workshop-display-entry.js';
import {cottageBlocked,updateCottage} from '../src/core/home/cottage.js';
import {playerActionCountdown} from '../src/rendering/player-action-countdown.js';
// 仅设置营业房场景，计时由正式控制器推进。
function scene(kind){const g=new Game(freshProgress(),()=>.5);g.state='playing';g.cottage={kind,floor:0};Object.assign(g.player,shopkeeperApproach(g.cottage),{vx:0,vy:0});return g;}
// 固定帧收集服务意图，验证同一次靠近只产生一个。
function tick(g,n,input={x:0,y:0},dialog=false){const requests=[];for(let i=0;i<n;i++){const r=updateWorkshopDisplayEntry(g,.05,input,dialog);if(r)requests.push(r);}return requests;}
for(const kind of Object.keys(WORKSHOP_INTERIORS).filter(k=>k!=='warehouse'))test(kind+' 柜台可走到，入室出生不触发，一秒后只打开一次',()=>{const g=scene(kind),site={x:g.player.x,y:g.player.y};assert.equal(cottageBlocked(site.x,site.y,g),false);assert.equal(site.x,interiorShopkeeper(g.cottage).x);Object.assign(g.player,interiorLayout(g.cottage).spawn);assert.equal(tick(g,50).length,0);Object.assign(g.player,site);assert.equal(tick(g,20).length,0);assert.equal(playerActionCountdown(g).icon,'board');assert.equal(playerActionCountdown(g).wait,1);assert.equal(tick(g,1)[0].kind,kind);assert.equal(tick(g,60).length,0);g.player.x+=interiorCounter(g.cottage).width/2+SHOPKEEPER_ENTRY.releaseRadius+5;tick(g,1);Object.assign(g.player,site);assert.equal(tick(g,21).length,1);});

test('实际迎面走到柜台松手后计时，正面两侧有效而柜后无效',()=>{
 for(const kind of Object.keys(WORKSHOP_INTERIORS).filter(k=>k!=='warehouse')){
  const g=scene(kind);Object.assign(g.player,interiorLayout(g.cottage).spawn);
  for(let i=0;i<40;i++){updateCottage(g,.05,{x:0,y:-1});assert.equal(updateWorkshopDisplayEntry(g,.05,{x:0,y:-1}),null);}
  updateCottage(g,.05,{x:0,y:0});assert.equal(tick(g,21).length,1,kind);
  const site=shopkeeperApproach(g.cottage);
  for(const dx of [-60,0,60]){g.cottage.displayEntryLatch=false;Object.assign(g.player,{x:site.x+dx,y:site.y,vx:0,vy:0});assert.equal(cottageBlocked(g.player.x,g.player.y,g),false);assert.equal(tick(g,21).length,1,kind+' '+dx);}
  Object.assign(g.player,interiorShopkeeper(g.cottage));g.cottage.displayEntryLatch=false;assert.equal(tick(g,30).length,0);
 }
});

test('主动点击立即提交、清空候停并允许关闭后重开，远处和暂停不能提交',()=>{
 const g=scene('ammo');tick(g,10);assert.deepEqual(requestShopkeeperService(g),{kind:'ammo',index:undefined});assert.equal(g.cottage.displayEntry,null);assert.equal(tick(g,40).length,0);
 assert.ok(requestShopkeeperService(g));g.state='paused';assert.equal(requestShopkeeperService(g),null);g.state='playing';g.player.y+=500;assert.equal(requestShopkeeperService(g),null);
});
test('售货员候停移动清零，暂停和其他弹窗冻结，死亡不触发',()=>{const g=scene('seed');tick(g,10);const elapsed=g.cottage.displayEntry.elapsed;g.state='paused';tick(g,40);assert.equal(g.cottage.displayEntry.elapsed,elapsed);g.state='playing';tick(g,40,undefined,true);assert.equal(g.cottage.displayEntry.elapsed,elapsed);tick(g,1,{x:1,y:0});assert.equal(g.cottage.displayEntry,null);g.player.hp=0;assert.equal(tick(g,40).length,0);});
