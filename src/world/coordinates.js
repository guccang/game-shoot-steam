// 循环世界的统一坐标：逻辑坐标可以无限延伸，地形取模，交互使用最近镜像。
// 原生活区与湖谷保留原坐标；森林宽高各扩大三倍，物件尺寸不变。
export const ORIGINAL_WORLD = Object.freeze({ width: 3600, height: 2800 });
export const WORLD = Object.freeze({ width: 10800, height: 8400 });
// 正模支持负方向越界，不在边界处钳制或丢失移动距离。
export function wrap(value, size) {
  return ((value % size) + size) % size;
}
// 将位移折算为环面上的最短距离。
export function delta(value, size) {
  return wrap(value + size / 2, size) - size / 2;
}
// 查找目标在参考点附近的镜像，碰撞保留原对象身份。
export function nearest(point, reference) {
  return {
    x: reference.x + delta(point.x - reference.x, WORLD.width),
    y: reference.y + delta(point.y - reference.y, WORLD.height),
  };
}
// 统一距离用于寻敌、资源吸附、怪物碰撞与跨边界采集。
export function worldDistance(a, b) {
  const p = nearest(a, b);
  return Math.hypot(p.x - b.x, p.y - b.y);
}
// 世界坐标映射回单张地形图。
export function canonical(p) {
  return { x: wrap(p.x, WORLD.width), y: wrap(p.y, WORLD.height) };
}
// 绘制代理只改变位置；攻击路线与子弹尾迹随同一镜像平移。
export function viewBody(body, reference) {
  const p = nearest(body, reference),
    dx = p.x - body.x,
    dy = p.y - body.y;
  const result = { ...body, ...p };
  if (body.assault)
    result.assault = {
      ...body.assault,
      originX: body.assault.originX + dx,
      originY: body.assault.originY + dy,
      endX: body.assault.endX + dx,
      endY: body.assault.endY + dy,
    };
  if (body.trail) result.trail = body.trail.map((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
  if (Number.isFinite(body.ex)) {
    result.ex = body.ex + dx;
    result.ey = body.ey + dy;
  }
  return result;
}

// 扩大视野后补画视口内的周期镜像，仅生成绘制代理，不复制逻辑实体或奖励。
export function visibleBodies(items, view, padding = 140) {
  const result = [],
    reference = { x: view.x + view.w / 2, y: view.y + view.h / 2 };
  for (const item of items) {
    // 先用坐标裁剪，再复制真正可见的实体；避免为全地图构造攻击状态和弹道代理。
    const base = nearest(item, reference);
    for (
      let tx = Math.ceil((view.x - padding - base.x) / WORLD.width);
      tx <= Math.floor((view.x + view.w + padding - base.x) / WORLD.width);
      tx++
    )
      for (
        let ty = Math.ceil((view.y - padding - base.y) / WORLD.height);
        ty <= Math.floor((view.y + view.h + padding - base.y) / WORLD.height);
        ty++
      )
        result.push(
          viewBody(item, { x: base.x + tx * WORLD.width, y: base.y + ty * WORLD.height }),
        );
  }
  return result;
}
