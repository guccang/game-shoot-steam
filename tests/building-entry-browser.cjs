// 隔离实机：真实三秒候停与取消，建筑点击和自动入口使用同一运行时。
async page=>{
 if(new URL(page.url()).port!=='4283')throw Error('仅限隔离端口4283');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.enemies=[];a.game.spawnTimer=a.game.fireClock=999;});await page.setViewportSize({width:390,height:844});
 // 清缴告示牌移动取消，重新停稳三秒后只打开面板，绝不自动接任务。
 await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/building-entries.js')).BUILDING_ENTRIES.find(e=>e.id==='clearing'),{vx:0,vy:0});a.renderer.camera.time=null;});
 await page.waitForFunction(()=>a.game.buildingEntry?.elapsed>.4);await page.keyboard.down('ArrowRight');await page.waitForTimeout(180);await page.keyboard.up('ArrowRight');
 if(!await page.evaluate(()=>!a.game.buildingEntry))throw Error('移动未取消');
 await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/building-entries.js')).BUILDING_ENTRIES.find(e=>e.id==='clearing'),{vx:0,vy:0}));
 await page.waitForFunction(()=>a.game.buildingEntry?.elapsed>1);await page.screenshot({path:'output/playwright/building-entry-countdown/clearing-live.png'});await page.locator('#clearing-dialog').waitFor({state:'visible',timeout:6500});
 if(await page.evaluate(()=>a.game.progress.living.patrolActive))throw Error('自动接取清缴');
 await page.locator('#clearing-close').click();await page.waitForTimeout(3300);if(await page.locator('#clearing-dialog').isVisible())throw Error('关闭后原地重弹');
 await page.locator('#clearing-marker').focus();await page.keyboard.press('Enter');await page.locator('#clearing-dialog').waitFor({state:'visible'});await page.locator('#clearing-close').click();checks.push('清缴候停、移开取消、关闭不重弹且仍可点击');
 // 告示牌、消防站和守门盾牌仅打开既有选择页，不替用户确认挑战。
 for(const [id,dialog,close] of [['post-sunleaf-post','story-dialog','story-close'],['post-monster-neighbors','living-dialog','living-close'],['realm-fire','fire-dialog',null],['gate-top','camp-defense-dialog','camp-close'],['gate-left','camp-defense-dialog','camp-close']]){
  await page.evaluate(async id=>{const g=a.game;g.buildingEntry=g.buildingEntryLatch=null;Object.assign(g.player,(await import('/src/config/building-entries.js')).BUILDING_ENTRIES.find(e=>e.id===id),{vx:0,vy:0});g.enemies=[];g.spawnTimer=g.fireClock=999;a.renderer.camera.time=null;},id);
  await page.waitForFunction(()=>a.game.buildingEntry?.elapsed>.5);await page.screenshot({path:`output/playwright/building-entry-countdown/${id}-live.png`});
  await page.locator('#'+dialog).waitFor({state:'visible',timeout:6500});await page.screenshot({path:`output/playwright/building-entry-countdown/${id}-opened.png`});
  await (close?page.locator('#'+close):page.locator('[data-fire-close]')).click();await page.waitForTimeout(3300);
  if(await page.locator('#'+dialog).isVisible())throw Error(id+' 关闭后重弹');checks.push(id+' 自动开页并保持关闭');
 }
 // 三座秘境建筑进入原场景，返回原地点不会自动再次进入。
 for(const mode of ['tower','rogue','guardian']){
  await page.evaluate(async mode=>{const g=a.game;g.buildingEntry=g.buildingEntryLatch=null;Object.assign(g.player,(await import('/src/config/building-entries.js')).BUILDING_ENTRIES.find(e=>e.id==='realm-'+mode),{vx:0,vy:0});g.enemies=[];g.spawnTimer=g.fireClock=999;a.renderer.camera.time=null;},mode);
  await page.waitForFunction(()=>a.game.buildingEntry?.elapsed>.4);await page.waitForFunction(mode=>a.game.realm?.mode===mode,mode,{timeout:6500});
  await page.screenshot({path:`output/playwright/building-entry-countdown/realm-${mode}-entered.png`});
  await page.evaluate(()=>{a.game.leaveRealm();for(const d of document.querySelectorAll('dialog[open]'))d.close();a.game.start();a.refresh();});await page.waitForTimeout(3300);
  if(await page.evaluate(()=>!!a.game.realm))throw Error(mode+' 返回后自动重入');checks.push(mode+' 三秒进入及返回防重复');
 }
 // 小屋仍可候门、出门与床边候睡，正式徽记应始终在人物头顶。
 await page.evaluate(async()=>{const g=a.game;Object.assign(g.player,(await import('/src/config/cottage.js')).COTTAGE.door,{vx:0,vy:0});g.cottageDoorLatch=false;g.enemies=[];g.spawnTimer=g.fireClock=999;a.renderer.camera.time=null;});await page.waitForFunction(()=>a.game.cottageEntry>.5);
 if(!await page.evaluate(()=>a.renderer.actionCountdownView?.icon==='home'))throw Error('进门头顶徽记缺失');
 await page.waitForFunction(()=>!!a.game.cottage,null,{timeout:6500});
 await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>a.game.player.y>=330);await page.keyboard.up('ArrowDown');await page.waitForFunction(()=>a.renderer.actionCountdownView?.icon==='exit');
 await page.screenshot({path:'output/playwright/building-entry-countdown/home-exit-live.png'});await page.waitForFunction(()=>!a.game.cottage,null,{timeout:6500});
 await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/cottage.js')).COTTAGE.door);});await page.locator('#cottage-enter').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>!!a.game.cottage);
 await page.evaluate(()=>Object.assign(a.game.player,{x:150,y:170,vx:0,vy:0}));await page.waitForFunction(()=>a.renderer.actionCountdownView?.icon==='bed');await page.locator('#cottage-rest-dialog').waitFor({state:'visible',timeout:6500});
 await page.locator('#cottage-rest-cancel').click();await page.waitForTimeout(3300);if(await page.locator('#cottage-rest-dialog').isVisible())throw Error('休息取消后重弹');checks.push('小屋三秒进出、床边候睡和点击进入');
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'building-entry-countdown',checks,errors};
}
