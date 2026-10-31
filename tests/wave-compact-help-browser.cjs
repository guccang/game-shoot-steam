// 紧凑波次界面专项：真实点击、暂停归属、焦点恢复和手机昼夜同屏。
async(page)=>{
 if(new URL(page.url()).port!=='4237')throw Error('仅允许隔离端口4237');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.destroy();localStorage.clear();});
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game;window.waveHelpApp=a;
  Object.assign(g,{wave:2,waveGroupStart:1,bossWave:5,waveKills:10,waveSpawned:10,waveRest:0,waveWarning:0,spawnTimer:999,attackTimer:999});
  Object.assign(g.player,{x:780,y:900});g.enemies=[];
  const e=g.spawnEnemy(0,0,{x:700,y:1020});Object.assign(e,{speed:0,hp:1e8,maxHp:1e8,damage:0});
  g.summonVehicle();g.vehicle.module.cooldown=999;a.refresh();
 });
 // 所有视觉检查读取正式节点、圆环、触摸区域和同一详情弹窗。
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   const a=window.waveHelpApp;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.refresh();
  },time);await page.waitForTimeout(200);
  const s=await page.evaluate(async()=>{
   const s=(await import('/src/rendering/visual-review.js')).inspectWaveProgress(document);
   const boss=document.getElementById('boss-button').getBoundingClientRect();
   return {...s,helpSeparate:s.helpBox.left>=boss.right,helpTouch:s.helpBox.width>=44&&s.helpBox.height>=44};
  });
  if(s.titleVisible||s.countVisible||s.detailVisible||s.panelHeight>64||s.overflow||!s.helpSeparate||!s.helpTouch||!s.touchSize)throw Error('紧凑布局错误 '+JSON.stringify(s));
  samples.push({width,time,...s});await page.screenshot({path:`output/playwright/wave-compact-help/hud-${width}-${time}.png`});
  await page.locator('#wave-help').click();await page.locator('#wave-help-dialog').waitFor({state:'visible'});
  if(await page.locator('#wave-help-count').textContent()!=='10 / 18'||!(await page.locator('#wave-help-wave').textContent()).includes('第 2 波'))throw Error('详情计数不符');
  const modal=await page.evaluate(()=>{const d=document.getElementById('wave-help-dialog'),r=d.getBoundingClientRect();return {paused:waveHelpApp.game.state==='paused',overflow:d.scrollWidth>d.clientWidth+1,contained:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,focus:document.activeElement.id};});
  if(!modal.paused||modal.overflow||!modal.contained||modal.focus!=='wave-help-close')throw Error('详情布局或焦点错误 '+JSON.stringify(modal));
  await page.screenshot({path:`output/playwright/wave-compact-help/detail-${width}-${time}.png`});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>waveHelpApp.game.state==='playing');
  if(await page.evaluate(()=>document.activeElement.id)!=='wave-help')throw Error('关闭未恢复问号焦点');
 }
 // 再次打开必须读到新值；圆环在查看期间保持同一位置。
 await page.evaluate(()=>{const a=waveHelpApp,g=a.game;g.waveKills=17;g.waveWarning=2;g.waveWarningAfterRest=false;a.refresh();});
 await page.locator('#wave-help').click();
 if(await page.locator('#wave-help-count').textContent()!=='17 / 18')throw Error('重新打开使用旧计数');
 const warning=await page.evaluate(()=>waveHelpApp.game.waveWarning);await page.waitForTimeout(350);
 if(await page.evaluate(()=>waveHelpApp.game.waveWarning)!==warning)throw Error('详情未冻结计时');
 await page.locator('#wave-help-close').click();await page.waitForFunction(()=>waveHelpApp.game.state==='playing');
 // 同一行保留足够空间显示倒计时外圈，且与 Boss 和问号互不覆盖。
 await page.evaluate(()=>{waveHelpApp.game.waveWarning=2;waveHelpApp.refresh();});
 await page.screenshot({path:'output/playwright/wave-compact-help/countdown-320.png'});
 const rings=await page.evaluate(()=>{const rings=[...document.querySelectorAll('.wave-node[data-countdown="true"] svg')];return rings.map(n=>{const r=n.getBoundingClientRect(),p=n.closest('.wave-node'),next=p.nextElementSibling?.getBoundingClientRect();return {right:r.right,next:next?.left};});});
 if(rings.length!==1||rings.some(r=>r.next&&r.right>r.next))throw Error('圆环覆盖相邻节点');
 // Boss 完成条件保持真实配额结算；帮助中的提示与按钮实际行为一致。
 await page.evaluate(async()=>{const a=waveHelpApp,g=a.game,{waveDifficulty}=await import('/src/config/waves.js');g.enemies=[];g.wave=g.bossWave;g.waveWarning=0;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;g.updateWaves(.01);a.refresh();});
 await page.locator('#wave-help').click();
 if(!(await page.locator('#wave-help-wave').textContent()).includes('Boss 已就绪'))throw Error('Boss详情错误');
 await page.locator('#wave-help-close').click();await page.locator('#boss-button').click();
 if(!await page.evaluate(()=>!!waveHelpApp.game.boss))throw Error('Boss图标失效');
 await page.evaluate(()=>{const g=waveHelpApp.game,b=g.boss;g.hit(b,1e9);g.hit(b,1e9);waveHelpApp.refresh();});
 // 仅普通波次隐藏标题，剧情和秘境沿用自己的任务标题。
 for(const mode of ['story','realm']){
  await page.evaluate(mode=>{const a=waveHelpApp,g=a.game;Object.assign(g.player,{x:970,y:790});g.state='playing';if(mode==='story')g.enterStory('sunleaf-01','sunleaf-post');else g.enterRealm('tower');a.refresh();},mode);
  await page.locator('#wave-help').waitFor({state:'hidden'});await page.locator('#quest-title').waitFor({state:'visible'});
  await page.evaluate(mode=>{const a=waveHelpApp,g=a.game;if(mode==='story')g.leaveStory();else g.leaveRealm();g.start();a.refresh();},mode);
  if(await page.locator('#story-dialog').isVisible())await page.locator('#story-close').click();
 }
 // 卸载重挂只生成一套按钮和面板，沿用正式应用生命周期。
 const lifecycle=await page.evaluate(async()=>{
  const a=waveHelpApp;a.destroy();
  const removed=!document.getElementById('wave-help')&&!document.getElementById('wave-help-dialog');
  const b=(await import('/src/app/create-app.js')).createApplication();window.waveHelpApp=b;await b.ready;
  return {removed,buttons:document.querySelectorAll('#wave-help').length,dialogs:document.querySelectorAll('#wave-help-dialog').length};
 });
 if(!lifecycle.removed||lifecycle.buttons!==1||lifecycle.dialogs!==1||errors.length)throw Error(JSON.stringify({lifecycle,errors}));
 return {pass:true,designCriterion:'wave-compact-help',samples,lifecycle,errors};
}
