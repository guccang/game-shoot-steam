// 灯光规则验证：灯位安全、昼夜渐变、低动态和循环世界连续性。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIGHT_FIXTURES,
  fixturePower,
  visibleLights,
  localIllumination,
} from '../src/world/lighting.js';
import { isWaterBlocked } from '../src/world/river-geometry.js';
import { forestLayout } from '../src/world/biomes.js';
import { worldDistance, WORLD } from '../src/world/coordinates.js';
const night = { night: 1, dusk: 0, rain: 0 };

test('灯位固定且不在水里或树干上，保留桥头和营地照明', () => {
  assert.equal(new Set(LIGHT_FIXTURES.map((l) => l.id)).size, 7);
  assert.equal(LIGHT_FIXTURES.filter((l) => l.kind === 'lamp').length, 4);
  assert.equal(LIGHT_FIXTURES.filter((l) => l.kind === 'torch').length, 3);
  for (const fixture of LIGHT_FIXTURES) {
    assert.equal(isWaterBlocked(fixture.x, fixture.y, 15), false);
    assert.ok(forestLayout().every((tree) => worldDistance(tree, fixture) > 30));
  }
});

test('路灯渐亮，火把雨中减弱且低动态不闪烁，白天无光池', () => {
  for (const fixture of LIGHT_FIXTURES) {
    assert.equal(fixturePower(fixture, 1, { night: 0, dusk: 0 }), 0);
    assert.ok(fixturePower(fixture, 1, { night: 0, dusk: 1 }) < fixturePower(fixture, 1, night));
    assert.ok(fixturePower(fixture, 1, { ...night, rain: 1 }) < fixturePower(fixture, 1, night));
    assert.equal(fixturePower(fixture, 1, night, true), fixturePower(fixture, 800, night, true));
    for (let t = 0; t < 20; t += 0.05) {
      const a = fixturePower(fixture, t, night);
      assert.ok(a > 0.8 && a <= 1);
      assert.ok(Math.abs(a - fixturePower(fixture, t + 1 / 60, night)) < 0.02);
    }
  }
});

test('照明在循环边界和宽视野中连续，地图平移不重新创建灯位', () => {
  const view = { x: WORLD.width - 100, y: -200, w: 750, h: 1700 };
  const before = JSON.stringify(LIGHT_FIXTURES);
  const lights = visibleLights(view, 8, night);
  const translated = visibleLights({ ...view, x: view.x + WORLD.width }, 8, night);
  assert.equal(lights.length, translated.length);
  lights.forEach((l, i) => {
    assert.equal(l.id, translated[i].id);
    assert.ok(Math.abs(translated[i].x - l.x - WORLD.width) < 1e-8);
    assert.equal(l.power, translated[i].power);
  });
  const p = { x: WORLD.width + 570, y: 900 };
  assert.ok(localIllumination(p, lights).power > 0.5);
  assert.ok(Math.abs(localIllumination(p, lights).power -
    localIllumination({ ...p, x: p.x + WORLD.width }, translated).power) < 1e-8);
  assert.equal(JSON.stringify(LIGHT_FIXTURES), before);
});

test('光照边缘平滑归零、重叠上限受控、投影选择最强光源', () => {
  const lamp = { ...LIGHT_FIXTURES[0], x: 0, y: 0, offset: 0, power: 1 };
  assert.equal(localIllumination({ x: 0, y: 0 }, [lamp]).power, 1);
  assert.equal(localIllumination({ x: lamp.radius, y: 0 }, [lamp]).power, 0);
  assert.ok(localIllumination({ x: lamp.radius - 0.1, y: 0 }, [lamp]).power < 0.00001);
  assert.equal(localIllumination({ x: 0, y: 0 }, [lamp, lamp]).power, 1);
  const weak = { ...lamp, power: 0.1 };
  assert.equal(localIllumination({ x: 0, y: 0 }, [weak, lamp]).source, lamp);
});
