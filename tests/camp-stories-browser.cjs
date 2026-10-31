// 营地故事实际交互：逐句阅读、现场线索、保存失败重试、灰堆与手机底部对白。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const p=(await import('/src/progression/progress.js')).freshProgress(),cfg=await import('/src/config/monster-camps.js');p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.bosses=20;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.fireDispatch.next=999999;p.living.position=cfg.campVisitorSite(cfg.MONSTER_CAMPS[0]);localStorage.setItem('forest-patrol-v1',JSON.stringify(p));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.campApp=(await import('/src/main.js')).application;await campApp.ready;window.cfg=await import('/src/config/monster-camps.js');const g=campApp.game;g.attackTimer=999999;g.encounterTimer=999999;g.mainlineTalkDelay=999999;});
 // 现场按钮打开故事，先确认没有自动赠送线索，也没有功能说明和导航菜单。
 async function visit(id,kind='character'){
  await page.evaluate(({id,kind})=>{const g=campApp.game,c=cfg.MONSTER_CAMPS.find(c=>c.id===id);if(c.mapId!==g.mapId)g.switchMap(c.mapId);Object.assign(g.player,kind==='character'?cfg.campCharacterSite(c):kind==='cache'?cfg.campCacheSite(c):cfg.campVisitorSite(c));g.player.hp=g.maxHp();g.player.invincible=999999;campApp.renderer.camera.time=null;}, {id,kind});
  await page.waitForTimeout(250);await page.locator('#nearby-interaction').click();await page.evaluate(()=>campApp.game.player.invincible=0);
 }
 async function next(){await page.locator('[data-camp-next]').click();}
 async function close(){await page.locator('[data-camp-close]').click();await page.waitForTimeout(100);}
 await page.setViewportSize({width:390,height:844});await visit('berry-rumor');
 if(await page.locator('#monster-camps-title').textContent()!=='苔小报')throw Error('没有直接与居民聊天');
 if(await page.locator('#monster-camps-dialog button').count()!==2)throw Error('故事操作数量过多');
 if(/固定种子|已清空|有效游玩|查看全部|前往圈外|本轮击败/.test(await page.locator('#monster-camps-dialog').textContent()))throw Error('仍有功能说明');
 if(await page.evaluate(()=>campApp.game.progress.monsterCamps.clues.length))throw Error('打开故事就发线索');
 const before=await page.evaluate(()=>campApp.game.time);await page.waitForTimeout(350);if(await page.evaluate(()=>campApp.game.time)!==before)throw Error('聊天时战斗没有暂停');
 await close();if(await page.evaluate(()=>campApp.game.state)!=='playing')throw Error('关闭未恢复');
 await visit('berry-rumor');await next();
 // 保存失败不能丢失线索，重试同一个按钮后只记录一次。
 await page.evaluate(()=>{window.realCampPersist=campApp.game.livingPersist;campApp.game.livingPersist=()=>false;});await next();
 if(!await page.locator('#monster-camp-message').textContent().then(t=>t.includes('保存失败')))throw Error('没有显示失败');
 if(await page.evaluate(()=>campApp.game.progress.monsterCamps.clues.includes('editor')))throw Error('失败仍发线索');
 await page.evaluate(()=>campApp.game.livingPersist=window.realCampPersist);await next();
 if(!await page.evaluate(()=>campApp.game.progress.monsterCamps.clues.includes('editor')))throw Error('重试未保存');await close();
 // 再次靠近时无需重新列规则，各尺寸昼夜同屏使用正式对白与世界。
 for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await visit('berry-rumor');
  await page.evaluate(async phase=>{const a=campApp;a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;Object.assign(a.environment,{time:phase,autoTime:false,weather:'sun',autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment);},phase);
  await page.waitForTimeout(200);const check=await page.evaluate(()=>{const d=document.querySelector('#monster-camps-dialog'),r=d.getBoundingClientRect(),copy=d.querySelector('.story-speech-copy');return {state:campApp.game.state,width:innerWidth,height:innerHeight,top:r.top,bottom:r.bottom,dialogHeight:r.height,overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...d.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height),focus:document.activeElement.id,copyScroll:copy.scrollHeight>copy.clientHeight};});
  if(check.overflow||check.top<0||check.bottom>height+1||check.buttons.some(h=>h<44)||check.dialogHeight>height*.47)throw Error(JSON.stringify(check));
  await page.screenshot({path:`output/playwright/camp-stories/story-${width}-${phase}.png`});samples.push({phase,...check});await close();
 }
 // 外围读普通居民的小故事，不能隔空获取具名居民线索。
 await page.setViewportSize({width:390,height:844});await visit('ember-pot','visitor');await next();await next();await next();
 if(await page.locator('#monster-camps-dialog').isVisible()||await page.evaluate(()=>campApp.game.progress.monsterCamps.clues.includes('ash')))throw Error('外围故事错误发线索或未结束');
 await visit('ember-pot');await next();await next();if(!await page.evaluate(()=>campApp.game.progress.monsterCamps.clues.includes('ash')))throw Error('灰耳线索丢失');await close();
 // 灰堆从正式附近锚点打开，时段错误保持可重试，领取后重复打开不能重复发物品。
 await page.evaluate(async()=>{campApp.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id==='day').start+1000;});await visit('snore-pine','cache');await next();if(!await page.locator('#monster-camp-message').textContent().then(t=>t.includes('夜晚')))throw Error('时段限制丢失');await close();
 await page.evaluate(async()=>{campApp.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id==='night').start+1000;});await visit('snore-pine','cache');await next();if(!await page.locator('#monster-camp-message').textContent().then(t=>t.includes('歪嘴茶哨')))throw Error('未获得奇物');await close();await visit('snore-pine','cache');await next();if(!await page.locator('#monster-camp-message').textContent().then(t=>t.includes('已经找过')))throw Error('重复领取');await close();
 // 次数只改变自然开场；Esc关闭保持输入和暂停归属。
 await page.evaluate(()=>campApp.game.progress.monsterCamps.camps['berry-rumor'].clears=6);await visit('berry-rumor');if(!await page.locator('#monster-camp-message').textContent().then(t=>t.includes('又是你')))throw Error('回访没有记忆');await page.screenshot({path:'output/playwright/camp-stories/revisit-390.png'});await page.keyboard.press('Escape');await page.waitForTimeout(100);if(await page.evaluate(()=>campApp.game.state)!=='playing')throw Error('Esc未恢复');
 await page.evaluate(()=>{campApp.save();campApp.game.pause();});if(errors.length)throw Error(errors.join('\n'));return {samples,errors,checks:['逐句故事','中途关闭不发线索','暂停恢复','失败重试','远程不发线索','现场线索','灰堆时段','物品防重','回访记忆','Esc关闭']};
}
