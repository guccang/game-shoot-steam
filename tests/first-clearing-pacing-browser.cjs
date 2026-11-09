// 首次清缴实机：告示牌接单、正式五批调度和血条；快进命中仅用于验证结算。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('仅限隔离端口4175');const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();localStorage.clear();localStorage.setItem('forest-patrol-world-revision','forest-threefold-2026-10');const p=(await import('/src/progression/progress.js')).freshProgress();p.restoration.repaired=['clearing'];p.mainline.completed=['first-map'];p.mainline.phase='doing';localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.evaluate(()=>import('/src/main.js'));await page.setViewportSize({width:390,height:844});await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.update=()=>{};g.mainlineSpeech=null;g.mainlineTalkDelay=99999;Object.assign(g.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH);a.renderer.camera.time=null;a.refresh();a.renderer.draw();});
 await page.keyboard.press('KeyE');await page.locator('#clearing-accept').click();
 const result=await page.evaluate(async()=>{const g=a.game,{clearingSite}=await import('/src/progression/story/clearing-site.js');Object.assign(g.player,clearingSite(g.progress));g.navigation=null;g.enemies=[];g.attackTimer=999;const rows=[];
 for(let wave=1;wave<=5;wave++){const health=[];for(let i=0;i<600&&g.waveRest===0&&!g.boss;i++){g.updateWaves(.1);for(const e of g.enemies)if(e.hp>0&&e.wave===wave){health.push(e.maxHp);g.hit(e,e.hp);}}rows.push({wave,kills:g.waveKills,health});if(wave<5)g.updateWaves(3);}
 a.refresh();return {rows,hp:g.boss?.hp,maxHp:g.boss?.maxHp};});
 if(JSON.stringify(result.rows.map(r=>r.kills))!==JSON.stringify([2,3,4,5,6])||result.hp!==650||result.maxHp!==650)throw Error(JSON.stringify(result));
 for(const [width,height,phase] of [[390,844,'day'],[320,568,'night']]){
  await page.setViewportSize({width,height});await page.evaluate(async phase=>{const g=a.game,{LIVING_PHASES}=await import('/src/config/living-world.js'),{projectLivingCalendar}=await import('/src/world/living-calendar.js');g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===phase).start+1000;projectLivingCalendar(a.environment,g.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);g.enemies=[];g.texts=[];g.particles=[];g.boss.x=g.player.x+60;g.boss.y=g.player.y-120;a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();},phase);
  const hp=await page.locator('#boss-hp').innerText();if(hp!=='650 / 650'||!await page.locator('#boss-hud').isVisible())throw Error('血条错误 '+hp);await page.screenshot({path:'output/playwright/first-clearing/boss-'+width+'-'+phase+'.png'});
 }
 await page.evaluate(async()=>{const g=a.game;g.progress.patrol=(await import('/src/core/battle/patrol-session.js')).capturePatrol(g);localStorage.setItem('forest-patrol-v1',JSON.stringify(g.progress));});await page.reload();await page.evaluate(()=>import('/src/main.js'));await page.locator('#start').click();
 const restored=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};return {hp:a.game.boss?.hp,maxHp:a.game.boss?.maxHp,wave:a.game.wave};});if(restored.maxHp!==650||restored.wave!==5)throw Error(JSON.stringify(restored));
 if(errors.length)throw Error(errors.join('\n'));return {result,restored,errors};
}
