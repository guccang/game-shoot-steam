// 单屏武器工坊针对性回归：正式DOM、交易、草稿与手机触控施工。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('仅允许测试端口4175');
 const context=await page.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],samples=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4175');await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapons.fill(1);p.weapons[3]=0;p.weapon=0;p.mastery.fill(100);p.coins=p.wood=100000;p.vehicleHulls.fill(1);for(const k of Object.keys(p.materials))p.materials[k]=999;a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.enemies=[];a.refresh();a.workshop.open('weapons',3);});
 // 检查右侧无滚动、按钮可触达；左侧列表允许独立滑动。
 async function check(label,shot=false){
  await t.waitForTimeout(60);
  const s=await t.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopFocus(document));
  const size=t.viewportSize();
  const bad=s.controls.filter(c=>c.box.width<43.9||c.box.height<43.9||c.box.x<0||c.box.y<0||c.box.right>size.width+1||c.box.bottom>size.height+1);
  if(s.overflow.length||bad.length||s.territory){await t.screenshot({path:'output/playwright/workshop-layout/edge-failure.png'});throw Error(label+JSON.stringify({overflow:s.overflow,bad,territory:s.territory}));}
  samples.push({label,page:s.page,stage:s.stage,canvasBytes:s.canvasBytes});if(shot)await t.screenshot({path:'output/playwright/workshop-layout/'+label+'.png'});
 }
 // 长方案说明、特殊配置入口和施工草稿是额外的短屏边界。
 const order=await t.evaluate(async()=>(await import('/src/config/weapons.js')).WEAPON_DISPLAY_ORDER);
 for(const i of order){
  await t.evaluate(i=>{a.game.progress.weapons[i]=1;a.workshop.open('weapons',i);},i);
  await t.locator('[data-ws-upgrade="damage"]').tap();await t.waitForTimeout(1150);await check('edge-upgrade-'+i);
  await t.locator('#ws-function-modify').tap();
  for(const choice of [1,2]){await t.locator('[data-ws-part="'+choice+'"]').tap();await t.locator('#ws-socket').tap();await check('edge-modify-'+i+'-'+choice);await t.locator('#ws-change-part').tap();}
 }
 // 多项成长结果、关闭草稿后重开与短横屏改装也必须单屏完整。
 await t.evaluate(()=>a.workshop.open('weapons',16));await t.locator('[data-ws-upgrade="coordination"]').press('Enter');await t.waitForTimeout(1200);
 await t.locator('#ws-close').tap();if(await t.locator('#workshop-dialog').isVisible())throw Error('关闭仍然拦截');await t.evaluate(()=>a.workshop.open('weapons',16));await t.locator('[data-ws-upgrade="coordination"]').tap();await t.waitForTimeout(1200);
 await t.locator('#ws-hold').focus();await t.keyboard.down('Space');await t.waitForFunction(()=>!a.workshop.guideState().draft,null,{timeout:8000});await t.keyboard.up('Space');await check('coordination-complete',true);await t.locator('#ws-change-part').tap();await check('continue-upgrade',true);
 await t.setViewportSize({width:844,height:390});await t.evaluate(()=>a.workshop.open('weapons',16));await t.locator('#ws-function-modify').tap();await t.locator('[data-ws-part="2"]').tap();await t.locator('#ws-socket').tap();await check('landscape-modify-draft',true);
 if(errors.length)throw Error(errors.join('\n'));await context.close();return {designCriterion:'workshop-weapon-focus',edgeSamples:samples.length,errors};
}
