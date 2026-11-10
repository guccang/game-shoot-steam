// 环形地图的只读空间分桶：只缩小候选集合，精确碰撞仍由原规则判定。
import { WORLD, wrap } from './coordinates.js';

const forestIndices = new WeakMap();
const pendingDeaths = new WeakMap();

// 树干坐标固定。砍倒后读实时血量，清场会替换数组，补种会追加；矿井岩壁可原地换批。
export function treeGrid(trees) {
  if (trees.mineScene) return new SpatialGrid(trees);
  let entry = forestIndices.get(trees);
  if (!entry || entry.length !== trees.length) {
    const grid = new SpatialGrid(trees);
    const order = new Map();
    trees.forEach((tree, index) => order.set(tree, index));
    entry = { grid, order, length: trees.length };
    forestIndices.set(trees, entry);
  }
  return entry.grid;
}

// 命中和领主毁树登记同一份死亡集合；世界替换后旧集合由弱引用自动回收。
export function markTreeDeath(trees,tree){
  let deaths=pendingDeaths.get(trees);if(!deaths){deaths=new Set();pendingDeaths.set(trees,deaths);}deaths.add(tree);
}
// 正式帧只清理本帧死亡实体，原生数组搬移保留绘制顺序，不逐个扫描四万棵活树。
export function cleanupTreeDeaths(trees){
  const deaths=pendingDeaths.get(trees);if(!deaths)return;
  let entry=forestIndices.get(trees);
  // 同帧补种可能尚未入索引，不能仅修改长度就把新树误当成已经登记。
  if(entry&&entry.length!==trees.length){forestIndices.delete(trees);entry=null;}
  for(const tree of deaths){
    if(tree.hp>0)continue;
    const index=trees.indexOf(tree);if(index<0)continue;
    trees.splice(index,1);if(entry){entry.grid.remove(tree);entry.order.delete(tree);}
  }
  if(entry)entry.length=trees.length;pendingDeaths.delete(trees);
}
// 先缩小森林候选，再按原数组顺序交给可见性或瞄准精查，重叠遮挡和等距目标保持一致。
export function treesInBounds(trees, x, y, right, bottom, padding) {
  if (trees.length <= 24 || trees.mineScene) return trees;
  const nearby = treeGrid(trees).query(x, y, right, bottom, padding);
  const {order} = forestIndices.get(trees);
  return nearby.sort((a,b) => order.get(a) - order.get(b));
}

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

  // 树干位置固定，只访问所属分桶；最大半径保留保守上界，不必全图重新计算。
  remove(item) {
    const x=Math.floor(wrap(item.x,WORLD.width)/this.width),y=Math.floor(wrap(item.y,WORLD.height)/this.height);
    const key=y*this.columns+x,bucket=this.cells.get(key);
    if(!bucket)return;
    const index=bucket.indexOf(item);if(index>=0)bucket.splice(index,1);
    if(!bucket.length)this.cells.delete(key);
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
