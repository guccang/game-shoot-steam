// 确定性时钟验证诊断口径、容量、异常与暂停；计时器不参与游戏规则。
import test from 'node:test';
import assert from 'node:assert/strict';
import { PerformanceMonitor } from '../src/platform/performance-monitor.js';

// 模拟真实回调时间和内嵌阶段，避免用墙钟断言引入测试抖动。
function fixture() {
  let time = 0;
  const monitor = new PerformanceMonitor(() => time);
  return { monitor,
    frame(at, logic, render, state = 'playing', enemies = 3) {
      time = at; monitor.beginFrame(at, state);
      monitor.start('logic'); time += logic; monitor.end('logic');
      monitor.start('render'); time += render; monitor.end('render');
      monitor.finishFrame({ enemies });
    },
    advance(ms) { time += ms; },
  };
}

test('记录真实帧间隔，回调外等待扣除上一帧而非当前帧耗时', () => {
  const f = fixture();
  f.frame(0, 8, 12); f.frame(120, 3, 4);
  assert.equal(f.monitor.frames[1].interval, 120);
  assert.equal(f.monitor.frames[1].outside, 100);
  assert.equal(f.monitor.frames[1].total, 7);
});

test('初始化积压的 RAF 时间戳不污染实际回调间隔', () => {
  const f = fixture(), m = f.monitor;
  f.advance(3000); m.beginFrame(20, 'ready'); m.finishFrame();
  f.advance(17); m.beginFrame(3010, 'ready'); m.finishFrame();
  assert.equal(m.frames[0].at, 3000);
  assert.equal(m.frames[0].scheduledAt, 20);
  assert.equal(m.frames[1].interval, 17);
});

test('预览怪物与首次进入战斗分别保留，战斗中数量增加另行记录', () => {
  const f = fixture(), m = f.monitor;
  f.frame(0, 0, 1, 'ready', 5);
  f.frame(20, 2, 1, 'playing', 5);
  f.frame(40, 2, 1, 'playing', 6);
  assert.equal(m.milestones.find(e => e.type === 'first-enemy').frame.state, 'ready');
  assert.equal(m.milestones.find(e => e.type === 'combat-start').frame.state, 'playing');
  assert.equal(m.events.find(e => e.type === 'enemy-count-increased').before, 5);
});

test('区分逻辑、渲染提交和回调外等待，不把浏览器等待认定为 GPU 测量', () => {
  for (const [logic, render, interval, expected] of [
    [38, 3, 45, '逻辑'], [3, 45, 50, '渲染提交'], [2, 3, 120, '非 GPU 实测'],
  ]) {
    const f = fixture();
    for (let i = 0; i < 20; i++) f.frame(i * interval, logic, render);
    assert.ok(f.monitor.summary().diagnosis.includes(expected));
  }
  const f = fixture();
  for (let i = 0; i < 20; i++) f.frame(i * 16.7, 2, 3);
  assert.equal(f.monitor.summary().diagnosis, '暂无明显慢帧');
});

test('设置页暂停帧不掩盖战斗卡顿，后台返回重置间隔', () => {
  const f = fixture();
  f.frame(0, 40, 4); f.frame(50, 0, 1, 'paused');
  assert.equal(f.monitor.summary().sections.logic.mean, 40);
  f.monitor.resetClock(); f.frame(50000, 3, 4);
  assert.equal(f.monitor.frames.at(-1).interval, null);
});

test('长时间停留设置页仍保留最后战斗耗时', () => {
  const f = fixture(), m = f.monitor;
  f.frame(0, 40, 4);
  for (let i = 0; i < 1500; i++) f.frame(50 + i * 16, 0, 1, 'paused');
  assert.equal(m.summary().sections.logic.mean, 40);
  assert.equal(m.report().combatFrames.length, 1);
  assert.equal(m.frames.length, 600);
});

test('前台数秒冻结不能被当作后台间隔而过滤', () => {
  const f = fixture(), m = f.monitor;
  f.frame(0, 2, 3); f.frame(5000, 2, 3);
  assert.equal(m.summary().interval.max, 5000);
  assert.equal(m.spikes.at(-1).interval, 5000);
  assert.match(m.summary().diagnosis, /回调外等待/);
});

test('内嵌阶段保持包含口径，异常未结束阶段仍可导出', () => {
  const f = fixture(), m = f.monitor;
  m.beginFrame(0, 'playing'); m.start('logic'); f.advance(2);
  m.start('logic.spawn'); f.advance(6); m.end('logic.spawn');
  f.advance(3); m.finishFrame({ enemies: 1 });
  assert.equal(m.frames[0].sections.logic, 11);
  assert.equal(m.frames[0].sections['logic.spawn'], 6);
  assert.deepEqual(m.frames[0].unfinished, ['logic']);
  assert.match(m.summary().diagnosis, /异常/);
});

test('长时间记录有界，首次怪物和最慢帧不被正常帧冲掉', () => {
  const f = fixture(), m = f.monitor;
  f.frame(0, 10, 400);
  for (let i = 1; i < 1500; i++) { f.frame(500 + i * 16, 2, 3); m.event('longtask', { ms: 51 }); }
  assert.equal(m.frames.length, 600);
  assert.equal(m.events.length, 100);
  assert.ok(m.spikes.length <= 30);
  assert.ok(m.spikes.some(frame => frame.total === 410));
  assert.ok(m.report().milestones.some(event => event.type === 'first-enemy' && event.frame.total === 410));
});

test('关闭记录不创建新日志，清除诊断不触碰外部游戏状态', () => {
  const f = fixture(), m = f.monitor;
  f.frame(0, 1, 2); m.enabled = false; f.frame(20, 1, 2); m.event('error');
  assert.equal(m.totalFrames, 1);
  m.clear();
  assert.equal(m.report().recentFrames.length, 0);
  assert.equal(m.report().milestones.length, 0);
  assert.equal(m.summary().fps, 0);
});

// 一次尖峰在 120 帧中占比不足 5%，平均值与 P95 不应掩盖它。
test('偶发武器长帧即使平均和 P95 正常也必须报告', () => {
  const f = fixture(), m = f.monitor;
  for (let i = 0; i < 119; i++) f.frame(i * 17, 2, 3);
  f.advance(17); m.beginFrame(2040, 'playing'); m.start('logic.weapons');
  f.advance(62); m.end('logic.weapons'); m.finishFrame({ enemies: 0 });
  assert.ok(m.summary().total.p95 < 16.7);
  assert.match(m.summary().diagnosis, /偶发帧内卡顿.*logic.weapons/);
});

// 偶发浏览器等待与帧内工作分别描述，不把外部任务归因于移动或 GPU。
test('少量回调外长间隔也不能显示暂无明显慢帧', () => {
  const f = fixture();
  for (let i = 0; i < 119; i++) f.frame(i * 17, 2, 3);
  f.frame(2200, 2, 3);
  assert.match(f.monitor.summary().diagnosis, /偶发回调间隔/);
});

// 复现实测日志：4.165秒回调间隔后恢复60帧，玩家打开设置导出时仍能看到尖峰。
test('恢复正常超过120帧后仍突出近一分钟的兽潮停顿，同时保留当前帧率', () => {
  const f = fixture(), m = f.monitor;
  f.frame(0, 8, 13); f.frame(4165, 5, 19);
  for (let i = 1; i <= 240; i++) f.frame(4200 + i * 17, 2, 3);
  for (let i = 1; i <= 60; i++) f.frame(8300 + i * 17, 0, 3, 'paused');
  const summary = m.summary();
  assert.ok(summary.fps > 58); assert.ok(summary.interval.max < 20);
  assert.equal(summary.recentStall.intervalMs, 4165);
  assert.equal(summary.recentStall.outsideMs, 4144);
  assert.equal(summary.recentStall.frameMs, 24);
  assert.match(summary.diagnosis, /近1分钟曾卡顿 4\.17 秒/);
  assert.deepEqual(m.report().summary.recentStall, summary.recentStall);
  f.advance(60001); assert.equal(m.summary().recentStall, null);
  assert.equal(m.summary().diagnosis, '暂无明显慢帧');
});

// 后台重置、启动和设置本身的延迟不冒充近期战斗卡顿，清空日志同步清除提示。
test('严重卡顿摘要排除非战斗帧、后台间隔并随清空日志消失', () => {
  const f = fixture(), m = f.monitor;
  f.frame(0, 0, 2, 'ready'); f.frame(4000, 0, 3, 'ready');
  m.resetClock(); f.frame(30000, 2, 3);
  assert.equal(m.summary().recentStall, null);
  f.frame(35000, 2, 3); assert.ok(m.summary().recentStall);
  m.clear(); assert.equal(m.summary().recentStall, null);
});
