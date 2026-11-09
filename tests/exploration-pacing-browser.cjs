// 手机真实页面验收：使用正式任务与交易入口，测试存储位于隔离浏览器会话。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.reset();g.state='playing';g.arrivalScene=null;g.vehicle.active=false;g.enemies=[];g.boss=null;
  g.progress.restoration.repaired=['clearing','story'];g.progress.mainline.currentId='first-map';g.progress.mainline.phase='report';g.progress.mainline.seen.map=1;g.progress.mainline.distance=80;
  Object.assign(g.player,(await import('/src/config/mainline.js')).MAINLINE_SITES.camp);
  window.realUpdate=g.update.bind(g);g.update=()=>{};
  if(!(await import('/src/core/story/mainline-manager.js')).completeMainline(g))throw Error('交付失败');
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time:'day',forestSeason:'summer'});a.refresh();
 });
 // 从用户可见菜单进入巡林簿，关闭任务卡后仍有主动恢复入口。
 await page.getByRole('button',{name:'展开功能菜单',exact:true}).click();
 await page.getByRole('button',{name:'任务簿：主线、故事与邻里委托',exact:true}).click();
 await page.getByRole('button',{name:'打开巡林簿',exact:true}).click();
 await page.locator('#mainline-dialog').waitFor({state:'visible'});
 if(!await page.locator('#mainline-current').innerText().then(t=>t.includes('自由探索')))throw Error('缺少探索状态');
 const samples=[];
 for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   a.environment.time=time;a.game.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
  },time);
  await page.waitForTimeout(150);
  const info=await page.locator('#mainline-dialog').evaluate(d=>({overflow:document.documentElement.scrollWidth>innerWidth,rect:{width:d.getBoundingClientRect().width,height:d.getBoundingClientRect().height},buttons:[...d.querySelectorAll('.mainline-book-actions button')].filter(b=>!b.hidden).map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,x:r.x,y:r.y,w:r.width,h:r.height};})}));
  if(info.overflow||info.buttons.some(b=>b.w<44||b.h<44||b.x<0||b.y<0||b.x+b.w>width+1||b.y+b.h>height+1))throw Error(JSON.stringify({width,height,time,info}));
  samples.push({width,height,time,info});
  await page.screenshot({path:`output/playwright/exploration-pacing/book-${width}-${time}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('#mainline-choices summary').click();
 if(await page.locator('[data-mainline-select]').count()!==40)throw Error('自选数量错误');
 await page.locator('[data-mainline-select="football-day"]').click();
 if(!await page.locator('#mainline-current').innerText().then(t=>t.includes('今天不把球当怪物')))throw Error('自选未切换');
 await page.screenshot({path:'output/playwright/exploration-pacing/optional.png'});
 await page.locator('[data-mainline-select="first-patrol"]').click();
 await page.locator('#mainline-pause').click();
 if(await page.locator('#mainline-hud').isVisible())throw Error('探索仍有任务卡');
 await page.evaluate(()=>{a.save();});
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 if(!await page.evaluate(()=>a.game.progress.mainline.trackingPaused))throw Error('刷新丢失自由探索');
 if(await page.locator('#mainline-hud').isVisible()||await page.locator('#operation-guide').isVisible())throw Error('刷新后引导抢回');
 // 恢复真实更新，走路后仍没有被主线对白打断。
 const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(700);await page.keyboard.up('ArrowRight');
 const after=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,speech:a.game.mainlineSpeech}));
 if(after.x===before.x&&after.y===before.y||after.speech)throw Error('探索移动被阻挡');
 await page.screenshot({path:'output/playwright/exploration-pacing/free-exploration.png'});
 if(errors.length)throw Error(errors.join('\n'));
 return {samples,optional:40,reload:true,movement:true,errors};
}
