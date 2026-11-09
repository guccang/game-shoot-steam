// 可见图惰性 A*：先比较路程下界，仅在候选边出队时进行昂贵的精确通行采样。
// distance 必须是满足三角不等式的距离；通行检查仍由调用方保留地图、半径和障碍规则。
export function visibilityRoute(nodes, distance, clear) {
  const heap = [], costs = nodes.map(() => Infinity), previous = nodes.map(() => -1);
  const done = new Uint8Array(nodes.length), estimates = nodes.map(node => distance(node, nodes[1]));
  let serial = 0;
  // 相同下界按入队顺序处理，确保冷缓存和热缓存得到一致路径。
  const less = (a, b) => a.score < b.score || (a.score === b.score && a.order < b.order);
  // 二叉堆避免大量候选边反复全数组排序。
  function push(edge) {
    edge.order = serial++;
    let index = heap.length; heap.push(edge);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (!less(edge, heap[parent])) break;
      heap[index] = heap[parent]; index = parent;
    }
    heap[index] = edge;
  }
  // 弹出最小下界；被封闭节点的旧候选稍后直接丢弃。
  function pop() {
    const first = heap[0], last = heap.pop();
    if (heap.length) {
      let index = 0;
      while (index * 2 + 1 < heap.length) {
        let child = index * 2 + 1;
        if (child + 1 < heap.length && less(heap[child + 1], heap[child])) child++;
        if (!less(heap[child], last)) break;
        heap[index] = heap[child]; index = child;
      }
      heap[index] = last;
    }
    return first;
  }
  push({ from: -1, to: 0, cost: 0, score: estimates[0] });
  while (heap.length) {
    const edge = pop(), current = edge.to;
    if (done[current]) continue;
    // 失败边不关闭终点，其他父节点的可达候选仍可继续参与搜索。
    if (edge.from >= 0 && !clear(nodes[edge.from], nodes[current])) continue;
    costs[current] = edge.cost; previous[current] = edge.from; done[current] = 1;
    if (current === 1) {
      const path = [];
      for (let index = 1; index > 0; index = previous[index]) path.push(nodes[index]);
      return path.reverse();
    }
    for (let next = 0; next < nodes.length; next++) {
      if (done[next]) continue;
      const cost = costs[current] + distance(nodes[current], nodes[next]);
      push({ from: current, to: next, cost, score: cost + estimates[next] });
    }
  }
  return [];
}
