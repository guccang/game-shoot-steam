// 实际图片按钮与设置操作、四季实机截图、连续落雪及缓存验收。
async (page) => {
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('#start').click();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;window.review=a;
    const {catSprites}=await import('/src/rendering/cat-animation.js');if(!await catSprites.load())throw Error('猫图集缺失');
    a.game.enemies=[];a.game.spawnTimer=999;a.game.attackTimer=999;
  });
  await page.locator('#settings-button').click();await page.locator('#environment-button').click();
  await page.locator('#auto-time').uncheck();await page.locator('#auto-weather').uncheck();
  await page.locator('button[data-time="day"]').click();
  for(const season of ['spring','summer','autumn','winter']){
    await page.locator(`[data-forest-season="${season}"]`).click();
    if(!await page.locator('#season-picture-art').getAttribute('src').then(s=>s.includes(season)))throw Error('季节图片不同步');
  }
  for(const weather of ['sun','cloud','rain','thunder','snow']){
    await page.locator(`button[data-weather="${weather}"]`).click();
    await page.waitForFunction(()=>document.querySelector('#weather-picture-art').complete&&document.querySelector('#weather-picture-art').naturalWidth>0);
    if(!await page.locator('#weather-picture-art').getAttribute('src').then(s=>s.includes(weather)))throw Error('天气图片不同步');
  }
  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('环境面板横向溢出');
    await page.screenshot({path:`output/playwright/seasons-snow/settings-${width}.png`});
  }
  await page.locator('#environment-ok').click();await page.locator('#settings-done').click();
  await page.waitForFunction(()=>window.review.game.state==='playing');
  const clicks=[];
  for(const kind of ['season','weather'])for(let i=0;i<6;i++){
    const before=await page.evaluate(kind=>({value:review.environment[kind==='season'?'forestSeason':'weather'],x:review.game.player.x,y:review.game.player.y,wave:review.game.wave}),kind);
    await page.locator(`#${kind}-picture`).click();
    const after=await page.evaluate(kind=>({value:review.environment[kind==='season'?'forestSeason':'weather'],x:review.game.player.x,y:review.game.player.y,wave:review.game.wave,state:review.game.state,dialog:!!document.querySelector('dialog[open]')}),kind);
    if(before.value===after.value||before.x!==after.x||before.y!==after.y||before.wave!==after.wave||after.state!=='playing'||after.dialog)throw Error('图片随机切换重复或影响战斗');
    clicks.push({kind,from:before.value,to:after.value});
  }
  // 键盘也能激活图片；触控不泄漏为移动摇杆。
  await page.locator('#season-picture').focus();await page.keyboard.press('Enter');
  await page.reload();
  const restored=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;window.review=a;return {season:a.environment.forestSeason,weather:a.environment.weather};});
  if(!['spring','summer','autumn','winter'].includes(restored.season))throw Error('入场季节无效');
  if(!await page.evaluate(async()=>{const {SEASON_WEATHER_WEIGHTS}=await import('/src/world/season-weather.js');return SEASON_WEATHER_WEIGHTS[review.environment.forestSeason][review.environment.weather]>0;}))throw Error('入场天气不匹配季节');
  // 真实移动和停车保留猫猫主体动作，之后再固定实机画面。
  await page.evaluate(()=>{const g=review.game;g.state='playing';g.enemies=[];g.spawnTimer=999;g.attackTimer=999;Object.assign(g.player,{x:940,y:820});review.refresh();});
  await page.keyboard.down('ArrowRight');try{await page.waitForFunction(()=>review.game.player.x>980);}finally{await page.keyboard.up('ArrowRight');}
  await page.waitForFunction(()=>review.game.player.bodyAnimation.moveWeight<.1);
  const move=await page.evaluate(()=>review.game.player.bodyAnimation.moveTime);if(move<=0)throw Error('猫移动动画没有推进');
  await page.evaluate(async()=>{
    review.destroy();review.game.onEvent=()=>{};
    const {createEnvironmentPanel}=await import('/src/ui/panels/environment.js');
    // 静态验收继续调用正式面板渲染，确保图片标签与注入的实机状态一致。
    window.reviewPanel=createEnvironmentPanel({environment:review.environment,root:document,dialogs:{register(){},open(){},close(){}},onSave(){}});
  });
  const stats=[];
  for(const width of [1100,390,320]){
    await page.setViewportSize({width,height:width===1100?1000:844});
    for(const season of ['spring','summer','autumn','winter'])for(const time of ['day','night']){
      stats.push(await page.evaluate(async({season,time})=>{
        const a=review,g=a.game,r=a.renderer;
        const {EnvironmentTransition}=await import('/src/world/environment.js');const {SceneTone}=await import('/src/rendering/scene-tone.js');
        g.reset();g.state='playing';Object.assign(g.player,{x:900,y:800});g.progress.vehicleHulls[0]=1;g.summonVehicle();g.spawnEnemy(0,0,{x:810,y:865});
        Object.assign(a.environment,{forestSeason:season,time,weather:season==='winter'?'snow':'sun',autoTime:false,autoWeather:false});
        r.seasons.reset(season);r.light=new EnvironmentTransition(a.environment);r.tone=new SceneTone(a.environment);r.camera.time=null;r.resize();a.refresh();reviewPanel.render();r.draw();
        const buttons=['season-picture','weather-picture','settings-button'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height};});
        if(buttons.some(b=>b.x<0||b.x+b.w>innerWidth+1||b.w<44||b.h<44)||buttons[0].x+buttons[0].w>buttons[1].x)throw Error('环境图片触屏尺寸或位置异常');
        return r.diagnosticInfo();
      },{season,time}));
      await page.screenshot({path:`output/playwright/seasons-snow/${season}-${time}-${width}.png`});
    }
  }
  // 六组冬季景观与四季对照使用正式工作台，检查雪根、山脚、湖岸。
  await page.setViewportSize({width:1200,height:1000});
  for(const kind of ['seasons','winter','winter-night']){
    await page.evaluate(async kind=>{
      const {renderVisualCase}=await import('/src/rendering/visual-review.js');
      document.querySelector('#season-gallery')?.remove();
      const canvas=document.createElement('canvas');canvas.id='season-gallery';canvas.width=1200;canvas.height=1000;
      canvas.style.cssText='position:fixed;inset:0;z-index:99999;width:1200px;height:1000px;background:#dfe8df';document.body.append(canvas);
      const c=canvas.getContext('2d'),seasons=['spring','summer','autumn','winter'],count=kind==='seasons'?4:6,cols=kind==='seasons'?2:3;
      for(let i=0;i<count;i++){
        const tile=document.createElement('canvas');tile.width=1200/cols;tile.height=500;
        await renderVisualCase(tile.getContext('2d'),kind==='seasons'?`landscape-group-0-${seasons[i]}`:`landscape-group-${i}-${kind}`,1);
        c.drawImage(tile,i%cols*tile.width,Math.floor(i/cols)*500);
      }
    },kind);
    await page.screenshot({path:`output/playwright/seasons-snow/gallery-${kind}.png`});
  }
  await page.evaluate(()=>document.querySelector('#season-gallery').remove());
  const snow=await page.evaluate(async()=>{
    const {SnowRenderer}=await import('/src/rendering/snow.js');const canvas=document.createElement('canvas');canvas.width=390;canvas.height=844;
    const c=canvas.getContext('2d'),snow=new SnowRenderer(),view={x:900,y:700,zoom:.85},frames=[];
    for(const time of [0,1,2,3]){c.clearRect(0,0,390,844);snow.draw(c,time,390,844,view,1,0,false);frames.push(canvas.toDataURL());}
    if(new Set(frames).size!==4)throw Error('大雪没有连续变化');
    c.clearRect(0,0,390,844);snow.draw(c,4,390,844,view,1,0,true);const still=canvas.toDataURL();
    c.clearRect(0,0,390,844);snow.draw(c,8,390,844,view,1,0,true);if(canvas.toDataURL()!==still)throw Error('减少动态未冻结雪粒');
    snow.draw(c,8,5000,5000,view,1,0,false);if(snow.count>260)throw Error('雪粒超限');
    snow.draw(c,8,390,844,view,0,0,false);if(snow.count!==0)throw Error('晴天仍有雪粒');
    return {frames:4,reducedFrozen:true,maxParticles:260,clearSky:true};
  });
  if(stats.some(s=>s.snow.count>s.snow.limit||s.groundCache.count>s.groundCache.limit))throw Error('缓存或雪粒预算超限');
  if(errors.length)throw Error(errors.join(';'));
  return {designCriterion:['season-phenology','winter-ground-contact','snowfall-depth','environment-picture-controls'],clicks,entryRandom:restored,move,snow,treesMaxBytes:Math.max(...stats.map(s=>s.trees.bytes)),groundMaxBytes:Math.max(...stats.map(s=>s.groundCache.bytes)),errors};
}
