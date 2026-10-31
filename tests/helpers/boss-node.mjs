// 非解锁专项的战斗夹具显式设置已清空节点；资格规则由波次管理专项验证。
import {waveDifficulty} from '../../src/config/waves.js';
export function prepareBossNode(game){game.bossReady=true;game.bossWave=game.wave;game.waveKills=waveDifficulty(game.wave).total;game.kills=Math.max(game.kills,game.waveKills);game.waveSpawned=game.waveKills;game.waveRest=0;}
// 战斗专项跳过已由节点专项覆盖的刷怪前置，仍调用正式领主工厂与战斗结算。
export function summonBossAtNode(game){prepareBossNode(game);if(game.mapId==='forest'&&!game.story&&!game.realm&&!game.player.arena){game.progress.living.patrolActive=true;Object.assign(game.player,{x:450,y:1000});}return game.summonBoss();}
