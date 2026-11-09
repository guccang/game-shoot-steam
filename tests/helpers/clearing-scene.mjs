// 清缴专项夹具使用正式接单入口与本次场地，不绕过安全区或到场权限。
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../../src/game.js';
import {CLEARING_APPROACH} from '../../src/config/clearing.js';
import {clearingSite} from '../../src/progression/story/clearing-site.js';
import {acceptClearingPost} from '../../src/core/story/clearing-guide.js';
import {livingWaveAllowed} from '../../src/core/camp/living-safety.js';
import {prepareBossNode} from './boss-node.mjs';

// 接取、重接或死亡重试后到达正式清缴场，保留现有波次和奖励进度。
export function enterClearing(game){
 // 战斗夹具跳过开场对白，再走正式接单流程。
 game.mainlineSpeech=null;
 // 清缴测试从告示牌已修复的阶段开始，不受建筑教学前置阻挡。
 if(!game.progress.restoration.repaired.includes('clearing'))game.progress.restoration.repaired.push('clearing');
 if(!game.progress.living.patrolActive){
  Object.assign(game.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});
  assert.ok(acceptClearingPost(game).ok,'告示牌接取成功');
 }
 Object.assign(game.player,{x:clearingSite(game.progress).x,y:clearingSite(game.progress).y});
 assert.ok(livingWaveAllowed(game),'接取后到场才允许清缴');
 return game;
}

// 固定随机源但保留正式存档、怪物工厂与结算；关掉自动射击以便精确观察刷怪。
export function clearingArena(random=()=>.5){
 const game=new Game(freshProgress(),random);game.start();enterClearing(game);
 game.enemies=[];game.trees=[];game.attackTimer=999;return game;
}

// 非资格专项可直接准备已完成节点，随后仍由正式领主工厂建立挑战快照。
export function summonClearingBossAtNode(game){
 enterClearing(game);prepareBossNode(game);return game.summonBoss();
}
