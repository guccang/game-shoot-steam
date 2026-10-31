// 轻量主线实机验收：真实按钮完成地图与购枪，其他阶段用显式夹具检查反馈和布局。
async(page)=>{
 if(new URL(page.url()).port!=='4252')throw Error('仅限隔离验收端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.bringToFront();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const {freshProgress}=await import('/src/progression/progress.js');a.game.progress=freshProgress();a.game.reset();a.game.arrivalScene=null;a.refresh();});
 await page.locator('#start').click();
 await page.evaluate(async()=>{const g=a.game,{MAINLINE_SITES}=await import('/src/config/mainline.js');g.enemies=[];g.boss=null;Object.assign(g.player,{x:MAINLINE_SITES.camp.x,y:MAINLINE_SITES.camp.y+60});a.renderer.camera.time=null;a.refresh();});
 await page.locator('#mainline-speech').waitFor({state:'visible'});
 const before=await page.evaluate(()=>({zoom:a.renderer.view.zoom,elapsed:a.game.mainlineSpeech.elapsed,text:document.querySelector('#mainline-speech p').textContent}));
 await page.screenshot({path:'output/playwright/mainline-concise/intro.png'});
 await page.locator('.mainline-begin').click();await page.locator('#map-dialog').waitFor({state:'visible'});await page.locator('#close-map').click();
 if(!await page.evaluate(()=>a.game.progress.mainline.seen.map===1&&a.game.progress.mainline.phase==='doing'))throw Error('即时开始未打开真实地图');
 const after=await page.evaluate(()=>a.renderer.view.zoom);if(before.zoom!==after)throw Error('开始动作改变镜头');
 await page.locator('#mainline-info').click();
 if(await page.locator('#mainline-dialog details[open]').count())throw Error('详细说明默认展开');
 if(await page.locator('.mainline-checklist .done').count()!==1)throw Error('地图完成未打勾');
 if(!(await page.locator('.mainline-checklist .current').innerText()).includes('走一走'))throw Error('当前动作未推进');
 await page.screenshot({path:'output/playwright/mainline-concise/checks.png'});
 await page.locator('#mainline-close').click();await page.keyboard.down('ArrowLeft');await page.waitForTimeout(450);await page.keyboard.up('ArrowLeft');
 if(!await page.evaluate(()=>a.game.progress.mainline.distance>20))throw Error('实际移动未记录');
 // 明确夹具切到购枪任务，交易仍使用正式支付按钮。
 await page.evaluate(async()=>{const g=a.game,{MAINLINE_IDS,MAINLINE_SITES}=await import('/src/config/mainline.js');g.progress.mainline.completed=MAINLINE_IDS.slice(0,5);g.progress.mainline.phase='doing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.progress.coins=g.progress.wood=100000;g.progress.bosses=100;g.progress.materials={parts:9999,crystal:9999,core:9999};Object.assign(g.player,MAINLINE_SITES.weapons);g.enemies=[];a.refresh();});
 await page.locator('#mainline-hud').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.getElementById('ws-purchase').classList.contains('mainline-cue-target'));
 await page.screenshot({path:'output/playwright/mainline-concise/purchase.png'});
 await page.evaluate(()=>a.workshop.open('weapons',4));await page.waitForFunction(()=>!document.getElementById('ws-purchase').classList.contains('mainline-cue-target'));
 await page.evaluate(()=>a.workshop.open('weapons',3));
 const coins=await page.evaluate(()=>a.game.progress.coins);await page.locator('#ws-purchase').click();
 if(!await page.evaluate(coins=>a.game.progress.weapons[3]===1&&a.game.progress.coins<coins,coins))throw Error('购买未支付');
 await page.locator('#ws-close').click();await page.waitForFunction(()=>a.game.state==='playing');
 // 多目标只显示未完成的那项，并切换到角色入口；不再把玩家送回已完成的枪械页。
 await page.evaluate(async()=>{const g=a.game,{MAINLINE_IDS}=await import('/src/config/mainline.js');g.progress.mainline.completed=MAINLINE_IDS.slice(0,2);g.progress.mainline.phase='doing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.progress.weapons[0]=3;g.progress.heroes[0]=1;a.refresh();});
 if(!(await page.locator('#mainline-hud b').innerText()).includes('栗子'))throw Error('HUD未更新为角色动作');
 await page.locator('#mainline-hud').click();await page.locator('#camp-dialog').waitFor({state:'visible'});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>a.game.state==='playing');
 await page.locator('#mainline-info').focus();await page.keyboard.press('Enter');await page.locator('#mainline-dialog').waitFor({state:'visible'});await page.locator('#mainline-close').click();
 await page.evaluate(async()=>{const g=a.game;g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(g.progress,0);Object.assign(g.player,{x:530,y:860});g.summonVehicle();g.spawnEnemy(0,100);if(!g.enemies.length)throw Error('无真实怪物');Object.assign(g.enemies[0],{x:595,y:880,speed:0,hp:1e9,maxHp:1e9});g.spawnTimer=999;g.player.invincible=0;a.refresh();});
 const samples=[];
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.camera.time=null;a.renderer.draw();a.refresh();},time);
  await page.screenshot({path:`output/playwright/mainline-concise/world-${width}-${time}.png`});
  const world=await page.evaluate(()=>{const c=document.getElementById('mainline-hud').getBoundingClientRect(),i=document.getElementById('mainline-info').getBoundingClientRect(),f=document.getElementById('game-frame').getBoundingClientRect();return {card:c.toJSON(),info:i.toJSON(),right:f.right};});
  if(world.info.right>world.right||world.info.left<world.card.right)throw Error('详情按钮溢出或重叠');
  await page.locator('#mainline-info').click();
  const sample=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectConciseMainline(a.game,document,a.renderer));
  if(sample.overflow||sample.book.overflow||sample.expanded||sample.book.rect.right>width+1)throw Error('默认轻量界面溢出或展开');
  await page.screenshot({path:`output/playwright/mainline-concise/book-${width}-${time}.png`});samples.push({width,time,...sample});await page.locator('#mainline-close').click();
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/playwright/mainline-concise/reduced.png'});
 if(errors.length)throw Error(errors.join('\n'));return {before,zoom:after,map:true,movement:true,purchase:true,correctTarget:true,keyboard:true,samples,errors};
}
