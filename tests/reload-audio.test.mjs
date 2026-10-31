// 换弹声音由真实弹夹时钟触发，覆盖手持、炮塔、独立返航补给与共享无人机。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, WEAPONS } from '../src/game.js';
import { advanceReload, consumeRound } from '../src/combat/magazine.js';
import { updateVehicle } from '../src/combat/vehicle.js';
import { updateFunnel, FUNNEL_CHARGING } from '../src/combat/funnel.js';
import { createGameEventHandler } from '../src/app/game-events.js';
import {VEHICLE_ARMAMENTS} from '../src/config/vehicle-armaments.js';
import {vehicleWeapon} from '../src/config/vehicles.js';

// 收集换弹事件，去除世界障碍与自动刷怪干扰。
function arena(index = 0, loadouts = [0, 9, 12], armament = null) {
  const progress = freshProgress(), events = [];
  progress.weapons.fill(1); progress.weapon = index; progress.funnelLoadout = loadouts;
  progress.vehicleWeapons[0] = 1; progress.vehicleLoadouts[0] = 0;
  // 炮塔用例显式选择已拥有的武装车型，不能依赖新档默认的无武器电动车。
  if(armament){progress.vehicleIndex=armament.hullIndex;progress.vehicleHulls[armament.hullIndex]=1;progress.vehicleWeapons[armament.weaponIndex]=1;progress.vehicleLoadouts[armament.hullIndex]=armament.weaponIndex;}
  const game = new Game(progress, () => 0.5, (type, data) => {
    if (type.startsWith('reload-')) events.push({ type, kind: data.kind });
  });
  game.start(); game.trees = []; game.enemies = []; game.waveWarning = 999;
  return { game, events };
}

test('每轮真实换弹只播一次开始和完成，零步长不触发，新一轮正常重播', () => {
  const weapon = WEAPONS[0], magazine = { ammo: 1, remaining: 0 }, events = [];
  const emit = type => events.push(type);
  for (let round = 0; round < 2; round++) {
    magazine.ammo = 1;
    consumeRound(magazine, weapon);
    advanceReload(magazine, weapon, 0, emit);
    assert.equal(events.length, round * 2);
    for (let i = 0; i < 4; i++) advanceReload(magazine, weapon, 0.1, emit);
    assert.equal(events.length, round * 2 + 1);
    assert.ok(magazine.remaining > 0);
    advanceReload(magazine, weapon, 1, emit);
    assert.equal(magazine.ammo, weapon.magazineSize);
    advanceReload(magazine, weapon, 10, emit);
    assert.equal(events.length, (round + 1) * 2);
  }
  assert.deepEqual(events, ['reload-start', 'reload-complete', 'reload-start', 'reload-complete']);
});

test('手持在实际填满时响，召唤回能静默，暂停和收起冻结，不重播开始提示', () => {
  for (const index of [0, 13]) {
    const { game: g, events } = arena(index), w = WEAPONS[index], m = g.magazines[index];
    m.ammo = 0; m.remaining = w.reloadTime;
    g.update(0.05);
    assert.deepEqual(events, index===13?[]:[{ type: 'reload-start', kind: w.id }]);
    const remaining = m.remaining;
    g.pause(); g.update(1);
    assert.equal(m.remaining, remaining);
    g.pause(); g.progress.weapon = 1; g.update(0.05);
    assert.equal(m.remaining, remaining);
    g.progress.weapon = index;
    for (let t = 0; t < w.reloadTime*(index===13?4:1) + 0.1; t += 0.05) g.update(0.05);
    assert.deepEqual(events, index===13?[]:[{ type: 'reload-start', kind: w.id }, { type: 'reload-complete', kind: w.id }]);
    assert.equal(m.ammo, w.magazineSize);
  }
});

test('炮塔仅上车后开始装填，下车冻结，上车继续只响完成声', () => {
  for(const armament of VEHICLE_ARMAMENTS.filter(w=>!w.crew)){
    const {game:g,events}=arena(0,undefined,armament),sounds=[];
    const route=createGameEventHandler({root:{},audio:{play:kind=>sounds.push(kind)},toast:{},input:{},save(){throw Error('装填不应写盘');}});
    const collect=g.onEvent;g.onEvent=(type,data)=>{collect(type,data);if(type.startsWith('reload-'))route(type,data);};
    const module=g.vehicle.module,m=module.magazine,w=vehicleWeapon(g.loadout,g.vehicle.weaponIndex);
    assert.equal(w.id,armament.id);assert.equal(g.vehicle.active,false);
    // 两次真实耗尽弹夹，确认完成后下一轮仍会重新播放一次开始/完成声。
    for(let round=0;round<2;round++){
      m.ammo=1;assert.equal(consumeRound(m,w),true);assert.equal(m.remaining,w.reloadTime);
      updateVehicle(g,10);assert.equal(m.remaining,w.reloadTime);assert.equal(events.length,round*2);
      assert.equal(g.summonVehicle(),true);updateVehicle(g,.1);
      assert.deepEqual(events.at(-1),{type:'reload-start',kind:w.id});assert.equal(events.length,round*2+1);
      const remaining=m.remaining;g.pause();updateVehicle(g,10);assert.equal(m.remaining,remaining);g.start();
      for(let retry=0;retry<2;retry++){
        assert.equal(g.dismountVehicle(),true);const frozen=m.remaining;updateVehicle(g,10);assert.equal(m.remaining,frozen);
        assert.equal(g.summonVehicle(),true);assert.equal(g.vehicle.module,module);updateVehicle(g,.05);
        assert.ok(m.remaining<frozen);assert.equal(events.length,round*2+1);
      }
      updateVehicle(g,m.remaining+.1);assert.equal(m.remaining,0);assert.equal(m.ammo,w.magazineSize);
      updateVehicle(g,10);assert.equal(events.length,(round+1)*2);
      assert.deepEqual(events.at(-1),{type:'reload-complete',kind:w.id});assert.equal(g.dismountVehicle(),true);
    }
    assert.deepEqual(sounds,['reload-start','reload-complete','reload-start','reload-complete'],w.id);
  }
});

test('三炮返航途中静默，入坞后按各自枪型和装填时间独立提示', () => {
  const { game: g, events } = arena(12);
  for (const n of g.funnel.nodes) {
    n.magazine.ammo = 0; n.magazine.remaining = n.weapon.reloadTime;
    n.x = 200; n.y = -150; n.flight.mode = 'return';
  }
  updateFunnel(g, 0.01);
  assert.equal(events.length, 0);
  for (const n of g.funnel.nodes) {
    [n.x, n.y] = FUNNEL_CHARGING[n.index];
    n.flight.mode = 'dock';
  }
  g.reducedMotion = true;
  updateFunnel(g, 0.01);
  assert.deepEqual(events.map(e => e.kind), ['pistol', 'pulse']);
  for (let t = 0; t < 4; t += 0.05) updateFunnel(g, 0.05);
  assert.equal(events.filter(e => e.type === 'reload-start').length, 2);
  assert.deepEqual(events.filter(e => e.type === 'reload-complete').map(e => e.kind).sort(),
    ['pistol', 'pulse']);
});

test('机械弹夹与能量充能按实际枪型路由，不生成额外奖励和保存', () => {
  const sounds = [];
  const handle = createGameEventHandler({ root: {}, audio: { play: type => sounds.push(type) },
    toast: {}, input: {}, save() { throw Error('换弹不应写入成长'); } });
  for (const kind of ['pistol', 'gatling', 'pulse', 'funnel']) {
    handle('reload-start', { kind }); handle('reload-complete', { kind });
  }
  assert.deepEqual(sounds, ['reload-start', 'reload-complete', 'reload-start', 'reload-complete',
    'charge-start', 'charge-complete', 'charge-start', 'charge-complete']);
});
