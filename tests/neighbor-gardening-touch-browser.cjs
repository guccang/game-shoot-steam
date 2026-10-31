// 独立触摸上下文验证窄屏购种和实际交付，使用4175正式服务，不读取用户浏览器数据。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.touchApp=(await import('/src/main.js')).application;await touchApp.ready;const {MAINLINE_IDS,MAINLINE_SITES}=await import('/src/config/mainline.js');
   const p=(await import('/src/progression/progress.js')).freshRangerProgress();p.arrival=null;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('neighbor-seed-shop'));p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.coins=100;p.farm.unlocked[0]=true;p.farm.delivery.nextAt=Date.now()+3600000;p.farm.wildMaps=['forest','jiuzhaigou'];
   const g=touchApp.game;g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.enemies=[];g.fireClock=99999;g.mainlineTalkDelay=0;Object.assign(g.player,MAINLINE_SITES.camp);for(const d of document.querySelectorAll('dialog[open]'))d.close();touchApp.renderer.camera.time=null;touchApp.refresh();
  });
  await page.locator('#mainline-speech-skip').waitFor({state:'visible'});await page.locator('#mainline-speech-skip').tap();
  await page.evaluate(async()=>{Object.assign(touchApp.game.player,(await import('/src/config/farm.js')).FARM_SEED_DOOR);touchApp.renderer.camera.time=null;touchApp.refresh();});
  await page.locator('#mainline-hud').tap();await page.locator('[data-buy-seed="0"][data-count="1"]').tap();await page.locator('[data-buy-seed="0"][data-count="1"]').tap();
  if(!await page.evaluate(()=>touchApp.game.progress.mainline.gardening.purchased===2&&touchApp.game.progress.coins===80))throw Error('触摸购买未推进或扣款不符');
  await page.locator('#seed-shop-close').tap();await page.evaluate(async()=>{Object.assign(touchApp.game.player,(await import('/src/config/mainline.js')).MAINLINE_SITES.camp);touchApp.game.mainlineTalkDelay=0;touchApp.renderer.camera.time=null;touchApp.refresh();});
  await page.locator('#mainline-speech-skip').waitFor({state:'visible'});await page.locator('#mainline-speech-pause').tap();
  if(await page.locator('#mainline-speech-skip').textContent()!=='交付种子并收谢礼')throw Error('交付动作没有清楚标示');
  const layout=await page.locator('#mainline-speech').evaluate(el=>{const r=el.getBoundingClientRect();return {overflow:el.scrollWidth>el.clientWidth+1,left:r.left,right:r.right,bottom:r.bottom,buttons:[...el.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height)};});
  if(layout.overflow||layout.left<0||layout.right>321||layout.bottom>569||layout.buttons.some(n=>n<44))throw Error('窄屏交付界面越界 '+JSON.stringify(layout));
  await page.screenshot({path:'output/playwright/neighbor-quests/07-touch-delivery-320.png'});await page.locator('#mainline-speech-skip').tap();
  if(!await page.evaluate(()=>touchApp.game.progress.farm.seeds[0]===4&&touchApp.game.progress.mainline.completed.includes('neighbor-seed-shop')))throw Error('触摸交付未扣种子');
  if(errors.length)throw Error(errors.join('\n'));return {passed:true,touch:true,layout,errors};
 }finally{await context.close();}
}
