// 稀疏采样主场景 Canvas 的同步 API 调用；统计提交开销，不把它当作 GPU 完成时间。
const METHODS = ['clearRect', 'fillRect', 'strokeRect', 'drawImage', 'fillText', 'strokeText',
  'beginPath', 'closePath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'ellipse', 'rect', 'roundRect',
  'fill', 'stroke', 'clip', 'save', 'restore', 'translate', 'rotate', 'scale', 'transform', 'setTransform', 'resetTransform', 'setLineDash', 'measureText'];
export class CanvasCommandSampler {
  // 每个应用只保留有界采样列表，不挂接全局原型。
  constructor(now = () => performance.now()) { this.now = now; this.samples = []; this.restore = null; }
  // 每三百个正式帧采一帧，平时完全不包装 Canvas 方法；只保留十二帧报告。
  begin(c, frame, state, enabled) {
    if (!enabled || state !== 'playing' || frame % 300 || this.restore) return false;
    const commands = {}, originals = [], now = this.now;
    this.current = { frame, at: now(), commands, instrumented: true };
    // 先注册回滚，包装或绘制异常时同样恢复原属性描述符。
    this.restore = () => { for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(c, name, descriptor); else delete c[name]; } };
    try {
      for (const name of METHODS) {
        if (typeof c[name] !== 'function') continue;
        const method = c[name], descriptor = Object.getOwnPropertyDescriptor(c, name);
        const stat = commands[name] = { count: 0, totalMs: 0, maxMs: 0 };
        Object.defineProperty(c, name, { configurable: true, writable: true, value: function (...args) {
          const start = now();
          try { return Reflect.apply(method, this, args); }
          finally { const ms = now() - start; stat.count++; stat.totalMs += ms; stat.maxMs = Math.max(stat.maxMs, ms); }
        } });
        originals.push([name, descriptor]);
      }
    } catch { this.restore(); this.restore = null; this.current = null; return false; }
    return true;
  }
  // finally 中恢复主上下文，后续帧无计时包装；采样帧额外开销在报告中明确标记。
  end() {
    if (!this.restore) return;
    this.restore(); this.restore = null;
    this.samples.push(this.current); if (this.samples.length > 12) this.samples.shift(); this.current = null;
  }
  // 用户清空诊断时同步清空采样，不残留上一轮战斗数据。
  clear() { this.end(); this.samples.length = 0; }
  // 仅返回有效命令；离屏缓存生成、属性写入、浏览器栅格化与 GPU 时间不在此统计内。
  report() { return { scope: '主场景 Canvas 同步方法调用；含测量误差，不含离屏画布、属性赋值和 GPU 完成时间', everyFrames: 300, samples: this.samples.map(sample => ({ ...sample, commands: Object.fromEntries(Object.entries(sample.commands).filter(([, value]) => value.count)) })) }; }
}
