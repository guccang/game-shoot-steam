import { i18nText } from "../i18n/index.js";
// 有界性能记录器：只测量阶段耗时，不改动模拟时间、画质或战斗规则。
export const DIAGNOSTICS_VERSION = '2026-10-29-canvas-recovery-v9';
const FRAME_LIMIT = 600, EVENT_LIMIT = 100, SPIKE_LIMIT = 30;

// 统计平均及尾部值；仅在查看面板、汇总或导出时排序。
function statistics(values) {
  if (!values.length) return { mean: 0, p95: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return { mean: values.reduce((a, b) => a + b, 0) / values.length,
    p95: sorted[Math.floor(sorted.length * 0.95)], max: sorted[sorted.length - 1] };
}

// 阶段采用包含子阶段的计时，报告明确区分顶层总量与细分，避免重复相加。
export class PerformanceMonitor {
  constructor(now = () => performance.now()) {
    this.now = now;
    this.enabled = true;
    this.frames = [];
    this.combatFrames = [];
    this.spikes = [];
    this.events = [];
    this.milestones = [];
    this.active = new Map();
    this.current = null;
    this.lastFrameAt = null;
    this.previousCost = 0;
    this.totalFrames = 0;
    this.lastEnemies = 0;
    this.lastState = null;
    this.droppedFrames = 0;
  }

  // 以真实回调时间记录间隔，绝不使用受限的表现 dt 或固定逻辑步长代替。
  beginFrame(now, state) {
    if (!this.enabled) return;
    const arrival = this.now();
    const interval = this.lastFrameAt === null ? null : arrival - this.lastFrameAt;
    // RAF 时间戳可能早于同步初始化，另存调度时间，避免把旧时间戳误当回调到达时间。
    this.current = { at: arrival, scheduledAt: now, state, interval, outside: interval === null ? 0 :
      Math.max(0, interval - this.previousCost), sections: {}, start: arrival };
    this.lastFrameAt = arrival;
    this.active.clear();
  }

  // 阶段名固定，热循环中不创建包装闭包；关闭记录后只保留一次布尔检查。
  start(name) {
    if (this.enabled) this.active.set(name, this.now());
  }

  // 非帧阶段用于记录初始化及导出等耗时，不混入战斗帧统计。
  end(name) {
    if (!this.enabled || !this.active.has(name)) return;
    const duration = this.now() - this.active.get(name);
    this.active.delete(name);
    if (this.current) this.current.sections[name] = (this.current.sections[name] || 0) + duration;
    else this.event('timing', { name, ms: duration });
  }

  // 保存少量最慢帧，怪物初次出现的尖峰不会被后来的正常帧覆盖。
  finishFrame(context = {}) {
    if (!this.current) return;
    const frame = this.current, end = this.now();
    for (const [name, start] of this.active)
      frame.sections[name] = (frame.sections[name] || 0) + end - start;
    frame.unfinished = [...this.active.keys()];
    frame.total = end - frame.start;
    delete frame.start;
    Object.assign(frame, context);
    this.current = null;
    this.active.clear();
    this.previousCost = frame.total;
    this.totalFrames++;
    if (frame.interval > 50) this.droppedFrames++;
    this.frames.push(frame);
    if (this.frames.length > FRAME_LIMIT) this.frames.shift();
    // 查看设置可能持续很久，单独保留最后 120 个战斗帧，不被暂停绘制覆盖。
    if (frame.state === 'playing') {
      this.combatFrames.push(frame);
      if (this.combatFrames.length > 120) this.combatFrames.shift();
    }
    if (frame.total > 50 || frame.interval > 80) {
      this.spikes.push(frame);
      this.spikes.sort((a, b) => Math.max(b.total, b.interval || 0) - Math.max(a.total, a.interval || 0));
      if (this.spikes.length > SPIKE_LIMIT) this.spikes.length = SPIKE_LIMIT;
    }
    if (frame.enemies > 0 && this.lastEnemies === 0)
      this.event('first-enemy', { enemies: frame.enemies, frame });
    if (frame.state === 'playing' && this.lastState !== 'playing')
      this.event('combat-start', { enemies: frame.enemies, frame });
    else if (frame.state === 'playing' && frame.enemies > this.lastEnemies)
      this.event('enemy-count-increased', { before: this.lastEnemies, enemies: frame.enemies, frame });
    this.lastEnemies = frame.enemies || 0;
    this.lastState = frame.state;
  }

  // 异常和浏览器事件只保留有限条目，禁止逐帧打印到手机控制台。
  event(type, detail = {}) {
    if (!this.enabled) return;
    const event = { at: this.now(), type, ...detail };
    this.events.push(event);
    if (this.milestones.length < 40 &&
        (['first-enemy', 'combat-start', 'monster-atlas-build', 'frame-error', 'error', 'contextlost', 'contextrestored'].includes(type) ||
          (type === 'timing' && detail.name?.startsWith('init.'))))
      this.milestones.push(event);
    if (this.events.length > EVENT_LIMIT) this.events.shift();
  }

  // 后台切回和记录开关重置间隔基准，不把后台停留时间判成卡顿。
  resetClock() {
    this.lastFrameAt = null;
    this.previousCost = 0;
  }

  // 清除诊断日志只影响诊断数据，不操作游戏存档。
  clear() {
    this.frames.length = this.spikes.length = this.events.length = this.milestones.length = 0;
    this.combatFrames.length = 0;
    this.totalFrames = this.droppedFrames = this.lastEnemies = 0;
    this.lastState = null;
    this.resetClock();
  }

  // 默认分析最近战斗帧，设置页面的暂停画面不能掩盖之前的卡顿。
  summary() {
    const playing = this.combatFrames;
    const frames = (playing.length ? playing : this.frames).slice(-120);
    const keys = new Set(frames.flatMap(frame => Object.keys(frame.sections)));
    const sections = Object.fromEntries([...keys].map(key =>
      [key, statistics(frames.map(frame => frame.sections[key] || 0))]));
    const interval = statistics(frames.map(frame => frame.interval).filter(n => n > 0));
    const total = statistics(frames.map(frame => frame.total));
    const outside = statistics(frames.filter(frame => frame.interval > 50)
      .map(frame => frame.outside));
    const ranking = ['logic', 'render', 'ui', 'storage', 'environment']
      .map(name => ({ name, ms: sections[name]?.mean || 0 })).sort((a, b) => b.ms - a.ms);
    const main = ranking[0];
    let diagnosis = i18nText("platform.performance-monitor.2052c43501");
    if (frames.some(frame => frame.unfinished.length)) diagnosis = i18nText("platform.performance-monitor.dae62fa166");
    else if (interval.mean > 40 && outside.mean > Math.max(25, total.mean))
      diagnosis = i18nText("platform.performance-monitor.0c2336abf6");
    else if (total.mean > 16.7 || total.p95 > 33)
      diagnosis = i18nText("platform.performance-monitor.64107eec4d", { p0: ({ logic: i18nText("platform.performance-monitor.c735ed0901"), render: i18nText("platform.performance-monitor.e406d0343b"), ui: i18nText("platform.performance-monitor.785d65c70f"), storage: i18nText("platform.performance-monitor.c73a6774d9"), environment: i18nText("platform.performance-monitor.904dd029c7") }[main.name]) });
    // 偶发尖峰可能低于样本的 5%，不能因平均值和 P95 正常就报告没有慢帧。
    else if (total.max > 50) {
      const slowest = frames.reduce((a, b) => a.total > b.total ? a : b);
      const stage = Object.entries(slowest.sections).filter(([name]) => name.includes('.'))
        .sort((a, b) => b[1] - a[1])[0];
      diagnosis = i18nText("platform.performance-monitor.4746495db8", { p0: (stage?.[0] || i18nText("platform.performance-monitor.0cc3a8dcb6")), p1: (total.max.toFixed(1)) });
    } else if (interval.max > 50) diagnosis = i18nText("platform.performance-monitor.49261b0704");
    // 导出前恢复几秒就会覆盖120帧窗口；仍从有界尖峰记录突出最近一分钟的严重战斗停顿。
    const now = this.now();
    const stall = this.spikes.filter(frame => frame.state === 'playing' && now - frame.at <= 60000 &&
      now >= frame.at && Math.max(frame.interval || 0, frame.total) >= 250)
      .sort((a, b) => Math.max(b.interval || 0, b.total) - Math.max(a.interval || 0, a.total))[0];
    const recentStall = stall ? { at: stall.at, agoMs: now - stall.at, intervalMs: stall.interval,
      outsideMs: stall.outside, frameMs: stall.total } : null;
    if (recentStall) {
      const seconds = (Math.max(stall.interval || 0, stall.total) / 1000).toFixed(2);
      diagnosis = `近1分钟曾卡顿 ${seconds} 秒（回调外等待 ${stall.outside.toFixed(0)} ms，帧内 ${stall.total.toFixed(0)} ms）；当前窗口：${diagnosis}`;
    }
    const timed = frames.filter(frame => frame.interval > 0 && Number.isFinite(frame.logicSteps));
    const logicFps = timed.length ? timed.reduce((sum, frame) => sum + frame.logicSteps, 0) * 1000 /
      timed.reduce((sum, frame) => sum + frame.interval, 0) : null;
    return { frames: frames.length, state: playing.length ? 'playing' : frames.at(-1)?.state,
      logicFps, logicTargetHz: frames.at(-1)?.logicHz ?? null, renderTargetHz: frames.at(-1)?.renderTargetHz ?? null,
      fps: interval.mean ? 1000 / interval.mean : 0, interval, total, outside, sections, diagnosis, recentStall };
  }

  // 报告同时保留最慢帧和最近帧，方便分析首次出现与持续卡顿的区别。
  report() {
    return { version: DIAGNOSTICS_VERSION, totalFrames: this.totalFrames,
      droppedFrames: this.droppedFrames, enabled: this.enabled, summary: this.summary(),
      events: this.events, milestones: this.milestones,
      spikes: this.spikes, recentFrames: this.frames.slice(-120), combatFrames: this.combatFrames };
  }
}
