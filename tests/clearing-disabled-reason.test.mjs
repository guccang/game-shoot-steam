// 清缴禁用说明专项：界面权限和正式接取错误同源，暂停与骑乘不误报。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {CLEARING_POST,CLEARING_APPROACH} from '../src/config/clearing.js';
import {clearingPostReason,canUseClearingPost,acceptClearingPost} from '../src/core/story/clearing-guide.js';
// 最小权限场景保留正式进度和告示牌坐标，避免无关战斗逻辑影响原因判定。
function scene(){const progress=freshProgress();progress.restoration.repaired.push('clearing');return {progress,state:'playing',mapId:'forest',player:{...CLEARING_APPROACH},vehicle:{active:false}};}

test('远处查看明确要求靠近告示牌，不改清缴进度；抵达边界恢复可用',()=>{
 const g=scene();g.player.x+=CLEARING_POST.radius+1;const before=structuredClone(g.progress);
 assert.match(clearingPostReason(g),/靠近.*清缴告示牌/);assert.equal(canUseClearingPost(g),false);assert.deepEqual(acceptClearingPost(g),{ok:false,message:clearingPostReason(g)});assert.deepEqual(g.progress,before);
 g.player.x--;assert.match(clearingPostReason(g),/木栏保护/);
 g.progress.living.patrolActive=true;assert.equal(clearingPostReason(g),'');assert.equal(canUseClearingPost(g),true);
 g.progress.living.patrolActive=false;Object.assign(g.player,CLEARING_APPROACH);assert.equal(clearingPostReason(g),'');
});
test('当前地图、活动、死亡和对话均返回实际阻碍',()=>{
 for(const [changes,expected] of [[{state:'dead'},/复活/],[{mapId:'jiuzhaigou'},/返回森林营地/],[{campDefense:{}},/营地防守/],[{workshopTrial:{}},/武器试用/],[{story:{}},/故事/],[{realm:{}},/挑战/],[{fireActive:true},/消防任务/],[{arrivalCinematic:{}},/入职引导/],[{mainlineSpeech:{}},/对话/],[{state:'title'},/返回游戏/],[{livingPreview:true},/预览/],[{boss:{}},/领主战斗/],[{livingBattle:{}},/遭遇战/]]){
  const g=Object.assign(scene(),changes);assert.match(clearingPostReason(g),expected);assert.equal(canUseClearingPost(g),false);assert.equal(acceptClearingPost(g).message,clearingPostReason(g));
 }
});
test('未修复明确提示修复所需木材，已修复清除说明',()=>{
 const g=scene();g.progress.restoration.repaired=[];assert.match(clearingPostReason(g),/木头.*修复/);g.progress.restoration.repaired.push('clearing');assert.equal(clearingPostReason(g),'');
});
test('原生弹窗暂停和驾驶均可现场确认，已接取不重复开任务',()=>{
 const g=scene();g.state='paused';g.vehicle.active=true;assert.equal(clearingPostReason(g),'');
 g.progress.living.patrolActive=true;assert.deepEqual(acceptClearingPost(g),{ok:true});g.player.x+=CLEARING_POST.radius+1;assert.match(clearingPostReason(g),/靠近/);
});
test('实际接取保存失败继续返回事务错误，不能误报距离',()=>{
 const p=scene().progress,g=new Game(p,()=>.5);g.state='paused';g.enemies=[];g.boss=null;Object.assign(g.player,CLEARING_APPROACH);g.livingPersist=()=>false;
 assert.equal(clearingPostReason(g),'');const result=acceptClearingPost(g);assert.equal(result.ok,false);assert.match(result.message,/保存|存储/);assert.equal(g.progress.living.patrolActive,false);
});
