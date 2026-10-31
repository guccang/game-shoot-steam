// 风格预载与缓存释放集中管理；缺失资源不替换当前画面。
import { artStyle, commitArtStyle, persistArtStyle, ART_STYLES } from './state.js';
import { loadCozyCottage } from '../rendering/cozy-cottage.js';
import { clearArtStyleCache as clearLiving } from '../rendering/living-world.js';
import { clearArtStyleCache as clearMonsters } from '../rendering/monster-atlas.js';
import { clearArtStyleCache as clearTerrain } from '../rendering/natural-terrain.js';
import { clearArtStyleCache as clearScenery } from '../rendering/scenery.js';
import { clearArtStyleCache as clearProps } from '../rendering/story-props.js';
import { clearArtStyleCache as clearTrees } from '../rendering/tree-art.js';
let switching = false;
// 必需图片就绪后原子更换风格；游戏对象及其动作时钟保持不动。
export async function switchArtStyle(id) {
  if (!ART_STYLES.some((s) => s.id === id)) throw Error('未知美术风格');
  if (switching) throw Error('正在切换，请稍候');
  if (id === artStyle()) return { changed: false, saved: true };
  switching = true;
  try {
    await loadCozyCottage(id);
    clearLiving();
    clearMonsters();
    clearTerrain();
    clearScenery();
    clearProps();
    clearTrees();
    commitArtStyle(id);
    return { changed: true, saved: persistArtStyle(id) };
  } finally {
    switching = false;
  }
}
