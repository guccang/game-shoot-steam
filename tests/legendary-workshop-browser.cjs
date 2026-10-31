// 手机正式流程：红狼档案启程、显现解锁、配色预览与保存、读取真实升级报价。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.waitForFunction(async()=>!!(await import('/src/main.js')).application);
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();await a.ready;});
  await page.waitForFunction(()=>a.menu.page==='game');
  await page.evaluate(async()=>{const g=a.game;g.update=()=>{};const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.farm.lessonRewarded=true;p.vehicleHulls.fill(1);p.vehicleIndex=6;p.weapons[0]=20;p.coins=p.wood=1000000;g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.vehicle=g.vehicles[6];g.vehicle.active=true;g.player.treePass=true;g.player.x=700;g.player.y=800;a.renderer.camera.time=null;a.refresh();a.workshop.open('vehicle',1);});
  await page.locator('#ws-info').tap();if(await page.locator('#ws-legendary').isVisible())throw Error('其他战车出现专属入口');await page.locator('#ws-equipment-done').tap();
  await page.locator('[data-ws-item="6"]').tap();await page.locator('#ws-info').tap();await page.locator('#ws-legendary').tap();
  if(!await page.locator('#legendary-dialog').isVisible())throw Error('红狼传承页未打开');
  await page.screenshot({path:'output/playwright/legendary-workshop/story-390.png'});
  await page.locator('#legendary-primary').tap();await page.waitForFunction(()=>a.game.state==='playing');await page.waitForTimeout(500);
  if(await page.evaluate(()=>a.game.progress.legendaryWorkshop.unlocked))throw Error('启程直接跳过传承解锁');
  await page.locator('#legendary-entry').tap();await page.locator('#legendary-primary').tap();
  if(!await page.evaluate(()=>a.game.progress.legendaryWorkshop.unlocked))throw Error('接受传承未解锁');
  await page.screenshot({path:'output/playwright/legendary-workshop/unlocked-390.png'});
  await page.locator('[data-legendary-design]').tap();const before=await page.locator('#legendary-preview').evaluate(c=>c.toDataURL());
  await page.locator('[data-paint-part="hull"][data-paint-value="3"]').tap();await page.locator('[data-paint-part="turret"][data-paint-value="4"]').tap();await page.locator('[data-paint-part="tracks"][data-paint-value="2"]').tap();await page.locator('[data-paint-part="badge"][data-paint-value="1"]').tap();
  const after=await page.locator('#legendary-preview').evaluate(c=>c.toDataURL());if(before===after)throw Error('预览颜色没有变化');
  if(await page.evaluate(()=>a.game.progress.legendaryWorkshop.designs[6].hull)!==0)throw Error('预览提前保存');
  await page.locator('[data-scheme-save="0"]').tap();await page.locator('#legendary-primary').tap();
  if(await page.evaluate(()=>a.game.progress.legendaryWorkshop.designs[6].hull)!==3)throw Error('应用未保存');
  await page.locator('[data-paint-part="hull"][data-paint-value="5"]').tap();await page.locator('[data-scheme-load="0"]').tap();if(await page.locator('[data-paint-part="hull"][data-paint-value="3"]').getAttribute('aria-pressed')!=='true')throw Error('方案恢复错误');
  for(const [width,height] of [[390,844],[320,568]]){await page.setViewportSize({width,height});await page.locator('#legendary-preview').scrollIntoViewIfNeeded();await page.screenshot({path:`output/playwright/legendary-workshop/design-${width}.png`});const layout=await page.locator('#legendary-dialog').evaluate(d=>({overflow:d.querySelector('.ui-panel__body').scrollWidth>d.querySelector('.ui-panel__body').clientWidth+1,footer:d.querySelector('.ui-panel__footer').getBoundingClientRect().bottom<=innerHeight,small:[...d.querySelectorAll('button')].filter(b=>!b.hidden&&b.getBoundingClientRect().height>0&&b.getBoundingClientRect().height<44).length}));if(await page.locator('#legendary-primary').evaluate(b=>b.getBoundingClientRect().width<200))throw Error('底部操作被挤成竖排');if(layout.overflow||!layout.footer||layout.small)throw Error('手机布局错误 '+JSON.stringify(layout));checks.push({width,...layout});}
  await page.locator('#legendary-vehicle').selectOption('1');await page.locator('[data-paint-part="hull"][data-paint-value="5"]').tap();await page.locator('#legendary-primary').tap();if(await page.evaluate(()=>a.game.progress.legendaryWorkshop.designs[1].hull)!==5)throw Error('重型坦克配色未保存');
  await page.locator('[data-legendary-back]').tap();await page.locator('[data-legendary-upgrade]').tap();await page.locator('[data-ws-upgrade="damage"]').tap();
  const price=await page.locator('.ws-footer').innerText();if(!price.includes('25000')&&!price.includes('25,000'))throw Error('工坊缺少传奇升级真实报价 '+price);
  await page.screenshot({path:'output/playwright/legendary-workshop/upgrade-320.png'});await page.locator('#ws-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  for(const [width,height,time] of [[390,844,'day'],[320,568,'night']]){await page.setViewportSize({width,height});await page.evaluate(async time=>{const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar.elapsed=phase.start+phase.duration/2;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);if(time==='night'){const site=(await import('/src/config/legendary-workshop.js')).LEGENDARY_WORKSHOP;a.game.player.y=site.y+20;}Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();},time);await page.waitForTimeout(350);await page.screenshot({path:`output/playwright/legendary-workshop/world-${width}-${time}.png`});}
  for(const index of [1,5,6]){await page.evaluate(index=>{a.game.vehicle=a.game.vehicles[index];a.game.vehicle.active=index!==6;a.refresh();a.renderer.draw();},index);await page.waitForTimeout(100);if(await page.locator('#legendary-entry').isVisible())throw Error('其他车或步行仍有工坊');}
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')).legendaryWorkshop);if(!saved.unlocked||saved.designs[6].hull!==3||saved.schemes.length!==1)throw Error('持久化结果错误');
  if(errors.length)throw Error(errors.join('\n'));return {checks,travel:true,exclusiveEntry:true,unlock:true,previewAndSchemes:true,upgradeQuote:true,saved,errors};
 }finally{await context.close();}
}
