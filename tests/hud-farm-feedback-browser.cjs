// 正式场景验收：低生命、手机布局、任务整条切换和真实地形开垦预览。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.lessonRewarded=true;
  p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice(0,2);p.mainline.phase='doing';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  const g=a.game;g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];g.boss=null;g.vehicle.active=false;g.update=()=>{};
  Object.assign(g.player,{x:803.25,y:751.5,vx:0,vy:0});for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();
 });
 // 阈值使用真实生命比率；驾驶时必须取车体生命而非乘员生命。
 for(const mounted of [false,true])for(const ratio of [1,.25,.249]){
  await page.evaluate(({mounted,ratio})=>{a.game.vehicle.active=mounted;a.game.player.hp=a.game.maxHp()*(mounted?1:ratio);a.game.vehicle.hp=a.game.vehicle.maxHp*ratio;a.refresh();},{mounted,ratio});
  const low=await page.locator('.player-hud').evaluate(el=>el.classList.contains('low-health'));
  if(low!==(ratio<.25))throw Error('生命提醒阈值错误');
 }
 await page.evaluate(()=>{a.game.vehicle.active=false;a.game.player.hp=a.game.maxHp()*.2;a.refresh();});
 const colors=[];for(let i=0;i<3;i++){await page.waitForTimeout(350);colors.push(await page.locator('.player-hud').evaluate(el=>getComputedStyle(el).backgroundColor));}
 if(new Set(colors).size<2)throw Error('呼吸动画没有变化');
 await page.emulateMedia({reducedMotion:'reduce'});if(await page.locator('.player-hud').evaluate(el=>getComputedStyle(el).animationName)!=='none')throw Error('减少动态未生效');await page.emulateMedia({reducedMotion:'no-preference'});
 // 点击任务正文与键盘激活都只切换寻路，不打开任务操作或改变任务进度。
 const before=await page.evaluate(()=>JSON.stringify({phase:a.game.progress.mainline.phase,completed:a.game.progress.mainline.completed}));
 await page.locator('#mainline-hud').click({position:{x:100,y:20}});
 if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled)!==false)throw Error('整条关闭寻路失败');
 await page.locator('#mainline-hud').press('Enter');
 if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled)!==true)throw Error('再次点击开启寻路失败');
 if(await page.locator('dialog[open]').count()||before!==await page.evaluate(()=>JSON.stringify({phase:a.game.progress.mainline.phase,completed:a.game.progress.mainline.completed})))throw Error('任务操作被误触');
 for(const [width,height] of [[320,568],[390,844]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(async phase=>{a.game.progress.living.calendar.elapsed=phase==='night'?260000:75000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();},phase);await page.waitForTimeout(180);
  const bounds=await page.evaluate(()=>{const h=document.querySelector('.player-hud').getBoundingClientRect(),m=document.querySelector('.hud-resources').getBoundingClientRect(),t=document.getElementById('mainline-hud').getBoundingClientRect();return {healthTop:h.top,moneyBottom:m.bottom,healthBottom:h.bottom,taskTop:t.top,taskHeight:t.height,overflow:document.documentElement.scrollWidth>innerWidth};});
  if(bounds.overflow||bounds.healthTop<bounds.moneyBottom||bounds.taskTop<bounds.healthBottom||bounds.taskHeight>48)throw Error('HUD 重叠或任务条不紧凑 '+JSON.stringify(bounds));
  await page.screenshot({path:`output/playwright/hud-farm/hud-${width}-${phase}.png`});samples.push({width,phase,...bounds});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{a.game.player.hp=a.game.maxHp();a.refresh();a.farm.open();});await page.waitForTimeout(200);
 if(!await page.locator('#farm-placement').isVisible())throw Error('打开锄头缺少默认预览');
 const targets=await page.evaluate(async()=>{
  const {farmDigTarget}=await import('/src/world/farm-land.js'),v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();let valid,invalid;
  for(let y=260;y<r.height-160;y+=24)for(let x=36;x<r.width-30;x+=24){const point={x:v.x+x/r.width*v.w,y:v.y+y/r.height*v.h},t=farmDigTarget(a.game,point,v);if(!valid&&!t.reason)valid={x:r.x+x,y:r.y+y,target:t.point};if(!invalid&&t.reason?.includes('路面'))invalid={x:r.x+x,y:r.y+y,target:t.point};}return {valid,invalid};
 });
 for(const [kind,t] of Object.entries(targets)){
  if(!t)throw Error('当前地图缺少测试地面');await page.mouse.move(t.x,t.y);await page.waitForTimeout(150);
  const preview=await page.locator('#farm-placement').evaluate(el=>({...el.dataset}));
  if(preview.valid!==String(kind==='valid')||Math.hypot(Number(preview.worldX)-t.target.x,Number(preview.worldY)-t.target.y)>1e-6)throw Error('预览与正式选址不一致');
  await page.screenshot({path:`output/playwright/hud-farm/farm-${kind}-night.png`});
  await page.mouse.click(t.x,t.y);
  const queue=await page.evaluate(()=>a.game.farmWork.queue.map(j=>j.point));
  if(kind==='valid'&&(!queue.length||Math.hypot(queue[0].x-t.target.x,queue[0].y-t.target.y)>1e-6))throw Error('实际开垦目标不同');
  if(kind==='invalid'&&queue.length)throw Error('红色预览仍可开垦');
  await page.evaluate(()=>{a.game.farmWork.queue=[];a.game.farmWork.job=null;});
 }
 // 拖动继续交给摇杆，只显示预选框，不能意外排队开地。
 const p=targets.valid;await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+65,p.y+50,{steps:6});await page.mouse.up();
 if(await page.evaluate(()=>a.game.farmWork.queue.length))throw Error('拖动误开地');
 await page.locator('#farm-water').click();if(await page.locator('#farm-placement').isVisible())throw Error('换工具后预览未收起');
 await page.locator('#farm-exit').click();
 // 没有钱包的秘境保留底部生命卡，不能占用顶部专属波次信息。
 await page.evaluate(()=>{if(!a.game.enterRealm('tower'))throw Error('高塔入口不可用');a.refresh();});await page.waitForTimeout(150);
 const realmBounds=await page.evaluate(()=>({health:document.querySelector('.player-hud').getBoundingClientRect().toJSON(),quest:document.getElementById('quest').getBoundingClientRect().toJSON()}));
 if(realmBounds.health.top<realmBounds.quest.bottom||realmBounds.health.bottom>844)throw Error('秘境生命卡遮住顶部信息');
 await page.screenshot({path:'output/playwright/hud-farm/realm-layout.png'});
 await page.evaluate(()=>{a.game.leaveRealm();a.refresh();});
 // 故事任务卡原本是穿透点击的 section，整条开关也必须阻止误触战场摇杆。
 await page.evaluate(async()=>{const g=a.game,posts=await import('/src/core/story-posts.js');Object.assign(g.player,posts.storyPostApproach(posts.storyPostForChapter(g,'sunleaf-01')));if(!g.enterStory('sunleaf-01','sunleaf-post'))throw Error('故事入口不可用');g.story.phase='prepare';g.chooseStoryLoadout('frost-guard');g.startStoryStage();Object.assign(g.story,{stageId:'TO_RELAY',phase:'active',dialogue:null});g.state='playing';a.refresh();});await page.waitForTimeout(150);
 await page.locator('#quest').click({position:{x:70,y:20}});
 if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled)!==false)throw Error('故事任务整条关闭失败');
 await page.locator('#quest').click({position:{x:70,y:20}});
 if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled)!==true)throw Error('故事任务整条恢复失败');
 if(errors.length)throw Error(errors.join('\n'));return {samples,healthThresholds:6,navigationToggle:true,placement:true,errors};
}
