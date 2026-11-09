// 真实点击接取、借装、照料、交付与购买；站点定位仅缩短长途往返，不伪造目标完成。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;for(const d of document.querySelectorAll('dialog[open]'))d.close();g.state='playing';g.mainlineTalkDelay=999;g.progress.living.requests['neighbors-market'].completed=true;const {STORY_POSTS}=await import('/src/config/story-posts.js');Object.assign(g.player,(await import('/src/core/story/story-posts.js')).storyPostApproach(STORY_POSTS[1]));a.living.open();a.refresh();});
 await page.locator('[data-living-tab="equipment"]').click();await page.locator('#living-dialog [data-equipment-story="equipment-water"]').click();
 await page.locator('[data-story-command="enter"]').click();await page.locator('#story-speech-skip').click();await page.locator('[data-story-loadout="equipment-water-loan"]').click();await page.locator('[data-story-command="start"]').click();
 // 真实键盘移动验证任务开启后可控制；动作时钟正常继续。
 const before=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {x:g.player.x,y:g.player.y};});
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');
 const moved=await page.evaluate(async b=>{const g=(await import('/src/main.js')).application.game;return Math.hypot(g.player.x-b.x,g.player.y-b.y);},before);if(moved<5)throw Error('故事开始后移动异常');
 // 站点夹具只定位；每个目标仍必须实际点击并等待交互完成。
 async function arrive(){return await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,def=(await import('/src/core/story/story-definition.js')).storyDefinition(g),o=g.storyObjective();Object.assign(g.player,{x:def.world.sites[o.site].x,y:def.world.sites[o.site].y+65});a.refresh();return g.story.stageId;});}
 async function reply(){await page.locator('#story-speech-skip').waitFor({state:'visible'});await page.locator('#story-speech-skip').click();}
 for(let i=0;i<5;i++){
  const stage=await arrive();
  if(stage!=='END')await page.locator('#story-interact').click();
  if(stage==='WATER'){
   await page.waitForTimeout(400);await page.screenshot({path:'output/playwright/equipment-quests/water-care-day-390.png'});
   samples.push(await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return (await import('/src/rendering/visual-review.js')).inspectEquipmentNeighborStories(a.game,document);}));
  }
  await reply();
 }
 await page.locator('[data-story-command="claim"]').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;if(!g.progress.story.chapters['equipment-water'].completed||g.progress.weapons[5])throw Error('任务交付不应直接赠枪');for(const d of document.querySelectorAll('dialog[open]'))d.close();g.state='playing';a.workshop.open('weapons',5);a.refresh();});
 if(await page.locator('#ws-purchase').isDisabled())throw Error('完成后未开放购买');await page.screenshot({path:'output/playwright/equipment-quests/water-unlocked-390.png'});
 await page.locator('#ws-purchase').click();
 await page.waitForFunction(async()=>{const g=(await import('/src/main.js')).application.game;return g.progress.weapons[5]>0;});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>await (await import('/src/main.js')).application.ready);
 const saved=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {owned:g.progress.weapons[5],completed:g.progress.story.chapters['equipment-water'].completed,run:g.progress.story.run};});
 if(!saved.owned||!saved.completed||saved.run)throw Error('刷新后所有权或交付记录丢失');if(errors.length)throw Error(errors.join(';'));
 return {moved,samples,saved,errors};
}
