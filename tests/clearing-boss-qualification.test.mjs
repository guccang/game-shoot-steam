import {clearingSite} from '../src/progression/story/clearing-site.js';
// 清缴资格专项：真实接取/击杀/保存链路与玩家看到的进度反馈保持一致。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {BOSS_CLEARING} from '../src/config/settlements.js';
import {CLEARING_APPROACH} from '../src/config/clearing.js';
import {acceptClearingPost} from '../src/core/story/clearing-guide.js';
import {waveDifficulty} from '../src/config/waves.js';
import {challengeProgress,challengeTier,RECOMMENDED_ECONOMY} from '../src/config/economy.js';
import {createGameEventHandler} from '../src/app/game-events.js';
import {challengeLevelMarkup,challengeVictoryText} from '../src/ui/challenge-feedback.js';
import {equipmentRequirements} from '../src/progression/workshop/equipment-goals.js';
// 仅略过已覆盖的波次战斗时间，资格必须通过正式告示牌和 Boss 致命命中结算。
function win(g){Object.assign(g.player,CLEARING_APPROACH);assert.ok(acceptClearingPost(g).ok);Object.assign(g.player,{x:clearingSite(g.progress).x,y:clearingSite(g.progress).y});g.wave=g.bossWave;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;g.bossReady=true;assert.ok(g.summonBoss());const boss=g.boss;g.hit(boss,1e9);return boss;}
test('完整清缴每次180，四次升级且重复致命命中不发奖，资源满额不阻止成长',()=>{
 const g=new Game(freshProgress(),()=>.5),events=[];g.start();g.progress.coins=g.progress.wood=99990000;
 g.onEvent=(type,data)=>{if(type==='victory')events.push(data);};
 for(let i=1;i<=4;i++){const boss=win(g);g.hit(boss,1e9);assert.equal(g.progress.bosses,i);assert.equal(events.length,i);assert.equal(g.progress.campLevel.xp,i*180);assert.equal(g.progress.living.patrolActive,false);assert.equal(challengeProgress(validateProgress(JSON.parse(JSON.stringify(g.progress)))).tier,i===4?2:1);}
 assert.equal(events[3].qualification.previousTier,1);assert.equal(events[3].qualification.tier,2);assert.equal(events[3].qualification.percent,95);assert.match(challengeVictoryText(events[0]),/营地经验 \+180/);
 assert.ok(equipmentRequirements(g.progress,'weapons',1).every(r=>r.key!=='bosses'));
});
