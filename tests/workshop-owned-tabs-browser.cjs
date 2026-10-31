// 隔离手机触屏验收：货架归属、真实购买、草稿切页、空状态及载具不受影响。
async page=>{
 if(new URL(page.url()).port!=='4296')throw Error('仅允许隔离端口4296');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],checks=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4296');await t.locator('#start').tap();
 await t.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const p=(await import('/src/progression/progress.js')).freshProgress();p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  p.weapons.fill(0);p.weapons[0]=3;p.weapons[14]=1;p.weapon=0;p.coins=p.wood=100000;p.mastery.fill(100);p.vehicleHulls.fill(1);p.vehicleHulls[2]=0;for(const k of Object.keys(p.materials))p.materials[k]=10000;
  a.game.progress=p;a.game.reset();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.enemies=[];a.refresh();
 });
 await t.waitForFunction(()=>a.menu.page==='game');
 // 从正式DOM比较目录与拥有状态，同时保证选中项属于当前页签。
 async function checkShelf(tab){
  await t.locator('#ws-function-'+tab).tap();
  const s=await t.evaluate(async tab=>{
   const order=(await import('/src/config/weapons.js')).WEAPON_DISPLAY_ORDER,p=a.game.progress;
   return {actual:[...document.querySelectorAll('[data-ws-item]')].map(b=>Number(b.dataset.wsItem)),expected:order.filter(i=>(p.weapons[i]>0)===(tab!=='buy')),selected:[...document.querySelectorAll('[data-ws-item][aria-pressed="true"]')].map(b=>Number(b.dataset.wsItem)),index:a.workshop.guideState().index,empty:!document.getElementById('ws-empty-catalog').hidden,overflow:document.documentElement.scrollWidth>innerWidth};
  },tab);
  const selectionValid=s.actual.length?s.selected.length===1&&s.actual.includes(s.index):s.empty&&s.selected.length===0&&s.index===null;
  if(JSON.stringify(s.actual)!==JSON.stringify(s.expected)||s.overflow||!selectionValid)throw Error('货架状态错误 '+tab+' '+JSON.stringify(s));
  checks.push(tab+':'+s.actual.length);return s;
 }
 await t.evaluate(()=>a.workshop.open('weapons',3));
 for(const tab of ['buy','upgrade','modify','unlock'])await checkShelf(tab);
 const before=await t.evaluate(()=>JSON.stringify(a.game.progress));
 await checkShelf('upgrade');await t.locator('[data-ws-upgrade="damage"]').tap();await t.locator('#ws-socket').tap();
 await checkShelf('buy');if(await t.evaluate(()=>JSON.stringify(a.game.progress))!==before||await t.locator('#ws-discard').isVisible())throw Error('切页未清理草稿或错误扣费');
 await t.evaluate(()=>a.workshop.open('weapons',3));const coins=await t.evaluate(()=>a.game.progress.coins);await t.locator('#ws-purchase').tap();
 if(!await t.evaluate(coins=>a.game.progress.weapons[3]===1&&a.game.progress.coins<coins,coins))throw Error('真实购买失败');
 await checkShelf('buy');if(await t.locator('[data-ws-item="3"]').count())throw Error('购买后仍留在购买目录');
 for(const tab of ['upgrade','modify','unlock']){await checkShelf(tab);if(!await t.locator('[data-ws-item="3"]').count())throw Error('新购武器未进入已有目录');}
 for(const [width,height] of [[320,568],[390,844],[844,390]]){
  await t.setViewportSize({width,height});
  for(const tab of ['buy','upgrade','modify','unlock']){await checkShelf(tab);await t.screenshot({path:'output/playwright/workshop-owned-tabs/'+tab+'-'+width+'.png'});}
 }
 // 买齐最后一把后保持购买页空状态，隐藏全部旧装备操作并可直接切换升级。
 await t.setViewportSize({width:320,height:568});await t.evaluate(()=>{a.game.progress.weapons.fill(1);a.game.progress.weapons[3]=0;a.workshop.open('weapons',3);});
 await t.locator('#ws-purchase').tap();await checkShelf('buy');
 if(await t.locator('.ws-center').isVisible()||await t.locator('.ws-footer').isVisible()||await t.locator('.ws-parts').isVisible())throw Error('空货架残留旧操作');
 await t.screenshot({path:'output/playwright/workshop-owned-tabs/all-owned.png'});await t.locator('#ws-empty-action').tap();await checkShelf('upgrade');
 // 零武器边界不留下无效详情，键盘页签也能进入正确目录。
 await t.evaluate(()=>{a.game.progress.weapons.fill(0);a.workshop.open('weapons',0);});
 for(const tab of ['upgrade','modify','unlock'])await checkShelf(tab);
 await t.screenshot({path:'output/playwright/workshop-owned-tabs/none-owned.png'});await t.locator('#ws-empty-action').tap();await checkShelf('buy');
 await t.locator('#ws-function-buy').press('ArrowRight');if(await t.locator('#workshop-dialog').getAttribute('data-function')!=='upgrade')throw Error('键盘页签失效');
 await t.evaluate(()=>a.workshop.open('vehicle',2));
 for(const tab of ['buy','upgrade','modify','unlock']){
  await t.locator('#ws-function-'+tab).tap();
  if(!await t.evaluate(async()=>JSON.stringify([...document.querySelectorAll('[data-ws-item]')].map(b=>Number(b.dataset.wsItem)))===JSON.stringify((await import('/src/config/vehicles.js')).VEHICLE_DISPLAY_ORDER)))throw Error('载具目录被错误筛选');
 }
 if(errors.length)throw Error(errors.join('\n'));await context.close();await page.evaluate(r=>window.workshopOwnedResult=r,{checks,errors});
}
