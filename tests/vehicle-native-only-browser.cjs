// 固定主武器实机验收：工坊无挂载页、收藏无换枪操作、远征领取随车主炮。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(s=>s.id);
  p.vehicleHulls.fill(1);p.vehicleWeapons.fill(3);p.vehicleLoadouts.fill(9);p.vehicleIndex=1;p.weapons.fill(1);
  p.coins=p.wood=100000;for(const k of ['parts','crystal','core'])p.materials[k]=10000;
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};Object.assign(a.game.player,{x:630,y:360});a.renderer.camera.time=null;a.refresh();});
 for(const [width,height] of [[390,844],[320,568]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{
   a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.workshop.open('vehicle',1);a.refresh();
  },phase);
  if(await page.locator('#ws-function-modify').isVisible())throw Error('载具挂载页仍可见');
  await page.locator('#ws-function-upgrade').focus();await page.keyboard.press('ArrowRight');
  if(await page.locator('#ws-function-unlock').getAttribute('aria-selected')!=='true')throw Error('键盘仍停留在隐藏挂载页');
  await page.locator('#ws-function-upgrade').click();await page.locator('#ws-kits-tab').click();
  const state=await page.evaluate(()=>a.workshop.guideState());if(state.turret!==18||state.weaponTarget!==18)throw Error('旧挂载未恢复重坦主炮');
  if(await page.locator('[data-ws-part]').count())throw Error('仍有挂载枪械选择');
  await page.locator('[data-ws-upgrade="damage"]').click();
  if(!await page.evaluate(()=>a.workshop.guideState().affordable))throw Error('主炮升级无法报价');
  await page.screenshot({path:`output/playwright/vehicle-native-only/workshop-${width}-${phase}.png`});samples.push({width,phase,turret:state.turret});await page.locator('#ws-close').click();
 }
 await page.setViewportSize({width:390,height:844});
 // 正常载具入口已转交综合工坊；旧收藏面板仍按自己的页签处理函数检查兼容展示。
 await page.evaluate(()=>{document.getElementById('vehicle-tab-turrets').click();document.getElementById('vehicle-collection-dialog').showModal();});
 if(await page.locator('[data-turret-action]').count())throw Error('收藏面板仍有挂载操作');
 await page.screenshot({path:'output/playwright/vehicle-native-only/collection.png'});await page.locator('#close-vehicle-collection').click();
 if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').click();
 await page.locator('#realm-button').click();await page.locator('[data-enter-realm="rogue"]').click();
 if(await page.locator('[data-realm-roll="turret"]').count())throw Error('远征仍有随机炮塔');
 await page.locator('[data-realm-roll="weapon"]').click();await page.waitForFunction(()=>!document.querySelector('[data-realm-roll="vehicle"]').disabled);
 await page.locator('[data-realm-roll="vehicle"]').click();await page.waitForFunction(()=>!document.querySelector('[data-realm-ready]').disabled);
 const loadout=await page.evaluate(async()=>{const l=a.game.realm.loadout;if(l.turret!==((await import('/src/config/vehicle-armaments.js')).nativeVehicleWeapon(l.vehicle)?.weaponIndex??null))throw Error('远征主炮未配套');return l;});
 await page.screenshot({path:'output/playwright/vehicle-native-only/expedition.png'});await page.locator('[data-realm-ready]').click();
 if(await page.evaluate(()=>a.game.realm.phase)!=='choice')throw Error('两次领取后不能出发');
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'vehicle-native-only',samples,loadout,errors};
}
