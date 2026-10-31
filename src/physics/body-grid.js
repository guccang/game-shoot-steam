// 可移动刚体分桶：碰撞纠正后立即换桶，保持原有按数组顺序传播的连锁冲量。
import { WORLD, wrap } from '../world/coordinates.js';

export class BodyGrid {
  // 索引使用当前刚体数组编号，Boss、大半径残块和越界坐标共用同一查询。
  constructor(bodies) {
    this.bodies = bodies;
    this.columns = Math.ceil(WORLD.width / 96);
    this.rows = Math.ceil(WORLD.height / 96);
    this.width = WORLD.width / this.columns;
    this.height = WORLD.height / this.rows;
    this.cells = new Map();
    this.keys = [];
    this.radius = 0;
    bodies.forEach((body, index) => {
      this.radius = Math.max(this.radius, body.radius || 17);
      this.update(index);
    });
  }

  // 查询覆盖未变时沿用已有候选，避免密集挤压时反复分配和排序同一组编号。
  coverage(index) {
    const body = this.bodies[index], radius = (body.radius || 17) + this.radius;
    const left = Math.floor((body.x - radius) / this.width);
    const top = Math.floor((body.y - radius) / this.height);
    const columns = Math.min(this.columns, Math.floor((body.x + radius) / this.width) - left + 1);
    const rows = Math.min(this.rows, Math.floor((body.y + radius) / this.height) - top + 1);
    return ((wrap(left, this.columns) * this.rows + wrap(top, this.rows)) *
      (this.columns + 1) + columns) * (this.rows + 1) + rows;
  }

  // 位移修正可能把物体推入尚未处理的邻桶，因此每次碰撞都同步更新。
  update(index) {
    const body = this.bodies[index];
    const column = Math.floor(wrap(body.x, WORLD.width) / this.width);
    const row = Math.floor(wrap(body.y, WORLD.height) / this.height);
    const key = row * this.columns + column;
    if (this.keys[index] === key) return;
    this.cells.get(this.keys[index])?.delete(index);
    if (!this.cells.has(key)) this.cells.set(key, new Set());
    this.cells.get(key).add(index);
    this.keys[index] = key;
  }

  // 只返回尚未访问的编号并稳定排序，不重访已经错过的碰撞对，和原双循环一致。
  after(index, previous = index) {
    const body = this.bodies[index], radius = (body.radius || 17) + this.radius;
    const left = Math.floor((body.x - radius) / this.width);
    const top = Math.floor((body.y - radius) / this.height);
    const columns = Math.min(this.columns, Math.floor((body.x + radius) / this.width) - left + 1);
    const rows = Math.min(this.rows, Math.floor((body.y + radius) / this.height) - top + 1);
    const result = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < columns; x++) {
        const cell = this.cells.get(wrap(top + y, this.rows) * this.columns + wrap(left + x, this.columns));
        if (cell) for (const candidate of cell) if (candidate > previous) result.push(candidate);
      }
    return result.sort((a, b) => a - b);
  }
}
