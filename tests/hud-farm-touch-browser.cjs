// 手机真实触摸事件与连续视频验收，按住地面先看到预览，拖动不误开地。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/hud-farm/video',size:{width:390,height:844}}});
 const page=await context.newPage();let video;
 try {
  await page.goto(original.url());await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.lessonRewarded=true;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice(0,2);p.mainline.phase='doing';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];g.boss=null;g.vehicle.active=false;g.update=()=>{};Object.assign(g.player,{x:803.25,y:751.5,hp:g.maxHp()*.2});for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();
  });
  await page.waitForTimeout(2000);await page.locator('#mainline-hud').tap({position:{x:100,y:20}});
  if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled)!==false)throw Error('触屏任务条关闭失败');
  await page.locator('#mainline-hud').tap({position:{x:100,y:20}});
  if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled)!==true)throw Error('触屏任务条恢复失败');
  await page.locator('#field-menu-toggle').tap();await page.locator('#farm-menu').tap();await page.waitForTimeout(200);
  const target=await page.evaluate(async()=>{const {farmDigTarget}=await import('/src/world/farm-land.js'),v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();for(let y=260;y<r.height-180;y+=20)for(let x=50;x<r.width-90;x+=20){const p={x:v.x+x/r.width*v.w,y:v.y+y/r.height*v.h};if(!farmDigTarget(a.game,p,v).reason)return {x:r.x+x,y:r.y+y};}throw Error('未找到可开垦地面');});
  const client=await context.newCDPSession(page);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...target,id:1}]});await page.waitForTimeout(120);
  if(!await page.locator('#farm-placement').isVisible()||await page.locator('#farm-placement').getAttribute('data-valid')!=='true')throw Error('手指按下未出现绿色预览');
  await page.screenshot({path:'output/playwright/hud-farm/touch-preview.png'});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:target.x+65,y:target.y+50,id:1}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  if(await page.evaluate(()=>a.game.farmWork.queue.length))throw Error('触屏拖动误开垦');
  await page.touchscreen.tap(target.x,target.y);
  if(!await page.evaluate(()=>a.game.farmWork.queue.some(j=>j.action==='dig')))throw Error('触屏短按未开垦');
  await page.locator('#farm-exit').tap();if(await page.locator('#farm-placement').isVisible())throw Error('退出后预览残留');
  video=page.video();return {touchPreview:true,touchDrag:true,touchTap:true,taskToggle:true,video:await video.path()};
 } finally {await context.close();}
}
