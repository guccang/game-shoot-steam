// 正式浏览器交付验收：检查点只准备前置，抵达用真实移动，交付点击走原有面板。
async page=>{
 if(new URL(page.url()).port!=='4267')throw Error('仅用于4267隔离端口');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.setViewportSize({width:1280,height:900});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,def=(await import('/src/config/story-campaign.js')).STORY_CAMPAIGN['sunleaf-01'];if(!g.enterStory('sunleaf-01'))throw Error('无法进入故事');Object.assign(g.story,{stageId:'Q80',phase:'active',dialogue:null,interacting:0,readLines:[]});g.story.flags.silenced=true;g.state='playing';g.enemies=[];g.boss=null;g.vehicle.active=false;Object.assign(g.player,{x:def.world.sites.CAMP.x,y:def.world.sites.CAMP.y+140});a.refresh();});
 if(await page.locator('#story-dialog').isVisible())throw Error('远处提前弹出');
 await page.keyboard.down('KeyW');await page.waitForTimeout(800);await page.keyboard.up('KeyW');
 await page.locator('#story-speech').waitFor({state:'visible'});await page.locator('[data-story-command="claim"]').waitFor({state:'visible',timeout:45000});
 checks.push('桌面真实步行抵达，自动对白结束打开领奖页，无任务UI点击');await page.screenshot({path:'output/playwright/automatic-task-handoff/story-desktop.png'});
 await page.locator('#story-close').click();await page.waitForTimeout(800);if(await page.locator('#story-dialog').isVisible())throw Error('关闭后反复弹窗');checks.push('领奖页关闭不反复弹出');
 await page.locator('#story-button').click();await page.locator('[data-story-command="claim"]').click();
 if(!await page.evaluate(async()=>(await import('/src/main.js')).application.game.progress.story.chapters['sunleaf-01'].rewardClaimed))throw Error('未领取');
 // 完成只显示奖励，关闭后直接巡林，不再自动打开任务簿。
 await page.locator('#task-reward-dialog').waitFor({state:'visible'});await page.locator('#task-reward-close').click();
 await page.setViewportSize({width:390,height:900});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,{residentFor}=await import('/src/core/living-world.js');g.progress.living.requests['neighbors-lunch'].stage=3;g.progress.taskTracking={kind:'living',id:'neighbors-lunch'};const npc=residentFor(g,'cook');Object.assign(g.player,{x:npc.x,y:npc.y+180});g.enemies=[];g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;a.refresh();});
 await page.keyboard.down('KeyW');await page.locator('#living-dialog').waitFor({state:'visible',timeout:10000});await page.keyboard.up('KeyW');
 const action=page.locator('[data-living-do="neighbors-lunch"]');if(!await action.isVisible())throw Error('打开的不是交接面板');
 await page.screenshot({path:'output/playwright/automatic-task-handoff/living-mobile.png'});checks.push('手机抵达最后交接人自动打开对应委托');
 await page.locator('#living-close').click();await page.waitForTimeout(800);if(await page.locator('#living-dialog').isVisible())throw Error('邻里面板反复弹出');
 await page.keyboard.down('KeyS');await page.waitForTimeout(1000);await page.keyboard.up('KeyS');
 await page.locator('#settings-button').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,npc=(await import('/src/core/living-world.js')).residentFor(g,'cook');Object.assign(g.player,{x:npc.x,y:npc.y+60});a.refresh();});
 if(await page.locator('#living-dialog').isVisible())throw Error('抢占设置页');await page.keyboard.press('Escape');await page.locator('#living-dialog').waitFor({state:'visible'});checks.push('离开再到达可重新交接，其他菜单期间延后弹出');
 const coins=await page.evaluate(async()=>(await import('/src/main.js')).application.game.progress.coins);await action.click();
 const result=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {coins:g.progress.coins,completed:g.progress.living.requests['neighbors-lunch'].completed};});if(!result.completed||result.coins!==coins+300)throw Error('邻里交付奖励错误');checks.push('确认交付后奖励正常入账');
 if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
}
