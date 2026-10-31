// 出口短按验收：真实手机触控覆盖三种房间、两种屏幕和昼夜，逻辑冻结以排除自动倒计时。
async page=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const p=await context.newPage(),errors=[],results=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(new URL(page.url()).origin);await p.locator('#start').tap();
  await p.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;
   g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.restoration.repaired=['garage','cottage'];
   g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;
   window.roomModule=await import('/src/core/cottage.js');window.roomConfig=await import('/src/config/workshop-interiors.js');
   window.roomTick=g.update.bind(g);g.update=()=>{};
  });
  for(const kind of ['cottage','weapons','vehicle'])for(const [width,height]of [[320,568],[390,844]])for(const time of ['day','night']){
   await p.setViewportSize({width,height});
   const outside=await p.evaluate(async({kind,time})=>{
    const g=a.game;Object.assign(g.player,roomConfig.interiorLayout({kind}).door);g.cottageDoorLatch=false;g.mainlineSpeech=null;
    if(!(kind==='cottage'?roomModule.enterCottage(g):roomModule.enterWorkshop(g,kind)))throw Error('入室失败：'+kind);
    g.progress.living.calendar.elapsed=time==='day'?400000:1100000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
    a.refresh();a.renderer.draw();return g.cottage.outside;
   },{kind,time});
   await p.locator('#cottage-exit').waitFor({state:'visible'});
   const box=await p.locator('#cottage-exit').boundingBox();
   if(box.width<44||box.height<44||box.x<0||box.y<0||box.x+box.width>width+1||box.y+box.height>height+1)throw Error('出口触控区越界或太小');
   await p.screenshot({path:`output/playwright/room-exit-click/${kind}-${width}-${time}.png`});
   // 直接点击画布文字中心，而非用DOM强制触发，验证投影和真实输入接线。
   const text=await p.evaluate(()=>{const room=a.game.cottage,v=a.renderer.cottageView,l=roomConfig.interiorLayout(room),r=a.renderer.canvas.getBoundingClientRect();return {x:r.left+v.x+l.exit.x*v.zoom,y:r.top+v.y+(room.kind==='cottage'?331:l.height-21)*v.zoom};});
   await p.touchscreen.tap(text.x,text.y);
   const state=await p.evaluate(()=>({room:!!a.game.cottage,x:a.game.player.x,y:a.game.player.y,latch:!!a.game.cottageDoorLatch}));
   if(state.room||!state.latch||state.x!==outside.x||state.y!==outside.y)throw Error('点击后未立即回到室外：'+JSON.stringify(state));
   await p.locator('#cottage-controls').waitFor({state:'hidden'});results.push({kind,width,time});
  }
  // 自动出门继续走原规则：不到一秒不能离开，一秒后恢复同一室外落点。
  await p.evaluate(()=>{
   const g=a.game;Object.assign(g.player,roomConfig.interiorLayout({kind:'cottage'}).door);g.mainlineSpeech=null;
   if(!roomModule.enterCottage(g))throw Error('自动出门验收入室失败');Object.assign(g.player,roomConfig.interiorLayout(g.cottage).exit);
   roomModule.updateCottage(g,.5,{x:0,y:0});if(!g.cottage)throw Error('自动出门提前触发');
   roomModule.updateCottage(g,.5,{x:0,y:0});if(g.cottage)throw Error('自动出门失效');
  });
  if(errors.length)throw Error(errors.join('\n'));return {passed:results.length,automaticExit:true,errors};
 }finally{await context.close();}
}
