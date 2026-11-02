// 手机钱包专项：隔离存档验证真实资源节点搬移、说明弹窗、实时刷新及主界面布局。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 // 使用实际手机入口，菜单仍由正式点击事件展开和收起。
 async function phone(){if(!await page.locator('#phone-button').isVisible())await page.locator('#field-menu-toggle').tap();await page.locator('#phone-button').tap();}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
   p.coins=965;p.wood=300;p.logistics.bagWood=20;p.vehicleHulls.fill(0);p.vehicleHulls[0]=1;p.logistics.builds[0].wood=24;
   const g=a.game;g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.enemies=[];g.update=()=>{};Object.assign(g.player,{x:900,y:700});a.renderer.camera.time=null;a.refresh();
  });
  for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{Object.assign(a.environment,{livingPreview:true,autoTime:false,autoWeather:false,time,weather:'sun'});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();},time);
   await page.waitForTimeout(150);
   const main=await page.evaluate(async()=>{
    const hp=document.querySelector('.player-hud').getBoundingClientRect(),settings=document.getElementById('settings-button').getBoundingClientRect();
    await (await import('/src/rendering/visual-review.js')).inspectTaskNavigation(a.game,document);
    return {hp:hp.toJSON(),settings:settings.toJSON(),resources:document.querySelectorAll('.hud-resources .resource-pill').length,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   if(await page.locator('[data-coins]').isVisible()||await page.locator('[data-wood]').isVisible()||main.resources||main.overflow||Math.abs(main.hp.y-main.settings.y)>1||main.hp.right>main.settings.x)throw Error('主页面资源或HP布局错误 '+JSON.stringify(main));
   await page.screenshot({path:`output/playwright/phone-wallet/main-${width}-${time}.png`});
   await phone();
   const wallet=page.locator('#phone-wallet');
   if(!await wallet.isVisible()||await wallet.locator('[data-coins]').textContent()!=='965'||await wallet.locator('[data-wood]').textContent()!=='344')throw Error('手机钱包数字错误');
   const fit=await wallet.evaluate(n=>{const r=n.getBoundingClientRect(),buttons=[...n.querySelectorAll('button')].map(b=>b.getBoundingClientRect());return {inside:r.x>=0&&r.right<=innerWidth,overflow:n.scrollWidth>n.clientWidth,buttons:buttons.map(b=>({width:b.width,height:b.height}))};});
   if(!fit.inside||fit.overflow||fit.buttons.some(b=>b.width<44||b.height<44))throw Error('手机钱包触控或布局错误 '+JSON.stringify(fit));
   await page.screenshot({path:`output/playwright/phone-wallet/phone-${width}-${time}.png`});
   for(const key of ['coins','wood']){
    await wallet.locator(`[data-resource-info="${key}"]`).tap();await page.locator('#resource-help-dialog').waitFor({state:'visible'});
    if(!(await page.locator('#resource-help-source').textContent()).trim())throw Error('资源说明为空');
    await page.locator('#close-resource-help').tap();if(!await page.locator('#phone-dialog').isVisible()||await page.evaluate(()=>a.game.state)!=='paused')throw Error('资源说明关闭破坏手机暂停归属');
   }
   await page.locator('#phone-close').tap();await page.waitForFunction(()=>a.game.state==='playing');samples.push({width,height,time,main,fit});
  }
  await phone();
  // 使用正式资源入账并等待普通HUD刷新，不手工触发render掩盖余额不同步。
  await page.evaluate(async()=>{(await import('/src/progression/resource-wallet.js')).creditResource(a.game.progress,'coins',100);a.game.progress.logistics.bagWood+=6;});
  await page.waitForFunction(()=>document.querySelector('[data-coins]').textContent==='1065'&&document.querySelector('[data-wood]').textContent==='350');
  if(!(await page.locator('[data-wood]').getAttribute('title')).includes('载具 24'))throw Error('木材库存明细丢失');
  await page.locator('#phone-close').tap();
  // 同一页面销毁重建应用，节点应恢复并重新搬入手机，不能丢失或重复。
  await page.evaluate(async()=>{a.save();a.destroy();window.a=(await import('/src/app/create-app.js')).createApplication();});
  await page.locator('#start').tap();await page.evaluate(async()=>{await a.ready;a.game.mainlineSpeech=null;a.game.update=()=>{};a.refresh();});await phone();
  if(await page.locator('#phone-wallet').count()!==1||await page.locator('[data-coins]').count()!==1||await page.locator('[data-coins]').textContent()!=='1065'||await page.locator('[data-wood]').textContent()!=='350')throw Error('应用重建钱包丢失或重复');
  await page.locator('#phone-close').tap();
  // 主界面浮游炮占用更宽，320下仍不能挤到生命值或右侧设置。
  await page.setViewportSize({width:320,height:568});await page.evaluate(async()=>{const g=a.game;g.progress.weapon=(await import('/src/config/weapons.js')).WEAPONS.findIndex(w=>w.independentSupply);g.progress.weapons[g.progress.weapon]=1;g.reset();g.start();g.mainlineSpeech=null;g.update=()=>{};a.refresh();});await page.waitForTimeout(150);
  const independent=await page.evaluate(()=>{const hp=document.querySelector('.player-hud').getBoundingClientRect(),ammo=document.querySelector('.combat-instruments').getBoundingClientRect(),health=document.getElementById('player-health').getBoundingClientRect(),settings=document.getElementById('settings-button').getBoundingClientRect();return {fits:ammo.right<=hp.right&&ammo.bottom<=hp.bottom&&health.bottom<=ammo.top&&hp.right<=settings.x};});
  if(!independent.fits)throw Error('主界面三路弹药或设置重叠');await page.screenshot({path:'output/playwright/phone-wallet/funnel-320.png'});
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'phone-wallet',samples,liveUpdate:true,recreated:true,independent,errors};
 }catch(error){const state=await page.evaluate(()=>({dialogs:[...document.querySelectorAll('dialog[open]')].map(n=>({id:n.id,inert:n.inert,parent:n.parentElement.id})),active:document.activeElement?.outerHTML,inert:[...document.querySelectorAll('[inert]')].map(n=>n.id),page:document.getElementById('game-frame').dataset.page}));throw Error(error.message+' '+JSON.stringify(state));}finally{await context.close();}
}
