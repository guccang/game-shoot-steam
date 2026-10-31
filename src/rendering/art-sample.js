// 营地到木桥的绘本美术样板范围；仅影响表现，不参与碰撞、生成和资源规则。
export const ART_SAMPLE = { x: 1050, y: 720, rx: 590, ry: 480 };

// 边缘缓和过渡，避免地面缓存块或区域交界出现矩形色带。
export function artSampleWeight(x, y) {
  const distance = Math.hypot((x - ART_SAMPLE.x) / ART_SAMPLE.rx, (y - ART_SAMPLE.y) / ART_SAMPLE.ry);
  const t = Math.max(0, Math.min(1, (1 - distance) / 0.28));
  return t * t * (3 - 2 * t);
}
