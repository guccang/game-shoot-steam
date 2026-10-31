// 隔离端口验证固定首页、自动续档和设置内清档，所有操作经过正式应用。
async(page)=>{
  if(new URL(page.url()).port!=='4187')throw Error('仅允许隔离端口4187');
  const checks=[],samples=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  // 重挂载仅替换测试端口的存储适配器，禁止触及日常游戏存档。
  async function mount(raw=null,mode='normal'){
    await page.evaluate(async({raw,mode})=>{
      (window.menuApp||(await import('/src/main.js')).application).destroy();localStorage.clear();
      localStorage.setItem('forest-patrol-world-revision','forest-threefold-2026-10');
      if(raw!==null)localStorage.setItem('forest-patrol-v1',typeof raw==='string'?raw:JSON.stringify(raw));
      const {createApplication}=await import('/src/app/create-app.js');
      window.menuApp=createApplication({getStorage:()=>{if(mode==='denied')throw Error('blocked');return {getItem:k=>localStorage.getItem(k),removeItem:k=>localStorage.removeItem(k),setItem:(k,v)=>{if(mode==='quota'&&k==='forest-patrol-v1')throw Error('quota');localStorage.setItem(k,v);}};}});
    },{raw,mode});
  }
  // 断言读取正式状态；按钮位置同时覆盖文字、颜色和几何尺寸。
  async function check(name,fn){if(!await page.evaluate(fn))throw Error(name);checks.push(name);}
  async function layout(){return page.evaluate(()=>['title-name','start','.title-footer'].map(id=>{const n=id[0]==='.'?document.querySelector(id):document.getElementById(id),r=n.getBoundingClientRect();return {id,text:n.textContent,x:r.x,y:r.y,width:r.width,height:r.height};}));}
  async function same(name,before){if(JSON.stringify(await layout())!==JSON.stringify(before))throw Error(name);checks.push(name);}
  async function start(){await page.locator('#start').click();await page.waitForFunction(()=>menuApp.menu.page==='game');}
  await mount();await page.evaluate(()=>document.fonts.ready);const baseline=await layout();
  await check('首页只有一个开始且无加载提示',()=>document.querySelectorAll('.title-actions > button').length===1&&document.getElementById('start').textContent==='开始游戏'&&!document.getElementById('title-new')&&!document.body.textContent.includes('背景视频加载中')&&!document.querySelector('.title-local'));
  await check('无存档首页不提前写档',()=>localStorage.getItem('forest-patrol-v1')===null&&menuApp.menu.page==='title');
  const saved=await page.evaluate(async()=>{const p=(await import('/src/progression/progress.js')).freshProgress();p.coins=2468;return p;});
  await mount(saved);await same('有档与无档首页布局一致',baseline);
  // 同步捕获首次建图前的忙碌态，避免等待下一帧后错过禁用状态。
  const loading=await page.evaluate(()=>{const n=document.getElementById('start'),before=getComputedStyle(n).backgroundColor;n.click();return {text:n.textContent,hidden:getComputedStyle(n).visibility==='hidden',disabled:n.disabled,busy:n.getAttribute('aria-busy'),before,after:getComputedStyle(n).backgroundColor,box:n.getBoundingClientRect().toJSON()};});
  if(!loading.hidden||loading.text!=='开始游戏'||!loading.disabled||loading.busy!=='true'||loading.before!==loading.after||loading.box.y!==baseline[1].y)throw Error('建图期间入口不稳定');checks.push('建图期间首页按钮隐藏且禁止重复进入');
  await page.waitForFunction(()=>menuApp.menu.page==='game');
  await check('有档点击直接继续成长',()=>menuApp.game.progress.coins===2468&&menuApp.menu.page==='game'&&!document.getElementById('start-game-dialog'));
  await page.evaluate(()=>menuApp.menu.home());await same('返回首页文案和布局一致',baseline);
  await page.locator('#title-settings').click();await page.locator('#reset-progress').click();
  await check('清档确认默认焦点为取消',()=>document.activeElement.id==='cancel-reset');
  await page.locator('#cancel-reset').click();await check('取消保留存档',()=>menuApp.game.progress.coins===2468&&JSON.parse(localStorage.getItem('forest-patrol-v1')).coins===2468);
  await page.locator('#reset-progress').click();await page.locator('#confirm-reset').click();
  await check('清档成功回首页等待开始',()=>menuApp.menu.page==='title'&&!document.getElementById('settings-dialog').open&&menuApp.game.progress.coins!==2468&&menuApp.game.state==='ready');
  await same('清档后首页布局一致',baseline);await start();await check('清档后开始新入职',()=>!!menuApp.game.arrivalPending);
  await mount(saved,'quota');const raw=await page.evaluate(()=>localStorage.getItem('forest-patrol-v1'));
  await page.locator('#title-settings').click();await page.locator('#reset-progress').click();await page.locator('#confirm-reset').click();
  await check('写入失败保留确认和内存',()=>document.getElementById('settings-dialog').open&&!document.getElementById('reset-error').hidden&&menuApp.game.progress.coins===2468);
  if(await page.evaluate(()=>localStorage.getItem('forest-patrol-v1'))!==raw)throw Error('写入失败破坏原存档');checks.push('写入失败保留原存档');
  await page.locator('#cancel-reset').click();await page.locator('#settings-done').click();
  await mount('{broken');await same('损坏存档提示不移动首页',baseline);
  await check('损坏存档保留原文和固定按钮',()=>document.getElementById('start').disabled&&localStorage.getItem('forest-patrol-v1')==='{broken');
  await page.locator('#title-settings').click();await page.locator('#reset-progress').click();await page.locator('#confirm-reset').click();await check('损坏存档可通过设置清空',()=>!document.getElementById('start').disabled);
  await mount(null,'denied');await same('无存储权限也保持固定首页',baseline);await start();await check('无权限仍可开始临时游玩',()=>localStorage.getItem('forest-patrol-v1')===null);
  await mount();
  for(const [width,height] of [[320,568],[390,844],[430,932],[844,390]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);
    const before=await layout();await page.evaluate(()=>document.getElementById('title-video').dispatchEvent(new Event('error')));await same(`视频失败不移动首页${width}`,before);
    await page.screenshot({path:`output/playwright/stable-title-start/error-${width}.png`});
    await page.locator('#title-video-play').click();await same(`视频重试不移动首页${width}`,before);
    await page.emulateMedia({reducedMotion:'reduce'});await same(`减少动态不移动首页${width}`,before);
    await page.screenshot({path:`output/playwright/stable-title-start/home-${width}.png`});
    await page.locator('#title-settings').click();await page.locator('#reset-progress').scrollIntoViewIfNeeded();
    await page.screenshot({path:`output/playwright/stable-title-start/settings-${width}.png`});
    await page.locator('#reset-progress').click();await page.screenshot({path:`output/playwright/stable-title-start/confirm-${width}.png`});
    await check(`确认页手机无横向溢出${width}`,()=>document.getElementById('settings-dialog').scrollWidth<=document.getElementById('settings-dialog').clientWidth+1);
    await page.locator('#cancel-reset').click();await page.locator('#settings-done').click();await page.emulateMedia({reducedMotion:'no-preference'});samples.push({width,height,layout:before});
  }
  if(errors.length)throw Error(errors.join('\n'));
  const report={passed:true,checks,samples,errors};await page.evaluate(report=>{window.titleStabilityReport=report;},report);return report;
}
