import { i18nText } from "../i18n/index.js";
// 声音设置只控制音频服务；音量与总开关保留于独立偏好存档。
import { createEventScope } from '../platform/events.js';

// 手势解锁兼容手机自动播放限制，开关与双音量显示保持同步。
export function createAudioControls({ root, audio, toast }) {
  const scope = createEventScope(), $ = id => root.getElementById(id);
  let disposed = false;
  // 明示当前声音状态；静音时禁用滑块，避免调整却听不到反馈。
  function render() {
    if (disposed) return;
    const label = audio.enabled ? i18nText("ui.audio-controls.14273a787a") : i18nText("ui.audio-controls.d10a1eff91");
    $('sound').textContent = audio.enabled ? '♪' : '♫';
    $('sound').setAttribute('aria-label', label);
    $('sound').setAttribute('aria-pressed', String(audio.enabled));
    $('sound').title = label;
    $('sound-caption').textContent = audio.enabled ? '声音已开启' : '声音已关闭';
    for (const channel of ['music', 'effects']) {
      const value = Math.round(audio.preferences[channel] * 100);
      $(`${channel}-volume`).value = value;
      $(`${channel}-volume`).disabled = !audio.enabled;
      $(`${channel}-volume-value`).textContent = `${value}%`;
    }
  }
  // 触屏在抬指/点击时才授予播放权限；捕获阶段解锁，避免场景拦截冒泡。
  function unlock() { if (audio.enabled) void audio.unlock().catch(() => {}); }
  for (const type of ['pointerup', 'click', 'keydown'])
    scope.on(root, type, event => { if (!event.target.closest?.('#sound')) unlock(); }, { capture: true });
  scope.on($('sound'), 'click', async () => {
    $('sound').disabled = true;
    try {
      const enabled = await audio.toggle();
      if (disposed) return;
      toast.show(enabled ? i18nText("ui.audio-controls.d5326c5db8") : i18nText("ui.audio-controls.2d9b892a1a"));
      if (enabled) audio.play('meow-start');
    } catch {
      if (!disposed) toast.show(i18nText("ui.audio-controls.d1a648e894"));
    } finally {
      if (!disposed) { $('sound').disabled = false; render(); }
    }
  });
  scope.on($('start'), 'click', async () => {
    try { if (await audio.unlock()) audio.play('meow-start'); } catch { /* 未解锁音频不阻止开局。 */ }
  });
  for (const channel of ['music', 'effects'])
    scope.on($(`${channel}-volume`), 'input', () => {
      audio.setVolume(channel, Number($(`${channel}-volume`).value) / 100);
      render();
    });
  // 调整完成后试听一声，拖动期间只调增益，避免密集触发试听噪声。
  scope.on($('effects-volume'), 'change', async () => {
    try { if (await audio.unlock()) audio.play('purchase'); }
    catch { if (!disposed) toast.show(i18nText("ui.audio-controls.d1a648e894")); }
  });
  render();
  return { dispose() { disposed = true; scope.dispose(); } };
}
