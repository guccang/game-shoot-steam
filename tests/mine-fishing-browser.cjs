// 隔离手机浏览器验证默认折叠、全屏地图、真实触控钓鱼和昼夜短屏。
async original=>{
 const base=new URL(original.url()).origin;
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/mine-fishing/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];
 page.on('pageerror',e=>errors.push(e.message));
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(120);}
 // 截图和正式绘制器数据共同检查，所有可见操作至少44像素。
 async function shot(name){
  await page.waitForTimeout(180);await page.screenshot({path:'output/playwright/mine-fishing/'+name+'.png'});
  const r=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMineFishingFullscreen(a.game,a.renderer,document));
  if(r.view.top!==0||r.view.bottom!==r.view.height||r.overflow||r.buttons.some(b=>b.width<43.9||b.height<43.9))throw Error('全屏或触控不合格 '+JSON.stringify(r));
  if(r.fishing&&!r.fishingVisible)throw Error('钓鱼操作被隐藏');
  if(r.fishing){const fits=await page.evaluate(()=>{const v=a.renderer.mineView,p=a.game.player,w=a.game.fishing.water||a.game.fishing.shore.water,frame=document.getElementById('game-frame').getBoundingClientRect(),hud=document.getElementById('fishing-hud').getBoundingClientRect();return [p,w].every(q=>(q.x-v.x)*v.zoom>20&&(q.x-v.x)*v.zoom<v.width-20&&(q.y-v.y)*v.zoom<hud.top-frame.top-15);});if(!fits)throw Error('钓鱼主体被操作条遮住');}reviews.push({name,...r});
 }
 try{
  await page.goto(base);await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await(await import('/src/rendering/farm.js')).loadFarmArt();window.mc=await import('/src/config/mining.js');window.ec=await import('/src/config/mine-ecology.js');window.mi=await import('/src/core/mining/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.mining.seed=1847;p.wood=200;p.mining.ore=100;
   p.mining.layers[2]=(await import('/src/progression/mining/mine-layers.js')).freshMineLayer(2,{x:8,y:4},()=>.31);
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);mi.enterMine(g);g.cottage.scanWait=99999;g.livingPersist=()=>true;g.progress.outdoors.rod=true;g.progress.outdoors.bait=20;
   window.outdoors=await import('/src/core/activities/outdoors.js');window.mf=await import('/src/world/mine-fishing.js');
   let found=false;
   outer:for(let y=-16;y<16;y++)for(let x=-16;x<16;x++){
    if(!ec.mineTerrain({x,y},g.progress.mining).water)continue;const center=mc.minePoint({x,y});
    for(let dy=-112;dy<=112;dy+=16)for(let dx=-112;dx<=112;dx+=16){Object.assign(g.player,{x:center.x+dx,y:center.y+dy});if(mf.mineFishingShore(g)){found=true;break outer;}}
   }
   if(!found)throw Error('没有找到真实岸边');window.bank={x:g.player.x,y:g.player.y};a.refresh();
  });
  await page.waitForTimeout(300);
  if(await page.locator('#mine-tools-panel').isVisible())throw Error('工具没有默认折叠');
  await phase('day');await shot('collapsed-day');await phase('night');await shot('collapsed-night');
  await page.locator('#mine-tools-toggle').tap();
  if(!await page.locator('[data-mine-tool="lamp"]').isVisible()||!await page.locator('[data-mine-tool="sign"]').isVisible())throw Error('展开菜单缺少矿灯路牌');
  await shot('expanded-night');await page.locator('#mine-tools-toggle').tap();
  const view=await page.evaluate(()=>a.renderer.mineView);await page.locator('#mine-tools-toggle').tap();await page.waitForTimeout(180);
  const after=await page.evaluate(()=>a.renderer.mineView);if(view.x!==after.x||view.y!==after.y)throw Error('工具展开导致地图跳动');
  await page.locator('#mine-tools-toggle').tap();await phase('day');
  await page.locator('#mine-fish').tap();await shot('ready-day');
  if(await page.locator('#mine-controls').isVisible())throw Error('钓鱼时工具栏没有收起');
  // 使用真实触摸长按抛竿、黑漂扬竿；溜鱼随后仍通过正式操作入口完成。
  const cdp=await context.newCDPSession(page),box=await page.locator('#fishing-control').boundingBox(),point={x:box.x+box.width/2,y:box.y+box.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await page.waitForTimeout(1250);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>a.game.fishing?.phase==='bite',{},{timeout:15000});await page.locator('#fishing-control').tap();
  if(await page.evaluate(()=>a.game.fishing?.phase)!=='fight')throw Error('真实触摸没有扬竿');await shot('fight-day');
  await phase('night');await shot('fight-night');
  const age=await page.evaluate(()=>{a.game.state='paused';return a.game.fishing.clock;});await page.waitForTimeout(300);if(await page.evaluate(()=>a.game.fishing.clock)!==age)throw Error('暂停没有冻结');
  await page.evaluate(()=>{a.game.state='playing';});await page.waitForTimeout(100);
  await page.evaluate(()=>{
   const g=a.game;
   for(let i=0;i<1700&&g.fishing?.phase==='fight';i++){const f=g.fishing;outdoors.fishingControl(g,'lean',-(f.direction||1));outdoors.fishingControl(g,f.tension>.7?'release':f.tension<.45?'press':f.reeling?'press':'release');g.update(.04);}
   if(g.fishing?.phase!=='landed')throw Error('溜鱼未成功');a.refresh();
  });await shot('landed-night');await page.locator('[data-fish-keep]').tap();
  if(await page.evaluate(()=>a.game.progress.outdoors.caught)!==1)throw Error('鱼获没有入鱼护');await cdp.detach();
  for(const size of [{width:320,height:568},{width:360,height:640},{width:430,height:932},{width:844,height:390},{width:1280,height:900}]){
   await page.setViewportSize(size);await page.evaluate(()=>{Object.assign(a.game.player,bank);a.game.fishing=null;a.refresh();});
   for(const time of ['day','night']){await phase(time);await shot('layout-'+size.width+'-'+time);}
   await page.locator('#mine-tools-toggle').tap();await shot('tools-'+size.width);await page.locator('#mine-tools-toggle').tap();
   await page.locator('#mine-fish').tap();await shot('fishing-'+size.width);
   if(size.height<600){
    await page.evaluate(()=>{const g=a.game;outdoors.fishingControl(g,'press');for(let i=0;i<30;i++)g.update(.04);outdoors.fishingControl(g,'release');for(let i=0;i<250&&g.fishing?.phase!=='bite';i++)g.update(.04);outdoors.fishingControl(g,'press');outdoors.fishingControl(g,'release');if(g.fishing?.phase!=='fight')throw Error('短屏溜鱼场景准备失败');});
    await shot('short-fight-'+size.width);
   }
   await page.locator('#fishing-cancel').tap();
  }
  if(errors.length)throw Error(errors.join(' / '));return {base,scenes:reviews.length,errors,reviews};
 }catch(e){await page.screenshot({path:'output/playwright/mine-fishing/failure.png'});throw e;}finally{await context.close();}
}
