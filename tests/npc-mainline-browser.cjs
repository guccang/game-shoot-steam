// 主线当前人物的旧热点与自由闲聊热点互斥，正事仍需玩家主动选择。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress(),ids=(await import('/src/config/mainline.js')).MAINLINE_IDS,repairs=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS,people=await import('/src/core/camp-routines.js');
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=ids.filter(id=>id!=='first-map');p.mainline.currentId='first-map';p.mainline.phase='meet';p.restoration.repaired=repairs.map(r=>r.id);p.restoration.cottageRested=true;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineTalkDelay=999;g.mainlineSpeech=null;g.enemies=[];g.trees=[];g.vehicle.active=false;g.spawnTimer=g.fireClock=999;
   const actor=people.campResidents(g).find(n=>n.id==='mint');Object.assign(g.player,{x:actor.x,y:actor.y+65});a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('#mainline-npc').waitFor({state:'visible'});
  if(await page.locator('[data-camp-conversation=mint]').isVisible())throw Error('当前人物出现重复热点');
  await page.locator('#mainline-npc').tap();await page.locator('#npc-conversation-dialog[open]').waitFor();
  if(await page.locator('#npc-conversation-title').textContent()!=='青芽')throw Error('主线热点未转入本人闲聊');
  if(await page.evaluate(()=>a.game.progress.mainline.phase)!=='meet')throw Error('闲聊自动接取主线');
  // 横屏继续沿用底部滚动正文，姓名、关闭和接话按钮仍在可视范围。
  await page.setViewportSize({width:568,height:320});await page.waitForTimeout(100);
  const metrics=await page.locator('#npc-conversation-dialog').evaluate(n=>{const r=n.getBoundingClientRect(),copy=n.querySelector('.story-speech-copy').getBoundingClientRect();return {inside:r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,copyHeight:copy.height,buttons:[...n.querySelectorAll('button')].map(b=>{const p=b.getBoundingClientRect();return p.height>=44&&p.bottom<=r.bottom&&p.top>=r.top;})};});
  if(!metrics.inside||metrics.copyHeight<64||metrics.buttons.some(ok=>!ok))throw Error('横屏对白不能阅读 '+JSON.stringify(metrics));await page.screenshot({path:'output/playwright/npc-story-dialogue/landscape-mainline.png'});
  await page.locator('[data-npc-service]').tap();await page.waitForFunction(()=>a.game.state==='playing'&&a.game.mainlineSpeech?.id==='first-map');
  if(await page.evaluate(()=>a.game.progress.npcDialogue['camp:mint'].count)!==1)throw Error('进入正事重复记交情');
  // 进行中的任务没有主线对白，仍应从常驻人物的正事按钮打开任务详情。
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{a.game.progress.mainline.phase='doing';a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999;a.refresh();});
  await page.locator('[data-camp-conversation=mint]').tap();await page.locator('[data-npc-service]').tap();await page.locator('#mainline-dialog[open]').waitFor();
  if(await page.evaluate(()=>a.game.progress.npcDialogue['camp:mint'].count)!==2)throw Error('进行中任务入口错误');
  if(errors.length)throw Error(errors.join('\n'));return {mainlineService:true,noDuplicateHotspot:true,metrics,errors};
 }catch(error){await page.screenshot({path:'output/playwright/npc-story-dialogue/mainline-failure.png'});throw error;}finally{await context.close();}
}
