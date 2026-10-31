// 隔离端口执行正式场景点击回归；停留不触发、实际按钮打开与移动保持可用。
async page=>{
 if(new URL(page.url()).port!=='4291')throw Error('仅限隔离端口4291');
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true,parked:false};
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.enemies=[];a.game.spawnTimer=a.game.fireClock=999;});
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/cottage.js')).COTTAGE.door,{vx:0,vy:0});a.renderer.camera.time=null;});
 await page.locator('#nearby-interaction').waitFor({state:'visible'});
 await page.waitForTimeout(3600);
 if(await page.evaluate(()=>!!a.game.cottage))throw Error('站立仍自动进屋');
 await page.locator('#nearby-interaction').click();await page.waitForFunction(()=>!!a.game.cottage);
 // 在正式房间里通过键盘走到床边，检验触控按钮没有阻断行走。
 await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>a.game.player.y<190);await page.keyboard.up('ArrowUp');
 await page.keyboard.down('ArrowLeft');await page.waitForFunction(()=>a.game.player.x<152);await page.keyboard.up('ArrowLeft');
 await page.waitForFunction(()=>document.getElementById('nearby-interaction').dataset.target==='rest');
 await page.waitForTimeout(3500);if(await page.locator('#cottage-rest-dialog').isVisible())throw Error('床边仍自动弹窗');
 await page.screenshot({path:'output/playwright/click-bed-mobile.png'});
 await page.locator('#nearby-interaction').click();await page.locator('#cottage-rest-dialog').waitFor({state:'visible'});
 await page.locator('#cottage-rest-cancel').click();await page.locator('#nearby-interaction').click();
 await page.locator('#cottage-rest-dialog').waitFor({state:'visible'});await page.locator('#cottage-rest-cancel').click();
 await page.locator('#cottage-exit').click();await page.waitForFunction(()=>!a.game.cottage);
 // 各类入口保持原功能，点击只打开原选择页，不替用户接受委托。
 const checks=[];
 for(const [id,dialog,close] of [['clearing','clearing-dialog','#clearing-close'],['post-sunleaf-post','story-dialog','#story-close'],['post-monster-neighbors','living-dialog','#living-close'],['realm-fire','fire-dialog','[data-fire-close]'],['gate-top','camp-defense-dialog','#camp-close']]){
  await page.evaluate(async id=>{const g=a.game;Object.assign(g.player,(await import('/src/config/building-entries.js')).BUILDING_ENTRIES.find(e=>e.id===id),{vx:0,vy:0});g.enemies=[];g.spawnTimer=g.fireClock=999;a.renderer.camera.time=null;},id);
  await page.waitForFunction(id=>document.getElementById('nearby-interaction').dataset.target===id,id);
  await page.waitForTimeout(3300);if(await page.locator('#'+dialog).isVisible())throw Error(id+' 自动弹出');
  await page.locator('#nearby-interaction').click();await page.locator('#'+dialog).waitFor({state:'visible'});
  await page.locator(close).first().click();checks.push(id);
 }
 return {checks,room:'鼠标点击入屋、键盘行走、床边点击与原地重开通过'};
}
