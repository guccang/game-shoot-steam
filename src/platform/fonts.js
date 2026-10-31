// 页面字体加载屏障：首次绘制和文字测量必须等指定字体成功解码。
import { i18nText } from '../i18n/index.js';
const pending = new WeakMap();

// 同一文档复用加载结果，内嵌试玩文档拥有自己的 FontFaceSet。
export function loadGameFont(root = document) {
  if (pending.has(root)) return pending.get(root);
  const task = (async () => {
    try {
      const family = root.defaultView.getComputedStyle(root.documentElement).getPropertyValue('--game-font-family').trim();
      if (!family || !root.fonts) throw Error('Game font is not configured');
      const faces = await root.fonts.load(`16px ${family}`, i18nText('index.d75694ae48'));
      if (!faces.length || faces.some(face => face.status !== 'loaded')) throw Error('Game font did not load');
      root.documentElement.dataset.fontStatus = 'ready';
    } catch (cause) {
      root.documentElement.dataset.fontStatus = 'error';
      const alert = root.createElement('p');
      alert.id = 'font-load-error';alert.setAttribute('role', 'alert');
      alert.textContent = i18nText('font.loadFailed');root.body.prepend(alert);
      for (const button of root.querySelectorAll('button')) button.disabled = true;
      throw new Error(i18nText('font.loadFailed'), { cause });
    }
  })();
  pending.set(root, task);
  return task;
}
