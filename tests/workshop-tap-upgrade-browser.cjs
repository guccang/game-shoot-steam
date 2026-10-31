// 点选升级专项：真实触摸、免费试装、长按事务、暂停和手机单屏验收。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('仅允许测试端口4175');
 for(const c of page.context().browser().contexts())if(c!==page.context())await c.close();
 const context=await page.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],samples=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4175');await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapons.fill(1);p.weapons[3]=0;p.weapon=0;p.mastery.fill(100);p.coins=p.wood=100000;p.vehicleHulls.fill(1);for(const k of Object.keys(p.materials))p.materials[k]=999;a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.enemies=[];a.refresh();a.workshop.open('weapons',3);});
 // 检查右侧无滚动、按钮可触达；左侧列表允许独立滑动。
 async function check(label,shot=false){
  await t.waitForTimeout(60);
  const s=await t.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopFocus(document));
  const size=t.viewportSize();
  const bad=s.controls.filter(c=>c.box.width<43.9||c.box.height<43.9||c.box.x<0||c.box.y<0||c.box.right>size.width+1||c.box.bottom>size.height+1);
  if(s.overflow.length||bad.length||s.territory){await t.screenshot({path:'output/playwright/workshop-tap/failure.png'});throw Error(label+JSON.stringify({overflow:s.overflow,bad,territory:s.territory}));}
  samples.push({label,page:s.page,stage:s.stage,canvasBytes:s.canvasBytes});if(shot)await t.screenshot({path:'output/playwright/workshop-tap/'+label+'.png'});
 }
 const cdp=await context.newCDPSession(t);
 // 触控只落在正式按钮，完成由生产施工会话触发。
 async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});}
 // 长按使用按钮中心的真实触摸坐标。
 async function holdStart(){const b=await t.locator('#ws-hold').boundingBox();await touch('touchStart',b.x+b.width/2,b.y+b.height/2);}
 // 等待替换结束且正式报价允许提交。
 async function ready(){await t.waitForFunction(()=>!document.getElementById('ws-hold').disabled);}
 await t.evaluate(()=>a.workshop.open('weapons',0));await check('cards-320',true);
 const original=await t.evaluate(()=>JSON.stringify(a.game.progress));
 await t.locator('[data-ws-upgrade="damage"]').tap();
 if(await t.locator('#ws-tool').isVisible())throw Error('武器仍需拖工具');
 if(!await t.locator('#ws-hold').isDisabled())throw Error('替换动画期间可施工');
 await ready();await check('preview-320',true);
 if(!await t.locator('#ws-upgrade-preview').isVisible())throw Error('未显示属性预览');
 if(await t.evaluate(()=>JSON.stringify(a.game.progress))!==original)throw Error('试装扣费');
 await holdStart();await t.waitForFunction(()=>parseFloat(document.getElementById('ws-hold').style.getPropertyValue('--work-progress'))>15);await touch('touchEnd');
 const paused=await t.locator('#ws-work-progress').textContent();await t.waitForTimeout(300);
 if(await t.locator('#ws-work-progress').textContent()!==paused||!paused.includes('暂停'))throw Error('松手未暂停');
 if(await t.evaluate(()=>JSON.stringify(a.game.progress))!==original)throw Error('暂停扣费');
 await check('paused-320',true);await holdStart();await t.waitForFunction(()=>a.game.progress.weapons[0]===2,null,{timeout:10000});await touch('touchEnd');
 const committed=await t.evaluate(()=>JSON.stringify(a.game.progress));await t.waitForTimeout(400);
 if(await t.evaluate(()=>JSON.stringify(a.game.progress))!==committed)throw Error('重复提交');await check('complete-320',true);
 await t.locator('#ws-change-part').tap();await t.locator('[data-ws-upgrade="rate"]').tap();await ready();await holdStart();await t.waitForTimeout(250);await touch('touchEnd');
 await t.locator('#ws-change-part').tap();await t.locator('[data-ws-upgrade="capacity"]').tap();await ready();
 if(await t.evaluate(()=>JSON.stringify(a.game.progress))!==committed)throw Error('切换部件扣费');
 if(await t.locator('#ws-hold').evaluate(n=>parseFloat(n.style.getPropertyValue('--work-progress')))!==0)throw Error('切换残留进度');
 await t.locator('#ws-part-before').tap();if(!await t.locator('#ws-hold').isDisabled())throw Error('旧件可施工');await t.locator('#ws-part-after').tap();await ready();
 await t.locator('#ws-close').tap();if(await t.locator('#workshop-dialog').isVisible())throw Error('关闭仍然拦截');await t.evaluate(()=>a.workshop.open('weapons',0));await t.locator('[data-ws-upgrade="capacity"]').tap();await ready();await check('reopen-320');
 await t.locator('#ws-test').tap();await t.waitForFunction(()=>document.getElementById('weapon-trial-title').textContent!=='准备演练场');if(await t.locator('#weapon-trial-dialog').getAttribute('data-error'))throw Error('演练失败');await t.locator('#weapon-trial-close').tap();await ready();
 await t.locator('#ws-change-part').tap();await t.emulateMedia({reducedMotion:'reduce'});await t.locator('[data-ws-upgrade="reload"]').focus();await t.keyboard.press('Enter');await ready();
 await t.locator('#ws-hold').focus();await t.keyboard.down('Space');await t.waitForFunction(()=>parseFloat(document.getElementById('ws-hold').style.getPropertyValue('--work-progress'))>10);await t.keyboard.up('Space');
 if(!(await t.locator('#ws-work-progress').textContent()).includes('暂停'))throw Error('键盘松开未暂停');
 await t.locator('#ws-change-part').tap();
 // 全部型号的每种部件均使用正式报价和属性，不以固定文案假造预览。
 const order=await t.evaluate(async()=>(await import('/src/config/weapons.js')).WEAPON_DISPLAY_ORDER);
 for(const i of order){
  await t.evaluate(i=>{a.game.progress.weapons[i]=1;a.workshop.open('weapons',i);},i);await check('cards-'+i);
  const keys=await t.locator('[data-ws-upgrade]').evaluateAll(nodes=>nodes.map(n=>n.dataset.wsUpgrade));
  for(const key of keys){await t.locator('[data-ws-upgrade="'+key+'"]').tap();await ready();await check('preview-'+i+'-'+key);await t.locator('#ws-change-part').tap();}
 }
 // 缺料保留预览与费用但禁用确认；满级卡片不可再次试装。
 await t.evaluate(()=>{a.game.progress.coins=a.game.progress.wood=0;for(const k of Object.keys(a.game.progress.materials))a.game.progress.materials[k]=0;a.workshop.open('weapons',1);});await t.locator('[data-ws-upgrade="damage"]').tap();
 if(!await t.locator('#ws-hold').isDisabled())throw Error('缺料仍可施工');await check('shortage-320',true);
 await t.evaluate(async()=>{const {equipmentParts}=await import('/src/config/equipment-parts.js');a.game.progress.weapons[0]=equipmentParts('weapons',0).find(p=>p.key==='damage').max;a.workshop.open('weapons',0);});
 if(!await t.locator('[data-ws-upgrade="damage"]').isDisabled())throw Error('满级未禁用');
 await t.evaluate(()=>{a.game.progress.weapons[0]=1;a.game.progress.coins=a.game.progress.wood=100000;for(const k of Object.keys(a.game.progress.materials))a.game.progress.materials[k]=999;});
 // 正式昼夜同屏及手机尺寸复核，宽屏继续使用既有手机容器。
 for(const [width,height] of [[320,568],[390,844],[430,932],[844,390],[1280,900]])for(const time of ['day','night']){
  await t.evaluate(()=>a.workshop.open('weapons',0));await t.locator('#ws-close').tap();await t.setViewportSize({width,height});
  await t.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.game.selectVehicle(0);a.game.summonVehicle();a.game.spawnEnemy(0,125);a.renderer.resize();a.refresh();a.renderer.draw();a.workshop.open('weapons',0);},time);
  await check('cards-'+width+'-'+time,true);await t.locator('[data-ws-upgrade="damage"]').tap();await ready();await check('preview-'+width+'-'+time,true);
 }
 // 载具与武器共用点选自动试装和长按确认。
 await t.setViewportSize({width:390,height:844});await t.evaluate(()=>a.workshop.open('vehicle',0));
 await t.locator('[data-ws-upgrade="armor"]').tap();await ready();
 if(await t.locator('#ws-tool').isVisible())throw Error('载具仍显示拖动工具');
 if(errors.length)throw Error(errors.join('\n'));await cdp.detach();await context.close();return {samples:samples.length,interaction:'点选、动画、长按暂停继续、单次结算、更换、缺料、满级、键盘、试射和载具通过',errors};
}
