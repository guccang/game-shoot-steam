// 波次正文与三种故事资源的专项实机检查，使用隔离存档和正式呈现入口。
async(page)=>{
 if(new URL(page.url()).port!=='4235')throw Error('仅允许隔离端口4235');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.destroy();localStorage.clear();});
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game;window.simpleApp=a;
  Object.assign(g,{wave:3,waveGroupStart:1,bossWave:5,waveKills:18,waveSpawned:18,waveWarning:0,waveRest:0,spawnTimer:999,attackTimer:999});
  Object.assign(g.player,{x:780,y:900});g.enemies=[];
  const e=g.spawnEnemy(0,0,{x:700,y:1020});Object.assign(e,{speed:0,hp:1e8,maxHp:1e8,damage:0});
  g.summonVehicle();g.vehicle.module.cooldown=999;a.refresh();
 });
 for(const [width,height] of [[1280,900],[390,844],[320,568]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{
   const a=window.simpleApp;Object.assign(a.environment,{time,season:'spring',weather:'sun',autoTime:false,autoWeather:false});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.refresh();
  },time);
  await page.waitForTimeout(400);
  const s=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWaveProgress(document));
  if(s.detail||s.detailVisible||s.nodes.length!==5||s.nodes[0].state!=='done'||s.nodes[2].state!=='current'||!s.touchSize||!s.contained||s.overflow||s.progress<=40||s.progress>=60)throw Error('精简HUD异常 '+JSON.stringify(s));
  samples.push({width,time,...s});await page.screenshot({path:`output/playwright/story-reward-hud-simplify/wave-${width}-${time}.png`});
 }
 // 清掉最后一只普通怪后，末尾图标仍要点击才进入 Boss。
 await page.evaluate(async()=>{
  const a=window.simpleApp,g=a.game,{waveDifficulty}=await import('/src/config/waves.js');
  g.enemies=[];g.wave=g.bossWave;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total-1;
  const e=g.spawnEnemy(0,120);g.hit(e,1e9);g.updateWaves(.01);a.refresh();
 });
 await page.waitForFunction(()=>!document.getElementById('boss-button').disabled);
 await page.screenshot({path:'output/playwright/story-reward-hud-simplify/boss-ready.png'});
 await page.locator('#boss-button').click();
 if(!await page.evaluate(()=>!!simpleApp.game.boss))throw Error('Boss图标不可用');
 await page.evaluate(()=>{const g=simpleApp.game,b=g.boss;g.hit(b,1e9);g.hit(b,1e9);g.enemies=[];g.state='playing';simpleApp.refresh();});
 // 目录与礼包均显示三项；真实领取只能增加配置的三种资源。
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  const a=window.simpleApp,g=a.game,p=(await import('/src/config/story-posts.js')).STORY_POSTS[0];
  Object.assign(g.player,(await import('/src/core/story-posts.js')).storyPostApproach(p));
  for(const id of p.chapters)Object.assign(g.progress.story.chapters[id],{completed:true,rewardClaimed:true});
  g.state='playing';a.refresh();
 });
 await page.keyboard.press('e');await page.locator('#story-dialog').waitFor({state:'visible'});
 const rows=await page.locator('.story-collection [aria-label="礼包内容"] span').count();
 if(rows!==3)throw Error('礼包未限制为三种');
 await page.screenshot({path:'output/playwright/story-reward-hud-simplify/gift-390.png'});
 const before=await page.evaluate(()=>structuredClone(simpleApp.game.progress));
 await page.locator('[data-story-prize="patrol-supplies"]').click();
 const after=await page.evaluate(()=>structuredClone(simpleApp.game.progress));
 if(after.coins-before.coins!==1200||after.wood-before.wood!==400||after.materials.parts-before.materials.parts!==8||after.materials.core!==before.materials.core||after.materials.crystal!==before.materials.crystal)throw Error('礼包实际入账不符');
 await page.locator('#story-close').click();
 // 普通波次的 CSS 隐藏不得泄漏到剧情及秘境任务。
 const details=[];
 for(const mode of ['story','realm']){
  await page.evaluate(mode=>{
   const a=window.simpleApp,g=a.game;g.state='playing';
   if(mode==='story')g.enterStory('sunleaf-01','sunleaf-post');else g.enterRealm('tower');a.refresh();
  },mode);
  const s=await page.evaluate(()=>({text:document.getElementById('quest-detail').textContent,display:getComputedStyle(document.getElementById('quest-detail')).display,track:document.getElementById('wave-track').hidden}));
  if(!s.track||s.display==='none'||!s.text)throw Error(mode+'目标正文被隐藏');details.push({mode,...s});
  await page.evaluate(mode=>{const g=window.simpleApp.game;if(mode==='story')g.leaveStory();else g.leaveRealm();g.start();simpleApp.refresh();},mode);
  if(await page.locator('#story-dialog').isVisible())await page.locator('#story-close').click();
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {pass:true,designCriterion:'story-reward-hud-simplify',samples,resources:rows,details,errors};
}
