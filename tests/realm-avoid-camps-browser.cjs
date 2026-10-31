// 实际秘境入口与昼夜首屏复核，只使用本任务隔离端口。
async page=>{
 if(new URL(page.url()).port!=='4278')throw Error('仅允许隔离端口');
 const errors=[],results=[];page.on('pageerror',error=>errors.push(error.message));
 for(const [mode,width,night] of [['tower',1280,false],['tower',1280,true],['tower',390,false],['tower',390,true],['guardian',390,false],['rogue',390,true]]){
  await page.setViewportSize({width,height:width===390?844:800});
  await page.evaluate(async night=>{
   (window.realmApp||(await import('/src/main.js')).application).destroy();
   for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();localStorage.clear();
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
   const p=freshProgress();p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.living.calendar={day:1,elapsed:night?1100000:400000};
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
   localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:night?'night':'day',autoTime:false,autoWeather:false}));
   const {createApplication}=await import('/src/app/create-app.js');window.realmApp=createApplication();
  },night);
  await page.locator('#start').click();await page.waitForFunction(()=>realmApp.menu.page==='game');
  if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').click();
  await page.locator('#realm-button').click();await page.locator(`[data-enter-realm="${mode}"]`).click();
  // 远征装备与祝福使用正式入口完成整备，避免只检查测试造出的圆圈。
  if(mode==='rogue')await page.evaluate(()=>{for(const kind of ['weapon','vehicle','turret'])realmApp.game.rollRealmEquipment(kind);realmApp.game.readyRealm();realmApp.game.chooseRealmBlessing(realmApp.game.realm.offers[0]);realmApp.refresh();});
  if(mode==='guardian')await page.evaluate(()=>{realmApp.game.continueRealm();realmApp.refresh();});
  if(await page.locator('#realm-dialog').isVisible())await page.locator('[data-realm-resume]').click();
  await page.waitForTimeout(350);
  const state=await page.evaluate(async()=>{
   const {settlementAt}=await import('/src/world/settlements.js'),g=realmApp.game,a=g.realm.arena;
   const {blocked}=await import('/src/physics/motion.js');
   return {arena:a,mode:g.realm.mode,time:realmApp.environment.time,overlap:!!settlementAt(a,a.radius+24),blocked:blocked(g.player.x,g.player.y,12,g.trees,g.player),phase:g.realm.phase};
  });
  if(state.overlap||state.blocked||state.mode!==mode||state.time!==(night?'night':'day'))throw Error(JSON.stringify(state));
  await page.screenshot({path:`output/playwright/realm-avoid-camps/${mode}-${width}-${state.time}.png`});results.push({width,...state});
 }
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,results,errors};
}
