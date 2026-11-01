// 默认4175；隔离手机存储，以实际点击验证背包、手机、地图与任务返回路径。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 const output='output/playwright/backpack-phone-entry/';
 // 从真实菜单打开功能页，菜单折叠后关闭弹窗应恢复到可见入口。
 async function open(id){await page.locator('#field-menu-toggle').tap();await page.locator('#'+id).tap();}
 // 检查正式DOM的可见范围、触控尺寸及正文横向溢出，截图用于人工复核。
 async function inspect(name,width,height){
  const result=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectKeepsakeBackpack(a.game,document));
  if(result.overflow||result.hasStandaloneMap||result.box.x<0||result.box.y<0||result.box.right>width+1||result.box.bottom>height+1||result.controls.some(c=>c.width<43||c.height<43)||/undefined|NaN/.test(result.text))throw Error(JSON.stringify({name,result}));
  checks.push({name,panel:result.panel,slots:result.gridSlots,controls:result.controls.length});
  await page.screenshot({path:output+name+'.png'});
 }
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;});
  // 正式交接获得三件物品；格子点击后的首次读信仍保留失败重试。
  await page.evaluate(async()=>{const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshRangerProgress();g.reset();g.state='playing';if(!(await import('/src/core/ranger-arrival.js')).skipArrivalJourney(g))throw Error('跳过接送失败');a.refresh();});
  await open('heroes-button');await page.locator('[data-cat-tab=items]').tap();
  if(await page.locator('#current-cat-dialog .keepsake-letter').count())throw Error('背包不应直接展示来信');
  await page.locator('[data-keepsake=elder-letter]').tap();await page.locator('#keepsake-dialog').waitFor({state:'visible'});
  await page.evaluate(()=>{window.originalArrivalPersist=a.game.arrivalPersist;a.game.arrivalPersist=()=>false;});
  await page.locator('[data-pack-action=letter]').tap();if(!(await page.locator('#keepsake-dialog .keepsake-message').textContent()).includes('保存失败'))throw Error('缺少读信保存失败反馈');
  await page.evaluate(()=>{a.game.arrivalPersist=window.originalArrivalPersist;});await page.locator('[data-pack-action=letter]').tap();
  await page.waitForFunction(()=>!document.getElementById('keepsake-dialog').open);
  if(await page.evaluate(()=>a.game.state!=='paused'||!document.getElementById('current-cat-dialog').open))throw Error('详情关闭应返回背包并暂停');
  await page.locator('#current-cat-close').tap();await page.waitForFunction(()=>a.game.state==='playing'&&a.game.progress.arrival.phase==='ride-guide');
  // 第一项任务通过正式任务卡打开手机；只有实际查看地图才记录进度。
  await page.evaluate(async()=>{const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.phase='doing';p.mainline.currentId='first-map';p.restoration.repaired=['cottage','neighbors','travel'];g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.vehicle.active=false;a.refresh();});
  await page.locator('#mainline-hud').tap();await page.locator('#phone-dialog').waitFor({state:'visible'});
  if(await page.evaluate(()=>a.game.progress.mainline.seen.map!==0||document.getElementById('map-dialog').open))throw Error('手机首页提前完成地图教学');
  await page.waitForFunction(()=>document.querySelector('#phone-dialog [data-pack-action=map]').classList.contains('operation-source'));
  await page.screenshot({path:output+'task-phone.png'});
  await page.locator('#phone-dialog [data-pack-action=map]').tap();await page.locator('#map-dialog').waitFor({state:'visible'});
  if(await page.evaluate(()=>a.game.progress.mainline.seen.map!==1))throw Error('实际打开地图没有记录教学');
  await page.locator('#map-done').tap();await page.waitForFunction(()=>!document.getElementById('map-dialog').open);
  if(await page.evaluate(()=>a.game.state!=='paused'||!document.getElementById('phone-dialog').open))throw Error('地图返回未保持手机暂停');
  await page.locator('#phone-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  // 已完成主线的正式存档用于通话、旅行和昼夜检查，不干扰任务气泡。
  await page.evaluate(async()=>{const g=a.game;g.progress.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];g.progress.mainline.phase='complete';g.progress.mainline.currentId=null;g.mainlineSpeech=null;g.enemies=[];a.environment.autoWeather=false;a.environment.weather='sun';g.livingWeather='sun';Object.assign(g.player,{x:610,y:280});a.refresh();});
  await open('phone-button');await page.locator('[data-pack-action=map]').tap();
  await page.locator('[data-map=jiuzhaigou]').tap();await page.waitForFunction(()=>a.game.mapId==='jiuzhaigou');
  await page.locator('[data-map=forest]').tap();await page.waitForFunction(()=>a.game.mapId==='forest');
  await page.locator('#map-done').tap();await page.locator('[data-call=cook]').tap();
  if(!(await page.locator('.keepsake-call').textContent()).includes('通话已接通'))throw Error('电话未接通');
  const before=await page.evaluate(()=>JSON.stringify(a.game.progress.living.requests));
  await page.locator('[data-pack-action=visit]').tap();await page.waitForFunction(()=>a.game.state==='playing');
  const nav=await page.evaluate(async()=>({target:(await import('/src/core/world-navigation.js')).worldNavigationObjective(a.game)?.site.id,requests:JSON.stringify(a.game.progress.living.requests)}));
  if(nav.target!=='cook'||nav.requests!==before)throw Error('导航错误或远程更改委托');
  // 背包中的手机打开地图再逐层退出；Escape和按钮均不可提前恢复战场。
  await open('heroes-button');await page.locator('[data-cat-tab=items]').tap();await page.locator('[data-keepsake=patrol-phone]').tap();await page.locator('[data-pack-action=map]').tap();
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('map-dialog').open);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('phone-dialog').open);
  if(await page.evaluate(()=>a.game.state!=='paused'||!document.getElementById('current-cat-dialog').open||document.activeElement?.dataset.keepsake!=='patrol-phone'))throw Error('嵌套退出暂停或焦点错误');
  await page.locator('#current-cat-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  // 各尺寸共用手机布局，昼夜检查格子、物品详情和独立手机页面。
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390],[1280,900]]){
   await page.setViewportSize({width,height});
   for(const phase of ['day','night']){
    await page.evaluate(async phase=>{const g=a.game;g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,g.progress.living.calendar);a.renderer.light.set(a.environment,performance.now()-20000);a.renderer.draw();a.refresh();},phase);
    await open('heroes-button');await page.locator('[data-cat-tab=items]').tap();await inspect('grid-'+width+'-'+phase,width,height);
    if(await page.locator('.keepsake-pockets > *').count()!==9)throw Error('格子数量错误');
    await page.locator('[data-keepsake=elder-letter]').tap();await inspect('letter-'+width+'-'+phase,width,height);await page.locator('#keepsake-close').tap();
    await page.locator('[data-keepsake=house-key]').tap();await inspect('key-'+width+'-'+phase,width,height);await page.locator('#keepsake-close').tap();await page.locator('#current-cat-close').tap();
    await open('phone-button');await inspect('phone-'+width+'-'+phase,width,height);
    if(width===390){await page.locator('[data-call=cook]').tap();if(phase==='night'&&!(await page.locator('.keepsake-call').textContent()).includes('语音留言'))throw Error('作息未保留');await page.screenshot({path:output+'call-'+phase+'.png'});await page.locator('[data-pack-action=hangup]').tap();}
    await page.locator('#phone-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
   }
  }
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors,taskRoute:true,travel:true,nestedPause:true};
 }catch(error){await page.screenshot({path:output+'failure.png'});throw error;}
 finally{await context.close();}
}
