// 在同一隔离浏览器先执行 task-panel-actions-browser.cjs，再补查入职、邻里、清缴与故事正文。
async page=>{
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(()=>{if(a.game.story)a.game.leaveStory();});
 for(const phase of ['letter','ride-guide','gather','craft']){
  await page.evaluate(async phase=>{
   await taskScene('first-map');const {freshRangerProgress}=await import('/src/progression/progress.js');
   const p=freshRangerProgress();p.arrival.phase=phase;p.arrival.keys=true;p.arrival.elapsed=99;p.mainline.navigationEnabled=false;
   a.game.progress=p;a.game.reset();a.game.state='playing';a.game.mainlineSpeech=null;a.refresh();a.renderer.draw();
  },phase);
  await page.locator('#arrival-goal').click();
  const state=await page.evaluate(()=>({dialog:document.querySelector('dialog[open]')?.id,navigation:a.game.progress.mainline.navigationEnabled}));
  const expected={letter:'arrival-letter-dialog','ride-guide':'phone-dialog',gather:'arrival-workshop-dialog',craft:'workshop-dialog'}[phase];
  if(state.dialog!==expected||state.navigation)throw Error(phase+JSON.stringify(state));results.push({phase,...state});
 }
 await page.evaluate(async()=>{
  await taskScene('first-patrol',true);const {clearingSite}=await import('/src/progression/clearing-site.js');
  a.game.progress.living.patrolActive=true;Object.assign(a.game.player,clearingSite(a.game.progress));a.refresh();a.renderer.draw();
 });
 await page.locator('#quest').click({position:{x:12,y:12}});await page.locator('#wave-help-dialog').waitFor({state:'visible'});
 if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled))throw Error('波次详情恢复寻路');
 await page.locator('#wave-help-close').click();await page.locator('#wave-help').click();
 if(await page.locator('dialog[open]').count()!==1)throw Error('内嵌问号触发双重面板');
 await page.locator('#wave-help-close').click();results.push({clearingBody:true,embeddedHelp:true});
 await page.evaluate(async()=>{
  await taskScene('first-letter');a.game.progress.living.requests['neighbors-lunch'].stage=2;
  a.game.progress.taskTracking={kind:'living',id:'neighbors-lunch'};a.refresh();
 });
 await page.locator('#mainline-hud').click();await page.locator('#living-dialog').waitFor({state:'visible'});
 if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled))throw Error('邻里详情恢复寻路');
 results.push({neighborBody:true});
 await page.evaluate(async()=>{
  await taskScene('first-letter');const {STORY_POSTS}=await import('/src/config/story-posts.js');
  const post=STORY_POSTS.find(p=>p.chapters.includes('sunleaf-01'));Object.assign(a.game.player,{x:post.x,y:post.y});
  if(!a.game.enterStory('sunleaf-01',post.id))throw Error('故事夹具进入失败');
  a.game.advanceStoryDialogue(true);a.game.chooseStoryLoadout('line-patrol');a.game.startStoryStage();
  for(const d of document.querySelectorAll('dialog[open]'))d.close();a.game.state='playing';a.refresh();a.renderer.draw();
 });
 await page.locator('#quest').click({position:{x:12,y:12}});await page.locator('#story-dialog').waitFor({state:'visible'});
 if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled))throw Error('故事详情恢复寻路');
 await page.screenshot({path:'output/playwright/task-panel-actions/story-details-320.png'});results.push({storyBody:true});
 await page.locator('#story-close').click();
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
