// 保存成功反馈实机验收：真实触摸施工、回看、切换、减少动态与正式属性摘要。
async page=>{
  if(new URL(page.url()).port!=='4197')throw Error('仅允许隔离端口');
  await page.reload();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,p=(await import('/src/progression/progress.js')).freshProgress();p.coins=p.wood=100000;p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.mastery.fill(40);p.materials={parts:1000,core:1000,crystal:1000};a.game.progress=p;a.game.reset();a.game.state='ready';a.save();a.refresh();});
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  // 在真实控件坐标分发触摸，不直接提交升级。
  async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x,y}]});}
  // 从可见货架拖至画面中的真实连接点。
  async function drag(selector){await page.locator(selector).scrollIntoViewIfNeeded();const b=await page.locator(selector).boundingBox();await touch('touchStart',b.x+b.width/2,b.y+b.height/2);await touch('touchMove',b.x+b.width/2,b.y+b.height/2-12);const s=await page.locator('#ws-socket').boundingBox();await touch('touchMove',s.x+s.width/2,s.y+s.height/2);await touch('touchEnd');}
  const results=[];
  for(const [width,kind,index,part] of [[320,'weapons',0,'damage'],[390,'weapons',9,'rate'],[320,'vehicle',0,'armor'],[390,'turret',9,'range'],[1280,'vehicle',1,'engine']]) {
    const tag=`${width}-${kind}-${part}`;await page.setViewportSize({width,height:width===1280?960:844});
    await page.evaluate(async([kind,index])=>(await import('/src/main.js')).application.workshop.open(kind==='turret'?'vehicle':kind,kind==='turret'?2:index,kind==='turret'?index:undefined),[kind,index]);
    if(kind==='turret')await page.locator('#ws-turret-upgrade').click();
    await drag(`[data-ws-upgrade="${part}"]`);await page.waitForTimeout(1200);
    if(await page.locator('#ws-result').isVisible())throw Error('免费试装显示成功');
    const expected=await page.evaluate(async([kind,index,part])=>{const a=(await import('/src/main.js')).application,{workshopUpgrade,applyPartPreview}=await import('/src/progression/workshop/workshop.js'),{workshopResultChanges,formatWorkshopResult}=await import('/src/ui/workshop/results.js'),p=a.game.progress,plan=workshopUpgrade(p,kind,index,part,2),next=structuredClone(p);applyPartPreview(next,plan);return workshopResultChanges(p,next,plan,a.game.maxHp()).map(r=>[formatWorkshopResult(r.old),formatWorkshopResult(r.value)]);},[kind,index,part]);
    await drag('#ws-tool');const h=await page.locator('#ws-hold').boundingBox();
    await touch('touchStart',h.x+h.width/2,h.y+h.height/2);
    await page.waitForFunction(()=>document.getElementById('ws-bench').dataset.completionPhase==='retract');
    await page.screenshot({path:`output/playwright/workshop-completion/${tag}-retract.png`});
    await touch('touchEnd');await page.waitForTimeout(1300);
    if(await page.locator('#ws-bench').getAttribute('data-completion-phase')!=='settled')throw Error('工具未收回');
    const shown=await page.locator('#ws-result-fields>div').evaluateAll(nodes=>nodes.map(n=>[n.querySelector('b span').textContent,n.querySelector('strong').textContent]));
    if(JSON.stringify(shown)!==JSON.stringify(expected))throw Error('摘要与正式值不一致');
    const layout=await page.locator('#ws-result').evaluate(n=>{const b=n.getBoundingClientRect(),s=document.getElementById('ws-stage').getBoundingClientRect(),f=document.querySelector('.ws-checkout').getBoundingClientRect();return {top:b.top,bottom:b.bottom,stage:s.top,footer:f.top,overflow:[...n.querySelectorAll('b')].some(e=>e.scrollWidth>e.clientWidth+1)};});
    if(layout.stage<0||layout.bottom>layout.footer||layout.overflow)throw Error('结果不可读：'+JSON.stringify(layout));
    const pixels=await page.locator('#ws-construction').evaluate(c=>c.toDataURL());await page.keyboard.up('Space');await page.waitForTimeout(100);if(pixels!==await page.locator('#ws-construction').evaluate(c=>c.toDataURL()))throw Error('松键清除了高亮');
    await page.screenshot({path:`output/playwright/workshop-completion/${tag}-complete.png`});
    await page.locator('#ws-part-before').click();if(await page.locator('#ws-bench').getAttribute('data-completed')!=='false')throw Error('旧件误标');
    await page.locator('#ws-part-after').click();if(await page.locator('#ws-bench').getAttribute('data-completion-phase')!=='settled')throw Error('回看重播或丢失');
    const bytes=await page.locator('#workshop-dialog canvas').evaluateAll(ns=>ns.reduce((s,c)=>s+c.width*c.height*4,0));if(bytes>5*1024*1024)throw Error('画布超预算');
    results.push({tag,shown,layout,bytes});await page.locator('#ws-close').click();
  }
  // 减少动态直接呈现结果；切换后旧反馈不得重新覆盖新目标。
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:844});
  await page.evaluate(async()=>(await import('/src/main.js')).application.workshop.open('weapons',0));
  await drag('[data-ws-upgrade="rate"]');await drag('#ws-tool');const h=await page.locator('#ws-hold').boundingBox();
  await touch('touchStart',h.x+h.width/2,h.y+h.height/2);await page.waitForFunction(()=>document.getElementById('ws-bench').dataset.completionPhase==='settled');await touch('touchEnd');
  await page.screenshot({path:'output/playwright/workshop-completion/reduced-complete.png'});await page.waitForTimeout(400);
  await page.locator('[data-ws-mode="vehicle"]').click();await page.waitForTimeout(1400);if(await page.locator('#ws-result').isVisible()||await page.locator('#ws-bench').getAttribute('data-completed')==='true')throw Error('切换后残留');
  await page.locator('#ws-close').click();await page.emulateMedia({reducedMotion:'no-preference'});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
