// 分轨音频服务：缓存原创音色、限制并发，并管理音乐与载具的循环生命周期。
import { renderSound, renderEngine, SOUND_PROFILES, WEAPON_SOUNDS, RELOAD_SOUNDS } from './audio-sounds.js';
import {FIRE_LOOPS} from './audio-fire.js';
import { loadMusic } from './audio-music.js';
import { CONTINUOUS_WEAPONS, MUTED_WEAPON_SOUNDS } from './audio-weapons.js';

// 音量单独存储，清空游戏进度时仍保留；损坏数据安全回退。
export function normalizeAudioPreferences(raw) {
  return {
    // 首次进入默认有声；明确保存的静音选择继续生效，仍须用户手势解锁。
    enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : true,
    music: Number.isFinite(raw?.music) ? Math.max(0, Math.min(1, raw.music)) : 0.66,
    effects: Number.isFinite(raw?.effects) ? Math.max(0, Math.min(1, raw.effects)) : 0.03,
  };
}

// 所有音频只在用户手势解锁后播放；可注入上下文和音乐工厂，方便离线验证。
export function createAudio(
  createContext = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
  options = {},
) {
  const preferences = normalizeAudioPreferences(options.preferences);
  const buffers = new Map(), voices = new Set(), lastPlayed = new Map();
  const weaponLoops = new Map(), fireLoops=new Map();
  let context, master, musicBus, effectBus, compressor, musicFilter;
  let disposed = false, unlocked = false, pendingUnlock = null, musicPromise = null, musicBuffer = null;
  let music = null, engine = null, engineIndex = -1, musicOffset = 0, musicStarted = 0, lastMix = -1;
  let lastPrimary = -Infinity;
  let scene = { active: false, visible: true, vehicle: -1, moving: 0, night: false, boss: false };

  // 对已有自动化曲线先取消后接续，避免逐帧堆积参数事件。
  function smooth(param, value, duration = 0.08) {
    param.cancelScheduledValues(context.currentTime);
    param.setTargetAtTime(value, context.currentTime, duration);
  }
  // 用户首次开启时才占用音频设备；总线限幅避免多门炮同时开火产生削波。
  function initialize() {
    if (context) return;
    context = createContext();
    master = context.createGain(); musicBus = context.createGain(); effectBus = context.createGain();
    compressor = context.createDynamicsCompressor(); musicFilter = context.createBiquadFilter();
    master.gain.value = 0.8;
    musicBus.gain.value = preferences.music;
    effectBus.gain.value = preferences.effects;
    musicFilter.type = 'lowpass'; musicFilter.frequency.value = 6500;
    compressor.threshold.value = -12; compressor.knee.value = 12;
    compressor.ratio.value = 6; compressor.attack.value = 0.003; compressor.release.value = 0.2;
    musicBus.connect(musicFilter); musicFilter.connect(master); effectBus.connect(master);
    master.connect(compressor); compressor.connect(context.destination);
  }
  // 解锁并发请求共用同一次恢复；音乐异步合成完成后仍检查静音、暂停和销毁状态。
  async function unlock() {
    if (disposed || !preferences.enabled) return false;
    if (unlocked && context?.state === 'running' && musicPromise) return true;
    initialize();
    pendingUnlock ??= context.resume().then(() => { if (!disposed) unlocked = true; })
      .finally(() => { pendingUnlock = null; });
    await pendingUnlock;
    if (disposed || !preferences.enabled) return false;
    if (!musicPromise) {
      musicPromise = (options.loadMusic || loadMusic)(context, () => disposed)
        .then(buffer => { if (!disposed) { musicBuffer = buffer; syncLoops(); } })
        .catch(() => { musicPromise = null; });
    }
    syncLoops();
    return true;
  }
  // 淡出释放单次或循环声源，暂停后不保留隐藏的发动机与排队音效。
  function stopVoice(voice) {
    if (!voice || voice.stopped) return;
    voice.stopped = true;
    smooth(voice.gain.gain, 0, 0.008);
    voice.source.stop(context.currentTime + 0.04);
    voices.delete(voice);
  }
  // 单个声源结束后断开全部节点，避免长期巡游积累 WebAudio 节点。
  function voice(buffer, bus, loop = false, volume = 1, offset = 0) {
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer; source.loop = loop; gain.gain.value = loop ? 0 : volume;
    source.connect(gain); gain.connect(bus);
    const entry = { source, gain, stopped: false };
    source.onended = () => { source.disconnect(); gain.disconnect(); voices.delete(entry); };
    voices.add(entry);
    source.start(0, offset);
    if (loop) smooth(gain.gain, volume, 0.12);
    return entry;
  }
  // 连续武器按真实开火续期，每种只占一条循环，三门同枪不叠成多重噪音。
  function syncWeaponLoops(active) {
    for (const role of ['primary','companion']) for (const kind of CONTINUOUS_WEAPONS) {
      const key=role==='primary'?kind:`companion:${kind}`;
      const running = active && preferences.effects > 0 &&
        context.currentTime - (lastPlayed.get(key) ?? -Infinity) < 0.28;
      let current = weaponLoops.get(key);
      if (!running) {
        stopVoice(current);
        weaponLoops.delete(key);
        lastPlayed.delete(key);
        if (kind === 'chainsaw') lastPlayed.delete(role==='primary'?'chainsaw-contact':'companion:chainsaw-contact');
      } else if (!current) {
        if (!buffers.has(kind)) buffers.set(kind, renderSound(context, kind));
        current = voice(buffers.get(kind), effectBus, true, (kind === 'flame' ? 0.85 : 0.62)*(role==='companion'?.24:1));
        current.combat = true;
        current.companion=role==='companion';current.kind=kind;
        weaponLoops.set(key, current);
      }
    }
  }
  // 消防持续音由实际操作持有；每种仅一个声源，暂停、静音、下车立即释放。
  function syncFireLoops(active){
    for(const [kind,flag]of Object.entries(FIRE_LOOPS)){
      const running=active&&preferences.effects>0&&scene.vehicle===4&&scene[flag];
      if(!running){stopVoice(fireLoops.get(kind));fireLoops.delete(kind);}
      else if(!fireLoops.has(kind)){
        if(!buffers.has(kind))buffers.set(kind,renderSound(context,kind));
        fireLoops.set(kind,voice(buffers.get(kind),effectBus,true,kind==='fire-siren'?.32:.5));
      }
    }
  }
  // 音乐和发动机各至多一个循环；停止音乐时保存播放位置。
  function syncLoops() {
    if (!context || disposed) return;
    const active = unlocked && preferences.enabled && scene.active && scene.visible;
    const musicActive = unlocked && preferences.enabled && scene.visible && (scene.active || scene.previewMusic);
    if (musicActive && preferences.music > 0 && musicBuffer) {
      if (!music) {
        music = voice(musicBuffer, musicBus, true, 1, musicOffset % musicBuffer.duration);
        musicStarted = context.currentTime;
      }
    } else if (music) {
      musicOffset += context.currentTime - musicStarted;
      stopVoice(music); music = null;
    }
    const index = active && preferences.effects > 0 ? scene.vehicle : -1;
    if (engineIndex !== index || (!engine && index >= 0)) {
      stopVoice(engine); engine = null; engineIndex = index;
      if (index >= 0) {
        const key = `engine-${index}`;
        if (!buffers.has(key)) buffers.set(key, renderEngine(context, index));
        engine = voice(buffers.get(key), effectBus, true, 0.14);
      }
    }
    syncWeaponLoops(active);syncFireLoops(active);
  }
  // 频率最多每百毫秒更新一次，转速随移动变化，不创建新的循环节点。
  function setScene(next) {
    scene = { ...scene, ...next };
    if (!context || disposed) return;
    syncLoops();
    if (!scene.visible || !scene.active) {
      for (const v of voices) if (v.combat) stopVoice(v);
    }
    if (!scene.visible) for (const v of voices) stopVoice(v);
    if (context.currentTime - lastMix < 0.1) return;
    lastMix = context.currentTime;
    smooth(musicFilter.frequency, scene.night ? 2600 : 6500, 0.7);
    smooth(musicBus.gain, preferences.music * (scene.boss ? 0.7 : 1), 0.25);
    if (engine) {
      const movement = Math.max(0, Math.min(1, scene.moving));
      smooth(engine.source.playbackRate, 0.85 + movement * 0.35, 0.16);
      smooth(engine.gain.gain, (0.14 + movement * 0.08)*(context.currentTime-lastPrimary<.22?.5:1), 0.12);
    }
    const saw = weaponLoops.get('chainsaw');
    if (saw) {
      // 锯齿实际接触才进入负载：转速压低、音量加重，空转自然恢复。
      const cutting = context.currentTime - (lastPlayed.get('chainsaw-contact') ?? -Infinity) < 0.24;
      smooth(saw.source.playbackRate, cutting ? 0.86 : 1.08, 0.06);
      smooth(saw.gain.gain, cutting ? 0.9 : 0.62, 0.06);
    }
    mixCompanions();
  }
  // 伙伴只占背景层；主武器开火或命中时短暂让出声音空间，不更改攻击节奏。
  function mixCompanions() {
    const gain=context.currentTime-lastPrimary<.22?.14:.28;
    for(const v of voices)if(v.companion)smooth(v.gain.gain,gain*(v.source.loop?.8:1),.06);
  }
  // 同型号密集射击限频、全部瞬态至多二十个，猫叫有独立冷却避免反复受伤吵闹。
  function play(requested, source = 'primary') {
    const type = requested === 'shot' ? 'pistol' : requested === 'hurt' ? 'meow-hurt' : requested;
    // 在合成、缓存和混音前拦截，不创建静音循环，也不压低其他声音。
    if (MUTED_WEAPON_SOUNDS.has(type)) return false;
    if (!preferences.enabled || !unlocked || !context || disposed || !scene.visible ||
        preferences.effects === 0 || (!SOUND_PROFILES[type] && type !== 'chainsaw-contact')) return false;
    const combat = WEAPON_SOUNDS.has(type) || RELOAD_SOUNDS.has(type) ||
      ['explosion', 'thunder', 'armor-hit', 'chainsaw-contact','weapon-hit','fire-alert','fire-park'].includes(type);
    if (combat && !scene.active) return false;
    const companion=source==='companion',key=companion?`companion:${type}`:type;
    if (type === 'chainsaw-contact') {
      lastPlayed.set(key, context.currentTime);
      return true;
    }
    if (CONTINUOUS_WEAPONS.has(type)) {
      lastPlayed.set(key, context.currentTime);
      if(!companion)lastPrimary=context.currentTime;
      syncLoops();
      mixCompanions();
      return true;
    }
    const now = context.currentTime, cooldown = SOUND_PROFILES[type][5];
    if (now - (lastPlayed.get(key) ?? -Infinity) < cooldown) return false;
    // 跨枪型共享限频与三声并发，满编伙伴也不会按单位数量叠加噪音。
    if(companion&&(now-(lastPlayed.get('companion-any')??-Infinity)<.16||[...voices].filter(v=>v.companion&&!v.source.loop).length>=3))return false;
    if (type.startsWith('meow') && type !== 'meow-down' &&
        now - (lastPlayed.get('voice') ?? -Infinity) < 0.8) return false;
    if (type === 'meow-down') for (const v of voices) if (v.vocal) stopVoice(v);
    const transient = [...voices].filter(v => !v.source.loop);
    if (transient.length >= 20) {
      if(companion)return false;
      const background=transient.find(v=>v.companion);
      if (!background&&combat && !RELOAD_SOUNDS.has(type)&&!WEAPON_SOUNDS.has(type)&&type!=='weapon-hit') return false;
      // 换弹提示在密集交火中优先替换一声旧枪响，不突破总并发上限。
      stopVoice(background||transient.find(v => v.weapon) || transient[0]);
    }
    lastPlayed.set(key, now);
    if(companion)lastPlayed.set('companion-any',now);
    else if(WEAPON_SOUNDS.has(type)||type==='weapon-hit'){
      lastPrimary=now;mixCompanions();
      if(engine)smooth(engine.gain.gain,(.14+Math.max(0,Math.min(1,scene.moving))*.08)*.5,.04);
    }
    if (type.startsWith('meow')) lastPlayed.set('voice', now);
    if (!buffers.has(type)) buffers.set(type, renderSound(context, type));
    const v = voice(buffers.get(type), effectBus,false,companion?(now-lastPrimary<.22?.14:.28):1);
    v.companion=companion;
    v.combat = combat;
    v.weapon = WEAPON_SOUNDS.has(type);
    v.vocal = type.startsWith('meow');
    return true;
  }
  // 总开关关闭后立即终止所有声源，开关快速连点不会重建多个音频上下文。
  async function toggle() {
    if (disposed) return false;
    preferences.enabled = !preferences.enabled;
    options.onChange?.({ ...preferences });
    if (!preferences.enabled) {
      syncLoops();
      for (const v of voices) stopVoice(v);
      return false;
    }
    try { return await unlock(); }
    catch (error) {
      preferences.enabled = false;
      options.onChange?.({ ...preferences });
      throw error;
    }
  }
  // 音乐与效果独立调音，不改动游戏进度或音频开启状态。
  function setVolume(channel, value) {
    if (!['music', 'effects'].includes(channel) || !Number.isFinite(value)) return;
    preferences[channel] = Math.max(0, Math.min(1, value));
    if (context && !disposed) {
      smooth(channel === 'music' ? musicBus.gain : effectBus.gain, preferences[channel]);
      syncLoops();
    }
    options.onChange?.({ ...preferences });
  }
  // 销毁取消待合成音乐，停止循环、释放节点与设备，允许幂等调用。
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const v of voices) stopVoice(v);
    music = null; engine = null; engineIndex = -1;
    weaponLoops.clear();fireLoops.clear();
    buffers.clear(); musicBuffer = null;
    if (context) void context.close().catch(() => {});
  }
  return { toggle, unlock, play, setScene, setVolume, dispose,
    get enabled() { return preferences.enabled; },
    get preferences() { return { ...preferences }; },
    // 只读统计供性能日志与自动验收使用，不暴露声源控制能力。
    get diagnostics() { return { voices: voices.size, cached: buffers.size,
      music: !!music, vehicle: engineIndex, engineRate: engine?.source.playbackRate.value ?? 0, weapons: [...weaponLoops.keys()],fire: [...fireLoops.keys()],
      engineGain:engine?.gain.gain.value??0,companionVoices:[...voices].filter(v=>v.companion).length,
      unlocked, contextState: context?.state || 'locked' }; },
  };
}
