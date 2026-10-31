// 恢复只重建派生像素，原始图片、游戏进度、角色动作和环境时钟保留。
import {canvasRecoveryRevision} from './canvas-recovery.js';
import {clearArtStyleCache as living} from './living-world.js';
import {clearArtStyleCache as monsters} from './monster-atlas.js';
import {clearArtStyleCache as terrain} from './natural-terrain.js';
import {clearArtStyleCache as scenery} from './scenery.js';
import {clearArtStyleCache as props} from './story-props.js';
import {clearArtStyleCache as trees} from './tree-art.js';
import {clearWeatherAtlas} from './weather-atlas.js';
import {seasonRasterStats} from './season-raster.js';
import {catSprites} from './cat-animation.js';
let recovered=canvasRecoveryRevision();
// 同一批多个画布事件合并到下一次绘制，多个渲染器也只清理一次共享图集。
export function recoverSharedRenderCaches(){
 const revision=canvasRecoveryRevision();if(recovered===revision)return false;
 recovered=revision;
 living();monsters();terrain();scenery();props();trees();clearWeatherAtlas();
 catSprites.coats.clear();seasonRasterStats(true);
 return true;
}
