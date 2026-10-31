// 通过正式游戏和真实按钮检查 HUD 互斥、恢复与短条触控，独立端口不影响用户存档。
async page=>{
 if(new URL(page.url()).port!=='4264')throw Error('仅用于4264测试端口');
 const errors=[],samples=[],checks=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=['first-map'];p.mainline.phase='report';p.equipmentGoal={kind:'vehicle',index:1};p.vehicleHulls[0]=1;p.living.position={x:1600,y:400};p.living.patrolActive=false;localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();
 // 只设置场景前置条件，清缴完成和 Boss 结算仍使用正式入口。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.wave=1;g.bossWave=3;g.waveWarning=g.waveRest=0;g.waveSpawned=(await import('/src/config/waves.js')).waveDifficulty(g.wave).total;g.spawnTimer=g.attackTimer=999;g.enemies=[];for(const p of [{x:1690,y:490},{x:1520,y:460}]){const e=g.spawnEnemy(0,0,p,{ambient:true});Object.assign(e,{hp:1e9,maxHp:1e9,speed:0,damage:0});}g.vehicle.active=true;g.progress.living.calendar={day:1,elapsed:400000};a.environment.autoWeather=false;a.environment.weather='sun';a.refresh();});
 // 问号已移除，装备追踪仍由实际点击进入、关闭。
 await page.locator('#equipment-goal').click();if(!await page.locator('#equipment-goal-dialog').isVisible())throw Error('装备追踪不能查看');await page.locator('#close-goal').click();checks.push('装备追踪点击可用');
 // 昼夜过渡使用正式环境时钟，各尺寸逐一采样探索和清缴。
 for(const phase of ['day','night']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application;a.game.progress.living.calendar={day:1,elapsed:phase==='day'?400000:1100000};},phase);await page.waitForTimeout(21000);
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});
   for(const mode of ['explore','clearing']){
    await page.evaluate(async mode=>{const a=(await import('/src/main.js')).application,g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.progress.living.patrolActive=mode==='clearing';a.refresh();},mode);await page.waitForTimeout(400);
    const s=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectCompactTaskHud(document));const p=s.panels;
    if(mode==='clearing'&&(!p.quest||p['mainline-hud']||p['equipment-goal']))throw Error('战斗 HUD 没有独占 '+JSON.stringify(s));
    if(mode==='explore'&&(!p['mainline-hud']||!p['equipment-goal']||p.quest||p['mainline-hud'].height>60))throw Error('探索 HUD 未恢复或不够紧凑 '+JSON.stringify(s));
    const visible=Object.values(p).filter(Boolean);for(const r of visible)if(r.x<0||r.right>width+1)throw Error('HUD 超出屏幕');
    for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){const a=visible[i],b=visible[j];if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)throw Error('HUD 相互重叠');}
    if(mode==='explore'&&p['equipment-goal'].top<p['mainline-hud'].bottom)throw Error('装备追踪未排在主线下方');
    if(s.overflow)throw Error('页面横向溢出');samples.push({width,phase,mode,...s});await page.screenshot({path:`output/playwright/early-clearing-compact-hud/${mode}-${width}-${phase}.png`});
   }
  }
 }
 await page.setViewportSize({width:390,height:900});
 // 休整和预警仍占用同一张清缴面板，隐藏状态不依赖资源余额变化。
 for(const state of ['rest','warning','ready']){await page.evaluate(async state=>{const a=(await import('/src/main.js')).application,g=a.game;g.waveRest=state==='rest'?3:0;g.waveWarning=state==='warning'?3:0;g.bossReady=state==='ready';if(state==='ready'){g.wave=g.bossWave;g.waveKills=g.waveSpawned=(await import('/src/config/waves.js')).waveDifficulty(g.wave).total;g.enemies=[];}a.refresh();},state);const s=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectCompactTaskHud(document));if(!s.panels.quest||s.panels['equipment-goal']||s.panels['mainline-hud'])throw Error('波间或待战出现多面板');checks.push(state);}
 await page.locator('#boss-button').click();await page.waitForTimeout(200);const boss=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectCompactTaskHud(document));if(!boss.panels['boss-hud']||boss.panels['mainline-hud']||boss.panels['equipment-goal'])throw Error('Boss 战遮挡');await page.screenshot({path:'output/playwright/early-clearing-compact-hud/boss.png'});
 const finish=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.hit(g.boss,1e9);g.updateWaves(100);a.refresh();return {active:g.progress.living.patrolActive,goal:g.progress.equipmentGoal};});if(finish.active||finish.goal?.index!==1)throw Error('结算没有停止或追踪丢失');
 if(!await page.locator('#mainline-hud').isVisible()||!await page.locator('#equipment-goal').isVisible())throw Error('清缴结束未恢复');checks.push({finish});
 // 无导航时主线为44像素短目标，有导航保留箭头和距离。
 await page.locator('#mainline-hud').click();await page.waitForTimeout(200);if(!await page.locator('#mainline-dialog').isVisible())throw Error('主线短条不能点击');checks.push('短条操作入口可用');await page.locator('#mainline-close').click();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.progress.mainline.completed=['first-map','first-patrol'];g.progress.mainline.phase='doing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;a.refresh();});await page.waitForTimeout(200);const compact=await page.locator('#mainline-hud').boundingBox();if(compact.height!==44||!await page.locator('.mainline-bearing').evaluate(n=>n.hidden))throw Error('非赶路目标没有压成44像素短条');checks.push({compact});await page.screenshot({path:'output/playwright/early-clearing-compact-hud/compact-operation.png'});
 if(errors.length)throw Error(errors.join(';'));return {samples,checks,errors};
}
