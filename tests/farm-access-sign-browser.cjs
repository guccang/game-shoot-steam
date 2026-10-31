// 真实未完成教学的手机种地流程及田牌昼夜同屏验收；默认服务端口4175。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/farm-access-sign/video',size:{width:390,height:844}}});
 const page=await context.newPage(),errors=[],shots=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshRangerProgress();Object.assign(p.arrival,{phase:'gather',keys:true,x:865,y:790});
   p.weapons[14]=1;p.weapon=14;const g=a.game;/* 单项农活夹具不额外放置示范田。 */p.farm.wildMaps=['forest','jiuzhaigou'];g.progress=p;g.reset();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.fireClock=99999;Object.assign(g.player,{x:865,y:790});
   for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();
  });
  if(await page.locator('#farm-tools').isVisible())throw Error('点击种地前不应展开工具栏');
  await page.locator('#field-menu-toggle').tap();await page.locator('#farm-menu').tap();
  await page.waitForFunction(()=>a.game.farmWork?.tool==='hoe');
  // 新版从真实世界地面开垦，不再预制十二个草地按钮。
  const land=await page.evaluate(async()=>{const p=(await import('/src/config/farm.js')).farmCell(0),v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();return {x:r.x+(p.x-v.x)*v.zoom,y:r.y+(p.y-v.y)*v.zoom};});
  await page.touchscreen.tap(land.x,land.y);await page.waitForFunction(()=>a.game.progress.farm.plots.length===1,null,{timeout:15000});await page.waitForTimeout(450);
  await page.locator('[data-farm-cell="0"]').tap();await page.locator('[data-farm-seed="0"]').tap();
  await page.locator('[data-farm-cell="0"]').tap();await page.waitForFunction(()=>a.game.progress.farm.plots[0].crop===0);
  // 只推进作物成熟时间，正式触控收割和金币提交不走测试捷径。
  await page.evaluate(()=>{a.game.progress.farm.plots[0].plantedAt-=61000;a.game.progress.farm.plots[0].readyAt-=61000;a.refresh();});
  await page.locator('#farm-hoe').tap();await page.locator('[data-farm-cell="0"]').tap();await page.waitForFunction(()=>a.game.progress.coins===60,null,{timeout:15000});
  const farming=await page.evaluate(()=>({coins:a.game.progress.coins,pending:a.game.arrivalPending,phase:a.game.progress.arrival.phase,completed:a.game.progress.mainline.completed.length}));
  if(farming.coins!==60||!farming.pending||farming.completed!==0)throw Error('教学未完成时种地失败 '+JSON.stringify(farming));
  // 同一未完成任务存档定位到标牌附近；真实按键绕行，牌面不能与栅栏相互遮挡。
  await page.evaluate(()=>{Object.assign(a.game.player,{x:775,y:625});a.game.farmWork=null;a.renderer.camera.time=null;});
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{
    Object.assign(a.environment,{time,weather:'sun',autoWeather:false,autoTime:false,livingPreview:true});
    const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
    a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },time);await page.waitForTimeout(700);
   const path=`output/playwright/farm-access-sign/farm-${width}-${time}.png`;await page.screenshot({path});shots.push(path);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('页面横向溢出');
  }
  await page.setViewportSize({width:390,height:844});
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(400);await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowDown');await page.waitForTimeout(400);await page.keyboard.up('ArrowDown');
  // 工坊已经修好但教学购枪未完成：点击建筑仍应打开正式升级页。
  await page.evaluate(async()=>{
   Object.assign(a.game.progress.arrival,{phase:'craft'});const {WORKSHOP}=await import('/src/world/workshop.js');
   Object.assign(a.game.player,{x:WORKSHOP.x+65,y:WORKSHOP.y+35});a.renderer.camera.time=null;a.refresh();
  });await page.waitForTimeout(700);
  await page.locator('[data-workshop-kind="weapons"]').tap();await page.locator('#workshop-dialog').waitFor({state:'visible'});
  await page.screenshot({path:'output/playwright/farm-access-sign/workshop-before-tutorial-complete.png'});
  const workshop=await page.locator('#workshop-dialog').innerText();if(!workshop.includes('电锯'))throw Error('工坊仍强制跳到教学首枪');
  if(errors.length)throw Error(errors.join('\n'));
  return {designCriterion:'world-farm-delivery',farming,shots,workshop:workshop.slice(0,150),video:await page.video().path(),errors};
 }finally{await context.close();}
}
