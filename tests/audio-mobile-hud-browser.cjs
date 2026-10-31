// 正式顶部 HUD 的手机/桌面昼夜验收，保留地图、敌人、载具与机械蜘蛛同屏。
async page=>{
 if(new URL(page.url()).port!=='4217')throw Error('仅允许隔离端口');await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});await page.reload();await page.evaluate(async()=>{if(!await (await import('/src/main.js')).application.ready)throw Error('场景未就绪');});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,p=(await import('/src/progression/progress.js')).freshProgress();p.weapons.fill(1);p.vehicleHulls.fill(1);p.vehicleWeapons.fill(1);p.weapon=16;p.vehicleIndex=1;p.vehicleLoadouts[1]=18;p.weaponParts[16].coordination=13;p.coins=114399;p.wood=115199;const g=a.game;g.progress=p;g.reset();g.start();g.updateWaves=()=>{};g.hurt=()=>{};g.enemies=[];Object.assign(g.player,{x:1030,y:710});for(const [x,y] of [[900,820],[1080,820],[1180,750],[900,640],[1090,600]]){const e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{hp:1e8,maxHp:1e8,mass:1e6,speed:0,damage:0,flying:false});}g.summonVehicle();for(let i=0;i<2800;i++)g.update(1/60);a.refresh();const {catSprites}=await import('/src/rendering/cat-animation.js');if(!await catSprites.load())throw Error('角色资源缺失');});
 await page.locator('#settings-button').click();if(await page.locator('#sound').getAttribute('aria-pressed')!=='true') await page.locator('#sound').click();await page.locator('#music-volume').fill('0');await page.locator('#environment-button').click();await page.locator('#auto-time').uncheck();await page.locator('#auto-weather').uncheck();await page.locator('button[data-weather="sun"]').click();await page.locator('#close-environment').click();await page.locator('#close-settings').click();
 const results=[];await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(!a.audio.enabled)throw Error('音效未开启');});
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:width===1280?960:844});
  for(const time of ['day','night']){
   const label=time==='day'?'当前白昼':'当前夜晚';for(let i=0;i<3&&!(await page.locator('#time-picture').getAttribute('aria-label')).startsWith(label);i++)await page.locator('#time-picture').click();
   await page.evaluate(async time=>{const a=(await import('/src/main.js')).application,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.camera.time=null;a.renderer.resize();a.game.progress.coins=114399;a.game.progress.wood=115199;a.refresh();},time);
   await page.waitForTimeout(180);await page.screenshot({path:`output/playwright/audio-mobile-hud/scene-${width}-${time}.png`});
   const state=await page.evaluate(async()=>{const {inspectHudCompact}=await import('/src/rendering/visual-review.js');return inspectHudCompact(document);});results.push({width,time,...state});
  }
  for(const amount of [999,1000,9999,10000,99999999,100000000,999999999]){
   await page.evaluate(async amount=>{const a=(await import('/src/main.js')).application;a.game.progress.coins=a.game.progress.wood=amount;a.refresh();},amount);
   const state=await page.evaluate(async()=>{const {inspectHudCompact}=await import('/src/rendering/visual-review.js');return inspectHudCompact(document);});results.push({width,amount,...state});
  }
  // 图标继续实际响应点击，短标签保持不可见，屏幕阅读器名称随状态更新。
  for(const key of ['season','time','weather']){const b=page.locator(`#${key}-picture`),before=await b.getAttribute('aria-label');await b.click();if(await b.getAttribute('aria-label')===before)throw Error('图标未切换 '+key);}
 }
 await page.screenshot({path:'output/playwright/audio-mobile-hud/billion-320.png'});
 // 直接调用正式受伤入口验证实际飘字；生命仍扣除小数伤害。
 const hurt=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game,{Game}=await import('/src/core/game.js');g.vehicle.active=false;g.player.invincible=0;const hp=g.player.hp;Game.prototype.hurt.call(g,28.888222);return {before:hp,after:g.player.hp};});
 await page.screenshot({path:'output/playwright/audio-mobile-hud/hurt-320.png'});if(Math.abs(hurt.before-hurt.after-28.888222)>1e-6)throw Error('真实扣血被取整');
 const clipped=results.filter(r=>r.resources.some(v=>v.clipped)||!r.singleRow||!r.contained||r.overlap);
 // 真实满编交战采样：主炮命中存在，伙伴声受限，暂停清空全部战斗声源。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.vehicle.active=true;g.state='playing';a.refresh();window.mixSamples=[];const play=a.audio.play;a.audio.play=(kind,source)=>{const ok=play(kind,source);window.mixSamples.push({kind,source,ok,at:performance.now(),...a.audio.diagnostics});return ok;};});
 await page.waitForFunction(()=>window.mixSamples.some(s=>s.ok&&s.kind==='weapon-hit'),null,{timeout:20000});await page.waitForTimeout(3000);
 const audio=await page.evaluate(()=>window.mixSamples);
 if(!audio.some(s=>s.ok&&s.kind==='tank-125')||!audio.some(s=>s.ok&&s.kind==='weapon-hit')||!audio.some(s=>s.ok&&s.source==='companion')||audio.some(s=>s.companionVoices>5||s.engineGain>.23))throw Error('混音回归失败 '+JSON.stringify(audio.slice(-12)));
 await page.locator('#field-menu-toggle').click();await page.locator('#settings-button').click();await page.waitForFunction(async()=>(await import('/src/main.js')).application.audio.diagnostics.voices===0);
 if(errors.length||clipped.length||results.some(r=>r.icons.some(i=>!i.labelHidden||i.width<36||!i.name)))throw Error(JSON.stringify({errors,clipped}));return {results,errors,clipped,audio:{events:audio.length,played:audio.filter(s=>s.ok).length,companionPlayed:audio.filter(s=>s.ok&&s.source==='companion').length,maxCompanion:Math.max(...audio.map(s=>s.companionVoices)),primaryHits:audio.filter(s=>s.ok&&s.kind==='weapon-hit').length,paused:true}};
}
