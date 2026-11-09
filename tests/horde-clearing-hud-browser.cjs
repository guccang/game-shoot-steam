// 兽潮和清缴顶栏实机验收：默认4175，已有服务占用时允许独立4176。
async page=>{
 if(!['4175','4176'].includes(new URL(page.url()).port))throw Error('请使用本地游戏测试端口');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;g.progress.mainline.phase='complete';g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);g.reset();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.state='playing';a.refresh();});
 // 读取实际DOM边界，确认顶栏收起、按钮可点、进度和设置互不遮挡。
 async function inspect(label,id){
  await page.waitForTimeout(80);const s=await page.evaluate(id=>{a.refresh();const box=n=>n.getBoundingClientRect().toJSON(),visible=n=>!!n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden',hud=document.getElementById(id),settings=document.getElementById('settings-button');return {frame:box(document.getElementById('game-frame')),hud:box(hud),settings:box(settings),hidden:[...document.querySelectorAll('.hud-resources>.resource-pill,.hud-resources .environment-picture')].every(n=>!visible(n)),buttons:[...hud.querySelectorAll('button'),document.getElementById('task-navigation-toggle')].filter(visible).map(n=>({id:n.id,...box(n)})),nodes:[...hud.querySelectorAll('.wave-node')].map(box),overflow:hud.scrollWidth>hud.clientWidth+1};},id);
  if(!s.hidden||s.overflow||Math.abs(s.hud.top-s.settings.top)>2||s.hud.right>s.settings.left-6||s.settings.right>s.frame.right||s.hud.left<s.frame.left)throw Error(label+JSON.stringify(s));
  for(const b of s.buttons)if(b.width<44||b.height<44||b.left<s.hud.left||b.right>s.hud.right+1||b.top<s.hud.top||b.bottom>s.hud.bottom+1)throw Error(label+'按钮越界 '+JSON.stringify(s));
  for(let i=1;i<s.nodes.length;i++)if(s.nodes[i].left<s.nodes[i-1].right-1)throw Error('波次重叠 '+JSON.stringify(s));
  samples.push({label,...s});
 }
 // 结束和离场必须同时恢复两个资源与三个环境按钮。
 async function restored(label){const visible=await page.locator('.hud-resources>.resource-pill,.hud-resources .environment-picture').evaluateAll(ns=>ns.every(n=>!!n.getClientRects().length));if(!visible)throw Error(label+'未恢复顶栏');}
 for(const mode of ['horde','clearing']){
  await page.setViewportSize({width:390,height:844});
  if(mode==='horde'){
   await page.evaluate(async()=>{const gate=(await import('/src/config/camp-defense.js')).CAMP_GATES.find(g=>g.id==='left');Object.assign(a.game.player,gate);a.refresh();});await page.locator('[data-camp-gate="left"]').click();await page.locator('#camp-primary').click();await page.locator('#camp-defense-hud').waitFor({state:'visible'});
   await page.evaluate(async()=>{a.game.campDefense.timer=0;(await import('/src/core/camp/camp-defense.js')).updateCampDefense(a.game,1);a.refresh();});
  }else{
   await page.evaluate(async()=>{Object.assign(a.game.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH);a.refresh();});await page.locator('#clearing-marker').click();await page.locator('#clearing-accept').click();await restored('清缴赶路');
   await page.evaluate(()=>{Object.assign(a.game.player,a.game.progress.living.clearingSite);a.game.updateWaves(.5);a.refresh();});
  }
  const id=mode==='horde'?'camp-defense-hud':'quest';
  for(const [width,height] of [[320,568],[390,844],[1280,800],[900,480]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{a.game.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};Object.assign(a.environment,{time,autoTime:false,weather:'sun',autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);
   await inspect(`${mode}-${width}-${time}`,id);await page.screenshot({path:`output/playwright/horde-clearing-hud/${mode}-${width}-${time}.png`});
   await page.locator('#settings-button').click();await page.locator('#settings-dialog').waitFor({state:'visible'});if(await page.locator('#season-picture').isVisible())throw Error('暂停时资源栏闪回');await page.keyboard.press('Escape');await page.waitForFunction(()=>a.game.state==='playing');
  }
  await page.setViewportSize({width:320,height:568});
  if(mode==='horde'){
   await page.locator('#camp-help').click();await page.locator('#camp-close').click();
   await page.evaluate(async()=>{const g=a.game;g.enemies=[];Object.assign(g.campDefense,{cleared:10,phase:'boss-ready'});(await import('/src/core/camp/camp-defense.js')).spawnCampBoss(g);a.refresh();});await inspect('兽潮领主','camp-defense-hud');
   const separated=await page.evaluate(()=>document.getElementById('boss-hud').getBoundingClientRect().top>=document.getElementById('camp-defense-hud').getBoundingClientRect().bottom+7);if(!separated)throw Error('兽潮领主血条覆盖波次');await page.screenshot({path:'output/playwright/horde-clearing-hud/horde-boss.png'});
   await page.evaluate(()=>{a.game.hit(a.game.boss,1e9);a.refresh();});await restored('兽潮结算');await page.locator('#camp-primary').click();await page.locator('#task-reward-dialog').waitFor({state:'hidden',timeout:6000});await restored('兽潮领奖');
   await page.evaluate(async()=>{const m=await import('/src/core/camp/camp-defense.js'),gate=(await import('/src/config/camp-defense.js')).CAMP_GATES[0];Object.assign(a.game.player,gate);if(!m.startCampDefense(a.game,gate.id))throw Error('再次守门失败');a.refresh();});await page.locator('#camp-help').click();await page.locator('#camp-leave').click();await restored('主动退出兽潮');
  }else{
   await page.locator('#task-navigation-toggle').click();await inspect('清缴关闭寻路','quest');await page.locator('#task-navigation-toggle').click();
   await page.evaluate(()=>{const g=a.game,s=g.progress.living.clearingSite;g.player.x=s.x+s.radius+100;a.refresh();});await restored('离开清缴区');await page.evaluate(()=>{Object.assign(a.game.player,a.game.progress.living.clearingSite);a.refresh();});await inspect('返回清缴区','quest');
   await page.evaluate(()=>{const g=a.game;for(let i=0;i<600&&!g.boss;i++){g.updateWaves(.5);for(const e of g.enemies.filter(e=>e.hp>0))g.hit(e,1e9);}if(!g.boss)throw Error('清缴领主未出现');a.refresh();});await inspect('清缴领主','boss-hud');await page.screenshot({path:'output/playwright/horde-clearing-hud/clearing-boss.png'});
   await page.evaluate(()=>{a.game.hit(a.game.boss,1e9);a.refresh();});await restored('清缴结算');await page.locator('#task-reward-close').click();await restored('清缴完成');
  }
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:['early-clearing-compact-hud','compact-horde-hud'],samples,errors};
}



