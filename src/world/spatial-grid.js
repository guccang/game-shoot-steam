// 环形地图的只读空间分桶：只缩小候选集合，精确碰撞仍由原规则判定。
import { WORLD, wrap } from './coordinates.js';

export class SpatialGrid {
  // 单个实体只放入一个格子；最大半径用于查询扩边，跨边界不会复制实体。
  constructor(items, { cellSize = 96, offsetY = 0 } = {}) {
    this.columns = Math.ceil(WORLD.width / cellSize);
    this.rows = Math.ceil(WORLD.height / cellSize);
    this.width = WORLD.width / this.columns;
    this.height = WORLD.height / this.rows;
    this.cells = new Map();
    this.maxRadius = 0;
    for (const item of items) {
      const x = Math.floor(wrap(item.x, WORLD.width) / this.width);
      const y = Math.floor(wrap(item.y + offsetY, WORLD.height) / this.height);
      const key = y * this.columns + x;
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key).push(item);
      this.maxRadius = Math.max(this.maxRadius, item.radius || 0);
    }
  }

  // 长射线、大半径和多次越界最多访问每格一次，保留原对象以读取即时死亡状态。
  query(minX, minY, maxX, maxY, padding = 0) {
    const margin = this.maxRadius + padding;
    const left = Math.floor((minX - margin) / this.width);
    const top = Math.floor((minY - margin) / this.height);
    const columns = Math.min(this.columns, Math.floor((maxX + margin) / this.width) - left + 1);
    const rows = Math.min(this.rows, Math.floor((maxY + margin) / this.height) - top + 1);
    const result = [];
    for (let y = 0; y < rows; y++) {
      const row = wrap(top + y, this.rows);
      for (let x = 0; x < columns; x++) {
        const bucket = this.cells.get(row * this.columns + wrap(left + x, this.columns));
        if (bucket) for (const item of bucket) result.push(item);
      }
    }
    return result;
  }
}
