// 正式页面验证等级图鉴、各阶缩略图、模态返回与手机桌面昼夜排版。
async page=>{
 if(new URL(page.url()).port!=='4290')throw Error('仅允许隔离验收端口');const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [width,night] of [[320,false],[390,true],[1280,false],[1280,true]]){
  await page.setViewportSize({width,height:844});
  await page.evaluate(async({night})=>{
   (window.cApp||(await import('/src/main.js')).application).destroy();for(const d of document.querySelectorAll('dialog[open]'))d.close();localStorage.clear();
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{LIVING_PHASES}=await import('/src/config/living-world.js');
   const p=freshProgress();p.bosses=2;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.equipmentGoal={kind:'weapons',index:1};p.living.position={x:1600,y:400};p.living.calendar={day:1,elapsed:LIVING_PHASES.find(p=>p.id===(night?'night':'day')).start+1000};
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
   window.cApp=(await import('/src/app/create-app.js')).createApplication({random:()=>.5});
  },{night});
  await page.locator('#start').click();await page.waitForFunction(()=>cApp.menu.page==='game');
  await page.waitForFunction(n=>n?cApp.renderer.tone.sample(performance.now()).night>.99:cApp.renderer.tone.sample(performance.now()).night<.01,night);
  await page.locator('#equipment-goal').click();const before=await page.evaluate(()=>JSON.stringify(cApp.game.progress));
  await page.locator('#goal-details [data-challenge-catalog]').click();
  if(await page.locator('#challenge-tier-nav [aria-pressed="true"]').getAttribute('data-challenge-tier')!=='2')throw Error('未默认显示下一阶');
  await page.screenshot({path:`output/playwright/challenge-level-catalog/next-${width}-${night}.png`});
  const tierChecks=[];
  for(let tier=0;tier<=5;tier++){
   await page.locator(`[data-challenge-tier="${tier}"]`).click();
   const actual=await page.locator('#challenge-catalog-grid h4').allTextContents();
   const expected=await page.evaluate(async t=>(await import('/src/progression/realms/challenge-catalog.js')).challengeCatalog(cApp.game.progress).tiers[t].items.map(i=>i.name),tier);
   if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('名称或分组错误');
   const images=await page.locator('#challenge-catalog-grid canvas').evaluateAll(nodes=>nodes.map(c=>({width:c.width,height:c.height,pixels:Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).filter((v,i)=>i%4===3&&v>0).length})));
   if(images.some(i=>i.pixels<100))throw Error('装备图片为空');
   if(await page.locator('#challenge-catalog-body').evaluate(e=>e.scrollWidth>e.clientWidth+1))throw Error('图片溢出');
   tierChecks.push({tier,names:actual,images});
  }
  await page.screenshot({path:`output/playwright/challenge-level-catalog/top-${width}-${night}.png`});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#challenge-catalog-dialog').open);
  if(!await page.locator('#equipment-goal-dialog').evaluate(e=>e.open))throw Error('关闭图鉴丢失原面板');
  if(await page.evaluate(()=>cApp.game.state)!=='paused')throw Error('嵌套关闭提前恢复战斗');
  if(await page.evaluate(()=>JSON.stringify(cApp.game.progress))!==before)throw Error('查看图鉴修改进度');
  await page.waitForFunction(()=>document.querySelectorAll('#challenge-catalog-grid canvas').length===0);
  await page.locator('#goal-details [data-challenge-catalog]').focus();await page.keyboard.press('Enter');await page.waitForSelector('#challenge-catalog-dialog[open]');await page.locator('#challenge-catalog-close').click();
  await page.locator('#goal-workshop').click();await page.locator('#ws-challenge-level [data-challenge-catalog]').click();await page.waitForSelector('#challenge-catalog-dialog[open]');
  await page.locator('#challenge-catalog-close').click();
  if(!await page.locator('#workshop-dialog').evaluate(e=>e.open))throw Error('图鉴关闭未返回工坊');
  await page.locator('#ws-close').click();await page.waitForFunction(()=>cApp.game.state==='playing');
  checks.push({width,night,tiers:tierChecks});
 }
 if(errors.length)throw Error(errors.join('\n'));return {passed:true,checks,errors};
}
