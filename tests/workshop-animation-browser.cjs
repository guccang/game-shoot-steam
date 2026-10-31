// 实机施工清晰度验收：阶段动画、两类工具、局部/整件对比和保存后回看。
async page=>{
  if(new URL(page.url()).port!=='4197')throw Error('仅允许隔离端口');
  await page.reload();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,p=(await import('/src/progression/progress.js')).freshProgress();p.coins=p.wood=100000;p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.mastery.fill(40);p.materials={parts:1000,core:1000,crystal:1000};a.game.progress=p;a.game.reset();a.game.state='ready';a.save();a.refresh();});
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  // 真触摸事件沿可见工具/部件坐标移动，不直接调用提交接口。
  async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x,y}]});}
  // 起点与终点在同一视口，拖动后由正式事件创建试装。
  async function drag(selector){await page.locator(selector).scrollIntoViewIfNeeded();const b=await page.locator(selector).boundingBox();await touch('touchStart',b.x+b.width/2,b.y+b.height/2);await touch('touchMove',b.x+b.width/2,b.y+b.height/2-12);const s=await page.locator('#ws-socket').boundingBox();await touch('touchMove',s.x+s.width/2,s.y+s.height/2);await touch('touchEnd');}
  // 截图和画布哈希分别检查实际布局及前后配置是否一致。
  const hash=id=>page.locator(id).evaluate(c=>c.toDataURL());
  const results=[];
  for(const [width,kind,key,tool] of [[320,'weapons','rate','wrench'],[390,'weapons','damage','welder'],[320,'vehicle','armor','welder'],[1280,'vehicle','engine','wrench'],[390,'turret','range','welder']]){
    const tag=`${width}-${kind}-${key}`;await page.setViewportSize({width,height:width===1280?960:844});
    await page.evaluate(async kind=>(await import('/src/main.js')).application.workshop.open(kind==='turret'?'vehicle':kind,0,kind==='turret'?9:undefined),kind);
    if(kind==='turret')await page.locator('#ws-turret-upgrade').click();
    await drag(`[data-ws-upgrade="${key}"]`);await page.waitForTimeout(180);
    await page.screenshot({path:`output/playwright/workshop-animation/${tag}-remove.png`});
    await page.waitForTimeout(360);await page.screenshot({path:`output/playwright/workshop-animation/${tag}-insert.png`});
    await page.waitForFunction(()=>document.getElementById('ws-stage-label').textContent==='试装 · 未施工');
    const newImage=await hash('#ws-stage');
    if(await hash('#ws-part-before canvas')===await hash('#ws-part-after canvas'))throw Error('局部结构无差异');
    await page.locator('#ws-part-before').click();const oldImage=await hash('#ws-stage');if(oldImage===newImage)throw Error('整件前后未改变');
    if(!await page.locator('#ws-tool').isDisabled())throw Error('查看旧件仍可施工');
    await page.locator('#ws-part-after').click();await drag('#ws-tool');
    const h=await page.locator('#ws-hold').boundingBox(),b=await page.locator('#ws-stage').boundingBox();
    if(width<700&&(h.y+h.height>740||b.y<0||h.y<b.y+b.height+20))throw Error('手机无法同时看到施工和按住区');
    const balance=await page.evaluate(async()=>(await import('/src/main.js')).application.game.progress.coins);
    await touch('touchStart',h.x+h.width/2,h.y+h.height/2);await page.waitForTimeout(270);
    const first=await hash('#ws-construction');await page.screenshot({path:`output/playwright/workshop-animation/${tag}-${tool}-a.png`});
    await page.waitForTimeout(200);const next=await hash('#ws-construction');if(first===next)throw Error('工具动作无变化');
    await page.screenshot({path:`output/playwright/workshop-animation/${tag}-${tool}-b.png`});await touch('touchEnd');
    const paused=await page.locator('#ws-work-progress').textContent();if(!paused.includes('已暂停'))throw Error('松手未暂停');
    const pauseImage=await hash('#ws-construction');await page.waitForTimeout(100);if(pauseImage!==await hash('#ws-construction'))throw Error('暂停后姿势继续变化');
    await touch('touchStart',h.x+h.width/2,h.y+h.height/2);await page.waitForTimeout(1700);await touch('touchEnd');
    if(!(await page.locator('#ws-feedback').textContent()).includes('已保存'))throw Error('施工未完成');
    if(!(await page.locator('#ws-part-after').textContent()).includes('施工后'))throw Error('提交后丢失前后对照');
    await page.screenshot({path:`output/playwright/workshop-animation/${tag}-complete.png`});
    await page.locator('#ws-part-before').click();if(await hash('#ws-stage')!==oldImage)throw Error('保存后旧外观不正确');
    await page.locator('#ws-part-after').click();if(await hash('#ws-stage')!==newImage)throw Error('保存后新外观不正确');
    const bytes=await page.locator('#workshop-dialog canvas').evaluateAll(ns=>ns.reduce((sum,c)=>sum+c.width*c.height*4,0));if(bytes>5*1024*1024)throw Error('画布超预算');
    const after=await page.evaluate(async()=>(await import('/src/main.js')).application.game.progress.coins);if(after>=balance)throw Error('没有结算');
    results.push({tag,bytes,tool});await page.locator('#ws-close').click();
  }
  // 减少动态模式保留静态工具、可比较结构和进度，取消不提交。
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>(await import('/src/main.js')).application.workshop.open('weapons',0));
  await drag('[data-ws-upgrade="damage"]');await drag('#ws-tool');const h=await page.locator('#ws-hold').boundingBox();
  await touch('touchStart',h.x+h.width/2,h.y+h.height/2);await page.waitForTimeout(400);await page.screenshot({path:'output/playwright/workshop-animation/reduced.png'});await touch('touchCancel');
  await page.locator('[data-ws-mode="vehicle"]').click();if(await page.locator('#ws-part-compare').isVisible())throw Error('切换残留对照');
  await page.locator('#ws-close').click();await page.emulateMedia({reducedMotion:'no-preference'});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
