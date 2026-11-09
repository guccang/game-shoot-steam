// 口头禅沿正式居民与援军入口显示，实际读取小气泡和HUD，不创建预览替身。
async page=>{
 if(new URL(page.url()).port!=='4299')throw Error('仅允许隔离端口4299');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.update=()=>{};g.enemies=[];g.mainlineSpeech=null;const r=(await import('/src/core/camp/living-world.js')).residentFor(g,'cook');Object.assign(g.player,{x:r.x,y:r.y-90});g.time+=100;a.renderer.camera.time=null;a.refresh();});
 // 每个节点都来自正式组件；尾尖投影和尺寸一起判断头顶定位。
 async function capture(id){for(const width of [1280,390,320])for(const phase of ['day','night']){
  await page.setViewportSize({width,height:900});await page.evaluate(async phase=>{a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},phase);await page.waitForTimeout(150);
  const sample=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectNpcChatter(document)),n=sample.nodes.find(n=>n.id===id);
  if(!n||n.bottom||n.placement!=='overhead'||n.rect.width>168||n.rect.height>70||Math.abs(n.rect.bottom-n.anchor.y)>1||n.rect.left<sample.frame.left||n.rect.right>sample.frame.right||n.pointerEvents!=='none'||!sample.menuVisible||sample.overflow)throw Error(JSON.stringify(sample));
  samples.push({width,phase,id,...sample});await page.screenshot({path:`output/playwright/npc-overhead-chatter/${id}-${width}-${phase}.png`});
 }}
 await capture('resident-chatter');
 const before=await page.locator('#resident-chatter').evaluate(n=>Number(n.dataset.anchorX));await page.evaluate(()=>{a.game.player.x+=25;a.renderer.camera.time=null;a.refresh();});await page.waitForTimeout(150);const after=await page.locator('#resident-chatter').evaluate(n=>Number(n.dataset.anchorX));if(Math.abs(after-before)<1)throw Error('气泡未跟随镜头');
 // 短屏头顶没有空间时隐藏，不退化为底部全宽；恢复尺寸后正式交谈仍可打开。
 await page.setViewportSize({width:320,height:296});await page.waitForTimeout(150);if(!await page.locator('#resident-chatter').evaluate(n=>n.hidden))throw Error('短屏未隐藏气泡');await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>a.living.open('cook'));const dialog=await page.locator('#living-dialog').evaluate(n=>({bottom:n.classList.contains('npc-bottom-dialogue'),width:n.getBoundingClientRect().width}));if(!dialog.bottom||Math.abs(dialog.width-390)>1)throw Error('正式交谈没有保留底部全宽');if(!await page.locator('#resident-chatter').evaluate(n=>n.hidden))throw Error('交谈期间仍有闲聊');await page.locator('#living-close').click();
 // 援军共用短句组件，仍从真实救援阶段生成说话者与文本。
 await page.evaluate(async()=>{const g=a.game;g.state='playing';const c=await import('/src/core/camp/camp-defense.js'),gate=(await import('/src/config/camp-defense.js')).CAMP_GATES[0];Object.assign(g.player,gate);if(!c.startCampDefense(g,gate.id))throw Error('兽潮未开启');const e=g.spawnEnemy(0,0,{x:gate.x,y:gate.y-200});e.hp=e.maxHp=1e9;c.rescueCampDefense(g,'barricade');for(let i=0;i<20;i++)c.updateCampDefense(g,.1);a.refresh();});await capture('camp-rescue-speech');
 if(errors.length)throw Error(errors.join('；'));return {count:samples.length,follow:true,shortScreenHidden:true,formalDialogue:true,errors};
}
