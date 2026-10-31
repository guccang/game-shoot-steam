// 同步预览与分帧地形生成复用同一迭代器，不额外分配图元数组。

// 同步执行全部绘制步骤；保留生成器的副作用和异常传播。
export function consumeDrawSteps(steps) {
  while(!steps.next().done) { /* 每次推进都执行正式绘制步骤。 */ }
}
