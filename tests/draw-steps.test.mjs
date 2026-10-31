// 地形同步消费入口保留所有步骤和生成器异常，不缓存绘制结果。
import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeDrawSteps } from '../src/rendering/draw-steps.js';

test('同步绘制执行所有步骤与结束清理，包含空产出值',()=>{
  const calls=[];
  // 模拟分帧绘制器的图元、副作用与退出清理。
  function* steps(){try{calls.push('ground');yield;calls.push('river');yield 1;calls.push('shore');}finally{calls.push('cleanup');}}
  consumeDrawSteps(steps());assert.deepEqual(calls,['ground','river','shore','cleanup']);
});

test('同步绘制传播资源错误，不把未完成地形当作成功',()=>{
  // 资源损坏应由调用方处理，不能吞掉失败。
  function* steps(){yield;throw Error('素材缺失');}
  assert.throws(()=>consumeDrawSteps(steps()),/素材缺失/);
});
