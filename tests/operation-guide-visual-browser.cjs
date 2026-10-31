// 操作引导视觉验收：正式世界昼夜同屏、手机菜单入口与真实安装点。
async page=>{
 if(new URL(page.url()).port!=='4253')throw Error('仅限隔离端口4253');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(()=>a.destroy());await page.reload();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');a.game.progress=freshProgress();a.game.reset();const g=a.game,p=g.progress;g.arrivalScene=null;p.coins=p.wood=100000;p.weapons[0]=3;p.mainline.completed=MAINLINE_IDS.slice(0,2);p.mainline.phase='doing';g.mainlineTalkDelay=999;p.vehicleHulls[0]=1;p.vehicleIndex=0;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(p,0);Object.assign(g.player,{x:530,y:860});g.summonVehicle();g.spawnEnemy(0,100);if(!g.enemies.length)throw Error('无正式怪物');Object.assign(g.enemies[0],{x:595,y:880,speed:0,hp:1e9,maxHp:1e9});g.spawnTimer=999;g.player.invincible=0;a.refresh();});
 await page.locator('#start').click();
 const samples=[];
 // 验收接口直接读取正式DOM，不把离屏目标算作可用操作。
 async function sample(name){await page.waitForTimeout(550);const s=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectOperationGuide(document));if(!s.visible||s.overflow||!s.pointerThrough||[s.source,s.target,s.tip,s.destination].some(n=>n&&!n.contained))throw Error(name+':'+JSON.stringify(s));samples.push({name,...s});await page.screenshot({path:`output/playwright/operation-guide/${name}.png`});}
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.camera.time=null;a.renderer.draw();a.refresh();},time);
  await sample(`world-${width}-${time}`);
  if(width<701){if(!await page.locator('#field-menu-toggle').evaluate(n=>n.classList.contains('operation-source')))throw Error('折叠菜单入口未标亮');await page.locator('#field-menu-toggle').click();await sample(`menu-${width}-${time}`);if(!await page.locator('#heroes-button').evaluate(n=>{const b=n.getBoundingClientRect();return n.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}))throw Error('菜单目标被任务卡遮挡');}
  await page.locator('#heroes-button').click();await sample(`hero-${width}-${time}`);await page.locator('#close-camp').click();
 }
 // 返回真正的部件阶段，检查短屏的源/目标没有落到固定结算栏下面。
 await page.evaluate(()=>{a.game.progress.weapons[0]=1;a.refresh();a.workshop.open('weapons',0);});
 for(const [width,height] of [[1280,900],[390,844],[320,568]]){
  await page.setViewportSize({width,height});await sample(`parts-${width}`);
  const visible=await page.evaluate(()=>{const a=document.querySelector('.operation-source').getBoundingClientRect(),b=document.querySelector('.operation-target').getBoundingClientRect(),s=document.querySelector('.ws-layout').getBoundingClientRect();return a.top>=s.top&&a.bottom<=s.bottom&&b.top>=s.top&&b.bottom<=s.bottom;});if(!visible)throw Error('安装两端被滚动区裁切：'+width);
 }
 await page.locator('#ws-close').click();await page.evaluate(()=>{a.game.state='paused';a.refresh();});
 if(!await page.locator('#operation-guide').isHidden()||await page.locator('.operation-source,.operation-target').count())throw Error('暂停残留指引');
 if(errors.length)throw Error(errors.join('\n'));return {samples,cleanup:true,errors};
}
