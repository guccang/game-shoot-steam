// 营地地图导航、背包奇物和湖谷实际场景检查，沿用前一脚本的隔离存档。
async page=>{
 // 功能菜单默认折叠，实际展开后再点击入口。
 async function menu(id){if(await page.locator('#field-menu-toggle').getAttribute('aria-expanded')!=='true')await page.locator('#field-menu-toggle').click();await page.locator('#'+id).click();}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.locator('#start').click();
 // 隔离存档只复用奖励；先回安全观察点，避免上个脚本留下的战斗影响地图旅行。
 await page.evaluate(async()=>{window.campApp=(await import('/src/main.js')).application;await campApp.ready;const g=campApp.game,cfg=await import('/src/config/monster-camps.js');if(g.mapId!=='forest')g.switchMap('forest');Object.assign(g.player,cfg.campVisitorSite(cfg.MONSTER_CAMPS[1]));g.player.hp=g.maxHp();g.attackTimer=999999;g.encounterTimer=999999;g.mainlineTalkDelay=999999;});
 await page.setViewportSize({width:320,height:568});await menu('backpack-button');await page.locator('[data-keepsake="camp-relic-ash"]').click();
 if(!await page.locator('#keepsake-dialog').textContent().then(t=>t.includes('歪嘴茶哨')&&t.includes('永久效果')))throw Error('奇物没有进入正式背包');
 await page.screenshot({path:'output/playwright/monster-camps/backpack-320.png'});await page.locator('#keepsake-close').click();await page.locator('#backpack-close').click();
 await menu('phone-button');await page.locator('#phone-dialog [data-pack-action="map"]').click();
 await page.locator('[data-monster-camp="ember-pot"]').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/monster-camps/map-320.png'});await page.locator('[data-monster-camp="ember-pot"]').click();
 if(await page.locator('dialog[open]').count())throw Error('地图导航没有回到世界');
 const navigation=await page.evaluate(async()=>(await import('/src/core/navigation/world-navigation.js')).worldNavigationObjective(campApp.game));if(navigation.site.id!=='ember-pot-visitor')throw Error('营地导航未落在安全观察点');
 await menu('phone-button');await page.locator('#phone-dialog [data-pack-action="map"]').click();await page.locator('[data-map="jiuzhaigou"]').click();await page.locator('#close-map').click();await page.locator('#phone-close').click();
 const samples=[];await page.setViewportSize({width:390,height:844});
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{const a=campApp,g=a.game,cfg=await import('/src/config/monster-camps.js'),c=cfg.MONSTER_CAMPS.find(c=>c.id==='valley-bowl');Object.assign(g.player,{...cfg.campVisitorSite(c),x:c.x-10,y:c.y-cfg.MONSTER_CAMP_RULES.radius-18,invincible:0});g.attackTimer=999999;g.encounterTimer=999999;g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;Object.assign(a.environment,{time:phase,livingPreview:false,weather:'sun',autoWeather:false,autoTime:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment);a.renderer.camera.time=null;},phase);
  await page.waitForTimeout(1200);if(await page.evaluate(()=>campApp.environment.time)!==phase)throw Error('湖谷时段未实际切换');await page.screenshot({path:`output/playwright/monster-camps/valley-${phase}.png`});samples.push(await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMonsterCamps(campApp.game,document)));
 }
 await menu('phone-button');await page.locator('#phone-dialog [data-pack-action="map"]' ).click();await page.locator('[data-monster-camp="valley-echo"]' ).click();const valleyNavigation=await page.evaluate(async()=>(await import('/src/core/navigation/world-navigation.js')).worldNavigationObjective(campApp.game));
 if(valleyNavigation?.site?.mapId!=='jiuzhaigou')throw Error('湖谷导航失效');await page.evaluate(()=>campApp.game.pause());if(errors.length)throw Error(errors.join('\n'));return {navigation,valleyNavigation,samples,errors};
}
