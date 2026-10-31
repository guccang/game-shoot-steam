// 指定字体实机验收：真实 DOM、Canvas、平台字体报告及缺失资源失败路径。
async (page) => {
  if(new URL(page.url()).port!=='4199')throw Error('Use isolated port 4199');
  const errors=[],checks=[],platformFonts=[],layouts=[];
  page.on('pageerror',error=>errors.push(error.message));
  // 只观察正式画布的文字调用，不替换绘制内容或坐标。
  await page.addInitScript(()=>{
    window.fontDraws=[];
    for(const name of ['fillText','strokeText']){
      const original=CanvasRenderingContext2D.prototype[name];
      CanvasRenderingContext2D.prototype[name]=function(...args){
        if(window.fontDraws.length<300)window.fontDraws.push({font:this.font,status:document.documentElement.dataset.fontStatus});
        return original.apply(this,args);
      };
    }
  });
  // 等待字体和正式应用完成准备，禁止以系统字体回退通过检查。
  async function ready(){await page.evaluate(async()=>{const {application:a}=await import('/src/main.js');await a.ready;});}
  // 检查真实可见文本的计算字体、溢出情况，并留存当前界面。
  async function capture(name,selector='body'){
    const node=page.locator(selector);if(!await node.isVisible())throw Error(name+' hidden');
    const report=await node.evaluate(root=>{
      const textNodes=[root,...root.querySelectorAll('*')].filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&[...n.childNodes].some(t=>t.nodeType===3&&t.textContent.trim()));
      return {wrong:textNodes.filter(n=>!getComputedStyle(n).fontFamily.includes('HYQiHei75S')).map(n=>n.id||n.tagName),
        clipped:textNodes.filter(n=>!n.children.length&&n.clientWidth>0&&n.scrollWidth>n.clientWidth+3).map(n=>({text:n.textContent.trim().slice(0,80),ellipsis:getComputedStyle(n).textOverflow})),
        outside:root.tagName==='DIALOG'&&(root.getBoundingClientRect().left<0||root.getBoundingClientRect().right>innerWidth+1)};
    });
    if(report.wrong.length||report.outside||report.clipped.some(item=>item.ellipsis!=='ellipsis'))throw Error(name+JSON.stringify(report));
    layouts.push({name,...report});await page.screenshot({path:`output/playwright/font-${name}.png`});checks.push(name);
  }
  // 手机入口沿用实际折叠菜单。
  async function menu(selector){if(!await page.locator(selector).isVisible())await page.locator('#field-menu-toggle').click();await page.locator(selector).click();}
  for(const lang of ['zh-CN','en-US']){
    await page.goto(`http://localhost:4199/?lang=${lang}`);await ready();
    // 常规面板使用已可巡游的旧档结构；首次入职对白另有字体专项检查。
    await page.evaluate(async()=>{const {application:a}=await import('/src/main.js');const {freshProgress}=await import('/src/progression/progress.js');a.destroy();localStorage.setItem('forest-patrol-v1',JSON.stringify(freshProgress()));});
    await page.reload();await ready();
    // Chromium 平台报告确认实际字形来自自定义字体文件，而非仅匹配 CSS 名称。
    const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
    const {root}=await cdp.send('DOM.getDocument'),{nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#title-name'});
    const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
    if(!fonts.some(f=>f.isCustomFont&&f.glyphCount>0))throw Error('Title is using a fallback font');
    platformFonts.push({lang,fonts});await cdp.detach();
    for(const width of [1280,390,320]){await page.setViewportSize({width,height:width===1280?900:844});await capture(`${lang}-${width}-title`);}
    await page.locator('#start').click();
    for(const width of [1280,390,320]){
      await page.setViewportSize({width,height:width===1280?900:844});
      for(const time of ['day','night']){
        await page.evaluate(async time=>{const {application:a}=await import('/src/main.js');
          const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
          Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
          a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.refresh();},time);
        await page.waitForTimeout(150);await capture(`${lang}-${width}-${time}`);
      }
      await page.locator('#settings-button').click();await capture(`${lang}-${width}-settings`,'#settings-dialog');await page.locator('#close-settings').click();
      for(const [button,dialog,close,name]of [['#weapons-button','#workshop-dialog','#ws-close','workshop'],['#heroes-button','#camp-dialog','#close-camp','heroes'],['#map-button','#map-dialog','#close-map','map'],['#story-button','#story-dialog','#story-close','story'],['#realm-button','#realm-dialog','#close-realm','realms']]){
        await menu(button);await capture(`${lang}-${width}-${name}`,dialog);await page.locator(close).click();
      }
    }
    const canvas=await page.evaluate(async()=>({draws:window.fontDraws,review:(await import('/src/rendering/visual-review.js')).inspectGameFont(document)}));
    if(!canvas.draws.length||canvas.draws.some(d=>!d.font.includes('HYQiHei75S')||d.status!=='ready')||canvas.review.status!=='ready')throw Error('Canvas used fallback or drew before font loading: '+JSON.stringify(canvas));
    checks.push(`${lang}-canvas-ready`);
    await page.setViewportSize({width:1280,height:900});await page.goto(`http://localhost:4199/balance.html?lang=${lang}`);
    await page.waitForFunction(()=>document.documentElement.dataset.fontStatus==='ready');await capture(`${lang}-balance`);
  }
  await page.goto('http://localhost:4199/gatling-preview.html?lang=en-US');
  await page.waitForFunction(()=>document.documentElement.dataset.fontStatus==='ready');
  const scene=page.frameLocator('#scene');await scene.locator('#player-name').filter({hasText:'Chestnut'}).waitFor();
  if(await scene.locator('html').getAttribute('data-font-status')!=='ready')throw Error('Embedded scene font not loaded');
  await capture('gatling-preview');
  if(errors.length)throw Error(errors.join('\n'));
  // 只在隔离测试拦截资源，验证失败提示与启动禁用；不以备用字体继续游戏。
  await page.route('**/assets/fonts/HYQiHei_75S.ttf',route=>route.abort());
  await page.goto('http://localhost:4199/?lang=en-US');await page.locator('#font-load-error').waitFor();
  if(!await page.locator('#start').isDisabled()||await page.locator('html').getAttribute('data-font-status')!=='error')throw Error('Missing font silently fell back');
  await page.screenshot({path:'output/playwright/font-missing.png'});checks.push('missing-font-blocks-start');
  await page.unroute('**/assets/fonts/HYQiHei_75S.ttf');
  await page.goto('http://localhost:4199/');await ready();checks.push('font-recovery');
  return {checks,platformFonts,layouts,expectedFailure:errors};
}
