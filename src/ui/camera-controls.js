import { i18nText, i18nHtml } from "../i18n/index.js";
// 设置内的镜头控件与战场双指手势共享倍率，不触发移动或改变战斗数值。
import { CAMERA_VIEW } from '../config/camera.js';
import { createEventScope } from '../platform/events.js';

// 控件跟随应用生命周期创建和销毁，镜头倍率由正式渲染器唯一持有。
export function createCameraControls({ game, root, renderer, onChange }) {
  const scope = createEventScope(), bar = root.createElement('section');
  bar.className = 'camera-controls';
  bar.setAttribute('aria-label', i18nText("ui.camera-controls.200011ad5e"));
  bar.innerHTML = `<span>${i18nHtml("ui.camera-controls.200011ad5e")}</span><div class="camera-adjustments"><button data-zoom="out" aria-label="${i18nHtml("ui.camera-controls.10d2251fe8")}" title="${i18nHtml("ui.camera-controls.10d2251fe8")}">−</button><input type="range" min="0" max="${CAMERA_VIEW.steps}" value="0" step="0.01" aria-label="${i18nHtml("ui.camera-controls.3f5c44be2d")}"><button data-zoom="in" aria-label="${i18nHtml("ui.camera-controls.b3f7284601")}" title="${i18nHtml("ui.camera-controls.b3f7284601")}">＋</button><button data-zoom="reset" title="${i18nHtml("ui.camera-controls.180c60cdad")}">${i18nHtml("ui.camera-controls.3daa593fc1")}</button></div><small>${i18nHtml("ui.camera-controls.8d493dfd74")}</small>`;
  root.querySelector('#settings-dialog .settings-controls').prepend(bar);
  const slider = bar.querySelector('input');
  // 统一刷新档位及边界禁用态，便于读屏和键盘确认当前倍率。
  function render() {
    bar.hidden = game.realm?.mode !== 'guardian';
    const step = renderer.camera.zoomStep;
    slider.value = step;
    slider.setAttribute('aria-valuetext', step === 0 ? i18nText("ui.camera-controls.2a576e4919") : i18nText("ui.camera-controls.ac9b819006", { p0: (step.toFixed(2)) }));
    bar.querySelector('[data-zoom="out"]').disabled = step === 0;
    bar.querySelector('[data-zoom="in"]').disabled = step === CAMERA_VIEW.steps;
    bar.querySelector('[data-zoom="reset"]').setAttribute('aria-pressed', String(step === 0));
  }
  // 重绘后同步所有世界坐标点击区，避免缩放后的第一帧点错建造方格。
  function change(step) {
    if (game.realm?.mode !== 'guardian') return;
    renderer.camera.setZoomStep(step);
    renderer.draw(); render(); onChange();
  }
  // 将手指距离变化换算为连续档位，并按实际画面倍率消除封顶后的空拖区间。
  function pinch(ratio) {
    if (game.realm?.mode !== 'guardian' || !Number.isFinite(ratio) || ratio <= 0) return;
    const limit = renderer.view?.maxZoomStep ?? CAMERA_VIEW.steps;
    const step = Math.min(renderer.camera.zoomStep, limit);
    change(Math.min(limit, step + Math.log(ratio) / Math.log(CAMERA_VIEW.ratio)));
  }
  scope.on(bar, 'click', event => {
    const action = event.target.closest('button')?.dataset.zoom;
    if (action) change(action === 'reset' ? 0 : renderer.camera.zoomStep + (action === 'in' ? 1 : -1));
  });
  scope.on(slider, 'input', () => change(Number(slider.value)));
  // 释放全部事件和动态节点，应用重新挂载不会重复出现缩放栏。
  function dispose() { scope.dispose(); bar.remove(); }
  render();
  return { render, pinch, dispose };
}
