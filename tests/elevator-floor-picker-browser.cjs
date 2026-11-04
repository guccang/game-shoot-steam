// 隔离存档验证正式乘梯页的触摸滑动、边界、高楼层与手机昼夜布局。
async original=>{
 const out='output/playwright/elevator-floor-picker',context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],shots=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 // 使用正式楼层页入口，不新建测试替代控件。
 async function open(){await page.locator('#home-travel-open').tap();await page.locator('#home-lift-floor').waitFor({state:'visible'});await page.waitForTimeout(300);}
 // 读取高亮条目验证实际选中状态与窗口大小。
 async function selected(){return Number(await page.locator('#home-lift-floor [aria-selected=true]').getAttribute('data-floor'));}
 // 在可见窗口内派发真实触屏手势，等待浏览器惯性滚动与吸附。
 async function swipe(){
  await page.locator('#home-lift-floor').scrollIntoViewIfNeeded();const r=await page.locator('#home-lift-floor').boundingBox(),cdp=await context.newCDPSession(page),x=r.x+r.width/2,y=r.y+r.height-18;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*16}]});await page.waitForTimeout(70);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(600);await cdp.detach();
 }
 // 核验手机布局、原生滚动和44像素触控，截图仅覆盖真实界面。
 async function shot(name){
  const sizes=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,actionVisible:(()=>{const r=document.querySelector('[data-lift]').getBoundingClientRect();return r.y>=0&&r.bottom<=innerHeight&&r.height>=44;})(),rows:document.querySelectorAll('#home-lift-floor [role=option]').length,fields:document.querySelectorAll('#home-floor-picker input').length,heights:[...document.querySelectorAll('#home-floor-picker button,#home-lift-floor [role=option]')].map(n=>n.getBoundingClientRect().height)}));
  if(sizes.overflow||!sizes.actionVisible||sizes.rows>41||sizes.fields||sizes.heights.some(h=>h<43.99))throw Error('窗口布局错误 '+JSON.stringify(sizes));await page.screenshot({path:out+'/'+name+'.png'});shots.push(name);
 }
 try{
  await page.goto(original.url().includes('localhost')?original.url():'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.floors=8;p.homeDecor.elevators=[0];
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=999999;g.enemies=[];Object.assign(g.player,(await import('/src/config/cottage.js')).COTTAGE.door);g.cottageDoorLatch=false;a.refresh();
  });
  await page.waitForFunction(()=>a.game.cottage?.kind==='cottage');await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_ELEVATOR.landing));await open();
  if(await selected()!==1)throw Error('初始目标未居中');if(await page.evaluate(()=>a.game.state)!=='paused')throw Error('开页未暂停');
  await swipe();if(await selected()<=1)throw Error('触摸滑动未改变目标');await shot('swipe');
  await page.locator('[data-floor-first]').tap();await page.waitForTimeout(250);if(await selected()!==0||!await page.locator('[data-lift]').isDisabled())throw Error('当前层未禁用');
  await page.locator('#home-lift-floor [data-floor="1"]').tap();await page.waitForTimeout(300);if(await selected()!==1)throw Error('点击相邻层无效');
  await page.locator('[data-floor-last]').tap();await page.waitForTimeout(300);if(await selected()!==7)throw Error('顶层快捷无效');await shot('top-floor');await page.locator('[data-lift]').tap();await page.waitForFunction(()=>a.game.cottage.floor===7&&a.game.state==='playing');
  // 高楼层保持稀疏列表，首尾和方向键仍能精确选择，沿用真实乘梯校验。
  await page.evaluate(async()=>{a.game.progress.homeDecor.floors=1000001;a.game.cottage.floor=0;Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_ELEVATOR.landing);});await open();
  await page.locator('[data-floor-last]').tap();await page.waitForTimeout(300);if(await selected()!==1000000)throw Error('百万层顶层不可达');await page.locator('#home-lift-floor').press('ArrowUp');await page.waitForTimeout(300);if(await selected()!==999999)throw Error('高层微调失败');await shot('million-floor');
  await page.locator('#home-lift-floor').press('Home');for(let i=0;i<5;i++)await page.locator('#home-lift-floor').press('PageDown');await page.waitForTimeout(350);if(await selected()!==50)throw Error('窗口接续丢失目标');
  await swipe();const afterSwipe=await selected();if(afterSwipe<=50)throw Error('接续窗口后不能滑动');await shot('window-continuation');
  await page.locator('#home-lift-floor').press('End');await page.locator('[data-lift]').tap();await page.waitForFunction(()=>a.game.cottage.floor===1000000&&a.game.state==='playing');
  await page.evaluate(async()=>{a.game.cottage.floor=0;Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_ELEVATOR.landing);});await open();
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])for(const time of ['day','night']){
   await page.setViewportSize(size);await page.evaluate(async time=>{const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar.elapsed=phase.start+phase.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);},time);
   await page.locator('#home-lift-floor').scrollIntoViewIfNeeded();await page.waitForTimeout(250);await shot(size.width+'-'+time);
  }
  // 稳定复现手动打开与门前自动候停竞争，取消不能再消费旧请求。
  await page.setViewportSize({width:390,height:844});await page.locator('[data-build-close]').tap();await page.waitForFunction(()=>a.game.state==='playing');await page.evaluate(()=>{a.game.cottage.elevatorLatch=false;a.game.cottage.elevatorElapsed=.9;a.game.cottage.elevatorRequest=true;document.getElementById('home-travel-open').click();});await page.locator('[data-build-close]').tap();await page.waitForFunction(()=>a.game.state==='playing');await page.waitForTimeout(1200);if(await page.locator('#home-construction-dialog').isVisible())throw Error('取消后重复弹出');
  await open();await page.locator('[data-floor-first]').tap();await page.locator('#home-lift-floor').press('ArrowDown');await page.locator('[data-lift]').tap();await page.waitForFunction(()=>a.game.cottage.floor===1);
  if(errors.length)throw Error(errors.join('\n'));return {shots,swipe:true,windowContinuation:afterSwipe,millionFloor:true,cancelAndReopen:true,errors};
 }catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}finally{await context.close();}
}
