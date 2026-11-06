import {vehicleMotorSound} from '../src/config/vehicle-eras.js';
// 音频回归：缓存与限流、手机手势、循环生命周期、事件路由与独立偏好存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {fireAudioScene,FIRE_LOOPS} from '../src/platform/audio-fire.js';
import { readFile } from 'node:fs/promises';
import { createAudio, normalizeAudioPreferences } from '../src/platform/audio.js';
import { renderSound, renderEngine, SOUND_PROFILES, WEAPON_SOUNDS } from '../src/platform/audio-sounds.js';
import { WEAPONS } from '../src/config/weapons.js';
import { VEHICLE_WEAPONS } from '../src/config/vehicle-armaments.js';
import { COLLECTED_VEHICLES } from '../src/config/vehicles.js';
import { createSaveStore, STORAGE_KEYS } from '../src/platform/storage.js';
import { createGameEventHandler } from '../src/app/game-events.js';

// 模拟音频参数与生命周期，不依赖扬声器即可检查声源创建、停止和释放。
function fakeContext() {
  const param = () => ({ value: 0, cancelScheduledValues() {}, setTargetAtTime(v) { this.value = v; } });
  const node = () => ({ connect(target) { this.target=target; }, disconnect() { this.disconnected = true; }, gain: param(),
    frequency: param(), playbackRate: param(), threshold: param(), knee: param(),
    ratio: param(), attack: param(), release: param() });
  return {
    currentTime: 0, state: 'suspended', sources: [], buffers: 0, destination: node(), closed: 0,
    createGain: node, createBiquadFilter: node, createDynamicsCompressor: node,
    createBuffer(channels, length, sampleRate) {
      this.buffers++;
      const samples = new Float32Array(length);
      return { duration: length / sampleRate, getChannelData: () => samples };
    },
    createBufferSource() {
      const source = { ...node(), start(time, offset) { this.started = true; this.offset = offset; },
        stop() { this.stopped = true; this.onended?.(); } };
      this.sources.push(source); return source;
    },
    async resume() { this.state = 'running'; },
    async close() { this.closed++; this.state = 'closed'; },
  };
}
// 用极短音乐隔离真实声音计算，保留整个播放与混音路径。
function setup(preferences = { enabled: false }) {
  const context = fakeContext();
  const audio = createAudio(() => context, { preferences,
    loadMusic: async c => c.createBuffer(1, 22050, 22050) });
  return { context, audio };
}

test('首次使用默认有声但手势前不创建设备，刷新保留主动静音', async () => {
  const context = fakeContext(); let created = 0;
  const audio = createAudio(() => { created++; return context; }, {
    loadMusic: async c => c.createBuffer(1, 22050, 22050),
  });
  assert.equal(audio.enabled, true); assert.equal(created, 0);
  assert.deepEqual(audio.preferences,{enabled:true,music:.66,effects:.03});
  assert.equal(audio.play('meow-start'), false);
  await audio.unlock(); assert.equal(created, 1);
  audio.setScene({active:true}); assert.equal(audio.diagnostics.music, true);
  await audio.toggle();
  const restored = setup(audio.preferences).audio;
  assert.equal(await restored.unlock(), false);
  assert.equal(restored.diagnostics.contextState, 'locked');
  audio.dispose(); restored.dispose();
});

test('设置音乐试听独立于战斗暂停，关闭设置和后台立即停止', async () => {
  const {audio,context} = setup({enabled:true}); await audio.unlock();
  audio.setScene({active:true,vehicle:0});
  audio.setScene({active:false,previewMusic:true});
  assert.equal(audio.diagnostics.music,true); assert.equal(audio.diagnostics.vehicle,-1);
  assert.equal(audio.play('pistol'),false); assert.equal(audio.play('purchase'),true);
  audio.setVolume('music',.12);audio.setVolume('effects',.23);
  assert.equal(context.sources.find(s=>s.loop).target.target.gain.value,.12);
  assert.equal(context.sources.at(-1).target.target.gain.value,.23);
  audio.setScene({visible:false});assert.equal(audio.diagnostics.voices,0);
  audio.setScene({visible:true});assert.equal(audio.diagnostics.music,true);
  audio.setScene({previewMusic:false});assert.equal(audio.diagnostics.music,false);
  audio.dispose();
});

// 面板连续切换只暂停音效，音乐不停止、不重建声源，也不从头播放。
test('面板暂停期间延续原音乐声源，嵌套面板和返回游戏不重启音乐',async()=>{
 const {audio,context}=setup({enabled:true});await audio.unlock();
 audio.setScene({active:true,vehicle:0});
 const music=context.sources.find(s=>s.loop),count=context.sources.length;
 context.currentTime=12;audio.setScene({active:false,previewMusic:true});
 for(let i=0;i<5;i++)audio.setScene({active:false,previewMusic:true});
 assert.equal(audio.diagnostics.music,true);assert.equal(audio.diagnostics.vehicle,-1);
 assert.equal(music.stopped,undefined);assert.equal(context.sources.length,count);
 audio.setScene({active:true,previewMusic:false,vehicle:-1});
 assert.equal(music.stopped,undefined);assert.equal(context.sources.length,count);
 await audio.toggle();assert.equal(audio.diagnostics.music,false);audio.dispose();
});

test('所有枪械、载具动作与猫叫均有非静音有限音色，输出样本不削波', () => {
  const context = fakeContext(), signatures = new Set();
  // 邻里猫小队按真实出车与近战动作发声，装备编号本身不是开火音效。
  for (const w of VEHICLE_WEAPONS)for(const kind of w.crew?['cat-crew-deploy','cat-crew-hit']:[w.id])
    assert.ok(WEAPON_SOUNDS.has(kind), `${w.id} 缺少 ${kind} 音色`);
  const sounds = Object.keys(SOUND_PROFILES).map(kind => renderSound(context, kind));
  sounds.push(...[0, 1, 2, 3, 4].map(index => renderEngine(context, index)));
  for (const buffer of sounds) {
    const samples = buffer.getChannelData(0);
    let energy = 0, peak = 0;
    for (const sample of samples) {
      assert.ok(Number.isFinite(sample));
      energy += sample * sample; peak = Math.max(peak, Math.abs(sample));
    }
    assert.ok(energy > 0.01 && peak < 1);
    signatures.add(`${samples.length}:${energy.toFixed(6)}`);
  }
  assert.equal(signatures.size, sounds.length, '音色不共用同一段蜂鸣');
  // 新车型可共用同类发动机，但目录中的每辆车都必须有有效、未削波的循环。
  for(const [index,vehicle] of COLLECTED_VEHICLES.entries()){
    const sound=vehicleMotorSound(index);
    if(sound===-1)continue; // 人力和畜力车没有发动机。
    const samples=renderEngine(context,sound).getChannelData(0);
    assert.ok(samples.every(s=>Number.isFinite(s)&&Math.abs(s)<1),vehicle.id);
    assert.ok(samples.some(s=>Math.abs(s)>.01),`${vehicle.id} 发动机静音`);
  }
});

test('主动静音不申请设备；开启后缓存音色，多炮密集射击限流并最终释放节点', async () => {
  const { audio, context } = setup();
  assert.equal(audio.play('gatling'), false);
  assert.equal(audio.diagnostics.contextState, 'locked');
  await audio.toggle();
  audio.setScene({ active: true });
  const count = context.buffers;
  assert.equal(audio.play('gatling'), true);
  for (let i = 0; i < 500; i++) assert.equal(audio.play('gatling'), false);
  assert.equal(context.buffers, count + 1);
  for (let i = 0; i < 100; i++) {
    context.currentTime += 0.06;
    audio.play('gatling');
    for (const kind of WEAPON_SOUNDS) audio.play(kind);
  }
  assert.ok(audio.diagnostics.voices <= 23, '二十个瞬态、一条音乐和至多两种连续武器');
  for (const source of context.sources) if (!source.loop) source.onended?.();
  context.currentTime += 0.3;
  audio.setScene({ active: true });
  assert.equal(audio.diagnostics.voices, 1);
  assert.equal(audio.play('unknown'), false);
  audio.dispose(); audio.dispose();
  assert.equal(context.closed, 1);
  assert.equal(audio.diagnostics.voices, 0);
});

test('载具循环唯一、移动改变转速，暂停/后台/静音立即停止，继续不叠音乐', async () => {
  const { audio, context } = setup();
  await audio.toggle();
  audio.setScene({ active: true, vehicle: 0, moving: 0 });
  assert.equal(audio.diagnostics.voices, 2);
  const idleEngine = context.sources.at(-1), idlePitch = idleEngine.playbackRate.value;
  context.currentTime += 0.2;
  audio.setScene({ moving: 1 });
  assert.ok(idleEngine.playbackRate.value > idlePitch);
  for (let i = 0; i < 300; i++) audio.setScene({ moving: 1 });
  assert.equal(audio.diagnostics.voices, 2);
  audio.setScene({ vehicle: 2 });
  assert.equal(idleEngine.stopped, true);
  assert.equal(audio.diagnostics.vehicle, 2);
  audio.play('pulse');
  audio.setScene({ active: false });
  assert.equal(audio.diagnostics.voices, 0);
  assert.equal(audio.play('pulse'), false);
  audio.setScene({ active: true }); assert.equal(audio.diagnostics.voices, 2);
  audio.setScene({ visible: false }); assert.equal(audio.diagnostics.voices, 0);
  audio.setScene({ visible: true }); assert.equal(audio.diagnostics.voices, 2);
  await audio.toggle(); assert.equal(audio.diagnostics.voices, 0);
  audio.dispose();
});

test('独立音乐与音效静音、音量校验和偏好保存均不覆盖游戏存档', async () => {
  assert.deepEqual(normalizeAudioPreferences({ music: NaN, effects: -1, enabled: 'yes' }),
    { enabled: true, music: 0.66, effects: 0 });
  const values = new Map([[STORAGE_KEYS.progress, '{"coins":123}']]);
  const store = createSaveStore(() => ({ getItem: key => values.get(key),
    setItem: (key, value) => values.set(key, value) }));
  store.saveAudio({ enabled: true, music: 0.2, effects: 0.8 });
  assert.equal(values.get(STORAGE_KEYS.progress), '{"coins":123}');
  const { audio } = setup(store.loadAudio());
  assert.equal(audio.diagnostics.unlocked, false, '保存开启状态也要等待手势');
  await audio.unlock();
  audio.setScene({ active: true, vehicle: 1 });
  audio.setVolume('music', 0);
  assert.equal(audio.diagnostics.music, false);
  assert.equal(audio.diagnostics.vehicle, 1);
  audio.setVolume('effects', 0);
  assert.equal(audio.diagnostics.voices, 0);
  assert.equal(audio.play('meow-start'), false);
  audio.setVolume('music', 0.2);
  assert.equal(audio.diagnostics.music, true);
  audio.dispose();
});

test('异步音乐加载完成前静音或销毁，不会重新启动声音', async () => {
  for (const dispose of [false, true]) {
    const context = fakeContext();
    let finish;
    const audio = createAudio(() => context, { preferences: {enabled:false}, loadMusic: () => new Promise(resolve => { finish = resolve; }) });
    await audio.toggle();
    audio.setScene({ active: true });
    if (dispose) audio.dispose(); else await audio.toggle();
    finish(context.createBuffer(1, 22050, 22050));
    await Promise.resolve();
    assert.equal(audio.diagnostics.voices, 0);
    assert.equal(audio.diagnostics.music, false);
    audio.dispose();
  }
});

test('实际事件按枪型路由，装甲受击与猫猫受伤区分，出发和胜利播放猫叫', () => {
  const sounds = [];
  const handle = createGameEventHandler({ root: { getElementById: () => ({}) },
    audio: { play: type => sounds.push(type) }, toast: { show() {} }, input: { reset() {} }, save() {} });
  for (const w of WEAPONS) handle('shot', { kind: w.id });
  assert.deepEqual(sounds, WEAPONS.filter(w=>w.id!=='chainsaw').map(w => w.id));
  sounds.length = 0;
  handle('chainsaw-contact');
  assert.deepEqual(sounds, []);
  sounds.length = 0;
  handle('start'); handle('hurt', { armored: true }); handle('hurt');
  handle('hurt', { fatal: true }); handle('death'); handle('victory');
  handle('vehicle-summon'); handle('vehicle-dismount');
  assert.deepEqual(sounds, ['meow-start', 'armor-hit', 'meow-hurt', 'meow-down',
    'victory', 'meow-happy', 'vehicle-start', 'vehicle-stop']);
});

test('背景音乐资源为可解码的完整 PCM WAV，循环有旋律且无削波', async () => {
  const wav = await readFile(new URL('../assets/audio/forest-theme.wav', import.meta.url));
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.readUInt32LE(4), wav.length - 8);
  assert.equal(wav.readUInt32LE(24), 22050);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.ok((wav.length - 44) / 44100 > 40);
  let energy = 0, peak = 0;
  for (let i = 44; i < wav.length; i += 2) {
    const sample = wav.readInt16LE(i);
    energy += sample * sample; peak = Math.max(peak, Math.abs(sample));
  }
  assert.ok(energy > 1e6 && peak < 30000);
});

test('专属主炮、召唤动作与各车型启停路由完整，双喷口不重复播放整组声',()=>{
  const sounds=[],handle=createGameEventHandler({root:{getElementById:()=>({})},audio:{play:kind=>sounds.push(kind)},toast:{show(){}},input:{reset(){}},save(){}});
  for(const kind of ['vehicle-machinegun','tank-125','vehicle-vulcan'])handle('shot',{kind});
  handle('shot',{kind:'hover-tide'});
  for(const kind of ['hover-tide','hover-tide','mechanical-deploy','spider-hatch'])handle('weapon-sound',{kind});
  assert.deepEqual(sounds,['vehicle-machinegun','tank-125','vehicle-vulcan','hover-tide','hover-tide','mechanical-deploy','spider-hatch']);
  handle('weapon-sound',{kind:'cat-crew-deploy',source:'companion'});handle('shot',{kind:'cat-crew-hit',source:'companion'});
  assert.deepEqual(sounds.slice(-2),['cat-crew-deploy','cat-crew-hit']);
  for(let index=0;index<COLLECTED_VEHICLES.length;index++){
    const count=sounds.length,sound=vehicleMotorSound(index);
    handle('vehicle-summon',{index});handle('vehicle-dismount',{index});
    assert.deepEqual(sounds.slice(count),sound===-1?[]:['vehicle-start-'+sound,'vehicle-stop-'+sound]);
  }
});

test('火神炮最快射速与水压双发不被误限流，缓存复用且暂停清理',async()=>{
  const {audio,context}=setup();await audio.toggle();audio.setScene({active:true});
  for(const [kind,interval] of [['vehicle-vulcan',.065/1.32],['hover-tide',.12]]){
    assert.equal(audio.play(kind),true);const count=context.buffers;
    assert.equal(audio.play(kind),false);context.currentTime+=interval;
    assert.equal(audio.play(kind),true);assert.equal(context.buffers,count);
  }
  audio.setScene({active:false});assert.equal(audio.diagnostics.voices,0);
  assert.equal(audio.play('spider-hatch'),false);audio.dispose();
});

test('伙伴跨枪型共享限频且最多三声，不抢同型号主武器；主枪压低背景并优先占声源',async()=>{
  const {audio,context}=setup();await audio.toggle();audio.setScene({active:true,vehicle:1,moving:1});
  assert.ok(audio.diagnostics.engineGain<=.221);
  assert.equal(audio.play('pistol','companion'),true);
  const background=context.sources.at(-1);assert.equal(background.target.gain.value,.28);
  assert.equal(audio.play('pulse','companion'),false);
  assert.equal(audio.play('pistol'),true,'伙伴同枪不占主武器冷却');
  assert.equal(background.target.gain.value,.14);assert.ok(audio.diagnostics.engineGain<=.111);
  for(const kind of ['pulse','sniper']){context.currentTime+=.17;assert.equal(audio.play(kind,'companion'),true);}
  context.currentTime+=.17;assert.equal(audio.play('mechanical-core','companion'),false);
  assert.equal(audio.diagnostics.companionVoices,3);
  for(let i=0;i<30;i++){context.currentTime+=.2;assert.equal(audio.play('vehicle-machinegun'),true);}
  assert.equal(audio.diagnostics.companionVoices,0,'达到总上限时优先淘汰伙伴尾音');
  assert.equal(audio.play('weapon-hit'),true);assert.ok(audio.diagnostics.voices<=22);
  audio.setScene({active:false});assert.equal(audio.diagnostics.voices,0);audio.dispose();
});

test('伙伴连续声与主枪独立续接，停止主枪后背景自然恢复，暂停全部释放',async()=>{
  const {audio,context}=setup();await audio.toggle();audio.setScene({active:true,vehicle:2});
  audio.play('flame','companion');const background=context.sources.at(-1);
  audio.play('flame');assert.deepEqual(audio.diagnostics.weapons,['companion:flame','flame']);
  assert.ok(background.target.gain.value<.12);
  context.currentTime+=.4;audio.play('flame','companion');audio.setScene({active:true});
  assert.deepEqual(audio.diagnostics.weapons,['companion:flame']);assert.ok(background.target.gain.value<.23);
  assert.equal(audio.diagnostics.engineGain,.14);audio.setScene({visible:false});
  assert.equal(audio.diagnostics.voices,0);audio.dispose();
});

test('三炮同时装填合并同类提示，完成声不被开始声吞掉，暂停中禁止换弹提示', async () => {
  const { audio, context } = setup();
  await audio.toggle();
  audio.setScene({ active: true });
  assert.equal(audio.play('reload-start'), true);
  assert.equal(audio.play('reload-start'), false);
  assert.equal(audio.play('reload-start'), false);
  assert.equal(audio.play('reload-complete'), true);
  context.currentTime += 0.3;
  assert.equal(audio.play('charge-start'), true);
  audio.setScene({ active: false });
  assert.equal(audio.diagnostics.voices, 0);
  assert.equal(audio.play('charge-complete'), false);
  audio.dispose();
});

test('喷火按真实开火续接单一循环，三炮同枪不重启或叠音', async () => {
  const { audio, context } = setup();
  await audio.toggle();
  audio.setScene({ active: true });
  for (const kind of ['flame']) {
    audio.play(kind);
    const count = context.sources.length, cached = context.buffers;
    const source = context.sources.at(-1);
    assert.equal(source.loop, true);
    for (let frame = 0; frame < 100; frame++) {
      context.currentTime += 0.1;
      for (let cannon = 0; cannon < 3; cannon++) audio.play(kind);
      audio.setScene({ active: true });
      assert.deepEqual(audio.diagnostics.weapons, [kind]);
      assert.equal(context.sources.length, count);
      assert.equal(context.buffers, cached);
    }
    context.currentTime += 0.3;
    audio.setScene({ active: true });
    assert.equal(source.stopped, true);
    assert.deepEqual(audio.diagnostics.weapons, []);
  }
  audio.dispose();
});

test('电锯与接触声保持静默，不合成缓存或创建主角及伙伴声源', async () => {
  const { audio, context } = setup();
  await audio.toggle();
  audio.setScene({ active: true });
  const sources=context.sources.length,buffers=context.buffers;
  for(let frame=0;frame<100;frame++){
    for(const role of ['primary','companion'])for(const kind of ['chainsaw','chainsaw-contact'])assert.equal(audio.play(kind,role),false);
    context.currentTime+=.1;audio.setScene({active:true});
    assert.deepEqual(audio.diagnostics.weapons,[]);assert.equal(context.sources.length,sources);assert.equal(context.buffers,buffers);
  }
  assert.equal(audio.play('pistol'),true);assert.equal(audio.play('flame'),true);
  assert.deepEqual(audio.diagnostics.weapons,['flame']);
  audio.dispose();
});

test('电锯开火、命中、充能和接触事件均静默，其他武器仍正常路由',()=>{
 const sounds=[],handle=createGameEventHandler({root:{getElementById:()=>({})},audio:{play:(...args)=>sounds.push(args)},toast:{show(){}},input:{reset(){}},save(){}});
 for(const source of ['primary','companion'])for(const type of ['shot','weapon-sound','weapon-hit','reload-start','reload-complete','chainsaw-contact'])handle(type,{kind:'chainsaw',source});
 assert.deepEqual(sounds,[]);
 handle('shot',{kind:'pistol'});handle('weapon-hit',{kind:'pistol'});handle('reload-start',{kind:'pistol'});handle('reload-complete',{kind:'pulse'});
 assert.deepEqual(sounds.map(s=>s[0]),['pistol','weapon-hit','reload-start','charge-complete']);
});

test('暂停、后台、静音和音效音量归零终止连续声，恢复时不播放过期攻击', async () => {
  for (const reason of ['paused', 'hidden', 'muted', 'volume', 'dispose']) {
    const { audio } = setup();
    await audio.toggle();
    audio.setScene({ active: true });
    audio.play('chainsaw'); audio.play('flame');
    assert.equal(audio.diagnostics.weapons.length, 1);
    if (reason === 'paused') audio.setScene({ active: false });
    if (reason === 'hidden') audio.setScene({ visible: false });
    if (reason === 'muted') await audio.toggle();
    if (reason === 'volume') audio.setVolume('effects', 0);
    if (reason === 'dispose') audio.dispose();
    assert.deepEqual(audio.diagnostics.weapons, [], reason);
    if (reason === 'muted') await audio.toggle();
    if (reason === 'volume') audio.setVolume('effects', 0.65);
    audio.setScene({ active: true, visible: true });
    assert.deepEqual(audio.diagnostics.weapons, [], reason + ' 不偷播旧声');
    audio.dispose();
  }
});

test('连续武器没有点射衰减，手枪短促而狙击与脉冲保留各自尾音', () => {
  const context = fakeContext();
  // 分段能量验证持续喷射不会在一段末尾退化为静音，不替代主观听感验收。
  function energy(buffer, start, end) {
    const samples = buffer.getChannelData(0);
    const first = Math.floor(start * 22050), last = Math.min(samples.length, Math.floor(end * 22050));
    let sum = 0;
    for (let i = first; i < last; i++) sum += samples[i] ** 2;
    return Math.sqrt(sum / Math.max(1, last - first));
  }
  for (const kind of ['chainsaw', 'flame']) {
    const buffer = renderSound(context, kind), initial = energy(buffer, 0.1, 0.3);
    assert.equal(buffer.duration, 2);
    for (const t of [0.5, 1, 1.5]) {
      const ratio = energy(buffer, t, t + 0.2) / initial;
      assert.ok(ratio > 0.65 && ratio < 1.5, kind + ' 持续声能');
    }
  }
  const pistol = renderSound(context, 'pistol');
  const sniper = renderSound(context, 'sniper'), pulse = renderSound(context, 'pulse');
  assert.ok(energy(pistol, 0, 0.03) > energy(pistol, 0.15, 0.25) * 4);
  assert.ok(sniper.duration > pistol.duration * 3);
  assert.ok(pulse.duration > 1);
  assert.ok(energy(sniper, 0.25, 0.5) > 0.001);
  assert.ok(energy(pulse, 0.3, 0.6) > 0.01);
});

// 消防循环绑定真实动作；同一个声源复用，并遵守所有停声边界。
test('消防警笛/喷水/补水唯一循环，返程关笛且暂停静音释放',async()=>{
 const {audio,context}=setup();await audio.toggle();
 const g={vehicle:{active:true,index:4},player:{vx:80,vy:0},fireRescue:{phase:'active',water:40}};
 audio.setScene({active:true,vehicle:4,...fireAudioScene(g)});assert.deepEqual(audio.diagnostics.fire,['fire-siren']);const count=context.sources.length;
 for(let i=0;i<100;i++)audio.setScene(fireAudioScene(g));assert.equal(context.sources.length,count);
 g.fireRescue.stream={};audio.setScene(fireAudioScene(g));assert.deepEqual(audio.diagnostics.fire,['fire-spray']);g.fireRescue.stream=null;g.fireRescue.filling=true;audio.setScene(fireAudioScene(g));assert.deepEqual(audio.diagnostics.fire,['fire-refill']);
 g.fireRescue.phase='returning';audio.setScene(fireAudioScene(g));assert.deepEqual(audio.diagnostics.fire,[]);assert.equal(audio.diagnostics.vehicle,4);
 for(const reason of ['pause','hidden','mute','volume','dismount']){
  g.fireRescue.phase='active';g.fireRescue.filling=false;audio.setScene({active:true,visible:true,vehicle:4,...fireAudioScene(g)});assert.deepEqual(audio.diagnostics.fire,['fire-siren']);
  if(reason==='pause')audio.setScene({active:false});if(reason==='hidden')audio.setScene({visible:false});if(reason==='mute')await audio.toggle();if(reason==='volume')audio.setVolume('effects',0);if(reason==='dismount')audio.setScene({vehicle:-1});assert.deepEqual(audio.diagnostics.fire,[],reason);
  if(reason==='mute')await audio.toggle();if(reason==='volume')audio.setVolume('effects',.65);
 }
 audio.dispose();assert.equal(audio.diagnostics.voices,0);assert.deepEqual(audio.diagnostics.fire,[]);
});
// 独立发动机不能退回气垫声；消防持续声有能量且接缝没有突跳。
test('消防柴油机与气垫声不同，持续音有界且不作为武器音色路由',()=>{
 const c=fakeContext();assert.notDeepEqual(renderEngine(c,4).getChannelData(0),renderEngine(c,3).getChannelData(0));
 for(const kind of Object.keys(FIRE_LOOPS)){const b=renderSound(c,kind),a=b.getChannelData(0);assert.equal(b.duration,2);assert.ok(!WEAPON_SOUNDS.has(kind));assert.ok(Math.abs(a[0]-a.at(-1))<.01);for(const start of [.1,.5,1,1.5]){const part=a.slice(start*22050,(start+.1)*22050);assert.ok(part.reduce((s,x)=>s+x*x,0)/part.length>.0001);}}
 assert.ok(SOUND_PROFILES['vehicle-start-4']);assert.ok(SOUND_PROFILES['vehicle-stop-4']);
});
