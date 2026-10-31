// 章节领奖流程专项：使用正式领取按钮、奖励弹窗和暂停管理器，不替换游戏界面。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];g.boss=null;g.vehicle.active=false;g.update=()=>{};window.persist=g.storyPersist;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();a.refresh();
   // 只建立第一章终点条件，实际保存、发奖和返回均走正式事务与按钮。
   window.prepareEnding=async(replay=false)=>{
    const g=a.game,post=(await import('/src/config/story-posts.js')).STORY_POSTS[0];g.storyPersist=persist;g.state='playing';Object.assign(g.player,{x:post.x+post.approach.dx,y:post.y+post.approach.dy});
    if(!replay){g.progress.story.chapters['sunleaf-01'].completed=false;g.progress.story.chapters['sunleaf-01'].rewardClaimed=false;}
    if(!g.enterStory('sunleaf-01',post.id))throw Error('无法建立章节终点');
    Object.assign(g.story,{stageId:'Q80',phase:'prepare',dialogue:null,readLines:['ending']});g.story.flags.silenced=true;g.state='story';window.walletBefore=g.progress.coins;a.refresh();
   };
   // 记录浏览器实际可绘制的状态，捕获结算前后多余任务簿与暂停页。
   window.watchFlow=()=>{window.flow={rewardOpens:0,catalogFrames:0,pauseFrames:0,watching:true};let rewardOpen=false;function sample(){if(!flow.watching)return;const open=document.getElementById('task-reward-dialog').open;if(open&&!rewardOpen)flow.rewardOpens++;rewardOpen=open;if(document.getElementById('story-dialog').open&&!a.game.story)flow.catalogFrames++;if(!document.getElementById('overlay').hidden)flow.pauseFrames++;requestAnimationFrame(sample);}requestAnimationFrame(sample);};
  });
  for(const mode of ['button','auto','escape','repeat']){
   await page.evaluate(()=>prepareEnding());await page.locator('[data-story-command="claim"]').waitFor({state:'visible'});await page.evaluate(()=>watchFlow());
   // 重复事件仍只结算一次，已结束章节不能被旧按钮重新打开目录。
   if(mode==='repeat')await page.locator('[data-story-command="claim"]').evaluate(node=>{node.click();node.click();});else await page.locator('[data-story-command="claim"]').tap();await page.locator('#task-reward-dialog').waitFor({state:'visible'});
   if(await page.locator('#story-dialog').isVisible()||await page.locator('#overlay').isVisible())throw Error('结算时仍显示任务簿或暂停页');
   if(!await page.evaluate(()=>a.game.progress.coins-walletBefore===600&&a.game.progress.story.chapters['sunleaf-01'].rewardClaimed))throw Error('实际奖励不符');
   if(mode==='button'||mode==='repeat'){await page.screenshot({path:'output/playwright/story-completion-flow/reward.png'});await page.locator('#task-reward-close').tap();}
   else if(mode==='escape')await page.keyboard.press('Escape');
   await page.locator('#task-reward-dialog').waitFor({state:'hidden',timeout:5000});await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]')&&document.getElementById('overlay').hidden);
   await page.waitForTimeout(180);const result=await page.evaluate(()=>{flow.watching=false;return {...flow,coins:a.game.progress.coins-walletBefore,story:!!a.game.story};});
   if(result.rewardOpens!==1||result.catalogFrames||result.pauseFrames||result.story||result.coins!==600)throw Error(JSON.stringify({mode,...result}));checks.push({mode,...result});
  }
  await page.screenshot({path:'output/playwright/story-completion-flow/back-in-game.png'});
  // 保存拒绝和异常均留在领取页，钱包与领奖记录不变，恢复存储后只弹一次结算。
  for(const failure of ['false','throw']){
   await page.evaluate(()=>prepareEnding());await page.locator('[data-story-command="claim"]').waitFor({state:'visible'});
   await page.evaluate(kind=>{a.game.storyPersist=()=>{if(kind==='throw')throw Error('测试保存失败');return false;};},failure);
   await page.locator('[data-story-command="claim"]').tap();await page.locator('[data-story-command="claim"]').waitFor({state:'visible'});
   if(!await page.evaluate(()=>a.game.story?.error&&a.game.progress.coins===walletBefore&&!a.game.progress.story.chapters['sunleaf-01'].rewardClaimed&&!document.getElementById('task-reward-dialog').open&&document.getElementById('overlay').hidden))throw Error('保存失败丢失重试入口或提前发奖');
   if(!(await page.locator('.story-error').innerText()).includes('保存失败'))throw Error('保存失败提示不可见');
   await page.evaluate(()=>{a.game.storyPersist=persist;watchFlow();});await page.locator('[data-story-command="claim"]').tap();await page.locator('#task-reward-dialog').waitFor({state:'visible'});await page.locator('#task-reward-close').tap();await page.waitForFunction(()=>a.game.state==='playing'&&!document.querySelector('dialog[open]'));
   const result=await page.evaluate(()=>{flow.watching=false;return {...flow,coins:a.game.progress.coins-walletBefore};});if(result.rewardOpens!==1||result.coins!==600||result.catalogFrames||result.pauseFrames)throw Error('重试后重复结算');checks.push({failure,...result});
  }
  // 重玩已领章节不再发奖，也不打开目录或暂停；主动暂离仍保留原暂停规则。
  await page.evaluate(()=>prepareEnding(true));await page.locator('[data-story-command="claim"]').tap();await page.waitForFunction(()=>!a.game.story&&a.game.state==='playing');await page.waitForTimeout(150);
  if(!await page.evaluate(()=>a.game.progress.coins===walletBefore&&!document.querySelector('dialog[open]')&&document.getElementById('overlay').hidden))throw Error('重玩重复发奖或留在暂停');
  await page.evaluate(()=>prepareEnding(true));await page.locator('[data-story-command="leave"]').tap();await page.waitForFunction(()=>!a.game.story&&a.game.state==='paused');
  if(errors.length)throw Error(errors.join('\n'));return {checks,replay:true,manualLeavePaused:true,errors};
 }finally{await context.close();}
}
