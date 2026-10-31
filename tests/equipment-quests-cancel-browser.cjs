// 装备故事兼容章节取消：现场管理按钮、确认、归还借装及刷新不得授予资格。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.reload();await page.locator('#start').click();await page.evaluate(async()=>await(await import('/src/main.js')).application.ready);await page.setViewportSize({width:320,height:568});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;for(const d of document.querySelectorAll('dialog[open]'))d.close();if(g.story)g.leaveStory();g.progress.story.run=null;g.state='playing';g.mainlineTalkDelay=999;g.mainlineSpeech=null;
  const def=(await import('/src/config/story-campaign.js')).STORY_CAMPAIGN['equipment-spider'];for(const key of def.requires)g.progress.story.chapters[key].completed=true;
  const posts=await import('/src/core/story-posts.js'),post=posts.storyPostForChapter(g,def.id);Object.assign(g.player,posts.storyPostApproach(post));if(!g.enterStory(def.id))throw Error('接取失败');g.advanceStoryDialogue(true);g.chooseStoryLoadout(def.loadouts[0].id);g.startStoryStage();Object.assign(g.player,posts.storyPostApproach(post));a.refresh();
 });
 await page.locator('#nearby-interaction').waitFor({state:'visible'});await page.locator('#nearby-interaction').click();await page.locator('[data-story-command="cancel"]').click();
 await page.screenshot({path:'output/playwright/equipment-quests/equipment-cancel-320.png'});await page.locator('[data-story-command="confirm-cancel"]').click();
 const cancelled=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {active:!!g.story,saved:!!g.progress.story.run,owned:g.progress.weapons[16],completed:g.progress.story.chapters['equipment-spider'].completed};});
 if(cancelled.active||cancelled.saved||cancelled.owned||cancelled.completed)throw Error(JSON.stringify(cancelled));
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;if(a.game.story||a.game.progress.story.run)throw Error('取消后刷新恢复任务');});if(errors.length)throw Error(errors.join(';'));return {cancelled,errors};
}
