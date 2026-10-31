// 目录与说明使用真实章节和记录，覆盖类型、锁定、已领取与文本转义。
import test from 'node:test';
import assert from 'node:assert/strict';
import {storyUnlocked} from '../src/core/story-definition.js';
import {freshProgress} from '../src/game.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {storyCatalogRow,storyChapterHelp} from '../src/ui/story-catalog.js';
import {storyRewardMarkup} from '../src/ui/story-rewards.js';
test('每个故事及委托有固定类型，目录仅显示标题、图标和辅助状态',()=>{
 const p=freshProgress();
 for(const def of Object.values(STORY_CAMPAIGN)){
  assert.ok(['story','commission'].includes(def.catalogType),def.id);
  const html=storyCatalogRow(def,p,def.id,storyUnlocked(p,def.id));
  assert.match(html,/aria-pressed="true"/);assert.match(html,/<svg/);
  assert.ok(html.includes((def.catalogType==='commission'?'委托':'故事')+'：'));
  assert.doesNotMatch(html,/首通|扮演栗子|story-rewards/);
 }
 assert.match(storyCatalogRow(STORY_CAMPAIGN['sunleaf-02'],p,'sunleaf-01',storyUnlocked(p,'sunleaf-02')),/disabled/);
 p.story.chapters['sunleaf-01'].completed=true;
 assert.doesNotMatch(storyCatalogRow(STORY_CAMPAIGN['sunleaf-02'],p,'sunleaf-01',storyUnlocked(p,'sunleaf-02')),/disabled/);
 p.story.run={chapterId:'sunleaf-01'};
 assert.match(storyCatalogRow(STORY_CAMPAIGN['sunleaf-02'],p,'sunleaf-01',storyUnlocked(p,'sunleaf-02')),/请先交付当前章节/);
});
test('已领取说明移到问号页，奖励预览不伪装成重玩仍可领取',()=>{
 const def=STORY_CAMPAIGN['sunleaf-01'],record={completed:true,rewardClaimed:true};
 assert.equal(storyRewardMarkup(def,record),'');
 const help=storyChapterHelp(def,record);
 assert.match(help,/首通奖励已领取/);assert.match(help,/暂离保存阶段/);assert.match(help,/免费借用/);assert.match(help,/600/);
 assert.match(storyRewardMarkup(def,null),/600/);
 const escaped=storyCatalogRow({...def,title:'<img onerror="oops">'},freshProgress(),def.id,true);
 assert.doesNotMatch(escaped,/<img/);assert.match(escaped,/&lt;img/);
});
