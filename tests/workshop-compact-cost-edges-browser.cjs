// 紧凑费用区专项：正式报价、触控、费用聚合与手机布局。
async page=>{
 if(new URL(page.url()).port!=='4309')throw Error('仅允许隔离端口4309');
 for(const c of page.context().browser().contexts())if(c!==page.context())await c.close();
 const context=await page.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],samples=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4309');await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapons.fill(1);p.weapons[3]=0;p.weapon=0;p.mastery.fill(100);p.coins=p.wood=100000;p.vehicleHulls.fill(1);for(const k of Object.keys(p.materials))p.materials[k]=999;a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.enemies=[];a.refresh();a.workshop.open('weapons',3);});
 // 检查右侧无滚动、按钮可触达；左侧列表允许独立滑动。
 async function check(label,shot=false){
  await t.waitForTimeout(60);
  const s=await t.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopFocus(document));
  const size=t.viewportSize();
  const bad=s.controls.filter(c=>c.box.width<43.9||c.box.height<43.9||c.box.x<0||c.box.y<0||c.box.right>size.width+1||c.box.bottom>size.height+1);
  if(s.overflow.length||bad.length||s.territory){await t.screenshot({path:'output/playwright/workshop-compact-cost/failure.png'});throw Error(label+JSON.stringify({overflow:s.overflow,bad,territory:s.territory}));}
  samples.push({label,page:s.page,stage:s.stage,canvasBytes:s.canvasBytes});if(shot)await t.screenshot({path:'output/playwright/workshop-compact-cost/'+label+'.png'});
 }
 await t.emulateMedia({reducedMotion:'reduce'});
 await t.evaluate(()=>{a.game.progress.weapons[0]=19;a.workshop.open('weapons',0);});await t.locator('[data-ws-upgrade="damage"]').tap();await check('high-price',true);
 await t.evaluate(()=>{a.game.progress.coins=a.game.progress.wood=0;a.workshop.render();});await check('high-shortage',true);
 // 多材料仅作为排版夹具：复用购买页的真实报价DOM，不改变升级规则或提交交易。
 const materialHtml=await t.evaluate(()=>{a.game.progress.weapons[16]=0;a.workshop.open('weapons',16);return document.getElementById('ws-resources').innerHTML;});
 await t.evaluate(html=>{a.workshop.open('weapons',0);window.materialHtml=html;},materialHtml);await t.locator('[data-ws-upgrade="damage"]').tap();await t.evaluate(()=>{document.getElementById('ws-resources').innerHTML=window.materialHtml;});await check('five-material-layout',true);
 const count=await t.locator('#ws-resources > *').count();if(count!==5)throw Error('五材料夹具无效');
 if(errors.length)throw Error(errors.join('\n'));await context.close();return {samples:samples.length,materials:count,errors};
}
