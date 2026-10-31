// 故事的临时地形限制来自章节表；暂离但未交付的任务仍保留维修现场。
import {storyDefinition} from './story-definition.js';
export function storyWorldBarriers(game){
 if(game.mapId!=='forest'||game.realm)return [];
 const run=game.story||game.progress.story?.run;
 return run?storyDefinition(run).world.barriers||[]:[];
}
// 运行时刚体和寻路共享同一份限制，恢复森林现场后也立即同步。
export function syncStoryWorld(game){game.player.worldBarriers=storyWorldBarriers(game);}
