// 真实点击主界面昼夜按钮，验证三个独立圆环与手机/桌面实战同屏。
async(page)=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true});
 try {
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:4174/');await p.locator('#start').tap();
  await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.game.enemies=[];a.game.spawnTimer=999;a.game.attackTimer=999;});
  await p.locator('#settings-button').tap();await p.locator('#environment-button').tap();
  await p.locator('[data-forest-season="summer"]').tap();await p.locator('button[data-time="day"]').tap();
  await p.locator('#auto-time').check();await p.locator('#auto-weather').uncheck();await p.locator('button[data-weather="sun"]').tap();
  await p.locator('#environment-ok').tap();await p.locator('#settings-done').tap();
  const order=[];
  for(const expected of ['dusk','night','day','dusk','night','day']) {
   const before=await p.evaluate(()=>({x:a.game.player.x,y:a.game.player.y,seasonAt:a.environment.seasonAt,weatherAt:a.environment.weatherAt}));
   await p.locator('#time-picture').tap();
   const after=await p.evaluate(()=>({time:a.environment.time,x:a.game.player.x,y:a.game.player.y,seasonAt:a.environment.seasonAt,weatherAt:a.environment.weatherAt,state:a.game.state,offset:Number(document.getElementById('time-picture-progress').style.strokeDashoffset)}));
   if(after.time!==expected||after.state!=='playing'||after.offset>1||Object.keys(before).some(k=>before[k]!==after[k]))throw Error('点击顺序、独立计时或战斗输入异常');order.push(after.time);
  }
  await p.evaluate(()=>{a.environment.dayCycleAt=Date.now()-a.environment.timings.day/2;});
  await p.waitForFunction(()=>Math.abs(Number(document.getElementById('time-picture-progress').style.strokeDashoffset)-50)<1);
  await p.screenshot({path:'output/playwright/day-night-icon/half-ring.png'});
  await p.evaluate(()=>{a.environment.dayCycleAt=Date.now()-a.environment.timings.day+50;});
  await p.waitForFunction(()=>a.environment.time==='dusk');
  if(await p.evaluate(()=>Number(document.getElementById('time-picture-progress').style.strokeDashoffset))>2)throw Error('自动换段没有归满');
  await p.locator('#settings-button').tap();await p.locator('#environment-button').tap();await p.locator('#auto-time').uncheck();
  await p.locator('#environment-ok').tap();await p.locator('#settings-done').tap();
  await p.locator('#time-picture').tap();
  const paused=await p.evaluate(()=>({time:a.environment.time,running:document.getElementById('time-picture').dataset.running,offset:Number(document.getElementById('time-picture-progress').style.strokeDashoffset),dash:getComputedStyle(document.getElementById('time-picture-progress')).strokeDasharray}));
  if(paused.time!=='night'||paused.running!=='false'||paused.offset!==0||paused.dash!=='3px, 3px')throw Error('暂停圆环/手动切换异常');
  await p.screenshot({path:'output/playwright/day-night-icon/paused-ring.png'});
  await p.locator('#time-picture').focus();await p.keyboard.press('Enter');
  if(await p.evaluate(()=>a.environment.time)!=='day')throw Error('键盘不可操作');
  await p.locator('#settings-button').tap();await p.locator('#environment-button').tap();await p.locator('#auto-time').check();
  await p.locator('#environment-ok').tap();await p.locator('#settings-done').tap();
  if(await p.locator('#time-picture').getAttribute('data-running')!=='true')throw Error('恢复自动失败');
  await p.evaluate(()=>{a.game.progress.vehicleHulls[0]=1;a.game.summonVehicle();a.game.spawnEnemy(0,0,{x:a.game.player.x-90,y:a.game.player.y+65});});
  const layouts=[];
  for(const width of [320,390,1100])for(const time of ['day','dusk','night']) {
   await p.setViewportSize({width,height:844});
   for(let n=0;n<3&&await p.evaluate(()=>a.environment.time)!==time;n++)await p.locator('#time-picture').tap();
   await p.evaluate(async()=>{const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.seasons.reset('summer');a.renderer.light=new EnvironmentTransition(a.environment,performance.now());a.renderer.tone=new SceneTone(a.environment,performance.now());});
   await p.locator('#time-picture-art').evaluate(img=>img.decode());
   const result=await p.evaluate(()=>{
    const ids=['season','time','weather'],boxes=ids.map(id=>{const b=document.getElementById(`${id}-picture`),r=b.getBoundingClientRect();return {id,x:r.x,right:r.right,width:r.width,height:r.height,text:b.textContent,label:b.getAttribute('aria-label')};});
    return {boxes,loaded:document.getElementById('time-picture-art').naturalWidth,overflow:document.documentElement.scrollWidth>innerWidth,resource:Array.from(document.querySelectorAll('.resource-pill b')).map(b=>({text:b.textContent,width:b.clientWidth,scroll:b.scrollWidth}))};
   });
   if(result.overflow||!result.loaded||result.boxes.some((b,i)=>b.width<44||b.height<44||b.x<0||b.right>width||/\d/.test(b.text+b.label)||(i>0&&b.x<result.boxes[i-1].right)))throw Error('布局顺序、触控或数字显示异常');
   if(result.resource.some(b=>b.scroll>b.width))throw Error(`常用资源数字被挤压 ${width}: ${JSON.stringify(result.resource)}`);
   layouts.push({width,time,...result});await p.screenshot({path:`output/playwright/day-night-icon/hud-${width}-${time}.png`});
  }
  if(errors.length)throw Error(errors.join(';'));return {designCriterion:'day-night-ring',order,paused,layouts,errors};
 }finally{await context.close();}
}
