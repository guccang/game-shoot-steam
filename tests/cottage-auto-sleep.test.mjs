// 床前自动睡眠验证一秒门槛、取消、暂停、保存及睡醒防重复。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {COTTAGE} from '../src/config/cottage.js';
import {enterCottage,updateCottage,sleepInCottage,cottageBlocked} from '../src/core/home/cottage.js';
import {playerActionCountdown} from '../src/rendering/player-action-countdown.js';
import {nearbyInteraction} from '../src/core/navigation/nearby-interaction.js';
// 从正式房门进入，床边使用可通行脚底位置。
function scene(){const p=freshProgress();p.restoration.repaired=['cottage'];const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;Object.assign(g.player,COTTAGE.door);assert.ok(enterCottage(g));Object.assign(g.player,COTTAGE.bed);g.player.hp=20;g.livingPersist=()=>true;return g;}
// 固定步长严格累计；不以一次超长帧补满等待时间。
function tick(g,n,input={x:0,y:0}){for(let i=0;i<n;i++)updateCottage(g,.05,input);}

test('床前一秒才请求选择，显示床图标且不能提前睡眠',()=>{const g=scene();assert.equal(cottageBlocked(g.player.x,g.player.y,g),false);assert.equal(nearbyInteraction(g),null);assert.equal(sleepInCottage(g),false);tick(g,20);assert.equal(g.cottage.sleep,null);assert.equal(playerActionCountdown(g).icon,'bed');assert.equal(playerActionCountdown(g).wait,1);tick(g,1);assert.equal(g.cottage.sleepRequested,true);assert.equal(g.cottage.sleep,null);assert.equal(sleepInCottage(g,'morning'),true);assert.equal(g.cottage.sleep.mode,'morning');assert.equal(playerActionCountdown(g),null);});
test('移动取消并重新计时，暂停冻结，长帧不能直接入睡',()=>{const g=scene();tick(g,10);g.pause();const elapsed=g.cottage.restElapsed;tick(g,50);assert.equal(g.cottage.restElapsed,elapsed);g.start();tick(g,1,{x:1,y:0});assert.equal(g.cottage.restElapsed,null);updateCottage(g,10,{x:0,y:0});assert.equal(g.cottage.restElapsed,0);tick(g,19);assert.equal(g.cottage.sleep,null);tick(g,1);assert.equal(g.cottage.sleepRequested,true);assert.equal(g.cottage.sleep,null);});
test('醒来回满生命且只推进一次日期，移开后才能再次睡眠',()=>{const g=scene(),day=g.progress.living.calendar.day;tick(g,21);sleepInCottage(g);tick(g,24);assert.equal(g.player.hp,g.maxHp());assert.equal(g.progress.restoration.cottageRested,true);assert.equal(g.progress.living.calendar.day,day+1);tick(g,80);assert.equal(g.progress.living.calendar.day,day+1);Object.assign(g.player,{x:220,y:220});tick(g,1);Object.assign(g.player,COTTAGE.bed);tick(g,21);assert.equal(sleepInCottage(g),true);assert.ok(g.cottage.sleep);});
test('保存失败不回血不推进教学，离开后重试正常',()=>{const g=scene(),before=structuredClone(g.progress.living.calendar);g.livingPersist=()=>false;tick(g,21);sleepInCottage(g);tick(g,24);assert.equal(g.player.hp,20);assert.deepEqual(g.progress.living.calendar,before);assert.equal(g.progress.restoration.cottageRested,false);assert.match(g.cottage.notice,/没保存成功/);tick(g,40);assert.equal(g.cottage.sleep,null);Object.assign(g.player,{x:220,y:220});tick(g,1);Object.assign(g.player,COTTAGE.bed);g.livingPersist=()=>true;tick(g,21);sleepInCottage(g);tick(g,24);assert.equal(g.player.hp,g.maxHp());});
test('二楼、商店和死亡角色不会在床坐标入睡',()=>{for(const mode of ['floor','shop','dead']){const g=scene();if(mode==='floor')g.cottage.floor=1;if(mode==='shop')g.cottage.kind='seed';if(mode==='dead')g.player.hp=0;tick(g,60);assert.equal(g.cottage.sleep,null);assert.equal(g.cottage.restElapsed,null);}});
