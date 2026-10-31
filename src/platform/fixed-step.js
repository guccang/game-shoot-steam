// 固定逻辑时钟：累积真实经过时间，渲染帧不等于模拟步；长卡顿只有限补算。
export function createFixedStep({ hz = 25, maxSteps = 2 } = {}) {
  const step = 1 / hz;
  let pending = 0, totalSteps = 0, droppedSeconds = 0;
  // 每次最多补两步；17FPS时仍能保持25Hz逻辑，长暂停不突进。
  function advance(elapsed, update) {
    const incoming = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
    pending += incoming;
    const due = Math.floor((pending + 1e-9) / step);
    const steps = Math.min(due, maxSteps);
    if (due > maxSteps) droppedSeconds += (due - maxSteps) * step;
    pending = Math.max(0, pending - due * step);
    for (let i = 0; i < steps; i++) { update(step); totalSteps++; }
    return { steps, alpha: pending / step, totalSteps, droppedSeconds, logicHz: hz };
  }
  // 首页、隐藏及恢复清除余量，不把后台时间带入下一场战斗。
  function reset() { pending = 0; }
  return { advance, reset, step, hz };
}
