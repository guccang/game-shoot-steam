// 隔离端口实际浏览器验证；由 playwright-cli run-code --filename 执行。
async (page) => {
  if(new URL(page.url()).port!=='4197')throw Error('Use the isolated i18n server on port 4197');
  const errors=[],checks=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1280,height:900});
  await page.unroute('**/src/i18n/settings.json');await page.unroute('**/src/i18n/locales/en-test.json');
  await page.goto('http://localhost:4197/');
  await page.evaluate(async()=>{const {application}=await import('/src/main.js');await application.ready;});
  const chinese=await page.evaluate(async()=>(await(await fetch('/src/i18n/locales/zh-CN.json')).json()));
  await page.evaluate(async()=>{const {application}=await import('/src/main.js');application.destroy();localStorage.removeItem('forest-patrol-v1');});
  const translated=Object.fromEntries(Object.entries(chinese).map(([key,value])=>[key,value.replace(/\p{Script=Han}/gu,'X')]));
  // 等级、单位、缩写与英文标签也必须仅靠 JSON 替换，并允许参数重排。
  Object.assign(translated,{'common.level':'Rank {p0}','common.namedLevel':'Rank {p1}: {p0}','common.levelUpgrade':'{p1} from rank {p0}','common.secondsShort':'sec {p0}','common.boss':'Leader','common.debug':'Diagnostics','common.percentile':'Percentile {p0}','balance.percentiles':'Percentile 10/50/90','ui.resource.thousand':'KILO {p0}','ui.resource.tenThousand':'TEN-K {p0}','ui.resource.hundredMillion':'HUNDRED-M {p0}','startup.failed':'Application failed. Check language settings and assets.'});
  const translations={'森林巡游':'Forest Patrol','开始游戏':'Start Game','继续游戏':'Continue Game','游戏设置':'Settings','栗子':'Chestnut','松果手枪':'Acorn Pistol','武器工坊':'Workshop','角色':'Heroes','第 {p0} 波':'Wave {p0}'};
  for(const [key,value]of Object.entries(chinese))if(translations[value])translated[key]=translations[value];
  let defaultLocale='en-test';
  // 仅替换两个 JSON 响应，所有正式 JS 模块保持原样。
  await page.route('**/src/i18n/settings.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({defaultLocale,locales:{'zh-CN':'./locales/zh-CN.json','en-test':'./locales/en-test.json'}})}));
  await page.route('**/src/i18n/locales/en-test.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(translated)}));
  await page.reload();
  await page.evaluate(async()=>{const {application}=await import('/src/main.js');await application.ready;});
  if(await page.locator('html').getAttribute('lang')!=='en-test')throw Error('Document language did not change');
  if(await page.locator('#title-name').textContent()!=='Forest Patrol')throw Error('Static title did not translate');
  if(!['Start Game','Continue Game'].includes(await page.locator('#start').textContent()))throw Error('Dynamic menu did not translate');
  const compact=await page.evaluate(async()=>{const {compactResource}=await import('/src/ui/resource-number.js');return [999,1000,10000,100000000].map(compactResource);});
  if(JSON.stringify(compact)!==JSON.stringify(['999','1000','TEN-K 1','TEN-K 9999']))throw Error('Resource units did not translate');
  if(!(await page.locator('#debug-toggle').textContent()).includes('Diagnostics'))throw Error('Debug label did not translate');
  await page.locator('#start').click();
  const state=await page.evaluate(async()=>{const {application:a}=await import('/src/main.js');return {hero:(await import('/src/config/heroes.js')).HEROES[0].name,weapon:(await import('/src/config/weapons.js')).WEAPONS[0].name,state:a.game.state};});
  if(state.hero!=='Chestnut'||state.weapon!=='Acorn Pistol'||state.state!=='playing')throw Error(JSON.stringify(state));
  checks.push('JSON-only locale switch covers static DOM, accessibility, dynamic menu and config names');
  await page.locator('#weapons-button').click();
  if(!(await page.locator('#workshop-dialog').innerText()).includes('Acorn Pistol'))throw Error('Workshop uses stale language');
  if(!(await page.locator('#ws-level').textContent()).startsWith('Rank '))throw Error('Level label did not translate');
  await page.screenshot({path:'output/playwright/i18n-test-language-workshop.png'});
  await page.keyboard.press('Escape');
  await page.locator('#story-button').click();
  const storyText=await page.locator('#story-dialog').innerText();
  if(/\p{Script=Han}/u.test(storyText))throw Error('Untranslated story panel text');
  checks.push('Workshop and story panel use selected language');
  await page.keyboard.press('Escape');
  // 昼夜与尺寸切换使用正式环境状态，战场文字、同屏 UI 和画布共同取样。
  for(const [width,height]of [[1280,900],[390,844]]){
    await page.setViewportSize({width,height});
    for(const time of ['day','night']){
      await page.evaluate(async time=>{const {application:a}=await import('/src/main.js');const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.environment.autoTime=false;a.environment.autoWeather=false;a.environment.time=time;a.environment.weather='sun';a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.refresh();},time);
      await page.waitForTimeout(250);
      await page.screenshot({path:`output/playwright/i18n-test-${width}-${time}.png`});
    }
  }
  checks.push('Desktop and mobile day/night render without errors');
  await page.locator('#field-menu-toggle').click();
  await page.locator('#weapons-button').click();
  await page.screenshot({path:'output/playwright/i18n-test-mobile-workshop.png'});
  await page.keyboard.press('Escape');
  await page.goto('http://localhost:4197/balance.html');
  await page.waitForFunction(()=>document.documentElement.lang==='en-test');
  if(await page.locator('body').evaluate(node=>/\p{Script=Han}/u.test(node.innerText)))throw Error('Untranslated balance page');
  checks.push('Balance page static and dynamic content use language table');
  // 默认语言恢复中文后，用 URL 指定语言，正式配置也必须沿用该选择。
  defaultLocale='zh-CN';
  await page.goto('http://localhost:4197/?lang=en-test');
  await page.evaluate(async()=>{const {application}=await import('/src/main.js');await application.ready;});
  if(await page.locator('html').getAttribute('lang')!=='en-test'||await page.locator('#title-name').textContent()!=='Forest Patrol')throw Error('Query override did not apply');
  checks.push('Query override selects a registered language despite a Chinese default');
  if(errors.length)throw Error(errors.join('\n'));
  // 未注册语言必须中止启动并在页面明确报告，不回退到中文。
  await page.goto('http://localhost:4197/?lang=missing');
  await page.waitForFunction(()=>document.querySelector('#title-summary')?.getAttribute('role')==='alert');
  if(await page.locator('#title-summary').textContent()!==chinese['startup.failed'])throw Error('Startup error bypassed language table');
  if(!await page.locator('#start').isDisabled())throw Error('Bad locale should not start');
  checks.push('Invalid locale shows startup error and does not silently fall back');
  // 注册但缺项的语言包同样阻止启动，基准错误文案只用于失败提示。
  const savedLevel=translated['common.level'];delete translated['common.level'];
  await page.goto('http://localhost:4197/?lang=en-test');
  await page.waitForFunction(()=>document.querySelector('#title-summary')?.getAttribute('role')==='alert');
  if(!await page.locator('#start').isDisabled()||await page.locator('#title-summary').textContent()!==chinese['startup.failed'])throw Error('Incomplete locale should fail visibly');
  translated['common.level']=savedLevel;
  checks.push('Incomplete registered locale blocks startup with table-driven error text');
  await page.unroute('**/src/i18n/settings.json');await page.unroute('**/src/i18n/locales/en-test.json');
  await page.goto('http://localhost:4197/');
  await page.evaluate(async()=>{const {application}=await import('/src/main.js');await application.ready;});
  if(await page.locator('#title-name').textContent()!=='森林巡游')throw Error('Chinese default did not restore');
  await page.locator('#start').click();
  for(const [width,height]of [[1280,900],[390,844]]){
    await page.setViewportSize({width,height});
    for(const time of ['day','night']){
      await page.evaluate(async time=>{const {application:a}=await import('/src/main.js');const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.environment.autoTime=false;a.environment.autoWeather=false;a.environment.time=time;a.environment.weather='sun';a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.refresh();},time);
      await page.waitForTimeout(250);
      await page.screenshot({path:`output/playwright/i18n-chinese-${width}-${time}.png`});
    }
  }
  await page.locator('#field-menu-toggle').click();
  await page.locator('#weapons-button').click();
  await page.screenshot({path:'output/playwright/i18n-chinese-mobile-workshop.png'});
  await page.keyboard.press('Escape');
  checks.push('Chinese desktop/mobile day/night and mobile workshop remain readable');
  return checks;
}
