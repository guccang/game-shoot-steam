// 使用正式秘境目录校验原插画及有界重试，网络故障通过拦截真实图片请求复现。
async original=>{
 const context=await original.context().browser().newContext(),page=await context.newPage(),out='output/playwright/realm-art-paths/',checks=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));const attempts={rogue:0,tower:0,guardian:0};
 await page.route('**/assets/realms/*.webp*',route=>{const mode=/\/(rogue|tower|guardian)\.webp/.exec(route.request().url())?.[1];if(mode&&++attempts[mode]===1)return route.abort();return route.continue();});
 // 关闭教程而保留设施未修复状态，使用原按钮打开完整目录。
 async function start(){await page.goto(original.url());await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();g.progress.mainline.phase='complete';g.mainlineSpeech=null;g.state='playing';a.refresh();document.getElementById('realm-button').click();});}
 // 三张图片均应解析为完整768×512原图，不能仅凭IMG节点存在认为成功。
 async function loaded(){await page.waitForFunction(()=>[...document.querySelectorAll('img[data-realm-art]')].length===3&&[...document.querySelectorAll('img[data-realm-art]')].every(i=>i.complete&&i.naturalWidth===768&&i.naturalHeight===512));}
 try{
  await page.setViewportSize({width:390,height:844});await start();await loaded();
  if(Object.values(attempts).some(n=>n!==2))throw Error('一次失败未按上限恢复 '+JSON.stringify(attempts));checks.push({case:'首次失败自动恢复',attempts:{...attempts}});
  for(const [width,height,night] of [[320,568,false],[390,844,true],[900,1280,false]]){
   await page.setViewportSize({width,height});await page.evaluate(async night=>{Object.assign(a.environment,{time:night?'night':'day',autoTime:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();},night);
   for(const mode of ['rogue','tower','guardian']){const img=page.locator(`img[data-realm-art="${mode}"]`);await img.scrollIntoViewIfNeeded();const size=await img.evaluate(n=>({width:n.naturalWidth,height:n.naturalHeight,box:n.getBoundingClientRect().width}));if(size.box>width||size.width!==768)throw Error('插画尺寸异常');await page.screenshot({path:out+width+'-'+(night?'night':'day')+'-'+mode+'.png'});checks.push({case:'原图显示',mode,width,night,...size});}
  }
  // 解锁变化会重绘卡片，重新生成的图片也必须加载真实资源。
  await page.evaluate(async()=>{a.game.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);a.refresh();});await loaded();checks.push({case:'设施解锁后插画保留'});
  await page.unroute('**/assets/realms/*.webp*');let failures=0;
  await page.route('**/assets/realms/guardian.webp*',route=>{failures++;return route.abort();});await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  await page.waitForFunction(()=>{const n=document.querySelector('img[data-realm-art=guardian]');return n?.complete&&n.dataset.artRetried&&n.naturalWidth===0;});
  const limit=failures;await page.waitForTimeout(400);if(failures!==limit||limit!==2)throw Error('持续失败发生重复请求 '+failures);checks.push({case:'持续失败请求有界',requests:limit});
  await page.unroute('**/assets/realms/guardian.webp*');await page.evaluate(()=>{a.game.state='playing';a.game.mainlineSpeech=null;a.refresh();document.getElementById('realm-button').click();});await loaded();checks.push({case:'网络恢复后重新打开成功'});
  if(errors.length)throw Error(errors.join('\n'));return {ok:true,checks,errors};
 }finally{await context.close();}
}
