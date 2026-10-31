import { i18nText } from "../i18n/index.js";
// 浏览器诊断适配：本机保留日志、低频面板、异常与上下文事件，不向网络上传。
import { PerformanceMonitor, DIAGNOSTICS_VERSION } from '../platform/performance-monitor.js';
import { createEventScope } from '../platform/events.js';
import {createGameplayDiagnostics} from './gameplay-diagnostics.js';
const REPORT_KEY = 'forest-patrol-performance-report-v1';

// 在初始化游戏之前安装观察器，捕捉首次图集生成和初始化失败。
export function createDiagnostics({ root, host, getStorage }) {
  const gameplay=createGameplayDiagnostics({root,host,getStorage});
  const monitor = new PerformanceMonitor(() => host.performance.now()), scope = createEventScope();
  const $ = id => root.getElementById(id);
  let game, renderer, previousReport = null, latestText = '', ticks = 0;
  const observers = [], canvases = new Map();
  const counters = { resize: 0, contextLost: 0, longTasks: 0, longTaskMs: 0, uiCanvasCreated: 0 };
  const capabilities = { longtask: false, longAnimationFrame: false };
  const show = new URLSearchParams(host.location.search).get('perf') === '1';
  $('performance-overlay-toggle').checked = show;
  $('performance-hud').hidden = !show;
  try { previousReport = JSON.parse(getStorage().getItem(REPORT_KEY)); } catch { /* 存储受限时仍可内存记录。 */ }
  $('performance-previous').disabled = !previousReport;

  // 设备字段仅用于诊断，地址不含搜索参数、凭据或游戏存档。
  function device() {
    return { userAgent: host.navigator.userAgent, dpr: host.devicePixelRatio,
      viewport: [host.innerWidth, host.innerHeight], cores: host.navigator.hardwareConcurrency,
      memoryGiB: host.navigator.deviceMemory, secureContext: host.isSecureContext,
      visibility: root.visibilityState, focused: root.hasFocus(), jsHeap: host.performance.memory ? {
        used: host.performance.memory.usedJSHeapSize, limit: host.performance.memory.jsHeapSizeLimit,
      } : null };
  }

  // 只遍历页面 Canvas；不创建额外 WebGL 上下文，避免诊断本身增加显存压力。
  function watchCanvases() {
    for (const [canvas, listener] of canvases) {
      if (canvas.isConnected) continue;
      canvas.removeEventListener('contextlost', listener);
      canvas.removeEventListener('contextrestored', listener);
      canvases.delete(canvas);
    }
    root.querySelectorAll('canvas').forEach(canvas => {
      if (canvases.has(canvas)) return;
      counters.uiCanvasCreated++;
      const listener = event => {
        if (event.type === 'contextlost') counters.contextLost++;
        monitor.event(event.type, { canvas: canvas.id || canvas.className, width: canvas.width,
          height: canvas.height, trusted: event.isTrusted });
        if (event.type === 'contextlost' && counters.contextLost === 1) persist();
      };
      canvases.set(canvas, listener);
      for (const type of ['contextlost', 'contextrestored']) canvas.addEventListener(type, listener);
    });
  }

  // 独立刷新计时器可在主动画回调异常中断后继续显示停滞和最后阶段。
  function render() {
    const summary = monitor.summary();
    const age = monitor.lastFrameAt === null ? null : host.performance.now() - monitor.lastFrameAt;
    const stale = !root.hidden && monitor.enabled && age > 2000;
    const ms = name => (summary.sections[name]?.mean || 0).toFixed(1);
    const message = i18nText("app.diagnostics.summary", { p0: summary.fps.toFixed(0), p1: ms('logic'), p2: ms('render'), p3: ms('ui'), p4: summary.interval.p95.toFixed(0), p5: stale ? i18nText("app.diagnostics.b15609418e") : summary.diagnosis });
    $('performance-summary').textContent = monitor.enabled ? message : i18nText("app.diagnostics.e60672a0fd");
    $('performance-hud').textContent = monitor.enabled ? message : i18nText("app.diagnostics.09ddd916ce");
    $('performance-version').textContent = DIAGNOSTICS_VERSION;
    watchCanvases();
  }

  // 报告采用快照，后续战斗不会改变用户正在复制的文本。
  function report() {
    return { ...monitor.report(), createdAt: new Date().toISOString(), device: device(),
      capabilities, counters: { ...counters }, domCanvas: [...canvases.keys()].map(canvas => ({
        name: canvas.id || canvas.className, size: [canvas.width, canvas.height],
      })), scene: game ? {
        state: game.state, wave: game.wave, weapon: game.weapon().id,
        enemies: game.enemies.length, trees: game.trees.length, fx: game.fx.items.length,
      } : null, rendering: renderer?.diagnosticInfo?.() || null };
  }

  // 自动留档只保留事件与最慢帧，每 15 秒一次；常规帧不逐条写入 localStorage。
  function persist() {
    if (!monitor.enabled) return;
    const start = host.performance.now();
    try {
      const snapshot = report();
      snapshot.recentFrames = [];
      snapshot.combatFrames = [];
      getStorage().setItem(REPORT_KEY, JSON.stringify(snapshot));
    } catch { /* 无痕或配额不足不影响游戏，也不递归写错误日志。 */ }
    monitor.event('diagnostic-save', { ms: host.performance.now() - start });
  }

  // 下载在普通 HTTP 下也可用；复制失败时提供可长按选择的完整文本。
  function showReport(value = report()) {
    latestText = JSON.stringify(value, null, 2);
    $('performance-report-text').value = latestText;
    $('performance-report-details').open = true;
    return latestText;
  }

  scope.on($('performance-record-toggle'), 'change', event => {
    monitor.enabled = event.target.checked;
    monitor.resetClock(); render();
  });
  scope.on($('performance-overlay-toggle'), 'change', event => {
    $('performance-hud').hidden = !event.target.checked; render();
  });
  scope.on($('performance-report'), 'click', () => { showReport(); persist(); });
  scope.on($('performance-previous'), 'click', () => showReport(previousReport));
  scope.on($('performance-copy'), 'click', async () => {
    const text = latestText || showReport();
    try {
      if (!host.navigator.clipboard?.writeText) throw Error(i18nText("app.diagnostics.9e33563bfd"));
      await host.navigator.clipboard.writeText(text);
      $('performance-feedback').textContent = i18nText("app.diagnostics.ec8b631448");
    } catch {
      $('performance-report-details').open = true;
      $('performance-report-text').focus(); $('performance-report-text').select();
      $('performance-feedback').textContent = i18nText("app.diagnostics.edfc645931");
    }
  });
  scope.on($('performance-download'), 'click', () => {
    const text = latestText || showReport();
    const url = host.URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = root.createElement('a');
    link.href = url; link.download = 'forest-performance.json'; link.click();
    host.setTimeout(() => host.URL.revokeObjectURL(url), 1000);
    $('performance-feedback').textContent = i18nText("app.diagnostics.2e5864eaf6");
  });
  scope.on($('performance-clear'), 'click', () => {
    monitor.clear(); renderer?.commands.clear(); latestText = ''; $('performance-report-text').value = '';
    previousReport = null; $('performance-previous').disabled = true;
    try { getStorage().removeItem(REPORT_KEY); } catch { /* 不影响游戏数据。 */ }
    render();
  });
  scope.on(host, 'error', event => {
    monitor.event('error', { message: String(event.message || i18nText("app.diagnostics.575336340b")).slice(0, 500),
      stack: String(event.error?.stack || '').slice(0, 2000), phase: [...monitor.active.keys()] });
    persist();
  });
  scope.on(host, 'unhandledrejection', event => {
    monitor.event('rejection', { message: String(event.reason?.stack || event.reason).slice(0, 2000) });
    persist();
  });
  scope.on(root, 'visibilitychange', () => {
    monitor.event('visibility', { hidden: root.hidden });
    monitor.resetClock(); if (root.hidden) persist();
  });
  // 区分前台卡顿和窗口焦点切换；只记焦点事件，不推断 GPU 或温度原因。
  scope.on(host, 'blur', () => monitor.event('focus', { focused: false }));
  scope.on(host, 'focus', () => monitor.event('focus', { focused: true }));
  scope.on(host, 'pagehide', persist);
  // 长任务和长动画帧是浏览器补充证据；不支持时显式记录能力缺失。
  for (const type of ['longtask', 'long-animation-frame']) {
    if (!host.PerformanceObserver?.supportedEntryTypes?.includes(type)) continue;
    try {
      const observer = new host.PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (type === 'longtask') { counters.longTasks++; counters.longTaskMs += entry.duration; }
          monitor.event(type, { start: entry.startTime, ms: entry.duration,
            blocking: entry.blockingDuration, renderStart: entry.renderStart,
            styleAndLayoutStart: entry.styleAndLayoutStart,
            scripts: entry.scripts?.slice(0, 5).map(script => ({ duration: script.duration,
              function: script.sourceFunctionName, source: script.sourceURL?.split('/').pop() })) });
        }
      });
      observer.observe({ type, buffered: true }); observers.push(observer);
      capabilities[type === 'longtask' ? 'longtask' : 'longAnimationFrame'] = true;
    } catch { /* 旧浏览器仍支持阶段计时和错误记录。 */ }
  }
  const timer = host.setInterval(() => {
    if (root.hidden) return;
    render();
    if (++ticks % 15 === 0) persist();
  }, 1000);
  render();
  return {
    monitor, report, gameplay,
    // 绑定实例后即可读取场景上下文，初始化异常时也能导出之前的错误。
    attach(value) { game = value.game; renderer = value.renderer; gameplay.attach(game); },
    // 区分真正的尺寸变化与无效重复 resize，便于检查手机地址栏导致的重置。
    resize(before, after) {
      counters.resize++;
      monitor.event('resize', { before, after });
    },
    // 释放观察器和监听，避免重复挂载导致诊断本身积累开销。
    dispose() {
      gameplay.dispose();
      persist(); host.clearInterval(timer); scope.dispose();
      observers.forEach(observer => observer.disconnect());
      for (const [canvas, listener] of canvases)
        for (const type of ['contextlost', 'contextrestored']) canvas.removeEventListener(type, listener);
      canvases.clear();
    },
  };
}
