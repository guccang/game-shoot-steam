// 真实工坊入口进入全屏演练，验证移动、暂停、关闭和各类武器截图。
async page=>{
 if(new URL(page.url()).port!=='4292')throw Error('仅限隔离验收端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
  p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  p.weapons.fill(1);p.wood=p.coins=99999;
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.readTrial=(await import('/src/ui/workshop/trial-scene.js')).inspectWeaponTrialScene;});
 await page.waitForFunction(()=>a.menu.page==='game');
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>document.getElementById('weapons-button').click());
 await page.locator('#workshop-dialog').waitFor({state:'visible'});
 await page.locator('#ws-test').click();
 await page.waitForFunction(()=>readTrial(document.getElementById('weapon-trial-dialog'))?.elapsed>.2);
 if(await page.locator('#ws-trial').count())throw Error('仍存在小窗口试射');
 const before=await page.evaluate(()=>JSON.stringify(a.game.progress));
 const position=await page.evaluate(()=>readTrial(document.getElementById('weapon-trial-dialog')).player);
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(600);await page.keyboard.up('ArrowRight');
 const after=await page.evaluate(()=>readTrial(document.getElementById('weapon-trial-dialog')).player);if(after.x<=position.x+30)throw Error('无法走位');
 await page.locator('#weapon-trial-pause').click();
 const paused=await page.evaluate(()=>readTrial(document.getElementById('weapon-trial-dialog')).elapsed);
 await page.waitForTimeout(250);if(await page.evaluate(()=>readTrial(document.getElementById('weapon-trial-dialog')).elapsed)!==paused)throw Error('暂停失效');
 for(const size of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1280,height:900}]){
  await page.setViewportSize(size);await page.waitForTimeout(80);
  const layout=await page.evaluate(()=>{const d=document.getElementById('weapon-trial-dialog'),c=document.getElementById('weapon-trial-canvas').getBoundingClientRect();return {overflow:d.scrollHeight>d.clientHeight+2||d.scrollWidth>d.clientWidth+2,canvas:c.height,small:[...d.querySelectorAll('button')].some(b=>b.getBoundingClientRect().height<44)};});
  if(layout.overflow||layout.small||layout.canvas<100)throw Error('布局不合格 '+JSON.stringify({size,layout}));
  await page.screenshot({path:'output/playwright/trial-layout-'+size.width+'.png'});
 }
 await page.locator('#weapon-trial-close').click();await page.waitForTimeout(100);
 if(!await page.locator('#workshop-dialog').isVisible()||await page.evaluate(()=>a.game.state)!=='paused')throw Error('未返回暂停工坊');
 if(await page.evaluate(()=>JSON.stringify(a.game.progress))!==before)throw Error('演练污染正式存档');
 await page.setViewportSize({width:390,height:844});
 const results=[];
 for(const index of [1,3,6,8,9,10,12,13,14,15,16,17]){
  await page.locator('[data-ws-item="'+index+'"]').click();
  await page.locator('#ws-test').click();
  await page.waitForFunction(()=>readTrial(document.getElementById('weapon-trial-dialog'))?.elapsed>.7);
  const state=await page.evaluate(()=>readTrial(document.getElementById('weapon-trial-dialog')));
  if(await page.locator('#weapon-trial-dialog').getAttribute('data-error'))throw Error('演练渲染报错');
  await page.screenshot({path:'output/playwright/trial-weapon-'+index+'-day.png'});
  await page.locator('#weapon-trial-time').click();await page.screenshot({path:'output/playwright/trial-weapon-'+index+'-night.png'});
  await page.locator('#weapon-trial-time').click();
  results.push({index,scene:state.spec});
  await page.locator('#weapon-trial-close').click();await page.waitForTimeout(60);
 }
 await page.evaluate(result=>window.weaponTrialResult=result,{results,errors});
 if(errors.length)throw Error(JSON.stringify(errors));
}
