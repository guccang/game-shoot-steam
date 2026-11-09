// 手机农具栏验收：底部双行定位、状态卡与七个常用入口的触控及退出恢复。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',e=>errors.push(e.message));
 // 直接点选屏幕上已验证的按钮中心，避免横持短屏自动滚动页面。
 async function tapTool(id){const b=await page.locator('#farm-'+id).boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}
 try{
  await page.goto(original.url()||'http://localhost:4175');require('fs').mkdirSync('output/playwright/farm-toolbar',{recursive:true});
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;await document.fonts.ready;
   const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.lessonRewarded=true;
   g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.enemies=[];g.boss=null;g.vehicle.active=false;g.update=()=>{};
   Object.assign(g.player,{x:837,y:690,vx:0,vy:0});for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();
  });
  if(!await page.locator('#farm-menu').isVisible())await page.locator('#field-menu-toggle').tap();await page.locator('#farm-menu').tap();
  await page.waitForFunction(()=>!document.getElementById('farm-sickle').disabled);
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390],[568,320]]){
   await page.setViewportSize({width,height});
   for(const time of ['day','night']){
    await page.evaluate(async time=>{const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);
    await page.waitForTimeout(150);
    await tapTool('water');await page.waitForTimeout(180);
    const result=await page.evaluate(()=>{
     const toolbar=document.getElementById('farm-tools'),box=toolbar.getBoundingClientRect(),frame=document.getElementById('game-frame').getBoundingClientRect();
     // 直接读取正式命中区，确认没有覆盖状态卡、菜单或资源栏。
     const overlaps=['#field-menu-toggle','.hud-resources','.toast.visible'].filter(selector=>{const node=document.querySelector(selector);if(!node)return false;const r=node.getBoundingClientRect();return box.left<r.right&&box.right>r.left&&box.top<r.bottom&&box.bottom>r.top;});
     const buttons=[...toolbar.querySelectorAll(':scope > button')].map(node=>{const r=node.getBoundingClientRect();return {id:node.id,width:r.width,height:r.height,top:node.offsetTop,hit:node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
     return {buttons,overlaps,left:box.left-frame.left,right:frame.right-box.right,bottom:frame.bottom-box.bottom,top:box.top-frame.top,hudHidden:getComputedStyle(document.querySelector('.player-hud')).display==='none',saw:!!document.getElementById('farm-saw'),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    if(result.buttons.length!==7||new Set(result.buttons.map(b=>b.top)).size!==2||result.buttons.some(b=>b.width<44||b.height<44||!b.hit)||result.hudHidden||result.overlaps.length||result.left<12||Math.abs(result.left-result.right)>1||result.bottom!==20||result.top<0||result.saw||result.overflow)throw Error(JSON.stringify({width,height,time,...result}));
    samples.push({width,height,time,...result});await page.screenshot({path:`output/playwright/farm-toolbar/${width}-${height}-${time}.png`});
   }
   // 按钮使用真实触摸选择，退出后收起工具栏并恢复移动摇杆。
   for(const [id,tool] of [['water','water'],['sickle','harvest'],['hoe','hoe'],['remove','remove']]){await tapTool(id);if(!await page.evaluate(tool=>a.game.farmWork?.tool===tool,tool))throw Error('农具触摸未切换 '+id);await page.waitForTimeout(180);}
   await tapTool('combat');if(await page.locator('#farm-combat').getAttribute('aria-pressed')!=='true')throw Error('战斗按钮失效');await page.waitForTimeout(180);
   await tapTool('water');await page.waitForTimeout(180);await tapTool('exit');
   if(await page.locator('#farm-tools').isVisible()||!await page.locator('.player-hud').isVisible()||!await page.evaluate(()=>getComputedStyle(document.getElementById('joystick')).visibility==='visible'))throw Error('退出未恢复状态卡和操作');
   // 从已验证可见的常规手机菜单重新进入；短屏菜单滚动不属于本轮农具栏范围。
   await page.setViewportSize({width:390,height:844});if(!await page.locator('#farm-menu').isVisible())await page.locator('#field-menu-toggle').tap();await page.locator('#farm-menu').tap();
  }
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'world-farm-delivery',samples,errors};
 }catch(error){await page.screenshot({path:'output/playwright/farm-toolbar/failure.png'});throw error;}finally{await context.close();}
}
