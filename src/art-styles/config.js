// 两套风格仅提供普通数据；绘制、动画与交互均由同一套正式模块执行。
import classic from './classic/profile.json' with { type: 'json' };
import clear from './clear/profile.json' with { type: 'json' };
import { artStyle, onArtStyleChange } from './state.js';

// 深冻结配置，防止某次绘制或调试意外污染后续场景。
function freezeProfile(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeProfile);
    Object.freeze(value);
  }
  return value;
}
export const ART_PROFILES = freezeProfile({ classic, clear });
// 使用模块实时绑定，切换后调用者无需重建绘制器或复制一份逻辑。
export let style = ART_PROFILES[artStyle()];
onArtStyleChange((id) => {
  style = ART_PROFILES[id];
});
