// 手机菜单与娱乐目录回归，隔离存档验证修复前后显示、原卡片插画和锁定入口。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('游戏测试默认使用4175端口');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const t=await context.newPage(),errors=[],checks=[];t.on('pageerror',e=>errors.push(e.message));
 // 菜单折叠状态由正式触摸按钮控制，横屏已展开时不重复切换。
 async function menu(){if(!await t.locator('#realm-button').isVisible())await t.locator('#field-menu-toggle').tap();}
 // 昼夜复用正式环境投影，不改图片、画布和样式。
 async function light(phase){await t.evaluate(async phase=>{
  const g=a.game;g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;
  (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);
  a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
  a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();
 },phase);}
 try{
  await t.goto('http://localhost:4175');await t.locator('#start').tap();
  await t.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const {freshRangerProgress,validateProgress}=await import('/src/progression/progress.js'),p=freshRangerProgress();
   p.arrival={version:3,phase:'letter',keys:true,parked:false};p.vehicleHulls[5]=1;p.weapons[14]=1;p.weapon=14;
   p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   const g=a.game;g.story=null;g.realm=null;g.progress=validateProgress(p);g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.update=()=>{};
   Object.assign(g.player,{x:650,y:700});a.refresh();
  });await menu();
  if(await t.locator('#weapons-button').isVisible()||await t.locator('#vehicles-button').isVisible())throw Error('未修复工坊提前显示');
  if((await t.locator('#realm-button span').textContent()).trim()!=='娱乐')throw Error('菜单名称未同步');
  if(!await t.locator('#vehicle-button').isEnabled())throw Error('赠车驾驶快捷键被锁');
  await t.locator('#vehicle-button').tap();if(!await t.evaluate(()=>a.game.vehicle.active))throw Error('赠车不能驾驶');
  await menu();checks.push('未修复工坊隐藏入口，娱乐常驻，赠车仍可驾驶');
  const originalIcon=await t.locator('#realm-button svg').evaluate(n=>n.outerHTML);
  for(const [width,height]of [[320,568],[390,844],[844,390]])for(const phase of ['day','night']){
   await t.setViewportSize({width,height});await light(phase);await menu();
   await t.screenshot({path:`output/playwright/restoration-menu-entertainment/menu-${width}-${phase}.png`});
   await t.locator('#realm-button').tap();await t.locator('#realm-dialog').waitFor({state:'visible'});
   if((await t.locator('#realm-title').textContent()).trim()!=='娱乐')throw Error('页面名称未同步');
   if(await t.locator('#realm-content .realm-card').count()!==6||await t.locator('#realm-content .realm-art').count()!==6)throw Error('锁定卡片丢失原插画');
   for(const button of await t.locator('[data-enter-realm]').all()){
    if((await button.textContent()).trim()!=='查看修复条件')throw Error('锁定玩法仍显示进入');
    await button.scrollIntoViewIfNeeded();const b=await button.boundingBox();
    if(b.height<44||b.x<0||b.x+b.width>width)throw Error('修复按钮触控区越界');
   }
   const art=await t.locator('#realm-content .realm-art').evaluateAll(nodes=>nodes.map(n=>{
    const image=n.querySelector('img'),canvas=n.querySelector('canvas');
    return image?image.complete&&image.naturalWidth>0:canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some(v=>v>0);
   }));if(art.some(v=>!v))throw Error('原插画未成功加载');
   await t.locator('[data-enter-realm="rogue"]').scrollIntoViewIfNeeded();
   await t.screenshot({path:`output/playwright/restoration-menu-entertainment/cards-${width}-${phase}.png`});
   await t.locator('#close-realm').tap();
  }checks.push('三种手机尺寸昼夜：六张原卡片插画完整、修复按钮可触控');
  await t.setViewportSize({width:390,height:844});
  for(const mode of ['rogue','tower','guardian','fire','football','race']){
   await menu();await t.locator('#realm-button').tap();await t.locator(`[data-enter-realm="${mode}"]`).tap();
   await t.locator('#restoration-dialog').waitFor({state:'visible'});
   if(await t.locator('#realm-dialog').isVisible()||await t.evaluate(()=>!!a.game.realm||!!a.game.fireRescue))throw Error('未修复玩法被启动');
   const title=await t.locator('#restoration-title').textContent();checks.push(mode+'修复条件：'+title);await t.locator('#restoration-close').tap();
  }
  // 工坊在施工结束状态才露出；完成后再次刷新不得被娱乐面板隐藏回去。
  await t.evaluate(()=>{a.game.progress.arrival.phase='repairing';a.refresh();});
  if(await t.locator('#weapons-button').isVisible())throw Error('施工中提前露出武器入口');
  await t.evaluate(()=>{a.game.progress.arrival.phase='craft';a.refresh();});await menu();
  if(!await t.locator('#weapons-button').isVisible()||await t.locator('#vehicles-button').isVisible())throw Error('武器工坊单独解锁异常');
  await t.evaluate(()=>{a.game.progress.arrival.phase='complete';a.game.progress.restoration.repaired.push('garage');a.refresh();});
  if(!await t.locator('#vehicles-button').isVisible())throw Error('载具工坊修复后入口未显示');
  await t.locator('#realm-button').tap();
  const before=await t.locator('.realm-rogue .realm-art').evaluate(n=>n.innerHTML);
  await t.evaluate(()=>{a.game.progress.restoration.repaired.push('rogue');a.refresh();});
  const enter=t.locator('[data-enter-realm="rogue"]');if((await enter.textContent()).includes('修复'))throw Error('完工后按钮未更新');
  if(before!==await t.locator('.realm-rogue .realm-art').evaluate(n=>n.innerHTML)||originalIcon!==await t.locator('#realm-button svg').evaluate(n=>n.outerHTML))throw Error('解锁替换了原图');
  await enter.tap();await t.waitForFunction(()=>a.game.realm?.mode==='rogue');
  if(await t.locator('#weapons-button').isVisible()||await t.locator('#vehicles-button').isVisible())throw Error('活动中错误显示森林工坊');
  await t.locator('[data-realm-exit]').tap();await menu();
  if(!await t.locator('#weapons-button').isVisible()||!await t.locator('#vehicles-button').isVisible())throw Error('退出活动后未恢复工坊入口');
  checks.push('工坊分步开放、原图不变、解锁娱乐可进入且退出恢复菜单');
  if(errors.length)throw Error(errors.join('\n'));await page.evaluate(r=>window.entertainmentResult=r,{checks,errors});
 }catch(error){
  const state=await t.evaluate(()=>({state:a.game.state,phase:a.game.progress.arrival?.phase,dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id)}));
  throw Error(error.message+'\n已通过：'+JSON.stringify(checks)+'\n现场：'+JSON.stringify(state));
 }finally{await context.close();}
}
