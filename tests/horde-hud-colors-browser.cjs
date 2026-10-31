// 兽潮奶油底配色验收：默认4175，已有服务运行时使用隔离4176；仅设置检查点，不冒充完整通关。
async page=>{
 if(!['4175','4176'].includes(new URL(page.url()).port))throw Error('请使用本地验收端口');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;g.progress.mainline.phase='complete';g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.reset();g.state='playing';g.arrivalScene=null;const gate=(await import('/src/config/camp-defense.js')).CAMP_GATES.find(n=>n.id==='left');Object.assign(g.player,gate);window.realUpdate=g.update.bind(g);g.update=()=>{};a.refresh();});
 await page.setViewportSize({width:390,height:844});await page.locator('[data-camp-gate="left"]').click();await page.locator('#camp-primary').click();
 await page.evaluate(async()=>{const g=a.game;g.summonVehicle();const r=g.campDefense;r.timer=0;(await import('/src/core/camp-defense.js')).updateCampDefense(g,1);for(const [i,e] of g.enemies.entries())Object.assign(e,{x:r.barrier.x-150-i*25,y:r.barrier.y-55+i*40,speed:0,damage:0,hp:99999,maxHp:99999});Object.assign(r,{timer:1.5,waveKills:9,gateHp:750});g.attackTimer=999;a.refresh();});
 // 颜色直接读取正式DOM；半透明纸底按叠加黑色的保守值检查正文与圆环对比。
 function contrast(first,second){const luminance=color=>{const a=color.match(/[\d.]+/g).map(Number),alpha=a[3]??1;return a.slice(0,3).map(n=>n/255*alpha).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);};const x=luminance(first),y=luminance(second);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 // 检查颜色统一、文字和两环对比、原高度与设置留白。
 async function inspect(label){const s=await page.evaluate(async()=>{a.refresh();const s=(await import('/src/rendering/visual-review.js')).inspectCompactHordeHud(document);return {...s,settings:{background:getComputedStyle(document.getElementById('settings-button')).backgroundColor,...document.getElementById('settings-button').getBoundingClientRect().toJSON()}};});const p=s.palette;
  if(s.hud.height!==48||s.overflow||s.completedOverflow||s.hud.right>s.settings.left-6||p.background!==s.settings.background)throw Error(label+JSON.stringify(s));
  const ratios={text:contrast(p.text,p.background),muted:contrast(p.muted,p.background),help:contrast(p.help,p.background),outer:contrast(p.time,p.track),inner:contrast(p.kills,p.track)};if(ratios.text<4.5||ratios.muted<4.5||ratios.help<4.5||ratios.outer<3||ratios.inner<3||p.time===p.kills)throw Error(JSON.stringify(ratios));samples.push({label,...s,ratios});return s;
 }
 for(const time of ['day','night'])for(const [width,height] of [[320,568],[390,844],[1280,800]]){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{a.game.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};Object.assign(a.environment,{time,autoTime:false,weather:'sun',autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},time);
  await inspect(`${width}-${time}`);await page.screenshot({path:`output/playwright/horde-hud-colors/${width}-${time}.png`});
  if(width===390&&time==='day')await page.locator('#camp-defense-hud').screenshot({path:'output/playwright/horde-hud-colors/preview.png'});
  await page.locator('#camp-help').click();await page.locator('#camp-defense-dialog').waitFor({state:'visible'});await page.locator('#camp-close').click();await page.locator('#settings-button').click();await page.keyboard.press('Escape');await page.waitForFunction(()=>a.game.state==='playing');
 }
 await page.setViewportSize({width:320,height:568});await page.evaluate(()=>{a.game.progress.campDefense.runs=999999;Object.assign(a.game.campDefense,{wave:10,waveKills:31,timer:1.5});a.refresh();});await inspect('六位次数与末波');await page.screenshot({path:'output/playwright/horde-hud-colors/max-count.png'});
 await page.evaluate(async()=>{const g=a.game;g.campDefense.phase='boss-ready';g.enemies=[];(await import('/src/core/camp-defense.js')).spawnCampBoss(g);const b=g.campDefense.barrier;Object.assign(g.boss,{x:b.x-210,y:b.y-40});a.refresh();});await inspect('领主交战');await page.screenshot({path:'output/playwright/horde-hud-colors/boss.png'});
 // 实际移动沿正式更新执行；不改变碰撞、镜头及武器系统。
 const before=await page.evaluate(()=>{a.game.update=realUpdate;return {x:a.game.player.x,y:a.game.player.y};});await page.keyboard.down('KeyA');await page.waitForTimeout(400);await page.keyboard.up('KeyA');const moved=await page.evaluate(before=>{a.game.update=()=>{};return Math.hypot(a.game.player.x-before.x,a.game.player.y-before.y);},before);if(moved<1)throw Error('正式移动未生效');
 await page.evaluate(()=>{a.game.campDefense.bossDefeated=true;a.refresh();});const done=await page.locator('#camp-boss').evaluate(n=>({state:n.dataset.state,color:getComputedStyle(n,'::after').color}));if(done.state!=='done'||contrast(done.color,samples[0].palette.background)<4.5)throw Error('完成勾号对比不足');
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'compact-horde-hud',samples,moved,done,errors};
}

