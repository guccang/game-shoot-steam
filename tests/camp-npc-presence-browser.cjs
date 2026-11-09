// 常驻伙伴在正式渲染器中验收：隔离测试存档、昼夜取景、离开返回及刷新。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.reset();g.state='playing';g.vehicle.active=false;g.enemies=[];g.boss=null;
  Object.assign(g.player,(await import('/src/config/mainline.js')).MAINLINE_SITES.camp);g.player.x+=70;
  g.progress.mainline.currentId='first-map';g.progress.mainline.phase='report';g.progress.mainline.seen.map=1;g.progress.mainline.distance=80;
  window.originalUpdate=g.update.bind(g);g.update=()=>{};
  const main=await import('/src/core/story/mainline-manager.js');main.updateMainline(g,0);a.refresh();
 });
 // 对白首触先展示全文，第二次才真正交付；按实际按钮状态继续。
 for(let i=0;i<3&&!await page.evaluate(()=>a.game.progress.mainline.completed.includes('first-map'));i++)await page.locator('.mainline-begin').click();
 await page.locator('#task-reward-close').click();
 await page.waitForFunction(()=>a.game.progress.mainline.trackingPaused&&!document.querySelector('#task-reward-dialog[open]'));
 const samples=[];
 for(const width of [320,390])for(const time of ['day','night'])for(const id of ['mint','oak','wheel','lumi']){
  await page.setViewportSize({width,height:width===320?568:844});
  const result=await page.evaluate(async({id,time})=>{
   const g=a.game,main=await import('/src/core/story/mainline-manager.js'),person=main.mainlineActors(g).find(p=>p.sceneNpcId==='mainline:'+id);
   if(!person)throw Error('伙伴缺席：'+id);
   Object.assign(g.player,{x:person.x+65,y:person.y+55,vx:0,vy:0});g.cottage=null;g.time+=.3;g.enemies=[];
   Object.assign(a.environment,{livingPreview:true,autoSeason:false,autoTime:false,autoWeather:false,time,weather:'sun',forestSeason:'summer'});
   g.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   return {person,trackingPaused:g.progress.mainline.trackingPaused};
  },{id,time});
  await page.waitForTimeout(200);
  const rendered=await page.evaluate(async()=>{const data=(await import('/src/rendering/scene-npc-continuity.js')).inspectSceneNpcContinuity(a.renderer);return {...data,view:a.renderer.view};});
  if(!result.trackingPaused||!rendered.actors.some(p=>p.id==='mainline:'+id))throw Error('正式绘制器缺少伙伴');
  if(await page.locator('#mainline-hud').isVisible()||await page.locator('#mainline-speech').isVisible()||await page.locator('#operation-guide').isVisible())throw Error('常驻人物恢复了任务催促');
  await page.screenshot({path:`output/playwright/camp-npc-presence/${id}-${width}-${time}.png`});samples.push({width,time,id,person:result.person});
 }
 // 离开整个营地再返回，不能依靠上一个镜头的临时留驻缓存。
 await page.evaluate(()=>{Object.assign(a.game.player,{x:3800,y:3300});a.renderer.camera.time=null;a.refresh();});await page.waitForTimeout(200);
 await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/mainline.js')).MAINLINE_SITES.camp);a.game.player.x+=65;a.renderer.camera.time=null;a.refresh();a.save();});
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 const refreshed=await page.evaluate(async()=>({people:(await import('/src/core/story/mainline-manager.js')).mainlineActors(a.game).length,paused:a.game.progress.mainline.trackingPaused}));
 if(refreshed.people!==4||!refreshed.paused)throw Error('刷新后人物或自由探索状态丢失');
 // 恢复实时模拟，取样真实待机帧和常驻居民时钟，不使用静态预览替代运行时。
 const first=await page.evaluate(async()=>({time:a.game.time,frames:(await import('/src/rendering/story-props.js')).storyArtStats().npcFrames}));
 await page.waitForTimeout(700);await page.screenshot({path:'output/playwright/camp-npc-presence/live-after-reload.png'});
 const last=await page.evaluate(async()=>({time:a.game.time,frames:(await import('/src/rendering/story-props.js')).storyArtStats().npcFrames,residents:a.game.livingActors?.size}));
 if(last.time<=first.time||last.residents!==6||last.frames>40)throw Error('运行时时钟、居民或缓存异常');
 if(errors.length)throw Error(errors.join('\n'));
 return {samples:samples.length,refreshed,first,last,errors};
}
