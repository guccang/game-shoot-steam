// 可启动和销毁的动画时钟；高刷屏限制运行频率，后台不执行场景工作。
export function createFrameLoop({ host, onFrame, maxFps = 60 }) {
  const interval = 1000 / maxFps;
  let running = false,
    frameId = null,
    lastTime = 0,
    nextTime = 0;
  // 每次执行都检查运行状态，销毁后不再安排后续帧。
  function frame(now) {
    if (!running) return;
    if (host.document?.hidden) {
      lastTime = now; nextTime = now + interval;
      frameId = host.requestAnimationFrame(frame);
      return;
    }
    // 留出时间戳舍入误差；跳过高刷多余回调时不吞掉模拟时间。
    if (now + 0.5 < nextTime) {
      frameId = host.requestAnimationFrame(frame);
      return;
    }
    const elapsed = Math.max(0, (now - lastTime) / 1000);
    const dt = Math.min(elapsed, 0.05);
    lastTime = now;
    // 维持刷新相位，卡顿后最多执行一次，不用补帧再次挤满处理器。
    nextTime += Math.max(1, Math.floor((now + 0.5 - nextTime) / interval) + 1) * interval;
    // 表现计时保留原上限，固定逻辑另收真实间隔，避免17FPS时模拟减速。
    onFrame(dt, now, elapsed);
    if (running) frameId = host.requestAnimationFrame(frame);
  }
  // 重复启动不会创建第二条循环。
  function start() {
    if (running) return;
    running = true;
    lastTime = host.performance.now();
    nextTime = lastTime + interval;
    frameId = host.requestAnimationFrame(frame);
  }
  // 暂停绘制并释放浏览器回调，重复销毁安全。
  function dispose() {
    running = false;
    if (frameId !== null) host.cancelAnimationFrame(frameId);
    frameId = null;
  }
  // visibilitychange 在浏览器停止 RAF 时也能及时丢弃后台间隔。
  function resetClock() {
    lastTime = host.performance.now(); nextTime = lastTime + interval;
  }
  return { start, dispose, resetClock };
}
