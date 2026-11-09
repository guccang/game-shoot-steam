// 紧凑任务栏的正式 DOM 与实机场景验收；阶段夹具覆盖布局，不冒充任务通关。
async page=>{
 if(new URL(page.url()).port!=='4279')throw Error('仅使用隔离端口4279');
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';
  localStorage.clear();localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();
 await page.locator('#start').click();
 await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game;window.questApp=a;
  g.arrivalScene=null;g.state='playing';
  Object.assign(g.player,{x:970,y:790});
  if(!g.enterStory('sunleaf-01','sunleaf-post'))throw Error('进入章节失败');
  g.story.phase='prepare';g.chooseStoryLoadout('frost-guard');
  g.startStoryStage();
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  Object.assign(g.story,{stageId:'Q20',phase:'active',dialogue:null,trial:null,combat:{spawned:4,total:6,timer:999,cleared:false},experiences:{'frost-cannon':true}});
  Object.assign(g.player,{x:2550,y:2450,invincible:0});g.state='playing';g.attackTimer=999;g.enemies=[];
  for(let i=0;i<2;i++){const e=g.spawnEnemy(0,0,{x:2500+i*45,y:2350},{ambient:true});Object.assign(e,{speed:0,hp:99999,maxHp:99999,damage:0});}
  a.refresh();
 });
 // 检查真实行列位置；窄战场将计数独立成行，宽战场继续两行排列。
 async function inspect(label){
  const s=await page.evaluate(async()=>{questApp.refresh();return (await import('/src/rendering/visual-review.js')).inspectCompactQuest(document);});
  const narrow=await page.evaluate(()=>matchMedia('(max-width:480px),(max-height:720px)').matches);
  const p=s.parts,t=p['#quest-title'],c=p['#quest-count'],n=p['.story-navigation'],second=p['.story-experience'].visible?p['.story-experience']:p['#quest-detail'];
  if(s.overflow||s.box.height>(narrow?84:70)||!t.visible||!second.visible||second.box.top<t.box.bottom||second.box.bottom>s.box.bottom)throw Error(label+' 紧凑布局错误 '+JSON.stringify(s));
  if(c.visible&&(c.clipped||(narrow?c.box.top<t.box.bottom:Math.abs(c.box.top-t.box.top)>1||c.box.left<t.box.right-1)))throw Error(label+' 计数错位 '+JSON.stringify(s));
  if(n.visible&&(n.box.width!==(narrow?44:52)||n.box.left>=t.box.left||n.box.top>t.box.top||(!narrow&&n.box.bottom<second.box.bottom)))throw Error(label+' 导航位置错误');
  samples.push({label,...s});return s;
 }
 for(const lighting of ['day','night']){
  await page.evaluate(async lighting=>{
   const a=questApp;Object.assign(a.environment,{time:lighting,autoTime:false,weather:'sun',autoWeather:false});
   a.game.progress.living.calendar={day:1,elapsed:lighting==='day'?400000:1100000};
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now());
  },lighting);
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:900});await page.waitForTimeout(300);
   const s=await inspect(`${width}-${lighting}`);
   if(s.parts['#quest-detail'].visible||s.parts['.story-experience'].clipped||s.parts['#quest-title'].clipped)throw Error('常用任务文案未完整显示');
   await page.screenshot({path:`output/playwright/compact-quest-tracker/${width}-${lighting}.png`});
   if(width===390&&lighting==='day')await page.locator('#quest').screenshot({path:'output/playwright/compact-quest-tracker/preview.png'});
  }
 }
 await page.setViewportSize({width:320,height:900});
 const before=await page.evaluate(()=>({x:questApp.game.player.x,y:questApp.game.player.y}));
 await page.keyboard.down('KeyD');await page.waitForTimeout(300);await page.keyboard.up('KeyD');
 const after=await page.evaluate(()=>({x:questApp.game.player.x,y:questApp.game.player.y}));
 if(Math.hypot(after.x-before.x,after.y-before.y)<1)throw Error('正式移动失败');
 await page.evaluate(()=>{questApp.game.story.experiences={};questApp.refresh();});await inspect('未发现');
 await page.evaluate(()=>{Object.assign(questApp.game.story,{stageId:'Q80',combat:null});questApp.refresh();});
 const fallback=await inspect('无发现和无计数');if(fallback.parts['.story-experience'].visible||fallback.parts['#quest-count'].visible)throw Error('旧发现或计数残留');
 // 长标题和提醒仅作为文字边界夹具，仍使用正式样式并恢复正式刷新。
 const long=await page.evaluate(async()=>{
  const t=document.getElementById('quest-title'),d=document.getElementById('quest-detail'),c=document.getElementById('quest-count');
  t.textContent='前往森林深处调查被暴风吹倒的古老路标';d.textContent='已发现：冰晶能够为重炮争取更多持续攻击的时间';c.textContent='123/999';
  return (await import('/src/rendering/visual-review.js')).inspectCompactQuest(document);
 });
 if(long.box.height>84||long.parts['#quest-count'].clipped||!long.parts['#quest-title'].clipped)throw Error('长文案挤出计数');samples.push({label:'长文本',...long});
 await page.evaluate(()=>{Object.assign(questApp.game.story,{phase:'active',trial:{remaining:10,targets:[]}});questApp.refresh();});
 const trial=await inspect('试射隐藏导航');if(trial.parts['.story-navigation'].visible)throw Error('试射残留导航');
 // 领主栏保留原 44px 导航；退出后回到跨两行的任务栏。
 await page.evaluate(async()=>{
  const g=questApp.game;Object.assign(g.story,{trial:null,stageId:'Q60',phase:'active',dialogue:null,combat:null});g.enemies=[];
  (await import('/src/core/story/story-encounters.js')).spawnStoryBoss(g);questApp.refresh();
 });
 const boss=await page.evaluate(async()=>{const s=(await import('/src/rendering/visual-review.js')).inspectStoryNavigation(document);return {...s,questHidden:document.getElementById('quest').hidden};});
 if(boss.host!=='boss-hud'||boss.box.width!==44||!boss.questHidden)throw Error('领主栏导航被任务布局影响');
 samples.push({label:'领主栏',...boss});
 await page.evaluate(()=>{questApp.game.story.trial=null;questApp.game.leaveStory();questApp.refresh();});
 if(await page.locator('#game-frame').evaluate(n=>n.classList.contains('story-active')))throw Error('退出章节残留布局');
 if(errors.length)throw Error(errors.join('\n'));
 return {pass:true,designCriterion:'compact-quest-tracker',samples,movement:{before,after},errors};
}


