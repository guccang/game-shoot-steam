// 在主线界面验收后续测实际试射、购买门槛、秘境入口和正式昼夜同屏。
async(page)=>{
 if(new URL(page.url()).port!=='4251')throw Error('只使用隔离主线端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const bought=await page.evaluate(()=>({level:a.game.progress.weapons[3],selected:a.game.progress.weapon,coins:a.game.progress.coins}));
 if(bought.level!==1||bought.selected!==3||bought.coins>=100000)throw Error('实际购买失败');
 await page.locator('#ws-test').click();await page.waitForFunction(()=>a.game.progress.mainline.seen.trial>0,null,{timeout:30000});
 await page.evaluate(()=>a.workshop.open('weapons',12));
 if(!await page.locator('#ws-purchase').isDisabled())throw Error('无资格可购买高级武器');
 if(!(await page.locator('#ws-feedback').innerText()).includes('把最远的目标写下来'))throw Error('缺少任务资格提示');
 await page.locator('#ws-track').click();if(!await page.evaluate(()=>a.game.progress.mainline.seen.track))throw Error('未记录追踪');
 await page.screenshot({path:'output/playwright/mainline/gate-320.png'});
 await page.locator('#ws-close').click();
 await page.waitForFunction(()=>a.game.state==='playing');
 const stacked=await page.evaluate(()=>{const m=document.querySelector('#mainline-hud').getBoundingClientRect(),e=document.querySelector('#equipment-goal').getBoundingClientRect();return m.top>=e.bottom;});
 if(!stacked)throw Error('主线卡与装备追踪重叠');await page.screenshot({path:'output/playwright/mainline/tracked-320.png'});
 await page.evaluate(async()=>{const {MAINLINE_IDS}=await import('/src/config/mainline.js');const g=a.game;g.progress.mainline.completed=MAINLINE_IDS.slice(0,12);g.progress.mainline.phase='doing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.enemies=[];Object.assign(g.player,{x:990,y:1350});g.state='playing';a.refresh();});
 await page.locator('#mainline-hud').click();await page.locator('#realm-dialog').waitFor({state:'visible'});
 const realm=await page.evaluate(()=>({mode:a.game.realm?.mode,state:a.game.state,book:document.querySelector('#mainline-dialog').open}));
 if(realm.mode!=='rogue'||realm.book)throw Error('任务到秘境的切换失败');
 await page.screenshot({path:'output/playwright/mainline/realm-entry.png'});
 await page.evaluate(async()=>{
  const g=a.game;g.leaveRealm();for(const n of document.querySelectorAll('dialog[open]'))n.close();
  const {freshProgress}=await import('/src/progression/progress.js');g.progress=freshProgress();g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;
  (await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(g.progress,0);g.reset();g.arrivalScene=null;
  const {MAINLINE_SITES}=await import('/src/config/mainline.js');g.state='playing';g.mainlineTalkDelay=999;g.progress.mainline.phase='meet';Object.assign(g.player,{x:MAINLINE_SITES.camp.x,y:MAINLINE_SITES.camp.y+120});g.summonVehicle();
  g.spawnEnemy(0,100);if(!g.enemies.length)throw Error('正式怪物未生成');Object.assign(g.enemies[0],{x:965,y:970,speed:0,hp:1e9,maxHp:1e9});g.attackTimer=999;g.spawnTimer=999;g.player.invincible=0;a.refresh();
 });
 const samples=[];
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.camera.time=null;a.renderer.draw();a.refresh();},time);
  await page.screenshot({path:`output/playwright/mainline/scene-${width}-${time}.png`});
  await page.locator('#mainline-info').click();await page.screenshot({path:`output/playwright/mainline/final-book-${width}-${time}.png`});await page.locator('#mainline-close').click();samples.push({width,time});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/playwright/mainline/reduced-320.png'});
 if(errors.length)throw Error(errors.join('\n'));return {bought,trial:true,tracked:true,gate:true,realm,samples,errors};
}
