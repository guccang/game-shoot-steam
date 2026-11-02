// 表现快照只覆盖动态分支；静态地图、装备配置、生命与存档继续读取权威对象。
import { delta, WORLD } from '../world/coordinates.js';
import {bindGameSource} from '../core/game-source.js';

const ROOTS = ['player', 'vehicle', 'enemies', 'boss', 'enemyBolts', 'hazards', 'projectiles',
  'shots', 'particles', 'numbers', 'drops', 'remnants', 'fx', 'realm', 'funnel', 'drone',
  'mechanical', 'spider', 'magazines', 'arrivalScene', 'farmWork', 'livingActors', 'campActors', 'story', 'fireRescue'];
const CHILDREN = ['motion', 'bodyAnimation', 'recoil', 'assault', 'trail', 'nodes', 'mother', 'gun',
  'module', 'companions', 'items', 'rivals', 'defenses', 'runtime', 'player', 'vehicle',
  'mechanical', 'spider', 'funnel', 'drone', 'elder', 'bus', 'scooter', 'actors', 'goddess', 'magazine', 'flight', 'stream', 'job'];
// 悬停居民的离地高度与水平位置一起插值，头顶气泡不沿25Hz台阶升降。
const VALUES = ['x', 'y', 'z', 'elevation', 'angle', 'heading', 'time', 'clock', 'previewTime', 'idleTime', 'moveTime',
  'moveWeight', 'walkPhase', 'wheelPhase', 'rotor', 'age', 'life', 'reactionTime', 'kick', 'rise',
  'farmPoseTime', 'flash', 'swing', 'wingPhase', 'tankAge'];
const ANGLES = new Set(['angle', 'heading', 'rotor']);
const RESET_CLOCKS = new Set(['age', 'time', 'idleTime', 'moveTime', 'reactionTime']);
const QUERIES = ['weapon', 'findAttackTarget', 'findAttackLane'];

// 一份历史对应一个权威对象；弱引用缓存不会保留已回收的弹丸、怪物与动作轨道。
export function createRenderInterpolation() {
  let history = new WeakMap(), mirrors = new WeakMap(), scene = null;
  const bindings = new WeakMap();
  // 状态切换和地图/会话替换必须直接显示新场景，不能跨场景拖影。
  function sceneKey(game) { return [game.state, game.mapId, game.realm, game.cottage, game.story, game.player]; }
  // 捕获连续字段，不复制静态树林或递归进入配置、存档和目标引用。
  function beforeStep(game) {
    history = new WeakMap(); scene = sceneKey(game);
    const seen = new WeakSet();
    // 只遍历显式列出的表现分支，并跳过共享引用形成的环。
    function visit(value, root = false) {
      if (!value || typeof value !== 'object' || seen.has(value)) return;
      seen.add(value);
      if (Array.isArray(value) || value instanceof Map) {
        for (const item of value.values()) visit(item);
        return;
      }
      const previous = {};
      for (const key of VALUES) if (Number.isFinite(value[key])) previous[key] = value[key];
      history.set(value, previous);
      for (const key of root ? ROOTS : CHILDREN) visit(value[key]);
    }
    visit(game, true);
  }
  // 清理插值历史，表现对象身份仍保留，猫身体姿态匹配不会在暂停后重建轨道。
  function reset() { history = new WeakMap(); scene = null; }
  // 同一身体动画始终使用同一表现对象；每帧只更新有界动态分支。
  function sample(game, alpha) {
    const key = sceneKey(game), continuous = scene && key.every((value, i) => value === scene[i]);
    const amount = continuous ? Math.max(0, Math.min(1, alpha)) : 1;
    const seen = new WeakMap();
    // 复用对象身份，数组只投影当前成员，不复活已销毁实体。
    function project(value, root = false) {
      if (!value || typeof value !== 'object') return value;
      if (seen.has(value)) return seen.get(value);
      if (Array.isArray(value)) {
        let array = mirrors.get(value);
        if (!array) { array = []; mirrors.set(value, array); }
        seen.set(value, array); array.length = value.length;
        for (let i = 0; i < value.length; i++) array[i] = project(value[i]);
        return array;
      }
      if (value instanceof Map) {
        let map = mirrors.get(value);
        if (!map) { map = new Map(); mirrors.set(value, map); }
        seen.set(value, map); map.clear();
        for (const [id, item] of value) map.set(id, project(item));
        return map;
      }
      let view = mirrors.get(value);
      if (!view) { view = Object.create(root ? value : Object.getPrototypeOf(value)); mirrors.set(value, view); }
      seen.set(value, view);
      if (!root) {
        for (const key of Object.keys(view)) if (!Object.hasOwn(value, key)) delete view[key];
        Object.assign(view, value);
      }
      const previous = history.get(value);
      // 大位移是传送而非运动；使用环面最短位移处理跨地图接缝。
      const dx = previous && Number.isFinite(value.x) ? delta(value.x - previous.x, WORLD.width) : 0;
      const dy = previous && Number.isFinite(value.y) ? delta(value.y - previous.y, WORLD.height) : 0;
      const blend = previous && Math.hypot(dx || 0, dy || 0) <= 120 ? amount : 1;
      // 普通对象已复制当前字段，仅历史中存在的数值需要插值；新字段保持当前值。
      // 根对象依赖原型读取，仍完整覆盖数值以免保留上一帧的自有属性。
      for (const field of !root && previous ? Object.keys(previous) : VALUES) {
        const current = value[field], old = previous?.[field];
        if (!Number.isFinite(current)) continue;
        if (!Number.isFinite(old) || blend === 1) { view[field] = current; continue; }
        const change = field === 'x' ? dx : field === 'y' ? dy : ANGLES.has(field) ? delta(current - old, Math.PI * 2) : current - old;
        // 年龄、寿命重置属于新事件，不从旧状态反向播放。
        const resetClock = RESET_CLOCKS.has(field) && current < old;
        view[field] = resetClock ? current : current - change * (1 - blend);
      }
      for (const child of root ? ROOTS : CHILDREN) {
        if (value[child] !== undefined) view[child] = project(value[child]);
        else if (root) delete view[child];
      }
      return view;
    }
    const view = project(game, true);
    bindGameSource(view,game);
    // 条件解释器只读取自有字段；显式共享最新存档，让地面导航与任务栏使用同一进度。
    // 每帧更新引用以覆盖保存后的整份替换，不复制或插值任务完成条件。
    view.progress = game.progress;
    // 命中/寻敌等查询仍以权威对象为键，避免破坏感知 WeakMap 与锁定目标身份。
    // 查询绑定只在方法身份改变时重建，不为每个中间帧分配三个新函数。
    let queries = bindings.get(game);
    if (!queries) { queries = {}; bindings.set(game, queries); }
    for (const name of QUERIES) {
      if (typeof game[name] === 'function') {
        if (queries[name]?.method !== game[name]) queries[name] = { method: game[name], bound: game[name].bind(game) };
        view[name] = queries[name].bound;
      } else { delete queries[name]; delete view[name]; }
    }
    return view;
  }
  return { beforeStep, sample, reset };
}
