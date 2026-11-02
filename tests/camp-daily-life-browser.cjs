// 正式手机画面采样：真实运行工作、行走和轮流聊天，并核对自由探索与触控。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  window.routines=await import('/src/core/camp-routines.js');const g=a.game;
  g.progress=(await import('/src/progression/progress.js')).freshProgress();g.reset();g.state='playing';g.vehicle.active=false;g.enemies=[];g.boss=null;g.campActors=null;g.campRoutine=null;
  g.progress.mainline.trackingPaused=true;g.progress.taskTracking={kind:'none'};window.realUpdate=g.update.bind(g);g.update=()=>{};
  routines.updateCampRoutines(g,.04);window.beforeCampProgress=JSON.stringify({mainline:g.progress.mainline,tracking:g.progress.taskTracking});
  Object.assign(a.environment,{livingPreview:true,autoSeason:false,autoTime:false,autoWeather:false,time:'day',weather:'sun',forestSeason:'summer'});
  Object.assign(g.player,{x:735,y:600,vx:0,vy:0});a.renderer.camera.time=null;a.refresh();
 });
 const samples=[];
 // 正常倍率同屏复核四种岗位；白天长屏与夜晚短屏均保留既有手机布局。
 for(const width of [320,390])for(const time of ['day','night'])for(const id of ['mint','oak','wheel','lumi']){
  await page.setViewportSize({width,height:width===320?568:844});
  await page.evaluate(async({id,time})=>{
   const g=a.game,p=g.campActors.get(id);Object.assign(g.player,{x:p.x+55,y:p.y+55});
   a.environment.time=time;g.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
  },{id,time});
  await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/camp-daily-life/work-${id}-${width}-${time}.png`});samples.push({width,time,id});
 }
 await page.setViewportSize({width:390,height:844});
 // 连续工作帧来自正式游戏更新；小手和工具随时钟运动，身体仍使用真实待机帧。
 await page.evaluate(()=>{const g=a.game,p=g.campActors.get('lumi');Object.assign(g.player,{x:p.x+55,y:p.y+55});a.renderer.camera.time=null;g.update=realUpdate;a.refresh();});
 for(let i=0;i<3;i++){await page.waitForTimeout(300);await page.screenshot({path:`output/playwright/camp-daily-life/work-motion-${i}.png`});}
 await page.evaluate(()=>{
  const g=a.game;g.update=()=>{};g.progress.living.calendar={day:1,elapsed:400000};a.environment.time='day';
  for(let i=0;i<180&&g.campRoutine.time<7.04;i++)routines.updateCampRoutines(g,.04);
  const p=g.campActors.get('mint');Object.assign(g.player,{x:p.x+50,y:p.y+55});a.renderer.camera.time=null;g.update=realUpdate;a.refresh();
 });
 const start=await page.evaluate(()=>({x:a.game.campActors.get('mint').x,time:a.game.campActors.get('mint').motion.moveTime,clock:a.game.campActors.get('wheel').clock}));
 for(let i=0;i<4;i++){await page.waitForTimeout(350);await page.screenshot({path:`output/playwright/camp-daily-life/walk-${i}.png`});}
 const end=await page.evaluate(()=>({x:a.game.campActors.get('mint').x,time:a.game.campActors.get('mint').motion.moveTime,clock:a.game.campActors.get('wheel').clock}));
 if(Math.abs(end.x-start.x)<10||end.time<=start.time||end.clock<=start.clock)throw Error('正式游戏未推进走动与劳动时钟');
 // 用正式日常规则等到会面，再恢复实时模拟记录两人的轮流短句。
 await page.evaluate(()=>{
  const g=a.game;g.update=()=>{};
  for(let i=0;i<2000&&!routines.campConversation(g);i++)routines.updateCampRoutines(g,.04);
  const chat=routines.campConversation(g);if(!chat)throw Error('伙伴未能真实会面');
  const p=chat.actor;Object.assign(g.player,{x:p.x+45,y:p.y+80});a.renderer.camera.time=null;g.update=realUpdate;a.refresh();
 });
 await page.waitForTimeout(400);const first=await page.locator('#resident-chatter').textContent();
 if(!await page.locator('#resident-chatter').isVisible())throw Error('会面闲聊不可见');
 await page.screenshot({path:'output/playwright/camp-daily-life/chat-first.png'});
 const touch=await page.locator('#resident-chatter').evaluate(node=>{const r=node.getBoundingClientRect();return {events:getComputedStyle(node).pointerEvents,intercepts:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===node};});
 if(touch.events!=='none'||touch.intercepts)throw Error('闲聊拦截触控');
 await page.waitForTimeout(6300);const second=await page.locator('#resident-chatter').textContent();
 if(second===first)throw Error('没有轮流说话');await page.screenshot({path:'output/playwright/camp-daily-life/chat-reply.png'});
 // 短屏下也使用同一闲聊气泡，空间不足宁可隐藏，不覆盖 HUD 或移动控制。
 await page.evaluate(()=>a.game.update=()=>{});
 for(const time of ['day','night']){
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(async time=>{a.environment.time=time;a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);
  await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/camp-daily-life/chat-320-${time}.png`});
 }
 const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectCampDailyLife(a.game,a.renderer,document));
 if(review.actors.length!==4||review.speech.pointerEvents!=='none'||review.modal)throw Error('正式绘制器验收不通过');
 await page.evaluate(()=>a.game.update=realUpdate);
 const state=await page.evaluate(()=>({unchanged:beforeCampProgress===JSON.stringify({mainline:a.game.progress.mainline,tracking:a.game.progress.taskTracking}),speech:a.game.mainlineSpeech,dialogs:[...document.querySelectorAll('dialog[open]')].map(n=>n.id),actors:a.game.campActors.size}));
 if(!state.unchanged||state.speech||state.dialogs.length||state.actors!==4)throw Error('日常打断了自由探索：'+JSON.stringify(state));
 await page.evaluate(()=>a.game.pause());const paused=await page.evaluate(()=>a.game.campRoutine.time);await page.waitForTimeout(350);if(await page.evaluate(()=>a.game.campRoutine.time)!==paused)throw Error('暂停仍活动');await page.evaluate(()=>a.game.pause());
 if(errors.length)throw Error(errors.join('\n'));
 return {samples:samples.length,start,end,first,second,touch,state,review,errors};
}
