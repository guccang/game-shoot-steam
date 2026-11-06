// 存档适配器只依赖 Storage 接口，支持浏览器存储或测试中的内存实现。
import { freshProgress, validateProgress } from '../progression/progress.js';
import { normalizeEnvironment } from '../world/environment.js';
import { normalizeAudioPreferences } from './audio.js';
import { normalizeChronicle } from '../world/play-chronicle.js';
export const STORAGE_KEYS = {
  progress: 'forest-patrol-v1',
  worldRevision: 'forest-patrol-world-revision',
  environment: 'forest-patrol-environment-v1',
  audio: 'forest-patrol-audio-v1',
  gameplay: 'forest-patrol-gameplay-v1',
  chronicle: 'forest-patrol-chronicle-v1',
};
// 本轮按用户要求使用全新节奏存档，不迁移旧进度；同版本刷新正常恢复。
export const WORLD_SAVE_REVISION = 'forest-exploration-pacing-2026-11';
// 延迟获取存储，读取 localStorage 属性本身被浏览器拒绝时也能安全回退。
export function createSaveStore(getStorage = () => globalThis.localStorage) {
  let available = true, worldReady = false;
  let diagnostic=()=>{};
  // 只报告保存结果和键名，不向日志传递存档内容；观察器异常不能改变保存结果。
  function notify(operation,key,ok,error){try{diagnostic({operation,key,ok,error:error?String(error.name||error):null});}catch{/* 诊断与保存事务隔离。 */}}
  // 只重置成长与旧巡游回放，保留音量、显示、操作偏好；失败时不读取旧档。
  function prepareWorldSave() {
    if(worldReady)return true;
    try {
      const storage=getStorage();
      if(storage.getItem(STORAGE_KEYS.worldRevision)!==WORLD_SAVE_REVISION){
        storage.removeItem(STORAGE_KEYS.progress);
        storage.removeItem(STORAGE_KEYS.chronicle);
        storage.setItem(STORAGE_KEYS.worldRevision,WORLD_SAVE_REVISION);
      }
      worldReady=true;return true;
    } catch(error) {available=false;notify('prepare',STORAGE_KEYS.progress,false,error);return false;}
  }
  // 解析失败不污染游戏数据，调用方仍会经过白名单校验。
  function read(key) {
    try {
      return JSON.parse(getStorage().getItem(key));
    } catch {
      available = false;
      return null;
    }
  }
  // 写入返回明确结果，清空进度必须先写入成功再修改内存。
  function write(key, value) {
    try {
      getStorage().setItem(key, JSON.stringify(value));
      available = true;
      notify('write',key,true);
      return true;
    } catch(error) {
      available = false;
      notify('write',key,false,error);
      return false;
    }
  }
  // 永久成长的迁移规则只由 progression 模块负责。
  // 完成版本重置后只读检查，保留当前版本的损坏原文并区分缺档与拒绝访问。
  function inspectProgress() {
    if(!prepareWorldSave())return {status:'unavailable',progress:null};
    let text;
    try { text = getStorage().getItem(STORAGE_KEYS.progress); }
    catch { available = false; return { status: 'unavailable', progress: null }; }
    if (text === null) return { status: 'missing', progress: null };
    try {
      const raw = JSON.parse(text);
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== 1 ||
          !['coins', 'wood', 'heroes', 'weapons', 'patrol', 'story', 'realms'].some(key => Object.hasOwn(raw, key)))
        return { status: 'corrupt', progress: null };
      return { status: 'valid', progress: validateProgress(raw) };
    } catch { return { status: 'corrupt', progress: null }; }
  }
  // 先完成本版本清档，再恢复经过白名单校验的新进度。
  function loadProgress() {
    return inspectProgress().progress ?? freshProgress();
  }
  // 环境与成长使用不同键；本函数只恢复设置，入场随机由应用统一执行一次。
  function loadEnvironment() {
    const raw = read(STORAGE_KEYS.environment),
      state = {};
    if (raw && typeof raw === 'object')
      for (const key of [
        'time',
        'weather',
        'forestSeason',
        'seasonAt',
        'autoTime',
        'autoWeather',
        'randomGusts',
        'dayCycleAt',
        'weatherAt',
        'cycleVersion',
        'timings',
      ])
        state[key] = raw[key];
    normalizeEnvironment(state);
    return state;
  }
  // 版本重置完成后正常保存，新版本不会因再次刷新而丢失进度。
  function saveProgress(progress) {
    return prepareWorldSave() && write(STORAGE_KEYS.progress, progress);
  }
  // 环境时钟单独保存，避免覆盖成长进度。
  function saveEnvironment(environment) {
    return write(STORAGE_KEYS.environment, environment);
  }
  // 未设置或非法值默认不自动暂停，保留玩家明确开启的选择。
  function loadGameplay() {
    const saved=read(STORAGE_KEYS.gameplay);
    return { targetWood: saved?.targetWood !== false, pauseOnBlur: saved?.pauseOnBlur === true, showFps: saved?.showFps === true };
  }
  // 操作偏好独立于成长存档，清空游戏进度时仍保留玩家选择。
  function saveGameplay(preferences) {
    return write(STORAGE_KEYS.gameplay, { targetWood: preferences.targetWood !== false, pauseOnBlur: preferences.pauseOnBlur === true, showFps: preferences.showFps === true });
  }
  return {
    // 应用初始化后绑定日志，避免存储模块依赖页面或诊断实现。
    setDiagnostics(listener){diagnostic=typeof listener==='function'?listener:()=>{};},
    inspectProgress,
    loadChronicle: () => normalizeChronicle(prepareWorldSave() ? read(STORAGE_KEYS.chronicle) : null),
    saveChronicle: record => prepareWorldSave() && write(STORAGE_KEYS.chronicle, normalizeChronicle(record)),
    loadGameplay,
    saveGameplay,
    // 声音偏好独立保存，不随重开删除，也不覆盖旧成长存档。
    loadAudio: () => normalizeAudioPreferences(read(STORAGE_KEYS.audio)),
    saveAudio: preferences => write(STORAGE_KEYS.audio, normalizeAudioPreferences(preferences)),
    loadProgress,
    loadEnvironment,
    saveProgress,
    saveEnvironment,
    get available() {
      return available;
    },
  };
}
