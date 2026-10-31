// 载具工坊专项：正式车型目录、购买、升级、挂载和成长单屏检查。
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
 await t.emulateMedia({reducedMotion:'reduce'});
 await t.evaluate(async()=>{const {grantVehicleArmament}=await import('/src/config/vehicle-armaments.js');for(let i=0;i<a.game.progress.vehicleHulls.length;i++)grantVehicleArmament(a.game.progress,i);});
 const order=await t.evaluate(async()=>(await import('/src/config/vehicles.js')).VEHICLE_DISPLAY_ORDER);
 for(const i of order){
  await t.evaluate(i=>{a.game.progress.vehicleHulls[i]=0;a.workshop.open('vehicle',i);},i);await check('buy-'+i,true);
  await t.evaluate(async i=>{a.game.progress.vehicleHulls[i]=1;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(a.game.progress,i);a.workshop.open('vehicle',i);},i);await check('upgrade-'+i,true);
  await t.locator('[data-ws-upgrade="armor"]').tap();await check('armor-preview-'+i,true);await t.locator('#ws-change-part').tap();
  if(await t.locator('#ws-kits-tab').isVisible()){await t.locator('#ws-kits-tab').tap();await check('turret-'+i,true);await t.locator('[data-ws-upgrade="damage"]').tap();await check('turret-preview-'+i,true);}
  await t.locator('#ws-function-modify').tap();await check('mount-'+i,true);
  if(await t.locator('#ws-mount-next').isVisible()){await t.locator('#ws-mount-next').tap();await check('mount-next-'+i);await t.locator('[data-ws-part]').first().tap();await check('mount-preview-'+i,true);}
  await t.locator('#ws-function-unlock').tap();await check('growth-'+i,true);
 }
 for(const [width,height] of [[390,844],[430,932],[844,390],[1280,900]]){
  await t.setViewportSize({width,height});await t.evaluate(()=>a.workshop.open('vehicle',1));await check('upgrade-'+width,true);await t.locator('[data-ws-upgrade="engine"]').tap();await check('engine-'+width,true);await t.locator('#ws-function-modify').tap();await check('mount-'+width,true);
 }
 if(errors.length)throw Error(errors.join('\n'));await context.close();return {samples:samples.length,errors};
}
