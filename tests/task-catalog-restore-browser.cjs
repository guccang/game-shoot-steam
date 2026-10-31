// 最终目录布局与既有已领取存档重载；浏览器正式自动射击补查道路两侧。
async page=>{
 if(new URL(page.url()).port!=='4254')throw Error('仅限任务气泡隔离端口4254；在统一对白专项后执行');
 // 窄屏菜单在每次打开面板后自动收起，重新打开时走真实菜单按钮。
 async function openTasks(){if(!await page.locator('#story-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();await page.locator('#story-button').click();}
 await page.evaluate(()=>{a.game.leaveStory();for(const d of document.querySelectorAll('dialog[open]'))d.close();a.game.state='playing';a.environment.livingPreview=false;a.game.livingPreview=false;a.save();a.destroy();});
 await page.reload();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});await page.locator('#start').click();
 if(await page.locator('[data-story-command="leave"]').isVisible())await page.locator('[data-story-command="leave"]').click();
 await page.evaluate(()=>{a.game.start();a.game.mainlineTalkDelay=999;Object.assign(a.game.player,{x:650,y:1840});a.refresh();});
 await openTasks();await page.locator('[data-task-request="neighbors-night"]').click();
 if(await page.locator('[data-living-track="neighbors-night"]').isEnabled())await page.locator('[data-living-track="neighbors-night"]').click();
 await page.locator('[data-living-tab="journal"]').click();await page.locator('#living-close').click();await page.waitForTimeout(150);
 await openTasks();await page.locator('[data-task-request="neighbors-night"]').click();
 if(!await page.locator('[data-living-track="neighbors-night"]').isVisible())throw Error('目录未返回委托页');
 await page.locator('#living-close').click();await page.waitForTimeout(150);await openTasks();
 const samples=[];
 for(const [width,height] of [[1280,900],[390,844],[320,740]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>{document.getElementById('story-dialog').scrollTop=0;});
  await page.screenshot({path:`output/playwright/task-dialogue/catalog-final-${width}.png`});
  await page.locator('[data-task-request="neighbors-night"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:`output/playwright/task-dialogue/accepted-final-${width}.png`});
  const state=await page.evaluate(()=>{const n=document.getElementById('story-dialog');return {overflow:n.scrollWidth>n.clientWidth+1,rect:n.getBoundingClientRect().toJSON(),states:[...n.querySelectorAll('.story-neighbor-row')].map(x=>x.textContent),tracking:a.game.progress.taskTracking};});
  if(state.overflow||state.rect.left<0||state.rect.right>width||!state.states[0].includes('已领取')||!state.states[1].includes('正在追踪'))throw Error('目录状态或布局异常');
  samples.push({width,...state});
 }
 await page.locator('#story-close').click();await page.waitForTimeout(150);
 if(!await page.evaluate(()=>a.game.state==='playing'))throw Error('关闭目录没有恢复原来的游玩状态');
 // 使用正式自动更新和弹丸命中，不直接扣除生命；保留森林原地形及树木。
 const combat=[];
 for(const side of [-1,1]){
  const before=await page.evaluate(side=>{const g=a.game;g.enemies=[];g.boss=null;g.mainlineTalkDelay=999;Object.assign(g.player,{x:690,y:1250,aimInitialized:false});const e=g.spawnEnemy(0,0,{x:690+side*100,y:1250},{ambient:true});window.roadEnemy=e;return e.hp;},side);
  await page.waitForTimeout(1200);const hp=await page.evaluate(()=>window.roadEnemy.hp);combat.push({side,before,hp});
  if(hp>=before)throw Error('道路两侧自动攻击未命中 '+side);
 }
 return {samples,combat};
}
