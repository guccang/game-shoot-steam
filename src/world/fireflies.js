// 萤火虫环境模拟：随机散点各自独立漂浮，不参与战斗或消耗战斗随机数。
import { WORLD, wrap } from './coordinates.js';
import { LANDSCAPES } from './landscape-compositions.js';
export const SOLITARY_FIREFLIES = 72;
const STEP = 1 / 60;

// 独立种子让随机落点可重现，读取或移动镜头不会重新生成散点。
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// 跟随既有昼夜权重柔和出现，雨天减少亮度，白天完全隐藏。
export function fireflyOpacity(light) {
  return (
    Math.max(0, Math.min(1, light.night * 0.9 + light.dusk * 0.25)) *
    (1 - Math.max(0, Math.min(1, light.rain)) * 0.6)
  );
}

export class FireflyField {
  // 固定数量的散点覆盖循环地图，每只萤火虫独立更新。
  constructor(seed = 7319) {
    this.seed = seed;
    this.reset();
  }

  // 重开时恢复环境初态，不把瞬态萤火虫写入成长存档。
  reset() {
    const random = seededRandom(this.seed);
    this.time = 0;
    this.lastTime = null;
    this.accumulator = 0;
    this.points = [];
    // 总数量维持手机预算，将一部分散点安置在湖畔花丛，仍然各自独立漂浮。
    const habitats=LANDSCAPES.habitats, shoreCount=Math.min(24,habitats.length*4);
    for (let i = 0; i < SOLITARY_FIREFLIES; i++) {
      const point = {
        id: this.points.length,
        x: random() * WORLD.width,
        y: random() * WORLD.height,
        phase: random() * Math.PI * 2,
        pace: 0.15 + random() * 0.16,
        size: 1.2 + random() * 0.8,
      };
      point.homeX = point.x;
      point.homeY = point.y;
      point.driftX=30;point.driftY=23;
      if(i>=SOLITARY_FIREFLIES-shoreCount) {
        const habitat=habitats[(i-SOLITARY_FIREFLIES+shoreCount)%habitats.length];
        point.habitat=habitat.id;
        point.homeX=habitat.x+(point.x/WORLD.width-.5)*42;
        point.homeY=habitat.y+(point.y/WORLD.height-.5)*30;
        point.driftX=14;point.driftY=11;
      }
      point.x = wrap(point.homeX + Math.sin(point.phase) * point.driftX, WORLD.width);
      point.y = wrap(point.homeY + Math.sin(point.phase * 1.73) * point.driftY, WORLD.height);
      this.points.push(point);
    }
  }

  // 固定步长保证不同帧率的漂浮轨迹一致；后台恢复最多追赶0.2秒，避免瞬移与补帧风暴。
  advance(time, frozen = false) {
    if (!Number.isFinite(time)) return;
    if (this.lastTime !== null && time < this.lastTime) this.reset();
    const elapsed = this.lastTime === null ? 0 : Math.min(0.2, Math.max(0, time - this.lastTime));
    this.lastTime = time;
    if (frozen) {
      this.accumulator = 0;
      return;
    }
    this.accumulator += elapsed;
    while (this.accumulator >= STEP - 1e-9) {
      this.step(STEP);
      this.accumulator = Math.max(0, this.accumulator - STEP);
    }
  }

  // 只按个体的随机锚点、相位和速度漂浮，不读取或追随其他萤火虫。
  step(dt) {
    this.time += dt;
    for (const p of this.points) {
      const t = this.time * p.pace + p.phase;
      p.x = wrap(p.homeX + Math.sin(t) * p.driftX, WORLD.width);
      p.y = wrap(p.homeY + Math.sin(t * 0.73 + p.phase) * p.driftY, WORLD.height);
    }
  }
}
