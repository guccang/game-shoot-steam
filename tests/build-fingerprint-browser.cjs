// 正式设置版本信息检查：主菜单、战场、昼夜和三种屏宽，不修改业务存档结构。
async page=>{
 if(new URL(page.url()).port!=='4292')throw Error('仅限隔离验收端口4292');
 const errors=[],checks=[];page.on('pageerror',error=>errors.push(error.message));
 const response=await page.request.get(new URL('/build-info.json',page.url()).href),info=await response.json();
 if(response.headers()['cache-control']!=='no-store'||!/^[a-f0-9]{40}$/.test(info.commit))throw Error('实际 Git 接口不正确');
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.living.position={x:1600,y:400};
  p.vehicleHulls[0]=1;p.vehicleIndex=0;
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.setViewportSize({width:320,height:740});
 await page.evaluate(async()=>{await import('/src/main.js');});
 await page.waitForFunction(()=>!document.getElementById('start').disabled);
 await page.locator('#title-settings').click();
 await page.locator('#settings-dialog').waitFor({state:'visible'});
 await page.waitForFunction(()=>/^[a-f0-9]{7}$/.test(document.getElementById('settings-git-fingerprint').textContent));
 if(await page.locator('#settings-git-fingerprint').innerText()!==info.short)throw Error('主菜单指纹不匹配');
 await page.screenshot({path:'output/playwright/settings-git-fingerprint/menu-320.png'});
 await page.locator('#settings-done').click();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const g=a.game;g.update=()=>{};g.mainlineSpeech=null;
  g.vehicle.active=true;g.spawnEnemy(0,0,{x:g.player.x+130,y:g.player.y+55},{ambient:true});a.refresh();
 });
 for(const [width,height]of [[1280,900],[390,844],[320,740]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{const e=a.environment;e.livingPreview=true;e.time=phase;e.weather='sun';e.autoWeather=false;
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.renderer.camera.time=null;a.renderer.draw();},phase);
  await page.screenshot({path:`output/playwright/settings-git-fingerprint/field-${width}-${phase}.png`});
  await page.locator('#settings-button').focus();await page.keyboard.press('Enter');
  const result=await page.evaluate(async()=>{
   const r=(await import('/src/rendering/visual-review.js')).inspectSettingsFingerprint(document),label=document.querySelector('.settings-build').getBoundingClientRect(),close=document.getElementById('close-settings').getBoundingClientRect();
   return {...r,overlap:label.right>close.left&&label.top<close.bottom&&label.bottom>close.top};
  });
  if(result.fingerprint!==info.short||result.overflow||result.overlap)throw Error('指纹显示不正确或挤压关闭按钮');
  if(info.modified&&result.status!=='未提交修改')throw Error('缺少工作树改动标记');
  await page.screenshot({path:`output/playwright/settings-git-fingerprint/settings-${width}-${phase}.png`});checks.push({width,phase,...result});
  await page.locator('#settings-git-fingerprint').focus();if(await page.locator('#settings-git-fingerprint').getAttribute('title')!==info.commit)throw Error('缺少完整指纹');
  await page.locator('#settings-done').click();
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'settings-git-fingerprint',checks,errors,cache:'no-store',menu:true};
}
