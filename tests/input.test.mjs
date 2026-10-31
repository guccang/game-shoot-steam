// 浮动摇杆的触点归属、释放与暂停契约，避免多指操作留下移动输入。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/platform/input.js';

// 用事件目标模拟浏览器控件，捕获行为由浏览器验收另行覆盖。
function fixture(onTap = () => {}, onPinch = () => {}) {
  const frame = new EventTarget(), host = new EventTarget(), root = new EventTarget();
  const captured = new Set(), pad = { hidden: true, style: {}, getBoundingClientRect: () => ({ width: 100 }) };
  const stick = { style: {} }, game = { state: 'playing', realm: { mode: 'guardian' }, pause() { this.state = 'paused'; } };
  frame.getBoundingClientRect = () => ({ left: 50, top: 20 });
  frame.closest = () => null;
  frame.setPointerCapture = id => captured.add(id);
  frame.hasPointerCapture = id => captured.has(id);
  frame.releasePointerCapture = id => captured.delete(id);
  root.getElementById = id => ({ 'game-frame': frame, joystick: pad, stick })[id];
  root.querySelector = () => root.dialog ? {} : null;
  const input = createInput({ game, root, host, onChange() {}, onTap, onPinch });
  // 发送同一条真实监听链上的指针或键盘事件。
  function send(type, props = {}, target = frame) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: 1, clientX: 240, clientY: 300, button: 0 }, props);
    target.dispatchEvent(event);
    return event;
  }
  return { frame, host, root, pad, stick, game, input, send, captured };
}

test('任意触点为原点，拖动限制单位圆，松手隐藏并立即停止', () => {
  const f = fixture();
  f.send('pointerdown');
  assert.deepEqual(f.input.read(), { x: 0, y: 0 });
  assert.equal(f.pad.style.left, '190px');
  assert.equal(f.pad.style.top, '280px');
  assert.equal(f.pad.hidden, false);
  f.send('pointermove', { clientX: 270, clientY: 340 });
  assert.deepEqual(f.input.read(), { x: 0.6, y: 0.8 });
  assert.equal(f.send('contextmenu').defaultPrevented, true);
  f.send('pointerup');
  assert.deepEqual(f.input.read(), { x: 0, y: 0 });
  assert.equal(f.pad.hidden, true);
  assert.equal(f.captured.size, 0);
  f.input.dispose();
});

test('非触摸指针不抢摇杆、不因松手打断第一根，释放不清空键盘', () => {
  const f = fixture();
  f.send('keydown', { key: 'w' }, f.host);
  f.send('pointerdown');
  f.send('pointermove', { clientX: 270 });
  f.send('pointerdown', { pointerId: 2, clientX: 100 });
  f.send('pointermove', { pointerId: 2, clientX: 50 });
  f.send('pointerup', { pointerId: 2 });
  assert.deepEqual(f.input.read(), { x: 1, y: -1 });
  f.send('pointerup');
  assert.deepEqual(f.input.read(), { x: 0, y: -1 });
  f.input.dispose();
});

test('按钮、弹窗、暂停及非主鼠标按键不启动摇杆', () => {
  const f = fixture();
  f.frame.closest = () => ({ tagName: 'BUTTON' });
  assert.equal(f.send('pointerdown').defaultPrevented, false);
  f.frame.closest = () => null;
  f.root.dialog = true;
  f.send('pointerdown');
  f.root.dialog = false;
  f.game.state = 'paused';
  f.send('pointerdown');
  f.game.state = 'playing';
  f.send('pointerdown', { button: 2 });
  assert.equal(f.pad.hidden, true);
  assert.equal(f.captured.size, 0);
  f.input.dispose();
});

test('取消、捕获丢失、旋转、失焦、后台和卸载均清空输入', () => {
  for (const reason of ['pointercancel', 'lostpointercapture', 'resize', 'blur', 'visibilitychange', 'dispose']) {
    const f = fixture();
    f.send('pointerdown');
    f.send('pointermove', { clientX: 270 });
    if (reason === 'dispose') f.input.dispose();
    else if (reason === 'visibilitychange') {
      f.root.hidden = true;
      f.send(reason, {}, f.root);
    } else f.send(reason, {}, ['resize', 'blur'].includes(reason) ? f.host : f.frame);
    assert.deepEqual(f.input.read(), { x: 0, y: 0 }, reason);
    assert.equal(f.pad.hidden, true, reason);
    f.input.dispose();
  }
});

test('世界建筑只接受短按，往返拖动与取消不会触发，回调前先释放摇杆', () => {
  let taps = 0;
  const f = fixture(() => { taps++; assert.equal(f.pad.hidden, true); });
  f.send('pointerdown'); f.send('pointerup');
  assert.equal(taps, 0, '抬起时不打开弹窗，等待当前 click 防止触摸穿透');
  f.send('click');
  assert.equal(taps, 1);
  f.send('pointerdown'); f.send('pointermove', {clientX:270});
  f.send('pointermove', {clientX:240}); f.send('pointerup'); f.send('click');
  f.send('pointerdown'); f.send('pointercancel'); f.send('click');
  f.send('pointerdown'); f.send('pointerup', {clientX:270}); f.send('click');
  assert.equal(taps, 1);
  f.input.dispose();
});

// 建造栏处于战场内，方向键与空格必须留给原生车载武器下拉而非移动或暂停。
test('战场下拉控件保留方向键和空格，不残留移动或触发暂停', () => {
  const f = fixture();
  f.host.closest = () => ({ tagName: 'SELECT' });
  for (const props of [{key:'ArrowDown'},{key:' ',code:'Space'}])
    assert.equal(f.send('keydown', props, f.host).defaultPrevented, false);
  assert.deepEqual(f.input.read(), {x:0,y:0});
  assert.equal(f.game.state, 'playing');
  f.input.dispose();
});

// 使用真实输入监听链验证缩放接管，避免只测试独立距离公式。
test('双指连续缩放停止移动，剩余单指不恢复摇杆，抬起不触发世界点击', () => {
  const ratios = []; let taps = 0;
  const f = fixture(() => taps++, ratio => ratios.push(ratio));
  f.send('pointerdown', {pointerType:'touch',clientX:100});
  f.send('pointermove', {pointerType:'touch',clientX:130});
  assert.equal(f.input.read().x, 1);
  f.send('pointerdown', {pointerType:'touch',pointerId:2,clientX:230});
  assert.equal(f.pad.hidden, true);
  assert.deepEqual(f.input.read(), {x:0,y:0});
  assert.equal(f.send('contextmenu').defaultPrevented, true, '双指停留不打开长按菜单');
  f.send('pointermove', {pointerType:'touch',pointerId:2,clientX:280});
  f.send('pointermove', {pointerType:'touch',pointerId:2,clientX:205});
  assert.deepEqual(ratios, [1.5,.5]);
  f.send('pointerup', {pointerId:2});
  f.send('pointermove', {pointerType:'touch',clientX:190});
  assert.deepEqual(f.input.read(), {x:0,y:0});
  f.send('pointerup');
  assert.equal(f.send('click', {detail:1}).defaultPrevented, true);
  assert.equal(taps, 0);
  assert.equal(f.captured.size, 0);
  f.send('pointerdown', {pointerType:'touch'}); f.send('pointerup'); f.send('click', {detail:1});
  assert.equal(taps, 1, '新单指手势恢复点击');
  f.input.dispose();
});

test('缩放取消、切窗与卸载后释放触点，第三指不会突跳', () => {
  for (const reason of ['pointercancel','blur','resize','dispose']) {
    const ratios = [], f = fixture(() => {}, ratio => ratios.push(ratio));
    f.send('pointerdown', {pointerType:'touch',clientX:100});
    f.send('pointerdown', {pointerType:'touch',pointerId:2,clientX:200});
    f.send('pointerdown', {pointerType:'touch',pointerId:3,clientX:300});
    f.send('pointerup', {pointerId:1});
    f.send('pointermove', {pointerType:'touch',pointerId:3,clientX:350});
    assert.deepEqual(ratios,[1.5]);
    if (reason === 'dispose') f.input.dispose();
    else if (reason === 'pointercancel') {
      f.send(reason, {pointerId:2}); f.send(reason, {pointerId:3});
    } else f.send(reason, {}, f.host);
    assert.equal(f.captured.size,0,reason);
    assert.deepEqual(f.input.read(),{x:0,y:0});
    f.input.dispose();
  }
});

test('第二指点击菜单不会接管摇杆，弹窗内不缩放', () => {
  let scales = 0;
  const f = fixture(() => {}, () => scales++);
  f.send('pointerdown',{pointerType:'touch',clientX:100});
  f.send('pointermove',{pointerType:'touch',clientX:130});
  f.frame.closest = () => ({classList:{contains:()=>false}});
  f.send('pointerdown',{pointerType:'touch',pointerId:2,clientX:200});
  f.send('pointermove',{pointerType:'touch',pointerId:2,clientX:300});
  f.send('pointerup',{pointerId:2});
  assert.equal(f.input.read().x,1);
  assert.equal(scales,0);
  f.input.reset(); f.frame.closest=()=>null; f.root.dialog=true;
  f.send('pointerdown',{pointerType:'touch',clientX:100});
  f.send('pointerdown',{pointerType:'touch',pointerId:2,clientX:200});
  f.send('pointermove',{pointerType:'touch',pointerId:2,clientX:300});
  assert.equal(scales,0); assert.equal(f.pad.hidden,true);
  f.input.dispose();
});

// 输入法与键盘布局可改变 key，游戏移动始终按物理 WASD 键位识别。
test('输入法 Process 与不同布局使用物理键位，抬键字符变化也能停止', () => {
  const f=fixture();
  for(const [code,vector] of [['KeyW',{x:0,y:-1}],['KeyA',{x:-1,y:0}],['KeyS',{x:0,y:1}],['KeyD',{x:1,y:0}]]) {
    f.send('keydown',{code,key:'Process'},f.host);
    assert.deepEqual(f.input.read(),vector,code);
    f.send('keyup',{code,key:'Unidentified'},f.host);
    assert.deepEqual(f.input.read(),{x:0,y:0});
  }
  f.input.dispose();
});

// 建造面板的间距、文字和滚动条同样属于 UI，不能落入战场输入。
test('建造面板空白处不启动摇杆或双指缩放', () => {
  let scales=0;const f=fixture(()=>{},()=>scales++);
  f.frame.closest=selector=>selector.includes('.guardian-build-panel')?{classList:{contains:()=>false}}:null;
  f.send('pointerdown',{pointerType:'touch',clientX:100});
  f.send('pointerdown',{pointerType:'touch',pointerId:2,clientX:200});
  f.send('pointermove',{pointerType:'touch',pointerId:2,clientX:300});
  assert.equal(f.pad.hidden,true);assert.equal(scales,0);
  assert.equal(f.captured.size,0);f.input.dispose();
});

// 触摸缩放只接管触摸，不阻断独立键盘输入；浏览器快捷键仍由浏览器处理。
test('双指手势不屏蔽 PC 方向键，修饰键组合不触发移动', () => {
  const f=fixture();
  f.send('pointerdown',{pointerType:'touch',clientX:100});
  f.send('pointerdown',{pointerType:'touch',pointerId:2,clientX:200});
  f.send('keydown',{key:'Process',code:'KeyW'},f.host);
  assert.deepEqual(f.input.read(),{x:0,y:-1});
  f.send('keyup',{key:'w',code:'KeyW'},f.host);
  for(const modifier of ['ctrlKey','altKey','metaKey']) {
    assert.equal(f.send('keydown',{key:'w',code:'KeyW',[modifier]:true},f.host).defaultPrevented,false);
    assert.deepEqual(f.input.read(),{x:0,y:0});
  }
  f.input.dispose();
});

// 非守护模式的第二根手指不缩放，也不抢走首指摇杆。
test('森林、高塔与远征禁用双指缩放，首指移动和键盘仍可用', () => {
  for(const mode of [null,'tower','rogue']){
    let scales=0;const f=fixture(()=>{},()=>scales++);
    f.game.realm=mode?{mode}:null;
    f.send('pointerdown',{pointerType:'touch',clientX:100});
    f.send('pointermove',{pointerType:'touch',clientX:130});
    f.send('pointerdown',{pointerType:'touch',pointerId:2,clientX:200});
    f.send('pointermove',{pointerType:'touch',pointerId:2,clientX:300});
    f.send('pointerup',{pointerId:2});
    assert.equal(scales,0);assert.equal(f.input.read().x,1);assert.equal(f.pad.hidden,false);
    f.send('pointerup');f.send('keydown',{key:'Process',code:'KeyW'},f.host);
    assert.deepEqual(f.input.read(),{x:0,y:-1});f.input.dispose();
  }
});

// 世界门牌必须接受拖动且只在短按后的 click 激活，模拟捕获目标与门牌分离。
test('门牌拖动不挡移动，短按一次进入，取消及隐藏门牌不误开',()=>{
 const f=fixture();let opened=0;
 const label={hasAttribute:name=>name==='data-world-movement',isConnected:true,hidden:false,click(){opened++;}};
 f.frame.closest=()=>label;
 f.send('pointerdown');f.send('pointermove',{clientX:280});assert.equal(f.input.read().x,1);
 f.send('pointerup');f.send('click');assert.equal(opened,0);
 f.send('pointerdown');f.send('pointerup');assert.equal(opened,0);f.send('click');f.send('click');assert.equal(opened,1);
 f.send('pointerdown');f.send('pointercancel');f.send('click');assert.equal(opened,1);
 f.send('pointerdown');f.send('pointerup');label.hidden=true;f.send('click');assert.equal(opened,1);
 f.input.dispose();
});

// 冲刺键只给跑步比赛附加输入字段，旧战斗和双指缩放的输入形状不变。
test('运动会Shift冲刺可与方向键同时按住，失焦和松键立即释放',()=>{const f=fixture();f.game.realm.mode='race';f.send('keydown',{code:'KeyA',key:'a'},f.host);f.send('keydown',{code:'ShiftLeft',key:'Shift'},f.host);assert.deepEqual(f.input.read(),{x:-1,y:0,sprint:true});f.send('keyup',{code:'ShiftLeft',key:'Shift'},f.host);assert.equal(f.input.read().sprint,false);f.send('keydown',{code:'ShiftLeft',key:'Shift'},f.host);f.send('blur',{},f.host);assert.deepEqual(f.input.read(),{x:0,y:0,sprint:false});f.input.dispose();});
