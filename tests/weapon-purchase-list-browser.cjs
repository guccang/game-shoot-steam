// 手机购买预览与纯图标侧栏专项验收：默认连接4175；占用时沿用调用页面的本地隔离端口。
async page=>{
 const origin=new URL(page.url()).origin;
 if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('仅允许本地验收');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const t=await context.newPage(),errors=[],samples=[];
 t.on('pageerror',e=>errors.push(e.message));
 await t.goto(origin);await t.locator('#start').tap();
 await t.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  p.weapons.fill(0);p.weapons[0]=1;p.weapon=0;p.vehicleHulls.fill(1);p.vehicleHulls[2]=0;p.coins=p.wood=100000;
  for(const k of Object.keys(p.materials))p.materials[k]=10000;
  a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.enemies=[];a.refresh();
  a.workshop.open('weapons',3);
 });
 await t.waitForFunction(()=>document.getElementById('workshop-dialog').open);
 // 真实点击只选中并更新大图，随后使用正式结算按钮。
 const card=t.locator('[data-ws-item="3"]');await card.scrollIntoViewIfNeeded();
 const before=await t.evaluate(()=>JSON.stringify(a.game.progress));
 await card.tap();
 if(await t.evaluate(()=>JSON.stringify(a.game.progress))!==before)throw Error('选中误扣费');
 const coins=await t.evaluate(()=>a.game.progress.coins);await t.locator('#ws-purchase').tap();
 if(!await t.evaluate(coins=>a.game.progress.weapons[3]===1&&a.game.progress.coins<coins,coins)||await t.locator('[data-ws-item="3"]').count())throw Error('购买或目录刷新失败');
 await t.locator('#ws-function-upgrade').tap();if(!await t.locator('#ws-stage').isVisible())throw Error('升级舞台被隐藏');
 await t.locator('#ws-function-modify').tap();if(!await t.locator('#ws-stage').isVisible())throw Error('改装舞台被隐藏');
 await t.evaluate(()=>a.workshop.open('vehicle',2));if(!await t.locator('#ws-stage').isVisible())throw Error('载具舞台被隐藏');
 // 正式手机短屏、长屏与横屏昼夜；每个页签检查图标尺寸、横向溢出与固定结算。
 for(const [width,height] of [[320,568],[390,844],[844,390]])for(const time of ['day','night']){
  await t.locator('#ws-close').tap();await t.setViewportSize({width,height});
  await t.evaluate(async time=>{
   Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});
   // 生活历法是正式时段来源，避免下一帧把设置中的夜晚恢复为白天。
   const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);
   a.game.progress.living.calendar.elapsed=phase.start+phase.duration/2;
   a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   a.game.selectVehicle(0);a.game.summonVehicle();a.game.enemies=[];a.game.spawnEnemy(0,125);a.renderer.resize();a.refresh();a.renderer.draw();
  },time);
  await t.screenshot({path:`output/playwright/weapon-purchase-list/scene-${width}-${time}.png`});
  if(await t.evaluate(()=>a.environment.time)!==time)throw Error('历法时段未生效');
  await t.evaluate(()=>a.workshop.open('weapons',4));
  for(const tab of ['buy','upgrade','modify','unlock']){
  await t.locator('#ws-function-'+tab).tap();await t.locator('#ws-shelf > button').last().tap();
  const sample=await t.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWeaponPurchaseList(document));
  if(!sample.stage||sample.overflow||sample.items.some(i=>i.overflow||i.box.height<44||i.box.width<44||i.text.trim()||!i.name||Math.abs(i.icon.width-62.4)>.1||Math.abs(i.icon.height-41.6)>.1||i.icon.left<i.box.left||i.icon.right>i.box.right)||sample.items.filter(i=>i.selected).length!==1||(tab==='buy'&&(sample.shelf.bottom>sample.footer.top+1||sample.purchase.bottom>height)))throw Error('布局错误 '+JSON.stringify(sample));
  samples.push({width,height,time,tab,...sample});
  await t.screenshot({path:`output/playwright/weapon-purchase-list/sidebar-${width}-${time}-${tab}.png`});
  }
 }
 await t.setViewportSize({width:320,height:568});await t.evaluate(()=>{a.game.progress.coins=0;a.workshop.open('weapons',4);});
 if(!await t.locator('#ws-purchase').isDisabled()||!await t.locator('#ws-resources .short').count())throw Error('缺料提示失效');
 await t.screenshot({path:'output/playwright/weapon-purchase-list/short-resources.png'});
 await t.locator('#ws-resources [data-resource-info]').first().tap();if(!await t.locator('#resource-help-dialog').isVisible())throw Error('材料说明不可达');await t.locator('#close-resource-help').tap();
 await t.evaluate(()=>{a.game.progress.weapons.fill(1);a.workshop.open('weapons',0);});await t.locator('#ws-function-buy').tap();
 if(!await t.locator('#ws-empty-catalog').isVisible()||await t.locator('.ws-footer').isVisible())throw Error('全拥有空状态错误');
 await t.screenshot({path:'output/playwright/weapon-purchase-list/all-owned.png'});
 await t.locator('#ws-empty-action').tap();if(!await t.locator('#ws-stage').isVisible())throw Error('空状态导航失败');
 if(errors.length)throw Error(errors.join('\n'));
 await context.close();return {designCriterion:'weapon-purchase-list',samples:samples.length,transactions:'选择不扣费、购买成功、目录刷新、缺料禁用、资源说明、全拥有导航通过',maxThumbnailBytes:Math.max(...samples.map(s=>s.thumbnailBytes)),errors};
}
