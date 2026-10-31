// 首次目标与声音默认值专项：隔离存档，检查真实手机控件和任务显示。
async page=>{
 if(new URL(page.url()).port!=='4305')throw Error('仅限隔离端口4305');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});await page.reload();await page.evaluate(()=>import('/src/main.js'));
 for(const [width,height] of [[390,844],[320,568]]){
  await page.setViewportSize({width,height});await page.locator('#title-settings').click();await page.locator('#settings-dialog').waitFor({state:'visible'});
  const values=await page.evaluate(()=>({music:document.querySelector('#music-volume').value,effects:document.querySelector('#effects-volume').value,musicText:document.querySelector('#music-volume-value').textContent,effectsText:document.querySelector('#effects-volume-value').textContent}));
  if(values.music!=='66'||values.effects!=='3'||values.musicText!=='66%'||values.effectsText!=='3%')throw Error(JSON.stringify(values));checks.push({width,...values});await page.locator('#effects-volume').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/quest-defaults/settings-'+width+'.png'});await page.locator('#settings-done').click();
 }
 await page.locator('#start').click();await page.waitForFunction(async()=> (await import('/src/main.js')).application.menu.page==='game');
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;(await import('/src/core/ranger-arrival.js')).skipArrivalJourney(g);g.update=()=>{};a.refresh();});
 for(const [width,height,phase] of [[390,844,'day'],[320,568,'night']]){
  await page.setViewportSize({width,height});await page.evaluate(async phase=>{const {LIVING_PHASES}=await import('/src/config/living-world.js'),{projectLivingCalendar}=await import('/src/world/living-calendar.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===phase).start+1000;projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.resize();a.refresh();a.renderer.draw();},phase);
  const body=await page.locator('#arrival-body').textContent();if(!body.includes('/80'))throw Error('采木目标错误 '+body);await page.screenshot({path:'output/playwright/quest-defaults/gather-'+width+'-'+phase+'.png'});
 }
 // 旧任务夹具只设置未完成的进度，界面继续使用正式条件与操作引导。
 await page.evaluate(async()=>{const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(x=>x.id);p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('first-boss'));p.mainline.phase='doing';p.weapons[0]=3;p.heroes[0]=5;p.bosses=0;a.game.progress=p;a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.state='playing';a.refresh();});
 await page.locator('#mainline-info').click();const task=await page.locator('#mainline-current').innerText();if(task.includes('手枪或散弹枪升到5级')||!task.includes('击败森林领主'))throw Error(task);await page.screenshot({path:'output/playwright/quest-defaults/boss-task.png'});await page.locator('#mainline-close').click();
 await page.locator('#settings-button').click();await page.locator('#music-volume').fill('22');await page.locator('#effects-volume').fill('7');await page.locator('#settings-done').click();await page.reload();await page.evaluate(()=>import('/src/main.js'));await page.locator('#title-settings').click();await page.locator('#settings-dialog').waitFor({state:'visible'});
 if(await page.locator('#music-volume').inputValue()!=='22'||await page.locator('#effects-volume').inputValue()!=='7')throw Error('已有音量偏好未保留');
 if(errors.length)throw Error(errors.join('\n'));return {checks,task,savedPreferences:true,errors};
}
