// 手机实测用设置按钮切换风格；检查战斗快照、缓存与昼夜天气，不替换游戏更新函数。
async page=>{
 const root='output/playwright/shared-art-rendering/';
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:root,size:{width:390,height:844}}});
 const p=await context.newPage(),errors=[],samples=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(new URL('/?artPreview=idle-cat-pine',page.url()).href);
  await p.waitForFunction(()=>document.querySelector('#vehicle-button')?.getAttribute('aria-pressed')==='true',null,{timeout:60000});
  await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;window.style=await import('/src/art-styles/state.js');a.game.spawnTimer=999;});
  // 快照只读取玩法与动作，不把新建美术缓存算作战斗变化。
  async function snapshot(){return p.evaluate(()=>JSON.stringify({progress:a.game.progress,player:a.game.player,vehicle:a.game.vehicle,enemies:a.game.enemies,time:a.game.time,calendar:a.game.progress.living.calendar}));}
  // 设置弹窗冻结战斗，切换后逐字段核对原位置、轮角、主炮和进度。
  async function change(id){
   if(!await p.locator('#settings-dialog').evaluate(e=>e.open))await p.locator('#settings-button').tap();
   const before=await snapshot();await p.locator(`[data-art-style="${id}"]`).tap();
   await p.waitForFunction(id=>style.artStyle()===id&&!document.querySelector('#art-style-options').hasAttribute('aria-busy'),id);
   if(before!==await snapshot())throw Error('切换修改了战斗状态');
   await p.locator('#close-settings').tap();await p.waitForTimeout(250);
  }
  // 相同地点使用正式环境端点，真实天气连续过渡另行保留原实例核对。
  async function environment(time,weather='sun',season='summer'){
   await p.evaluate(async({time,weather,season})=>{document.querySelector(`[data-time="${time}"]`).click();document.querySelector(`[data-weather="${weather}"]`).click();document.querySelector(`[data-forest-season="${season}"]`).click();a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.ground.dispose();a.renderer.ground=new(await import('/src/rendering/season-ground-cache.js')).SeasonGroundCache(a.game.mapId,season);a.renderer.seasons=a.renderer.ground.seasons;Object.assign(a.game.player,{x:925,y:365,vx:0,vy:0});a.refresh();},{time,weather,season});
  }
  for(const id of ['classic','clear']){
   await change(id);
   for(const [time,weather,season]of [['day','sun','summer'],['night','rain','summer'],['day','snow','winter']]){
    await environment(time,weather,season);await p.waitForTimeout(500);await p.screenshot({path:root+id+'-'+time+'-'+weather+'.png'});
    samples.push(await p.evaluate(()=>({style:style.artStyle(),environment:{...a.environment},budget:a.renderer.diagnosticInfo(),overflow:document.documentElement.scrollWidth>innerWidth})));
   }
   await environment('day');const start=await p.evaluate(()=>({x:a.game.player.x,w:a.game.vehicle.wheelPhase}));await p.keyboard.down('ArrowRight');await p.waitForTimeout(300);await p.keyboard.up('ArrowRight');const end=await p.evaluate(()=>({x:a.game.player.x,w:a.game.vehicle.wheelPhase}));if(end.x<=start.x||end.w===start.w)throw Error('切换后四轮驾驶未推进');
  }
  // 正在变化的昼夜与天气继续使用相同过渡实例，切换不能重置到端点。
  await environment('day');await p.evaluate(()=>{document.querySelector('[data-time="night"]').click();document.querySelector('[data-weather="rain"]').click();window.oldLight=a.renderer.light;window.oldTone=a.renderer.tone;window.oldSeasons=a.renderer.seasons;});await p.waitForTimeout(1500);await change('classic');
  const transitions=await p.evaluate(()=>({light:oldLight===a.renderer.light,tone:oldTone===a.renderer.tone,seasons:oldSeasons===a.renderer.seasons,sample:a.renderer.light.sample(performance.now())}));if(!transitions.light||!transitions.tone||!transitions.seasons)throw Error('天气过渡实例被重置');
  for(const id of ['clear','classic','clear','classic','clear'])await change(id);
  const budget=await p.evaluate(()=>a.renderer.diagnosticInfo());if(budget.groundCache.count>64||budget.contextLost)throw Error('切换缓存异常');
  await p.setViewportSize({width:320,height:568});await p.locator('#settings-button').tap();await p.locator('[data-art-style="classic"]').scrollIntoViewIfNeeded();await p.screenshot({path:root+'settings-320.png'});
  const sizes=await p.locator('[data-art-style]').evaluateAll(nodes=>nodes.map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));if(sizes.some(s=>s.h<44)||await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('窄屏触控或布局异常');
  await p.locator('[data-art-style="classic"]').tap();await p.waitForFunction(()=>style.artStyle()==='classic'&&!document.querySelector('#art-style-options').hasAttribute('aria-busy'));
  await p.reload();await p.waitForFunction(()=>document.querySelector('#vehicle-button')?.getAttribute('aria-pressed')==='true');
  const saved=await p.evaluate(async()=>({style:(await import('/src/art-styles/state.js')).artStyle(),keys:Object.keys(localStorage)}));if(saved.style!=='classic'||saved.keys.some(k=>k!=='forest-art-style-v1'))throw Error('显示偏好或试玩存档隔离失败');
  if(samples.some(s=>s.overflow)||errors.length)throw Error(errors.join('\n')||'画面溢出');
  const review=await p.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectSharedArt((await import('/src/main.js')).application.renderer,document));
  if(!review.sharedProfile||!review.profileFrozen)throw Error('正式绘制器未使用当前只读配置');
  return {passed:true,designCriterion:'shared-art-rendering',review,samples,transitions,budget,sizes,saved,errors};
 }finally{await context.close();await p.video().saveAs(root+'switching.webm');}
}
