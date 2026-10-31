// 验证怪潮前后构图、时间缓动、窄屏安全及退出恢复，避免影响其他玩法镜头。
import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatCamera } from '../src/rendering/camera.js';

const horde = { horde: true };

// 从最终投影独立测量沿朝向到前后屏幕边缘的距离比例。
function frontRatio(player, view) {
  const x = (player.x - view.x) * view.zoom, y = (player.y - view.y) * view.zoom;
  const dx = Math.cos(player.angle), dy = Math.sin(player.angle);
  const forward = Math.min((dx >= 0 ? view.width - x : x) / Math.max(Math.abs(dx), 1e-9),
    (dy >= 0 ? view.height - y : y) / Math.max(Math.abs(dy), 1e-9));
  const backward = Math.min((dx >= 0 ? x : view.width - x) / Math.max(Math.abs(dx), 1e-9),
    (dy >= 0 ? y : view.height - y) / Math.max(Math.abs(dy), 1e-9));
  return forward / (forward + backward);
}

test('怪潮八方向前后七三分，目标位置不改变构图，武器倍率保持原样', () => {
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    for (const kind of ['rifle', 'sniper', 'funnel', 'pulse']) {
      for (let i = 0; i < 8; i++) {
        const player = { x: 900, y: 700, angle: i * Math.PI / 4 };
        const guide = { kind, target: { type: 'enemy', hp: 100 }, focus: { x: -9999, y: 9999 } };
        const view = new CombatCamera().update(player, width, height, guide, 0, false, horde);
        assert.ok(Math.abs(frontRatio(player, view) - .7) < 1e-8);
        assert.equal(view.zoom, new CombatCamera().update(player, width, height, guide).zoom);
      }
    }
  }
});

test('320手机连续转向时，身体、独立武器与换弹环保持在安全范围', () => {
  const camera = new CombatCamera(), player = { x: 900, y: 700, angle: 0 };
  for (let i = 0; i < 720; i++) {
    player.angle = Math.floor(i / 60) * Math.PI / 3;
    player.vx = Math.cos(player.angle) * 100;player.vy = Math.sin(player.angle) * 100;
    const view = camera.update(player, 320, 568, null, i / 60, false, horde);
    const x = (player.x - view.x) * view.zoom, y = (player.y - view.y) * view.zoom;
    assert.ok(x >= 110 * view.zoom + 12 - 1e-7 && x <= 320 - 110 * view.zoom - 12 + 1e-7);
    assert.ok(y >= 123 - 1e-7 && y <= 568 - 110 * view.zoom - 12 + 1e-7);
  }
});

test('持续反向移动不跳变，不因狙击或减少动态而失去缓动，暂停不推进', () => {
  for (const reduced of [false, true]) {
    const camera = new CombatCamera(), player = { x: 900, y: 700, angle: -Math.PI / 2 };
    const before = camera.update(player, 390, 844, { kind: 'sniper' }, 0, reduced, horde);
    player.angle = Math.PI / 2;
    player.vy = 100;
    assert.deepEqual(camera.update(player, 390, 844, { kind: 'sniper' }, 0, reduced, horde), before);
    let prior = before;
    for (let i = 1; i <= 240; i++) {
      const view = camera.update(player, 390, 844, { kind: 'sniper' }, i / 60, reduced, horde);
      assert.ok(view.y >= prior.y && (view.y - prior.y) * view.zoom <= 5 + 1e-7);
      prior = view;
    }
    assert.ok(Math.abs(frontRatio(player, prior) - .7) < .001);
  }
});

test('按实际秒数缓动，30与120帧设备经过同样时间拥有一致构图', () => {
  const ratios = [];
  for (const fps of [30, 120]) {
    const camera = new CombatCamera(), player = { x: 0, y: 0, angle: -Math.PI / 2 };
    camera.update(player, 390, 844, null, 0, false, horde);
    player.angle = Math.PI / 2;
    player.vy = 100;
    let view;
    for (let i = 1; i <= fps * 2; i++) view = camera.update(player, 390, 844, null, i / fps, false, horde);
    ratios.push(frontRatio(player, view));
  }
  assert.ok(Math.abs(ratios[0] - ratios[1]) < .001);
});

test('站定时自动攻击连续反向与受击冲量均不改变镜头构图', () => {
  for (const reduced of [false,true]) {
    const camera=new CombatCamera(),player={x:900,y:700,angle:0,vx:0,vy:0};
    const framing={horde:{gate:{nx:0,ny:-1}}};
    const before=camera.update(player,390,900,null,0,reduced,framing);
    for(let i=1;i<=600;i++){
      player.angle=i%2?Math.PI:0;player.pushX=i%2?40:-40;player.pushY=20;
      const guide={target:{type:'enemy',hp:100},focus:{x:player.x+Math.cos(player.angle)*400,y:player.y+Math.sin(player.angle)*400}};
      assert.deepEqual(camera.update(player,390,900,guide,i/60,reduced,framing),before);
    }
    assert.equal(camera.hordeAngle,-Math.PI/2,'初始朝向来自营门外，而非枪口');
  }
});

test('短促左右闪避、停步及小角度摇杆抖动不改变观察方向', () => {
  const camera=new CombatCamera(),player={x:0,y:0,angle:-Math.PI/2};
  const before=camera.update(player,390,900,null,0,false,horde);
  for(let i=1;i<=240;i++){
    player.vx=Math.floor(i/10)%2?100:-100;player.vy=0;
    assert.deepEqual(camera.update(player,390,900,null,i/60,false,horde),before);
  }
  for(let i=241;i<=360;i++){
    player.vx=0;player.vy=0;
    assert.deepEqual(camera.update(player,390,900,null,i/60,false,horde),before);
  }
  for(let i=361;i<=600;i++){
    const direction=-Math.PI/2+(i%2?.2:-.2);player.vx=Math.cos(direction)*100;player.vy=Math.sin(direction)*100;
    assert.deepEqual(camera.update(player,390,900,null,i/60,false,horde),before);
  }
});

test('持续移动确认后切换，暂停不累计方向确认时间，停止后保持新构图', () => {
  const camera=new CombatCamera(),player={x:0,y:0,angle:-Math.PI/2};
  const before=camera.update(player,390,900,null,0,false,horde);
  player.vx=100;
  for(let i=1;i<=24;i++)assert.deepEqual(camera.update(player,390,900,null,i/60,false,horde),before);
  for(let i=0;i<120;i++)assert.deepEqual(camera.update(player,390,900,null,.4,false,horde),before);
  let view;
  for(let i=25;i<=300;i++)view=camera.update(player,390,900,null,i/60,false,horde);
  assert.equal(camera.hordeAngle,0);
  assert.ok(Math.abs(frontRatio({...player,angle:0},view)-.7)<.001);
  player.vx=0;player.angle=Math.PI;
  for(let i=301;i<=600;i++)view=camera.update(player,390,900,null,i/60,false,horde);
  assert.equal(camera.hordeAngle,0,'站定攻击不切回枪口朝向');
  assert.ok(Math.abs(frontRatio({...player,angle:0},view)-.7)<.00001);
});

test('角度跨越正负π仍视作同向，新守门会话重新朝向新营门外', () => {
  const camera=new CombatCamera(),player={x:0,y:0,angle:0};
  const north={horde:{gate:{nx:0,ny:-1}}};camera.update(player,390,900,null,0,false,north);
  for(let i=1;i<=60;i++){
    const angle=i%2?Math.PI-.01:-Math.PI+.01;player.vx=Math.cos(angle)*100;player.vy=Math.sin(angle)*100;
    camera.update(player,390,900,null,i/60,false,north);
  }
  assert.ok(Math.abs(camera.hordeAngle)>3);
  player.vx=player.vy=0;
  camera.update(player,390,900,null,0,false,{horde:{gate:{nx:-1,ny:0}}});
  assert.equal(camera.hordeAngle,Math.PI);
});

test('进入及退出怪潮平滑衔接，最终恢复普通狙击构图', () => {
  const camera = new CombatCamera(), player = { x: 900, y: 700, angle: -Math.PI / 2 }, guide = { kind: 'sniper' };
  const normal = camera.update(player, 390, 844, guide, 0);
  const entry = camera.update(player, 390, 844, guide, 1 / 60, false, horde);
  assert.ok(Math.abs(entry.y - normal.y) * entry.zoom <= 5 + 1e-7);
  for (let i = 2; i <= 240; i++) camera.update(player, 390, 844, guide, i / 60, false, horde);
  const before = camera.update(player, 390, 844, guide, 4, false, horde);
  assert.deepEqual(camera.update(player, 390, 844, guide, 4), before);
  const after = camera.update(player, 390, 844, guide, 4 + 1 / 60);
  assert.ok(Math.abs(after.y - before.y) * after.zoom <= 5 + 1e-7);
  for (let i = 242; i <= 600; i++) camera.update(player, 390, 844, guide, i / 60);
  assert.deepEqual(camera.update(player, 390, 844, guide, 10), normal);
});

test('怪潮后进入守护或球场仍使用各自独立镜头', () => {
  for (const mode of ['guardian', 'football']) {
    const camera = new CombatCamera(), player = { x: 0, y: 0, angle: -Math.PI / 2 };
    camera.update(player, 390, 844, null, 0, false, horde);
    const framing = { mode, arena: { x: 100, y: 100, radius: 620 }, session: {} };
    assert.deepEqual(camera.update(player, 390, 844, null, 1, false, framing),
      new CombatCamera().update(player, 390, 844, null, 1, false, framing));
  }
});

test('进入重置时钟、退出恢复旧森林时钟，都不会瞬切镜头偏移', () => {
  const camera = new CombatCamera(), player = { x: 0, y: 0, angle: -Math.PI / 2 }, guide = { kind: 'sniper' };
  const forest = camera.update(player, 390, 844, guide, 120);
  assert.deepEqual(camera.update(player, 390, 844, guide, 0, false, horde), forest);
  let battle;
  for(let i=1;i<=240;i++)battle=camera.update(player,390,844,guide,i/60,false,horde);
  const restored = camera.update(player, 390, 844, guide, 2);
  assert.deepEqual(restored, battle);
  const next = camera.update(player, 390, 844, guide, 2+1/60);
  assert.ok(Math.abs(next.y-restored.y)*next.zoom<=5+1e-7);
});
