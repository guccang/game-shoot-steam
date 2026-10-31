// 在真实Chrome中清空像素存储并发送上下文生命周期事件，验证恢复后的像素，而不只检查计数。
async page => {
 if(!['4175','4176'].includes(new URL(page.url()).port))throw Error('仅允许本地测试服务');
 const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.addInitScript(()=>{
  window.__recoveryCanvases=[];
  const create=document.createElement.bind(document);
  document.createElement=function(name,...args){const element=create(name,...args);if(name==='canvas')window.__recoveryCanvases.push(element);return element;};
 });
 await page.setViewportSize({width:390,height:844});await page.reload();
 await page.getByRole('button',{name:'开始游戏',exact:true}).click();
 await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});
 // 暂停保证像素可比较，验收截图仅隐藏暂停遮罩，仍显示正式场景和HUD。
 await page.addStyleTag({content:'#overlay { display: none !important; }'});
 await page.waitForFunction(async()=>{const {application:a}=await import('/src/main.js');return a.menu.page==='game'&&(await import('/src/rendering/cat-animation.js')).catSprites.status==='ready';});
 await page.evaluate(async()=>{
  const {application:a}=await import('/src/main.js');a.game.state='paused';a.game.arrivalCinematic=null;
  Object.assign(a.environment,{autoWeather:false,autoTime:false,time:'day',weather:'sun',forestSeason:'summer',livingPreview:true});
  a.renderer.reduced={matches:true};
  Object.assign(a.game.player,{x:1880,y:2140});a.game.vehicle.active=false;
  window.__recoveryApp=a;
  const {drawTreeSprite}=await import('/src/rendering/tree-art.js'),{drawCat}=await import('/src/rendering/characters.js');
  // 固定动作的离屏采样必须像素完全一致；正式场景仍按原运行路径渲染。
  window.__probe=()=>{
   const result=[];
   for(const kind of ['tree','cat']){
    const canvas=document.createElement('canvas');canvas.width=200;canvas.height=200;const c=canvas.getContext('2d',{willReadFrequently:true});
    if(kind==='tree'){c.translate(100,170);drawTreeSprite(c,{id:3,variant:'pine',palette:0},0,0,false,'summer');}
    else drawCat(c,100,150,0,0,2,0,0);
    const pixels=c.getImageData(0,0,200,200).data;let hash=2166136261,opaque=0;
    for(let i=0;i<pixels.length;i++){hash=Math.imul(hash^pixels[i],16777619);if(i%4===3&&pixels[i]>0)opaque++;}
    result.push({kind,hash:hash>>>0,opaque});canvas.width=canvas.height=1;
   }
   return result;
  };
 });
 const baseline=await page.evaluate(()=>window.__probe());if(baseline.some(x=>x.opaque<1500))throw Error('基准图像未完整加载');
 await page.screenshot({path:'output/playwright/canvas-recovery/before.png'});
 const rounds=[];
 for(let round=0;round<2;round++){
  const result=await page.evaluate(async round=>{
   const a=window.__recoveryApp,g=a.game,r=a.renderer;
   const state={player:JSON.stringify(g.player),progress:JSON.stringify(g.progress),camera:JSON.stringify(r.camera),animation:JSON.stringify(g.player.bodyAnimation)};
   const oldGround=r.ground.current,oldTiles=[...oldGround.tiles.values()];
   const {catSprites}=await import('/src/rendering/cat-animation.js'),oldFrames=[...catSprites.coats.frames.values()];
   const expected=window.__probe();
   const canvases=[...new Set([...document.querySelectorAll('canvas'),...window.__recoveryCanvases])].filter(c=>c.width>1&&c.height>1);
   for(const canvas of canvases)canvas.width=canvas.width;
   // 未通知恢复时缓存对象仍命中，先证明能复现角色和树木变空白。
   const blank=window.__probe();if(blank[0].opaque!==0||blank[1].opaque>=expected[1].opaque*.7)throw Error('未成功复现缓存像素丢失：'+JSON.stringify({expected,blank}));
   for(const canvas of canvases)canvas.dispatchEvent(new Event('contextlost'));
   const context=r.c;Object.defineProperty(context,'isContextLost',{configurable:true,value:()=>true});
   if(r.recoverContext()!==false)throw Error('丢失期间不应构建纹理');
   delete context.isContextLost;
   for(const canvas of canvases)canvas.dispatchEvent(new Event('contextrestored'));
   r.recoverContext();const recovered=window.__probe();
   if(JSON.stringify(g.player)!==state.player||JSON.stringify(g.progress)!==state.progress||JSON.stringify(r.camera)!==state.camera||JSON.stringify(g.player.bodyAnimation)!==state.animation)throw Error('恢复改变了游戏状态或动作镜头');
   if(oldGround===r.ground.current||oldTiles.some(t=>t.day.width!==1)||oldFrames.some(c=>c.width!==1))throw Error('旧像素没有释放');
   return {round,canvases:canvases.length,blank,recovered,diagnostics:r.diagnosticInfo().contextRecovery};
  },round);
  if(JSON.stringify(result.recovered)!==JSON.stringify(baseline))throw Error('角色或树木恢复后的像素不一致');rounds.push(result);
  await page.waitForFunction(()=>window.__recoveryApp.renderer.ground.stats().count>0);
 }
 // 仅离屏树图集失效时不发送主画布事件，必须由下一帧自动恢复。
 const offscreen=await page.evaluate(()=>{
  const a=window.__recoveryApp,before=a.renderer.contextRecoveries;
  const canvas=window.__recoveryCanvases.find(c=>!c.isConnected&&c.width===256&&c.height===320);
  if(!canvas)throw Error('缺少真实树木离屏图集');
  canvas.width=canvas.width;canvas.dispatchEvent(new Event('contextlost'));canvas.dispatchEvent(new Event('contextrestored'));
  return {before};
 });
 await page.waitForFunction(before=>window.__recoveryApp.renderer.contextRecoveries>before,offscreen.before);
 const afterOffscreen=await page.evaluate(()=>window.__probe());
 if(JSON.stringify(afterOffscreen)!==JSON.stringify(baseline))throw Error('离屏单独恢复像素不一致');
 await page.screenshot({path:'output/playwright/canvas-recovery/recovered-day.png'});
 // 夜景与窄屏继续使用正式渲染，验证恢复之后的完整场景与缓存上限。
 await page.evaluate(()=>{const a=window.__recoveryApp;a.environment.time='night';a.renderer.reduced={matches:true};});
 await page.setViewportSize({width:320,height:720});
 await page.waitForFunction(()=>window.__recoveryApp.renderer.ground.current.requiredNight);
 await page.screenshot({path:'output/playwright/canvas-recovery/recovered-night-320.png'});
 const info=await page.evaluate(()=>window.__recoveryApp.renderer.diagnosticInfo());
 if(info.groundCache.limit!==24)throw Error('手机缓存预算未生效');
 if(errors.length)throw Error(errors.join('\n'));
 return {baseline,rounds,offscreenRecovered:true,mobileLimit:info.groundCache.limit,cacheBytes:info.groundCache.bytes,errors,method:'清空Canvas像素并注入生命周期事件，不等同鸿蒙真机GPU故障'};
}
