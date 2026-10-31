// 隔离端口核验新任务触控导航、载具工坊入口与昼夜真实战斗，不写用户日常存档。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('仅允许隔离验收端口');
 const errors=[],rows=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:4175');await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 // 检查点只设置任务前置和永久装备；目标 UI 通过真实按钮开启。
 await page.evaluate(async()=>{window.rhythmCheckpoint=async id=>{
  const g=a.game,{MAINLINE_IDS,MAINLINE_SITES}=await import('/src/config/mainline.js');
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  if(g.story)(await import('/src/core/story-manager.js')).leaveStory(g);g.campDefense=null;g.realm=null;
  const p=(await import('/src/progression/progress.js')).freshProgress();p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.phase='doing';
  p.coins=p.wood=10000;for(const index of [0,2,3]){p.vehicleHulls[index]=1;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(p,index);}
  g.progress=p;g.reset();g.arrivalScene=null;g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.attackTimer=999;g.spawnTimer=999;g.enemies=[];
  Object.assign(g.player,MAINLINE_SITES.camp);(await import('/src/core/world-navigation.js')).requestMainlineNavigation(g);a.refresh();
 };});
 // 读取任务卡内容，触控后核验正式路线目标，不使用程序代点 UI。
 for(const id of ['pistol-field','vehicle-field','hover-service','hover-horde','aircraft-service','aircraft-field','controller-horde']){
  await page.evaluate(id=>rhythmCheckpoint(id),id);await page.waitForTimeout(160);
  const text=await page.locator('#mainline-hud').innerText(),box=await page.locator('#mainline-hud').boundingBox();
  if(!text||!box||box.height<44)throw Error(id+'任务卡不可用');await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  const state=await page.evaluate(async()=>{const g=a.game,o=(await import('/src/core/world-navigation.js')).worldNavigationObjective(g);return {key:o?.key,state:g.state,overflow:document.documentElement.scrollWidth>innerWidth};});
  if(state.overflow)throw Error(id+'页面横向溢出');rows.push({id,text,...state});
 }
 // 检查载具三步整备在真实任务簿中的中文换行及正式工坊入口。
 await page.evaluate(()=>rhythmCheckpoint('hover-service'));
 await page.locator('#field-menu-toggle').click();await page.locator('#story-button').click();await page.locator('[data-task-panel=mainline]').first().click();await page.locator('#mainline-dialog').waitFor({state:'visible'});
 await page.screenshot({path:'output/playwright/mainline-combat-rhythm/hover-service.png'});
 await page.locator('#mainline-close').click();
 // 正式第一章借装战斗，在每种手机比例与昼夜环境中观察实际多怪和射击。
 for(const [width,height] of [[390,844],[320,640]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{
   await rhythmCheckpoint('first-letter');const g=a.game,{storyPostForChapter,storyPostApproach}=await import('/src/core/story-posts.js');Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));
   if(!g.enterStory())throw Error('章节入口失败');g.advanceStoryDialogue(true);g.chooseStoryLoadout('line-patrol');g.startStoryStage();
   Object.assign(g.player,(await import('/src/config/story.js')).STORY_SITES.SIGN);g.attackTimer=0;
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');Object.assign(a.environment,{time,weather:'sun',autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.refresh();
  },time);
  await page.waitForFunction(()=>a.game.enemies.filter(e=>e.hp>0).length>=3);
  await page.screenshot({path:`output/playwright/mainline-combat-rhythm/batch-${width}-${time}.png`});
  await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');
  await page.waitForFunction(()=>a.game.story?.combat?.cleared||a.game.story?.phase==='failed',{timeout:45000});
  const result=await page.evaluate(()=>({cleared:a.game.story.combat.cleared,spawned:a.game.story.combat.spawned,hp:a.game.player.hp,failed:a.game.story.phase==='failed',overflow:document.documentElement.scrollWidth>innerWidth}));
  if(result.failed||!result.cleared||result.spawned!==6||result.overflow)throw Error(JSON.stringify(result));rows.push({width,height,time,...result});
 }
 if(errors.length)throw Error(errors.join('\n'));return {rows,errors};
}
