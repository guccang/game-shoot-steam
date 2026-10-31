// 全景几何与缩放回归：完整场地、边缘角色、小屏和视口调整都使用正式镜头。
import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatCamera } from '../src/rendering/camera.js';
import { REALM_RADIUS } from '../src/config/realms.js';
import { Game, freshProgress } from '../src/game.js';
import { findArrivalSpot } from '../src/core/enemy-arrival.js';
import { CAMERA_VIEW } from '../src/config/camera.js';

test('全景在横竖屏完整包含秘境，移动角色不拖走场地，缩放后能准确还原', () => {
  const arena = { x: 900, y: 700, radius: REALM_RADIUS }, camera = new CombatCamera();
  for (const [width, height] of [[320, 568], [390, 844], [563, 900], [844, 390]]) {
    const p = { x: arena.x + arena.radius - 30, y: arena.y };
    camera.setZoomStep(0);
    const v = camera.update(p, width, height, null, 0, false, { arena, mode: 'guardian' });
    assert.ok((arena.x - arena.radius - v.x) * v.zoom >= 24);
    assert.ok((arena.x + arena.radius - v.x) * v.zoom <= width - 24);
    assert.ok((arena.y - arena.radius - v.y) * v.zoom >= Math.min(140, height * .22));
    assert.ok((arena.y + arena.radius - v.y) * v.zoom <= height - Math.min(200, height * .3));
    camera.setZoomStep(CAMERA_VIEW.steps);
    const close = camera.update(p, width, height, null, 1, false, { arena, mode: 'guardian' });
    assert.ok(close.zoom > v.zoom);
    assert.ok(Math.abs(close.x + close.w / 2 - p.x) < 1e-8);
    camera.setZoomStep(-100);
    assert.deepEqual(camera.update(p, width, height, null, 2, false, { arena, mode: 'guardian' }), v);
    assert.equal(camera.setZoomStep(999), CAMERA_VIEW.steps);
    assert.equal(camera.setZoomStep(NaN), 0);
  }
});

test('森林恢复原版正常视角，残留缩放不会影响安全出生点', () => {
  let seed = 1729;
  const game = new Game(freshProgress(), () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32));
  const camera = new CombatCamera();
  for (const [width, height] of [[320, 568], [390, 844], [563, 900]]) {
    game.setViewport(width, height);
    for (const step of [0, 6]) {
      camera.setZoomStep(step);
      const v = camera.update(game.player, width, height, null, 0, false, {});
      game.arrivalView = { left: v.x - game.player.x, right: v.x + v.w - game.player.x,
        top: v.y - game.player.y, bottom: v.y + v.h - game.player.y, width, height };
      assert.equal(camera.zoomStep, 0);
      assert.ok(findArrivalSpot(game), `${width} / ${step} 应有安全出生点`);
    }
  }
});

// 小幅捏合必须连续响应，不能等待跨过整档才突然跳近。
test('触摸缩放保留小数档位，并报告宽屏实际倍率上限', () => {
  const camera = new CombatCamera(), player = {x:0,y:0};
  camera.setZoomStep(.125);
  const a = camera.update(player,390,844,null,0,false,{mode:'guardian'});
  camera.setZoomStep(.25);
  const b = camera.update(player,390,844,null,0,false,{mode:'guardian'});
  assert.equal(camera.zoomStep,.25);
  assert.ok(b.zoom > a.zoom && b.zoom / a.zoom < 1.1);
  const wide = camera.update(player,1920,1080,null,0,false,{mode:'guardian'});
  assert.ok(wide.maxZoomStep < 6 && wide.maxZoomStep > 0);
});

// 正式模式切换不继承守护女神的倍率，普通场景恢复原版近景跟随。
test('离开守护女神后森林、高塔与远征忽略手动倍率，重新进入恢复默认视野', () => {
  const camera=new CombatCamera(),player={x:900,y:700},arena={...player,radius:REALM_RADIUS};
  for(const mode of [undefined,'tower','rogue']){
    const framing={mode,arena:mode?arena:undefined};
    const baseline=camera.update(player,390,844,null,0,false,framing);
    camera.setZoomStep(3);
    const guardian=camera.update(player,390,844,null,0,false,{mode:'guardian',arena});
    assert.equal(camera.zoomStep,3);
    const normal=camera.update(player,390,844,null,0,false,framing);
    assert.deepEqual(normal,baseline);assert.equal(camera.zoomStep,0);
    assert.equal(camera.update(player,390,844,null,0,false,{mode:'guardian',arena}).zoom,.85);
  }
});

// 默认不再以战场大小适配，横竖屏宽高均与普通基础视角相同，角色走到边缘仍跟随。
test('守护默认视野与普通地图基础倍率相同，手动全景与新局重置互不干扰',()=>{
  const arena={x:900,y:700,radius:REALM_RADIUS},player={x:1300,y:700},session={};
  const camera=new CombatCamera();
  for(const [width,height] of [[320,568],[390,844],[563,900],[844,390]]){
    const normal=new CombatCamera().update(player,width,height);
    const view=camera.update(player,width,height,null,0,false,{mode:'guardian',arena,session});
    assert.ok(Math.abs(view.w/normal.w-1)<1e-10);assert.ok(Math.abs(view.h/normal.h-1)<1e-10);
    assert.ok(Math.abs(view.x+view.w/2-player.x)<1e-10);
  }
  const initial=camera.update(player,390,844,null,0,false,{mode:'guardian',arena,session});
  camera.setZoomStep(initial.zoomStep);
  const manualStart=camera.update(player,390,844,null,0,false,{mode:'guardian',arena,session});
  assert.ok(Math.abs(manualStart.x-initial.x)<1e-8&&Math.abs(manualStart.y-initial.y)<1e-8,'默认转手动不能跳动');
  camera.setZoomStep(0);const full=camera.update(player,390,844,null,0,false,{mode:'guardian',arena,session});
  assert.ok(full.zoom<.85);assert.equal(camera.zoomStep,0);
  camera.setZoomStep(3);const manual=camera.update(player,390,844,null,0,false,{mode:'guardian',arena,session});
  assert.equal(camera.update(player,390,844,null,0,false,{mode:'guardian',arena,session}).zoom,manual.zoom);
  assert.equal(camera.update(player,390,844,null,0,false,{mode:'guardian',arena,session:{}}).zoom,.85);
});

// 同一个正式镜头入口必须复用原版倍率和跟随规则，不能再把普通场景适配为全景。
test('森林、高塔与远征恢复原版正常及专用武器镜头，视线随角色移动',()=>{
  for(const width of [320,390,563])for(const mode of [undefined,'tower','rogue'])for(const kind of [null,'sniper','funnel','pulse']){
    const player={x:900,y:700},arena={...player,radius:REALM_RADIUS},guide=kind?{kind}:null;
    const camera=new CombatCamera(),legacy=new CombatCamera();camera.setZoomStep(6);
    const original=legacy.update(player,width,844,guide,0);
    const actual=camera.update(player,width,844,guide,0,false,{mode,arena});
    assert.deepEqual(actual,original);
    const expected=['sniper','funnel'].includes(kind)?(width<500?.6:.75):(width<500?.85:1.05)/(kind==='pulse'?1.2:1);
    assert.equal(actual.zoom,expected);
    player.x+=100;player.y+=70;
    const moved=camera.update(player,width,844,guide,.1,false,{mode,arena});
    assert.ok(Math.abs(moved.x-actual.x-100)<1e-8);
    assert.ok(Math.abs(moved.y-actual.y-70)<1e-8);
  }
});
