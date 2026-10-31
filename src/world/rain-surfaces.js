// 雨滴落点固定在世界网格中：静态地表缓存，动态树冠按当帧位置查询。
import { isWaterBlocked } from './river-geometry.js';
import { isLakeWater } from './natural-terrain.js';
import { pathDistance } from './biomes.js';
import { SpatialGrid } from './spatial-grid.js';
import { valleyBlocked } from './jiuzhaigou.js';

export class RainSurfaces {
  // 缓存键来自周期雨场的 seed，最多覆盖全地图的 2400 个雨滴网格。
  constructor() {
    this.terrain = new Map();
    this.trees = null;
    this.order = new Map();
    this.canopyRadius = 0;
  }

  // 树木砍倒、重生及循环镜像每帧同步，不能把树冠遮挡写入静态缓存。
  setTrees(trees) {
    this.trees = new SpatialGrid(trees);
    this.order.clear();
    this.canopyRadius = 0;
    trees.forEach((tree, index) => {
      this.order.set(tree, index);
      this.canopyRadius = Math.max(this.canopyRadius, 30 * tree.size);
    });
  }

  // 多棵树冠重叠时仍选择输入顺序最前的树，保持原有落水位置和遮挡。
  canopyAt(drop) {
    let selected = null, first = Infinity;
    for (const tree of this.trees.query(drop.x, drop.y, drop.x, drop.y, this.canopyRadius)) {
      const index = this.order.get(tree);
      if (index < first && tree.hp > 0 &&
          Math.abs(tree.x - drop.x) < 30 * tree.size &&
          Math.abs(tree.y - drop.y) < 25 * tree.size) {
        first = index;
        selected = tree;
      }
    }
    return selected;
  }

  // 水面、桥面、道路均为静态地形，同一周期落点只做一次完整几何判定。
  groundAt(drop) {
    if (!this.terrain.has(drop.seed)) {
      this.terrain.set(drop.seed, this.mapId === 'jiuzhaigou'
        ? valleyBlocked(drop.x, drop.y, 0) ? 'water' : 'grass'
        : (isWaterBlocked(drop.x, drop.y, 0) || isLakeWater(drop.x, drop.y))
          ? 'water' : pathDistance(drop.x, drop.y) < 26 ? 'path' : 'grass');
    }
    return this.terrain.get(drop.seed);
  }
}
