// 猫爪指引实机验收：复现选错部件后的更换按钮，检查短屏、穿透和长按施工。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 let phase='setup';try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();await page.waitForFunction(()=>document.getElementById('game-frame').dataset.page==='game');
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS,MAINLINE_SITES}=await import('/src/config/mainline.js'),p=freshProgress(),g=a.game;p.arrival=null;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.coins=p.wood=100000;p.materials={parts:10000,crystal:10000,core:10000};p.weapons[0]=1;p.weapon=0;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('pistol-upgrade'));p.mainline.phase='doing';g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=99999;g.enemies=[];g.player.invincible=99999;Object.assign(g.player,MAINLINE_SITES.weapons);for(const d of document.querySelectorAll('dialog[open]'))d.close();a.refresh();a.workshop.open('weapons',0);
  });await page.waitForFunction(()=>document.getElementById('operation-guide')?.dataset.stage==='part');
  await page.locator('[data-ws-upgrade="capacity"]').tap();await page.waitForFunction(()=>document.getElementById('operation-guide')?.dataset.stage==='other-draft');
  for(const [width,height] of [[320,568],[390,844],[844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(550);
   // 读取正式覆盖层和目标，猫爪与说明都不得离屏或互相盖住。
   const state=await page.evaluate(async()=>{
    const s=(await import('/src/rendering/visual-review.js')).inspectOperationGuide(document),paw=document.querySelector('.operation-paw'),art=paw.querySelector('svg'),source=document.querySelector('.operation-source'),r=source.getBoundingClientRect(),t=document.querySelector('.operation-tip').getBoundingClientRect(),p=paw.getBoundingClientRect();
    return {...s,sourceId:source.id,tipOverlap:p.left<t.right&&p.right>t.left&&p.top<t.bottom&&p.bottom>t.top,artBox:art.getBoundingClientRect().toJSON(),animation:getComputedStyle(art).animationName,clickable:source.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};
   });
   if(!state.visible||!state.paw?.contained||!state.tip?.contained||state.tipOverlap||!state.clickable||!state.pointerThrough||state.sourceId!=='ws-change-part'||state.animation!=='operation-paw-tap')throw Error(JSON.stringify(state));samples.push({width,height,...state});
   for(const time of ['day','night']){await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.refresh();},time);await page.screenshot({path:`output/playwright/guide-cat-paw/change-${width}-${time}.png`});}
  }
  phase='change-back';await page.setViewportSize({width:390,height:844});await page.locator('#ws-change-part').tap();await page.waitForFunction(()=>document.getElementById('operation-guide')?.dataset.stage==='part');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);if(!await page.locator('.operation-paw').isVisible()||await page.locator('.operation-paw svg').evaluate(n=>getComputedStyle(n).animationName!=='none'))throw Error('减少动态未保留静态猫爪');
  phase='choose-damage';await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-ws-upgrade="damage"]').tap();await page.waitForFunction(()=>document.getElementById('operation-guide')?.dataset.stage==='hold'&&!document.getElementById('ws-hold').disabled);
  phase='hold';const cdp=await context.newCDPSession(page),r=await page.locator('#ws-hold').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]});await page.waitForTimeout(180);
  if(await page.locator('.operation-paw').isVisible())throw Error('施工期间猫爪未收起');
  await page.waitForFunction(()=>a.game.progress.weapons[0]===2,null,{timeout:7000});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  phase='next-step';await page.waitForFunction(()=>['hold','continue'].includes(document.getElementById('operation-guide')?.dataset.stage)&&!document.querySelector('.operation-paw').hidden&&!a.workshop.guideState().tool.pointer);await page.screenshot({path:'output/playwright/guide-cat-paw/next-step.png'});
  await page.locator('#ws-close').tap();await page.waitForTimeout(120);if(await page.locator('#workshop-dialog #operation-guide').isVisible())throw Error('关闭工坊后残留旧猫爪');
  if(errors.length)throw Error(errors.join('\n'));return {passed:true,samples,clickThrough:true,holdCompletes:true,reducedMotion:true,cleanup:true,errors};
 }catch(error){const state=await page.evaluate(()=>({stage:document.getElementById('operation-guide')?.dataset.stage,source:document.querySelector('.operation-source')?.id,workshop:window.a?.workshop.guideState(),dialogs:[...document.querySelectorAll('dialog[open]')].map(n=>n.id)}));throw Error(phase+': '+error.message+' '+JSON.stringify(state));}finally{await context.close();}
}
