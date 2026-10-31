// 营地委托只要求进入对应秘境，战斗成果与正式奖励仍由秘境规则结算。
import {STORY_CAMPAIGN} from '../config/story-campaign.js';
// 只记录匹配的实际秘境会话；重复调用不重复保存或发奖。
export function recordStoryExcursion(game){const r=game.progress.story?.run,realm=game.realm;
  if(!r||!realm)return;const spec=STORY_CAMPAIGN[r.chapterId]?.nodes[r.stageId]?.excursion;
  if(!spec||realm.mode!==spec.mode||r.flags[spec.flag])return;
  r.flags[spec.flag]=true;game.onEvent('story-change');}

// 只允许匹配且已进入的秘境委托自动返回；普通秘境与其他章节继续原结算。
export function readyStoryExcursion(game,mode=game.realm?.mode){
  const run=game.progress.story?.run,def=STORY_CAMPAIGN[run?.chapterId];
  const spec=Object.values(def?.nodes||{}).find(node=>node.excursion)?.excursion;
  return !!spec&&spec.mode===mode&&run.flags[spec.flag]===true;
}
