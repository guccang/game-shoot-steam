// 正式详情的收拢端点、手动持留和减少动态，用真实手机入口及动画对象验收。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/clearing-panel-motion';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};
   p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(s=>s.id);p.restoration.cottageRested=true;
   g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=99999;
   Object.assign(g.player,(await import('/src/config/clearing.js')).CLEARING_APPROACH);
   const accepted=(await import('/src/core/story/clearing-guide.js')).acceptClearingPost(g);if(!accepted.ok)throw Error(accepted.message);
   Object.assign(g.player,g.progress.living.clearingSite,{invincible:999});
   g.update=()=>{};a.renderer.camera.time=null;a.refresh();window.track=document.getElementById('wave-track');window.detail=document.getElementById('wave-help-dialog');
   new MutationObserver(records=>{for(const r of records){if(r.attributeName==='open'&&detail.open)window.openAt=performance.now();if(r.attributeName==='data-collapsing'&&detail.dataset.collapsing==='true')window.collapseAt=performance.now();}}).observe(detail,{attributes:true,attributeFilter:['open','data-collapsing']});
   g.progress.living.clearingNotice='arrival';window.openAt=performance.now();a.refresh();
  });
  await page.locator('#wave-help-dialog').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>g.state),'paused');
  await page.screenshot({path:out+'/arrival.png'});
  for(const n of [3,2,1])await page.waitForFunction(n=>document.getElementById('clearing-notice-countdown').textContent.startsWith(n+'秒后'),n);
  await page.waitForFunction(()=>detail.dataset.collapsing==='true');
  const motion=await page.evaluate(()=>{
   const animation=detail.getAnimations()[0];animation.pause();animation.currentTime=220;
   const target=document.getElementById('wave-help').getBoundingClientRect(),frame=animation.effect.getKeyframes().at(-1),m=new DOMMatrix(frame.transform);
   // 还原未变换底板，计算最终中心与真实入口中心的误差。
   const now=animation.currentTime;animation.currentTime=0;const from=detail.getBoundingClientRect();animation.currentTime=now;
   return {elapsed:collapseAt-openAt,dx:from.x+from.width/2+m.e-(target.x+target.width/2),dy:from.y+from.height/2+m.f-(target.y+target.height/2),scale:m.a};
  });
  assert.ok(motion.elapsed>=2950&&motion.elapsed<3550,JSON.stringify(motion));assert.ok(Math.abs(motion.dx)<1&&Math.abs(motion.dy)<1&&motion.scale<.2,JSON.stringify(motion));
  await page.screenshot({path:out+'/collapsing.png'});await page.evaluate(()=>detail.getAnimations()[0].play());
  await page.locator('#wave-help-dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>g.state==='playing');
  await page.screenshot({path:out+'/icon.png'});await page.locator('#wave-help').tap();
  assert.ok(await page.evaluate(()=>document.getElementById('wave-help-dialog')===detail&&document.getElementById('wave-track')===track));
  await page.waitForTimeout(3200);assert.ok(await page.locator('#wave-help-dialog').isVisible());
  assert.ok(await page.locator('#clearing-notice-countdown').isHidden());
  await page.keyboard.press('Escape');await page.locator('#wave-help-dialog').waitFor({state:'hidden'});
  // 关闭中重复打开会取消上一轮回调，不会被旧动画再次关掉。
  await page.locator('#wave-help').tap();await page.locator('#wave-help-close').tap();
  await page.evaluate(()=>document.getElementById('wave-help').click());await page.waitForTimeout(550);assert.ok(await page.locator('#wave-help-dialog').isVisible());
  await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('Escape');await page.locator('#wave-help-dialog').waitFor({state:'hidden'});
  await page.locator('#wave-help').tap();assert.equal(await page.evaluate(()=>detail.getAnimations().length),0);
  await page.keyboard.press('Escape');await page.locator('#wave-help-dialog').waitFor({state:'hidden'});assert.deepEqual(errors,[]);
  return {designCriterion:'clearing-compact-hud',motion,samePanel:true,manualPersists:true,errors};
 }finally{await context.close();}
}
