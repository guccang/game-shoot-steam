// 同一同步帧内复用场景容器几何，避免每个移动命中区写样式后再次强制布局。
const frames = new WeakMap();

// 应用在帧入口开启缓存，容器与画布首次被查询时才读取真实矩形。
export function beginSceneLayout(renderer) { frames.set(renderer, new Map()); }

// 仅缓存不随世界热点移动的容器；帧外交互始终重新读取，兼容缩放和弹窗切换。
export function sceneLayout(renderer, frame) {
  const cache = frames.get(renderer);
  if (cache?.has(frame)) return cache.get(frame);
  const geometry = { frame: frame.getBoundingClientRect(), canvas: renderer.canvas.getBoundingClientRect() };
  cache?.set(frame, geometry);
  return geometry;
}

// 正常帧和异常帧都释放快照，下一帧会重新测量滚动、旋转和安全区变化。
export function endSceneLayout(renderer) { frames.delete(renderer); }
