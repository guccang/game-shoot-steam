// 操作日志必须有界、不可改写、独立于存档和寻路；覆盖诊断故障不影响正式逻辑。
import test from 'node:test';
import assert from 'node:assert/strict';
import {GameplayLog,diagnosticValue} from '../src/platform/gameplay-log.js';
import {gameplayState} from '../src/core/gameplay-state.js';
import {Game,freshProgress} from '../src/game.js';
import {createSaveStore} from '../src/platform/storage.js';
import {storyRouteDiagnostics} from '../src/core/story-route.js';
import {requestWorldNavigation,worldNavigationDiagnostics} from '../src/core/world-navigation.js';

test('日志按真实顺序保存独立副本，返回报告也不能改写历史',()=>{
 let time=0;const log=new GameplayLog({now:()=>time,date:()=>new Date(time).toISOString()}),data={task:{phase:'doing'}};
 log.record('game','victory',data);time=42;data.task.phase='report';log.record('input','end');
 const first=log.report();assert.equal(first.entries[0].data.task.phase,'doing');assert.equal(first.entries[1].elapsedMs,42);
 first.entries[0].data.task.phase='changed';assert.equal(log.report().entries[0].data.task.phase,'doing');
 assert.ok(first.entries[1].seq>first.entries[0].seq);
});

test('持续事件受条数和字符双限，过大载荷截断并说明覆盖数量',()=>{
 const log=new GameplayLog({limits:{entries:5,chars:1800,eventChars:1000}});
 for(let i=0;i<1000;i++)log.record('game','shot',{i});
 assert.equal(log.entries.length,5);assert.equal(log.dropped,995);assert.ok(log.chars<=1800);
 log.record('game','huge',{list:Array.from({length:64},()=> 'x'.repeat(1000))});
 assert.equal(log.report().entries.at(-1).data.truncated,true);assert.ok(log.chars<=1800);
});

test('脱敏循环、访问器和URL凭据，日志不执行实体getter',()=>{
 let reads=0;const input={token:'secret',password:'hidden',url:'https://name:password@example.com/game?token=secret#private'};
 input.self=input;Object.defineProperty(input,'computed',{enumerable:true,get(){reads++;throw Error('不能读取');}});
 const result=diagnosticValue(input);assert.equal(reads,0);assert.equal(result.self,'[循环引用]');
 assert.equal(result.url,'https://example.com/game');assert.equal(result.token,'[已隐藏]');assert.equal(result.password,'[已隐藏]');
 assert.equal(result.computed,'[访问器]');
});

test('相同状态不重复入列，只记录改变的玩法分组并保留当前完整状态',()=>{
 const log=new GameplayLog();log.capture({mainline:{phase:'doing'},vehicle:{active:false}});log.capture({mainline:{phase:'doing'},vehicle:{active:false}});
 assert.equal(log.entries.length,1);log.capture({mainline:{phase:'report'},vehicle:{active:false}},'after-action');
 const result=log.report();assert.deepEqual(Object.keys(result.entries[1].data.changes),['mainline']);assert.equal(result.latestState.vehicle.active,false);
 log.clear();assert.equal(log.entries.length,1);assert.equal(log.report().entries[0].name,'log-cleared');
});

test('玩法快照覆盖各活动，并且不执行寻路、改变存档或消费导航意图',()=>{
 const game=new Game(freshProgress(),()=>.5),before=JSON.stringify(game.progress),time=game.time;
 requestWorldNavigation(game,{id:'test',x:1000,y:1000,mapId:'forest'},'测试地点',{direct:true});
 const intent=worldNavigationDiagnostics(game);assert.equal(storyRouteDiagnostics(game),null);
 game.story={chapterId:'sunleaf-01',phase:'active',stageId:'Q20'};game.realm={mode:'football',phase:'combat',score:2};
 game.campDefense={gateId:'left',phase:'waves',wave:3};game.fireRescue={phase:'active',water:50};game.farmWork={tool:'water'};
 const state=gameplayState(game);assert.equal(state.story.active.stageId,'Q20');assert.equal(state.realm.score,2);
 assert.equal(state.defense.wave,3);assert.equal(state.fire.water,50);assert.equal(state.farm.work.tool,'water');
 assert.equal(JSON.stringify(game.progress),before);assert.equal(game.time,time);assert.deepEqual(worldNavigationDiagnostics(game),intent);assert.equal(storyRouteDiagnostics(game),null);
 const log=new GameplayLog();log.capture(state);assert.equal(log.report().entries[0].data.truncated,undefined);
});

test('存档日志只报告结果，保存失败与日志回调异常不互相污染',()=>{
 const memory=new Map(),events=[],storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)},store=createSaveStore(()=>storage);
 store.setDiagnostics(data=>events.push(data));assert.equal(store.saveGameplay({showFps:true}),true);
 assert.deepEqual(Object.keys(events[0]).sort(),['error','key','ok','operation']);assert.equal(events[0].ok,true);
 storage.setItem=()=>{throw new Error('quota');};assert.equal(store.saveGameplay({showFps:false}),false);assert.equal(events.at(-1).ok,false);
 storage.setItem=(key,value)=>memory.set(key,value);store.setDiagnostics(()=>{throw Error('诊断故障');});assert.equal(store.saveGameplay({showFps:false}),true);
});
