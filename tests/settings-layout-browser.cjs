// 设置布局专项：正式控件、独立滚动、返回保存和清空确认，不执行无关战斗测试。
async(page)=>{
 if(new URL(page.url()).port!=='4241')throw Error('仅允许隔离测试端口4241');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.destroy();localStorage.clear();localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;window.settingsApp=a;Object.assign(a.game,{state:'playing',enemies:[],waveWarning:0,waveRest:0,spawnTimer:999,attackTimer:999});Object.assign(a.game.player,{x:780,y:900,hp:1000000});a.game.summonVehicle();a.refresh();});
 for(const [width,height] of [[1280,900],[390,844],[320,568],[740,360]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{const a=settingsApp;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.refresh();},time);
  await page.locator('#settings-button').click();
  await page.waitForTimeout(100);
  if(await page.locator('.settings-scroll').evaluate(n=>n.scrollTop)>1)throw Error('重新打开未回到常用设置顶部');
  const before=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectSettingsLayout(document));
  if(!before.contained||before.overflow||before.advancedOpen||!before.resetInAdvanced||before.buttons.some(b=>b.height<44)||before.buttons[0].right>=before.buttons[1].left)throw Error('布局错误 '+JSON.stringify(before));
  await page.screenshot({path:`output/playwright/settings-layout/settings-${width}-${time}.png`});
  await page.locator('#settings-advanced>summary').click();
  await page.locator('#reset-progress').scrollIntoViewIfNeeded();
  const after=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectSettingsLayout(document));
  if(after.footerBottom!==before.footerBottom||after.scrollEnd>after.buttons[0].top)throw Error('滚动改变底栏或覆盖按钮');
  if(width===320&&time==='day')await page.screenshot({path:'output/playwright/settings-layout/advanced-320.png'});
  samples.push({width,height,time,...before});
  await page.locator('#settings-done').click();await page.waitForFunction(()=>settingsApp.game.state==='playing');
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#settings-button').click();
 const blur=await page.locator('#pause-on-blur').isChecked();await page.locator('#pause-on-blur').setChecked(!blur);await page.locator('#pause-on-blur').setChecked(blur);
 await page.locator('#music-volume').fill('32');await page.locator('#music-volume').dispatchEvent('input');
 if(await page.locator('#music-volume-value').innerText()!=='32%')throw Error('音量调整失败');
 await page.locator('#environment-button').click();await page.locator('#environment-ok').click();
 if(!await page.locator('#settings-dialog').isVisible()||!await page.evaluate(()=>settingsApp.game.state==='paused'))throw Error('嵌套环境错误恢复战斗');
 await page.locator('#help').click();await page.locator('#help-ok').click();
 await page.locator('#chronicle-button').click();await page.locator('#chronicle-ok').click();
 await page.locator('#settings-advanced>summary').click();await page.locator('#debug-toggle').click();
 if(!await page.locator('#debug-content').isVisible())throw Error('调试区无法展开');
 await page.locator('#debug-toggle').click();
 // 确认页取消优先，取消和Esc均不改变进度，返回后仍能看到原入口。
 const coins=await page.evaluate(()=>settingsApp.game.progress.coins);
 await page.locator('#reset-progress').click();
 if(await page.evaluate(()=>document.activeElement.id)!=='cancel-reset'||await page.locator('#settings-done').isVisible())throw Error('确认页焦点或操作隔离错误');
 await page.screenshot({path:'output/playwright/settings-layout/reset-confirmation.png'});
 await page.locator('#cancel-reset').click();await page.locator('#reset-progress').click();await page.keyboard.press('Escape');
 if(await page.evaluate(()=>settingsApp.game.progress.coins)!==coins||await page.locator('#reset-confirmation').isVisible())throw Error('取消重置失败');
 await page.locator('#settings-home').click();await page.waitForFunction(()=>settingsApp.menu.page==='title');
 if(!await page.evaluate(()=>!!localStorage.getItem('forest-patrol-v1')))throw Error('返回未保存');
 await page.locator('#title-settings').click();
 if(!await page.locator('#settings-home').isHidden()||await page.locator('#settings-done').innerText()!=='返回主菜单')throw Error('首页返回动作错误');
 if(await page.locator('#settings-advanced').getAttribute('open')!==null)throw Error('重新打开未折叠高级区');
 await page.locator('#settings-done').click();await page.locator('#start').click();
 // 仅在隔离存档执行真实清空事务，确认入口重排未断开原监听。
 await page.locator('#settings-button').click();await page.locator('#settings-advanced>summary').click();await page.locator('#reset-progress').click();await page.locator('#confirm-reset').click();
 await page.waitForFunction(()=>settingsApp.menu.page==='game'&&settingsApp.game.state==='playing');
 if(await page.evaluate(()=>{settingsApp.game.pause();return settingsApp.game.progress.coins;})!==60)throw Error('清空事务没有执行');
 if(errors.length)throw Error(errors.join(';'));
 return {pass:true,samples,controls:true,nestedDialogs:true,cancelSafe:true,saveHome:true,reset:true,errors};
}
