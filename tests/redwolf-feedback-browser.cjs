// 实际点击红狼试驾，检查耐久靶首炮掉血、连续命中、暂停与昼夜反馈。
async page=>{
 if(new URL(page.url()).port!=='4308')throw Error('仅允许隔离端口4308');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/redwolf-feedback/video',size:{width:390,height:844}}});
 const t=await context.newPage(),errors=[],results=[];t.on('pageerror',e=>errors.push(e.message));
 await t.goto('http://localhost:4308');await t.locator('#start').tap();
 await t.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  window.readTrial=()=>import('/src/ui/workshop/trial-scene.js').then(m=>m.inspectWeaponTrialScene(document.getElementById('weapon-trial-dialog')));
  const {freshProgress,validateProgress}=await import('/src/progression/progress.js'),p=freshProgress();
  p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.mainline.seen.trial=1;
  p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  a.game.progress=validateProgress(p);a.game.reset();a.game.state='playing';a.game.mainlineSpeech=null;a.game.update=()=>{};
  for(const d of document.querySelectorAll('dialog[open]'))d.close();a.workshop.open('vehicle',6);a.refresh();
 });
 const before=await t.evaluate(()=>JSON.stringify(a.game.progress));
 for(const [width,height]of [[320,568],[390,844],[844,390],[1280,900]]){
  await t.setViewportSize({width,height});await t.locator('#ws-test').tap();
  await t.waitForFunction(async()=>{const s=await readTrial();return s?.damage>0&&s.batch===1;},{},{timeout:12000});
  await t.screenshot({path:`output/playwright/redwolf-feedback/${width}-live-day.png`});
  await t.locator('#weapon-trial-pause').tap();
  const hit=await t.evaluate(()=>readTrial());
  if(hit.targets.length!==6||hit.destroyed!==0||!hit.targets.some(e=>e.hp===640)||!hit.targets.some(e=>e.hp===836)||!hit.numbers.includes('560')||!hit.numbers.includes('364'))throw Error('耐久靶掉血反馈不正确：'+JSON.stringify(hit));
  await t.screenshot({path:`output/playwright/redwolf-feedback/${width}-day.png`});
  await t.locator('#weapon-trial-time').tap();await t.screenshot({path:`output/playwright/redwolf-feedback/${width}-night.png`});await t.locator('#weapon-trial-time').tap();
  const paused=await t.evaluate(()=>readTrial());if(paused.elapsed!==hit.elapsed||paused.refillRemaining!==hit.refillRemaining)throw Error('暂停仍推进补靶');
  await t.locator('#weapon-trial-pause').tap();
  await t.waitForFunction(async()=>{const s=await readTrial();return s?.damage>2380;});
  await t.locator('#weapon-trial-pause').tap();await t.screenshot({path:`output/playwright/redwolf-feedback/${width}-second-hit.png`});
  await t.locator('#weapon-trial-time').tap();await t.locator('#weapon-trial-restart').tap();
  await t.waitForFunction(async()=>{const s=await readTrial();return s?.damage===0&&s.batch===1;});
  await t.waitForFunction(async()=>{const s=await readTrial();return s?.damage>0&&s.batch===1;});
  await t.screenshot({path:`output/playwright/redwolf-feedback/${width}-live-night.png`});await t.locator('#weapon-trial-time').tap();
  await t.locator('#weapon-trial-close').tap();if(!await t.locator('#workshop-dialog').isVisible())throw Error('未返回工坊');
  if(await t.evaluate(()=>JSON.stringify(a.game.progress))!==before)throw Error('试驾改变正式存档');
  results.push({width,height,damage:hit.damage,hp:hit.targets.map(e=>e.hp),numbers:hit.numbers,continuousHits:true,restart:true,isolated:true});
 }
 if(errors.length)throw Error(errors.join('\n'));
 await context.close();await page.evaluate(r=>window.feedbackResult=r,{results,errors});
}
