// 工坊任务专项：连续升级指引、演练返回及挂载真实交易。
async page=>{
 if(new URL(page.url()).port!=='4310')throw Error('仅允许隔离端口4310');
 for(const c of page.context().browser().contexts())if(c!==page.context())await c.close();
 const context=await page.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],samples=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4310');await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapons.fill(1);p.weapons[3]=0;p.weapon=0;p.mastery.fill(100);p.coins=p.wood=100000;p.vehicleHulls.fill(1);for(const k of Object.keys(p.materials))p.materials[k]=999;a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.enemies=[];a.refresh();a.workshop.open('weapons',3);});
 // 检查右侧无滚动、按钮可触达；左侧列表允许独立滑动。
 async function check(label,shot=false){
  await t.waitForTimeout(60);
  const s=await t.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopFocus(document));
  const size=t.viewportSize();
  const bad=s.controls.filter(c=>c.box.width<43.9||c.box.height<43.9||c.box.x<0||c.box.y<0||c.box.right>size.width+1||c.box.bottom>size.height+1);
  if(s.overflow.length||bad.length||s.territory){await t.screenshot({path:'output/playwright/vehicle-workshop-guide/failure.png'});throw Error(label+JSON.stringify({overflow:s.overflow,bad,territory:s.territory}));}
  samples.push({label,page:s.page,stage:s.stage,canvasBytes:s.canvasBytes});if(shot)await t.screenshot({path:'output/playwright/vehicle-workshop-guide/'+label+'.png'});
 }
 const cdp=await context.newCDPSession(t);
 // 设置当前任务前置状态，具体升级与挂载必须由可见按钮完成。
 async function task(id){await t.evaluate(async id=>{const ids=(await import('/src/config/mainline.js')).MAINLINE_IDS;a.game.progress.mainline.completed=ids.slice(0,ids.indexOf(id));a.game.progress.mainline.phase='doing';a.game.mainlineTalkDelay=999;a.game.mainlineSpeech=null;a.refresh();},id);}
 // 引导必须指向当前可见按钮，不能只改文字而留下旧ID。
 async function cue(selector){await t.waitForFunction(selector=>{const n=document.querySelector(selector);return n?.classList.contains('operation-source')&&n.getClientRects().length;},selector,{timeout:8000});}
 // 真实手指长按完成原子提交，记录当前存档只用于等待结果。
 async function finish(){await t.waitForFunction(()=>!document.getElementById('ws-hold').disabled);await cue('#ws-hold');const b=await t.locator('#ws-hold').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await t.waitForFunction(()=>!a.workshop.guideState().draft,null,{timeout:10000});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await t.evaluate(async()=>{const p=a.game.progress;p.vehicleHulls[0]=1;p.vehicleParts[0]={armor:1,engine:1};p.vehicleWeapons[0]=1;p.vehicleWeapons[17]=1;p.vehicleLoadouts[0]=0;p.mainline.seen.dismount=0;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(p,0);});
 await task('vehicle-service');await t.evaluate(()=>a.workshop.open('vehicle',0));await cue('[data-ws-upgrade="armor"]');await check('guide-armor',true);
 await t.locator('[data-ws-upgrade="engine"]').tap();await cue('#ws-change-part');await t.locator('#ws-change-part').tap();await cue('[data-ws-upgrade="armor"]');
 const before=await t.evaluate(()=>JSON.stringify(a.game.progress));await t.locator('[data-ws-upgrade="armor"]').tap();await cue('#ws-hold');
 if(await t.evaluate(()=>JSON.stringify(a.game.progress))!==before)throw Error('试装扣费');await finish();
 if(!await t.evaluate(()=>a.game.progress.vehicleHulls[0]===2))throw Error('车体升级失败');await cue('#ws-change-part');await t.locator('#ws-change-part').tap();await cue('[data-ws-upgrade="engine"]');await t.locator('[data-ws-upgrade="engine"]').tap();await finish();
 await cue('#ws-change-part');await t.locator('#ws-change-part').tap();await cue('#ws-native-turret');await t.locator('#ws-native-turret').tap();await cue('[data-ws-upgrade="damage"]');await check('guide-native',true);if(await t.locator('#ws-kits-tab').getAttribute('aria-pressed')!=='false')throw Error('主炮与挂载标签同时高亮');
 const handheld=await t.evaluate(()=>JSON.stringify(a.game.progress.weapons));await t.locator('[data-ws-upgrade="damage"]').tap();await finish();
 if(!await t.evaluate(handheld=>a.game.progress.vehicleWeapons[17]===2&&a.game.progress.vehicleLoadouts[0]===0&&JSON.stringify(a.game.progress.weapons)===handheld,handheld))throw Error('专属主炮升级污染挂载或手持');
 // 武器连续任务按真实步骤从弹仓切换供弹，再进入演练场。
 await t.evaluate(()=>{a.game.progress.weaponParts[0]={capacity:1,reload:1};a.game.progress.mainline.seen.trial=0;});await task('pistol-parts');await t.evaluate(()=>a.workshop.open('weapons',0));await cue('[data-ws-upgrade="capacity"]');await t.locator('[data-ws-upgrade="capacity"]').tap();await finish();
 await cue('#ws-change-part');await t.locator('#ws-change-part').tap();await cue('[data-ws-upgrade="reload"]');await t.locator('[data-ws-upgrade="reload"]').tap();await finish();await cue('#ws-test');await t.locator('#ws-test').tap();await cue('#weapon-trial-close');await check('guide-trial-return',true);await t.locator('#weapon-trial-close').tap();
 // 清除任务覆盖层后复核挂载付费与草稿取消，不把预览当成已拥有。
 await t.evaluate(async()=>{a.game.progress.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];a.game.progress.mainline.phase='complete';a.refresh();a.workshop.open('vehicle',0);});await t.locator('#ws-function-modify').tap();
 // 分页查找真实挂载卡片，避免测试依赖目录价格排序。
 async function mount(choice){while(!await t.locator(`[data-ws-part="${choice}"]`).count()){if(await t.locator('#ws-mount-next').isDisabled()){while(!await t.locator('#ws-mount-prev').isDisabled())await t.locator('#ws-mount-prev').tap();}else await t.locator('#ws-mount-next').tap();}await t.locator(`[data-ws-part="${choice}"]`).tap();}
 const coins=await t.evaluate(()=>a.game.progress.coins);await mount(1);await check('mount-buy-preview',true);if(await t.evaluate(()=>a.game.progress.coins)!==coins)throw Error('挂载预览扣费');await t.locator('#ws-confirm').tap();
 if(!await t.evaluate(coins=>a.game.progress.vehicleLoadouts[0]===1&&a.game.progress.vehicleWeapons[1]>0&&a.game.progress.coins<coins,coins))throw Error('购买并挂载失败');
 await t.locator('#ws-function-upgrade').tap();await t.locator('#ws-kits-tab').tap();if(!await t.evaluate(()=>a.workshop.guideState().turret===1))throw Error('武器部件未跟随当前挂载');
 // 已有武器免费挂载，取消换装不改变正式配置。
 await t.locator('#ws-function-modify').tap();await mount(0);const paid=await t.evaluate(()=>a.game.progress.coins);await t.locator('#ws-confirm').tap();if(!await t.evaluate(paid=>a.game.progress.vehicleLoadouts[0]===0&&a.game.progress.coins===paid,paid))throw Error('已有挂载重复收费');
 await mount(1);await t.locator('#ws-change-part').tap();if(!await t.evaluate(()=>a.game.progress.vehicleLoadouts[0]===0))throw Error('取消换装提交');
 if(errors.length)throw Error(errors.join('\n'));await cdp.detach();await context.close();return {samples:samples.length,transactions:'车体、引擎、专属主炮、武器连续升级与付费/免费挂载通过',guide:'真实任务连续控件及演练返回通过',errors};
}
