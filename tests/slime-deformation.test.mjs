// 史莱姆保留原版轮廓，同时验证局部动作不是整图统一缩放。
import test from 'node:test';
import assert from 'node:assert/strict';
import {slimeDeformation} from '../src/rendering/monster-atlas.js';

test('胶质轮廓左右边缘、波峰与表情独立变化，受击最终恢复', () => {
  const frames = Array.from({length: 8}, (_, i) => slimeDeformation('roll', i, 8));
  assert.ok(new Set(frames.map(frame => JSON.stringify(frame))).size > 6);
  assert.ok(frames.some(frame => frame.left * frame.right < 0));
  assert.ok(frames.some(frame => Math.abs(frame.crest - frame.face) > 2));
  assert.ok(Object.values(slimeDeformation('recover', 5, 6)).every(value => value === 0));

});

