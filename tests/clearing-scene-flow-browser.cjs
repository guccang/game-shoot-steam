// 实际点击接取、沿正式路线走出营地，再用真实清波结算推进节点；战斗数值不改动。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.reload();await page.locator('#start').click();await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.progress.mainline.completed=['first-map'];g.progress.mainline.phase='doing';g.progress.living.patrolActive=false;g.mainlineSpeech=null;g.mainlineTalkDelay=999;Object.assign(g.player,{x:920,y:1000,invincible:999});a.refresh();});await page.waitForTimeout(600);
 await page.keyboard.press('KeyE');await page.waitForTimeout(200);if(!await page.locator('#clearing-dialog').isVisible())throw Error('E没有打开现场告示牌');
 // 用触屏确认，保证与鼠标共用相同接取事务。
 const cdp=await page.context().newCDPSession(page),b=await page.locator('#clearing-accept').boundingBox(),touch={x:b.x+b.width/2,y:b.y+b.height/2,radiusX:2,radiusY:2};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(500);
 const accepted=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return (await import('/src/rendering/visual-review.js')).inspectClearingGuide(a.game,document);});if(accepted.stage!=='travel'||accepted.target?.id!=='east-clearing'||accepted.waveHud||accepted.dialog)throw Error(JSON.stringify(accepted));
 await page.screenshot({path:'output/playwright/clearing-scene-guide/accepted-route.png'});
 let arrived=false;const held=new Set();
 for(let i=0;i<230;i++){
  const s=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;if((await import('/src/core/camp/living-safety.js')).livingWaveAllowed(g))return {arrived:true};const r=(await import('/src/core/navigation/story-route.js')).storyRouteState(g),p=r?.points[1];return p?{dx:p.x-g.player.x,dy:p.y-g.player.y}:{};});
  if(s.arrived){arrived=true;break;}
  const keys=[];if(Math.abs(s.dx)>Math.abs(s.dy)*.35)keys.push(s.dx>0?'ArrowRight':'ArrowLeft');if(Math.abs(s.dy)>Math.abs(s.dx)*.35)keys.push(s.dy>0?'ArrowDown':'ArrowUp');
  for(const key of held)if(!keys.includes(key)){await page.keyboard.up(key);held.delete(key);}for(const key of keys)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}await page.waitForTimeout(120);
 }
 for(const key of held)await page.keyboard.up(key);if(!arrived)throw Error('未能沿正式路线走到清缴场');await page.waitForTimeout(3800);
 await page.screenshot({path:'output/playwright/clearing-scene-guide/field-waves.png'});
 const field=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;if(!g.enemies.some(e=>e.wave===g.wave))throw Error('到场没有波次怪物');return {x:g.player.x,y:g.player.y,spawned:g.waveSpawned,state:(await import('/src/rendering/visual-review.js')).inspectClearingGuide(g,document)};});
 // 清波通过原有伤害/奖励结算；只跳过等待，不代替玩家点击Boss。
 const cleared=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,{waveDifficulty}=await import('/src/config/waves.js');for(const e of [...g.enemies])g.hit(e,1e9);while(g.waveKills<waveDifficulty(g.wave).total)g.hit(g.spawnEnemy(0,100),1e9);g.updateWaves(.01);(await import('/src/core/story/mainline-manager.js')).updateMainline(g,0);a.refresh();return g.progress.mainline.phase;});if(cleared!=='report')throw Error('第一波完成后未进入交付');
 // 独立定位到已有Boss教学步骤，复用已经接取的清缴组。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game,{MAINLINE_TASKS}=await import('/src/config/mainline.js'),{waveDifficulty}=await import('/src/config/waves.js');g.progress.mainline.completed=MAINLINE_TASKS.slice(0,MAINLINE_TASKS.findIndex(t=>t.id==='first-boss')).map(t=>t.id);g.progress.mainline.phase='doing';g.mainlineSpeech=null;while(!g.bossReady){if(g.waveRest>0)g.updateWaves(g.waveRest+.1);for(const e of [...g.enemies])g.hit(e,1e9);while(g.waveKills<waveDifficulty(g.wave).total)g.hit(g.spawnEnemy(0,100),1e9);g.updateWaves(.01);}a.refresh();});await page.waitForTimeout(600);
 if(!await page.locator('#mainline-hud').evaluate(n=>n.hidden)||await page.locator('#quest .clearing-objective').textContent()!=='Boss 清缴 · 点击 Boss 头像')throw Error('清缴目标未接管Boss节点');await page.screenshot({path:'output/playwright/clearing-scene-guide/boss-ready.png'});await page.locator('#boss-button').click();await page.waitForTimeout(500);
 const boss=await page.evaluate(async()=>!!(await import('/src/main.js')).application.game.boss);if(!boss)throw Error('点击Boss头像未开战');await page.screenshot({path:'output/playwright/clearing-scene-guide/boss-start.png'});
 if(errors.length)throw Error(errors.join(';'));return {designCriterion:'clearing-scene-guide',accepted,field,firstWave:cleared,boss,errors};
}
