// 三类房间的出门计时与取消边界，使用正式房间控制器。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {interiorLayout} from '../src/config/workshop-interiors.js';
import {enterCottage,enterWorkshop,updateCottage} from '../src/core/cottage.js';
import {playerActionCountdown} from '../src/rendering/player-action-countdown.js';
import {nearbyInteraction} from '../src/core/nearby-interaction.js';
// 解锁房屋后从正式入口入室，不修改真实出生点与出口范围。
function scene(kind){const g=new Game(freshProgress(),()=>.5);g.start();g.vehicle.active=false;g.progress.restoration.repaired=['cottage','garage'];Object.assign(g.player,interiorLayout({kind}).door);assert.ok(kind==='cottage'?enterCottage(g):enterWorkshop(g,kind));return g;}
// 固定小步推进，只检查房间逻辑，不引入主线与战斗计时。
function step(g,seconds,input={x:0,y:0}){for(let i=0;i<Math.round(seconds/.05);i++)updateCottage(g,.05,input);}
for(const kind of ['cottage','weapons','vehicle']){
 test(kind+'：出生不触发，门前满一秒出门且恢复外部坐标',()=>{
  const g=scene(kind),layout=interiorLayout(g.cottage),outside={...g.cottage.outside};step(g,2);assert.ok(g.cottage);assert.equal(g.cottage.exitElapsed,0);
  Object.assign(g.player,layout.exit);step(g,.95);assert.ok(g.cottage);assert.equal(playerActionCountdown(g).wait,1);assert.equal(playerActionCountdown(g).icon,'exit');assert.equal(nearbyInteraction(g),null);
  step(g,.05);assert.equal(g.cottage,null);assert.deepEqual({x:g.player.x,y:g.player.y},outside);step(g,2);assert.equal(g.cottage,null);
 });
 test(kind+'：移开重置，暂停不推进',()=>{
  const g=scene(kind),layout=interiorLayout(g.cottage);Object.assign(g.player,layout.exit);step(g,.4);
  g.state='paused';step(g,2);assert.ok(g.cottage.exitElapsed<.41);g.state='playing';
  step(g,.5,{x:0,y:-1});assert.equal(g.cottage.exitElapsed,0);assert.equal(playerActionCountdown(g),null);Object.assign(g.player,layout.exit);step(g,.95);assert.ok(g.cottage);step(g,.05);assert.equal(g.cottage,null);
 });
}
