// 秘境进度与兽潮退出专项实机验收，使用独立端口和当前存档格式。
async page=>{
 if(new URL(page.url()).port!=='4280')throw Error('仅允许隔离端口');
 const checks=[],errors=[];page.on('pageerror',error=>errors.push(error.message));
 // 每个场景从完整森林状态进入，避免共享 HUD 残留使检查误通过。
 async function mount(width,night=false,gate=false){
  await page.setViewportSize({width,height:width===390?844:800});
  await page.evaluate(async({night,gate})=>{
   (window.hudApp||(await import('/src/main.js')).application).destroy();for(const d of document.querySelectorAll('dialog[open]'))d.close();localStorage.clear();
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
   const p=freshProgress();p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.living.position=gate?{x:120,y:729}:{x:635,y:700};p.living.calendar={day:1,elapsed:night?1100000:400000};
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:night?'night':'day',autoTime:false,autoWeather:false}));
   const {createApplication}=await import('/src/app/create-app.js');window.hudApp=createApplication();
  },{night,gate});
  await page.locator('#start').click();await page.waitForFunction(()=>hudApp.menu.page==='game');
  await page.evaluate(()=>{hudApp.game.update=()=>{};});
 }
 // 验证真实 DOM 和计算后布局，不只检查 hidden 字段。
 async function check(name,fn){if(!await page.evaluate(fn))throw Error(name);checks.push(name);}
 for(const [mode,width,night] of [['tower',1280,false],['tower',390,true],['rogue',1280,true],['rogue',390,false]]){
  await mount(width,night);
  if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').click();
  await page.locator('#realm-button').click();await page.locator(`[data-enter-realm="${mode}"]`).click();
  if(mode==='rogue')await page.evaluate(()=>{const g=hudApp.game;for(const kind of ['weapon','vehicle','turret'])g.rollRealmEquipment(kind);g.readyRealm();g.chooseRealmBlessing(g.realm.offers[0]);hudApp.refresh();});
  if(await page.locator('#realm-dialog').isVisible())await page.locator('[data-realm-resume]').click();
  await check(mode+' 预警时显示关卡及倒计时 '+width,()=>{const q=document.getElementById('quest');return !q.hidden&&q.getBoundingClientRect().height>0&&document.getElementById('quest-title').textContent.includes('1')&&document.getElementById('quest-count').textContent.includes('3')&&!q.classList.contains('wave-quest');});
  await page.evaluate(async()=>{const g=hudApp.game,{updateRealm}=await import('/src/core/realm-manager.js');g.realm.warning=0;updateRealm(g,.1);g.hit(g.enemies[0],999999);hudApp.refresh();});
  await check(mode+' 击杀实时反映在进度计数 '+width,()=>{const r=hudApp.game.realm;return r.kills>0&&document.getElementById('quest-count').textContent===`${r.kills} / ${r.spec.total}`&&!document.getElementById('quest').hidden;});
  await page.screenshot({path:`output/playwright/realm-progress-horde-exit/${mode}-${width}-${night?'night':'day'}.png`});
  if(mode==='tower'){
   await page.evaluate(async()=>{const g=hudApp.game,{updateRealm}=await import('/src/core/realm-manager.js');g.enemies=[];g.realm.kills=g.realm.spec.total;updateRealm(g,0);hudApp.refresh();});
   await check('高塔休整进度不消失 '+width,()=>hudApp.game.realm.phase==='rest'&&!document.getElementById('quest').hidden&&document.getElementById('quest-count').textContent.includes('5'));
   await page.evaluate(async()=>{const g=hudApp.game,{updateRealm,beginRealmStage}=await import('/src/core/realm-manager.js');g.realm.stage=5;beginRealmStage(g);g.realm.warning=0;g.realm.spawned=g.realm.spec.total-1;g.realm.kills=g.realm.spec.total-1;g.realm.spawnTimer=0;updateRealm(g,.1);hudApp.refresh();});
   await check('高塔 Boss 血条与进度不重叠 '+width,()=>{const q=document.getElementById('quest'),b=document.getElementById('boss-hud');return !!hudApp.game.boss&&!q.hidden&&!b.hidden&&b.getBoundingClientRect().top>=q.getBoundingClientRect().bottom+7;});
   await page.screenshot({path:`output/playwright/realm-progress-horde-exit/tower-boss-${width}.png`});
  }
  await page.locator('#realm-button').click();await page.locator('[data-realm-exit]').click();
  await check('退出 '+mode+' 后安全区不残留秘境进度 '+width,()=>!hudApp.game.realm&&document.getElementById('quest').hidden&&!document.getElementById('game-frame').classList.contains('realm-active'));
 }
 for(const [width,night] of [[1280,false],[390,true]]){
  await mount(width,night,true);
  await page.evaluate(()=>document.querySelector('[data-camp-gate="left"]').click());
  await check('未开始兽潮不显示退出 '+width,()=>document.getElementById('camp-leave').hidden);
  await page.evaluate(()=>{window.originalCampPlayer=hudApp.game.player;window.originalCampCoins=hudApp.game.progress.coins;});
  await page.locator('#camp-primary').click();await page.locator('#camp-help').click();
  if(!await page.locator('#camp-leave').isVisible())throw Error('兽潮退出按钮不可见');
  await page.screenshot({path:`output/playwright/realm-progress-horde-exit/horde-exit-${width}-${night?'night':'day'}.png`});
  // 写入失败必须保留本轮，不让关闭弹窗造成存档和现场分叉。
  await page.evaluate(()=>{window.originalCampPersist=hudApp.game.campDefensePersist;hudApp.game.campDefensePersist=()=>false;});
  await page.locator('#camp-leave').click();
  await check('兽潮退出保存失败保持面板和现场 '+width,()=>!!hudApp.game.campDefense&&document.getElementById('camp-defense-dialog').open&&document.getElementById('camp-error').textContent.includes('保存失败'));
  await page.evaluate(()=>{hudApp.game.campDefensePersist=originalCampPersist;});await page.locator('#camp-leave').click();
  await check('兽潮退出成功清空活动且无奖励 '+width,()=>!hudApp.game.campDefense&&hudApp.game.player===originalCampPlayer&&hudApp.game.progress.coins===originalCampCoins&&!document.getElementById('camp-defense-dialog').open&&document.getElementById('camp-defense-hud').hidden&&!document.getElementById('game-frame').classList.contains('camp-defending')&&JSON.parse(localStorage.getItem('forest-patrol-v1')).campDefense.run===null);
  await page.evaluate(()=>document.querySelector('[data-camp-gate="left"]').click());await page.locator('#camp-primary').click();
  await page.evaluate(()=>{hudApp.game.campDefense.phase='result';hudApp.refresh();});
  await check('兽潮结算仅保留领取返回，不丢弃已得奖励 '+width,()=>document.getElementById('camp-leave').hidden&&document.getElementById('camp-primary').textContent.includes('领取奖励'));
 }
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,checks,errors};
}
