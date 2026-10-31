// 正式营地混编验收：昼夜同屏、独立动作、真实追击与自动射击清场。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const p=(await import('/src/progression/progress.js')).freshProgress(),cfg=await import('/src/config/monster-camps.js');p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.bosses=20;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.fireDispatch.next=999999;p.living.position=cfg.campVisitorSite(cfg.MONSTER_CAMPS[0]);localStorage.setItem('forest-patrol-v1',JSON.stringify(p));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.campApp=(await import('/src/main.js')).application;await campApp.ready;window.cfg=await import('/src/config/monster-camps.js');const g=campApp.game;g.attackTimer=999999;g.encounterTimer=999999;g.mainlineTalkDelay=999999;g.mainlineSpeech=null;});
 // 取景始终站在预警带，物种读取正式居民对象，不构造展示替身。
 async function visit(id,phase='day'){
  await page.evaluate(async({id,phase})=>{const a=campApp,g=a.game,c=cfg.MONSTER_CAMPS.find(c=>c.id===id);if(g.mapId!==c.mapId)g.switchMap(c.mapId);Object.assign(g.player,{mapId:c.mapId,x:c.x,y:c.y-cfg.MONSTER_CAMP_RULES.radius-18,hp:g.maxHp(),invincible:0});g.attackTimer=999999;g.encounterTimer=999999;g.mainlineTalkDelay=999999;g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;Object.assign(a.environment,{time:phase,autoTime:false,weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment);a.renderer.camera.time=null;},{id,phase});await page.waitForTimeout(1000);
 }
 await page.setViewportSize({width:390,height:844});
 for(const id of ['ember-pot','snore-pine','late-mail','last-supper','valley-bowl'])for(const phase of ['day','night']){
  await visit(id,phase);const sample=await page.evaluate(async id=>{const g=campApp.game,actors=(await import('/src/core/monster-camps.js')).monsterCampObjects(g).filter(e=>e.monsterCamp===id);return {id,state:g.state,species:actors.map(e=>e.species),alerts:actors.filter(e=>e.campState==='alert').length,bolts:g.enemyBolts.length,fighters:g.enemies.filter(e=>e.monsterCamp===id).length,phase:campApp.environment.time};},id);
  if(sample.state!=='playing'||sample.alerts!==5||sample.fighters||sample.bolts||new Set(sample.species).size<3||sample.phase!==phase)throw Error(JSON.stringify(sample));samples.push(sample);await page.screenshot({path:`output/playwright/camp-residents/${id}-${phase}.png`});
 }
 for(const [width,height] of [[320,568],[1280,900]]){await page.setViewportSize({width,height});await visit('last-supper');await page.screenshot({path:`output/playwright/camp-residents/mixed-${width}.png`});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('页面溢出');}
 await page.setViewportSize({width:390,height:844});
 // 连续帧分两段：车轮与飞翼、盾卫重靴与炮口各自保留独立运动。
 for(const id of ['late-mail','last-supper']){
  await visit(id);await page.evaluate(()=>{campApp.game.player.invincible=999999;const stream=campApp.renderer.canvas.captureStream(20);window.campVideo={stream,chunks:[]};const r=campVideo;r.recorder=new MediaRecorder(stream,{mimeType:'video/webm'});r.recorder.ondataavailable=e=>{if(e.data.size)r.chunks.push(e.data);};r.recorder.start();});
  await page.keyboard.down('ArrowDown');await page.waitForTimeout(1000);await page.keyboard.up('ArrowDown');await page.waitForTimeout(1700);await page.keyboard.down('ArrowUp');await page.waitForTimeout(900);await page.keyboard.up('ArrowUp');await page.waitForTimeout(700);
  const combat=await page.evaluate(()=>({fighters:campApp.game.enemies.filter(e=>e.monsterCamp).map(e=>e.species),bolts:campApp.game.enemyBolts.length}));if(combat.fighters.length!==5)throw Error('越界追兵丢失');samples.push({id,combat});
  const download=page.waitForEvent('download');await page.evaluate(async()=>{const r=campVideo;await new Promise(resolve=>{r.recorder.onstop=resolve;r.recorder.stop();});const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(r.chunks,{type:'video/webm'}));a.download='camp-motion.webm';a.click();r.stream.getTracks().forEach(t=>t.stop());});await(await download).saveAs(`output/playwright/camp-residents/${id}-motion.webm`);
 }
 // 低级混编营地使用原自动武器实际清空，不能靠写击杀掩码通过。
 await visit('ember-pot');await page.evaluate(()=>{const g=campApp.game,c=cfg.MONSTER_CAMPS[0];Object.assign(g.player,{x:c.x,y:c.y+70,invincible:999999});g.progress.weapons[0]=20;g.loadout.weapons[0]=20;g.attackTimer=0;campApp.renderer.camera.time=null;});await page.waitForFunction(()=>campApp.game.progress.monsterCamps.camps['ember-pot'].clears===1,{},{timeout:60000});
 const clear=await page.evaluate(()=>({record:campApp.game.progress.monsterCamps.camps['ember-pot'],seeds:[0,1,3].map(i=>campApp.game.progress.farm.seeds[i])}));if(clear.seeds.some(n=>n!==1))throw Error('种子结算不符');await page.evaluate(()=>campApp.game.pause());if(errors.length)throw Error(errors.join('\n'));return {samples,clear,errors};
}
