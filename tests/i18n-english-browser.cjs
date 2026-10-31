// 正式英文包浏览器验收；隔离端口 4198，使用 Playwright CLI 的 run-code 执行。
async (page) => {
  if (new URL(page.url()).port !== '4198') throw Error('Use the isolated test server on port 4198');
  const errors=[], checks=[], overflow=[];
  page.on('pageerror', error=>errors.push(error.message));
  // 等待真实资源及语言表加载，不拦截或替换生产响应。
  async function ready() { await page.evaluate(async()=>{const {application:a}=await import('/src/main.js');await a.ready;}); }
  // 检查可见文本、读屏名称及弹窗宽度，并保存可供人工复核的截图。
  async function capture(name, selector='body') {
    if(!await page.locator(selector).isVisible())throw Error(name+': panel is not visible');
    const findings=await page.locator(selector).evaluate(root=>{
      const visible=[root,...root.querySelectorAll('*')].filter(el=>el.getClientRects().length && getComputedStyle(el).visibility!=='hidden');
      const text=[root.innerText,...visible.flatMap(el=>['aria-label','title','placeholder'].map(a=>el.getAttribute(a)||''))].join('\n');
      const clipped=visible.filter(el=>el.children.length===0 && el.textContent.trim() && el.clientWidth>0 && el.scrollWidth>el.clientWidth+3)
        .map(el=>({id:el.id||el.className,text:el.textContent.trim().slice(0,100),width:el.clientWidth,scroll:el.scrollWidth}));
      return {han:/\p{Script=Han}/u.test(text),params:/\{(?:p\d+|companion|group)\}/.test(text),clipped,
        outside:root.tagName==='DIALOG' && (root.getBoundingClientRect().left<0 || root.getBoundingClientRect().right>innerWidth+1)};
    });
    if(findings.han||findings.params||findings.outside)throw Error(name+': '+JSON.stringify(findings));
    overflow.push({name,clipped:findings.clipped});
    await page.screenshot({path:`output/playwright/en-${name}.png`});checks.push(name);
  }
  // 点击手机折叠菜单中的入口前，确保入口可见。
  async function menu(selector) {
    if(!await page.locator(selector).isVisible())await page.locator('#field-menu-toggle').click();
    await page.locator(selector).click();
  }
  await page.goto('http://localhost:4198/?lang=en-US');await ready();
  await page.evaluate(async()=>{const {application:a}=await import('/src/main.js');a.destroy();localStorage.removeItem('forest-patrol-v1');});
  await page.reload();await ready();
  for(const [width,height]of [[1280,900],[390,844]]){
    await page.setViewportSize({width,height});
    if(await page.locator('#title-name').textContent()!=='Forest Patrol')throw Error('English title missing');
    await capture(`${width}-title`);
  }
  await page.setViewportSize({width:1280,height:900});await page.locator('#start').click();
  // 使用游戏已有调试按钮准备全装备测试存档，方便复核最长名称与特殊模块面板。
  await page.locator('#settings-button').click();await page.locator('#settings-advanced > summary').click();
  await page.locator('#debug-toggle').click();await page.locator('#unlock-weapons').click();
  await page.locator('#unlock-vehicles').click();await page.locator('#grant-resources').click();
  await capture('debug','#settings-dialog');await page.locator('#close-settings').click();
  for(const [width,height]of [[1280,900],[390,844]]){
    await page.setViewportSize({width,height});
    for(const time of ['day','night']){
      await page.evaluate(async time=>{const {application:a}=await import('/src/main.js');
        const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
        a.environment.autoTime=false;a.environment.autoWeather=false;a.environment.time=time;a.environment.weather='sun';
        a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.refresh();},time);
      await page.waitForTimeout(150);await capture(`${width}-${time}`);
    }
    await page.locator('#settings-button').click();await capture(`${width}-settings`,'#settings-dialog');
    for(const [button,dialog,close,name]of [['#help','#help-dialog','#close-help','help'],['#environment-button','#environment-dialog','#close-environment','environment'],['#chronicle-button','#chronicle-dialog','#close-chronicle','chronicle']]){
      await page.locator(button).click();await capture(`${width}-${name}`,dialog);await page.locator(close).click();
    }
    await page.locator('#close-settings').click();
    await menu('#weapons-button');await capture(`${width}-workshop`,'#workshop-dialog');
    await page.locator('[data-ws-item="12"]').click();await page.locator('#ws-funnel').click();
    await capture(`${width}-funnels`,'#funnel-dialog');await page.locator('#close-funnel').click();
    for(const [kind,index] of [['mechanical',15],['spider',16]]){
      await page.locator(`[data-ws-item="${index}"]`).click();await page.locator(`#ws-${kind}`).click();
      await capture(`${width}-${kind}`,`#${kind}-dialog`);await page.locator(`#close-${kind}`).click();
    }
    await page.locator('#ws-close').click();
    await menu('#heroes-button');await capture(`${width}-heroes`,'#camp-dialog');
    await page.locator('#tab-weapons').click();await capture(`${width}-inventory-workshop`,'#workshop-dialog');
    await page.locator('#ws-close').click();
    await menu('#vehicles-button');await page.locator('[data-ws-item="4"]').click();
    await capture(`${width}-vehicles`,'#workshop-dialog');await page.locator('[data-ws-item="3"]').click();
    await capture(`${width}-hovercraft`,'#workshop-dialog');await page.locator('#ws-close').click();
    await menu('#map-button');await capture(`${width}-map`,'#map-dialog');await page.locator('#close-map').click();
    await menu('#story-button');await capture(`${width}-story`,'#story-dialog');
    await page.locator('[data-story-help="chapter"]').first().click();await capture(`${width}-story-help`,'#story-help-dialog');
    await page.locator('#story-help-close').click();await page.locator('#story-close').click();
    await menu('#realm-button');await capture(`${width}-realms`,'#realm-dialog');
    await page.locator('#realm-help').click();await capture(`${width}-realm-help`,'#realm-help-dialog');
    await page.locator('#close-realm-help').click();await page.locator('#close-realm').click();
    if(await page.locator('#fire-notice [data-fire-open]').isVisible()){await page.locator('#fire-notice [data-fire-open]').click();}else{if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#realm-button').click();await page.locator('[data-enter-realm="fire"]').click();}await capture(`${width}-fire`,'#fire-dialog');await page.locator('[data-fire-close]').first().click();
  }
  // 通过首页刷新切换语言，比较存档中的稳定进度，确保不要求清档。
  await page.locator('#settings-button').click();await page.locator('#settings-home').click();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));
  await page.goto('http://localhost:4198/?lang=zh-CN');await ready();
  if(await page.locator('#title-name').textContent()!=='森林巡游')throw Error('Chinese switch failed');
  await page.goto('http://localhost:4198/?lang=en-US');await ready();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Locale switch mutated saved progress');
  checks.push('Saved progress survives English / Chinese / English');
  await page.setViewportSize({width:1280,height:900});await page.goto('http://localhost:4198/balance.html?lang=en-US');
  await page.waitForFunction(()=>document.documentElement.lang==='en-US');await page.locator('#minutes').fill('1');
  await page.locator('#run').click();await page.waitForFunction(()=>!document.querySelector('#run').disabled,{},{timeout:60000});
  if(!(await page.locator('#metrics').innerText()).trim())throw Error('No simulation report');
  await capture('balance-report');await page.locator('#benchmark').click();
  await page.waitForFunction(()=>document.querySelector('#benchmark-table').rows.length>1,{},{timeout:60000});
  await capture('balance-benchmark');await page.locator('#pin-report').click();await capture('balance-comparison');
  await page.goto('http://localhost:4198/gatling-preview.html?lang=en-US');
  await page.waitForFunction(()=>document.documentElement.lang==='en-US');
  const scene=page.frameLocator('#scene');
  await scene.locator('#player-name').filter({hasText:'Chestnut'}).waitFor();
  if(await scene.locator('html').getAttribute('lang')!=='en-US')throw Error('Embedded preview did not inherit English');
  if(/\p{Script=Han}/u.test(await scene.locator('body').innerText()))throw Error('Embedded preview has untranslated text');
  await capture('gatling-preview');
  if(errors.length)throw Error(errors.join('\n'));
  return {checks,overflow,errors};
}
