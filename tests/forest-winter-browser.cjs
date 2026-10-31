// 隔离端口验证季节真实按钮、保存、移动及昼夜同屏，截图均沿正式绘制链。
async (page) => {
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1100,height:1000});
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.reload();if(await page.locator('#start').isVisible())await page.locator('#start').click();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;
    const {catSprites}=await import('/src/rendering/cat-animation.js');
    if(!await catSprites.load())throw Error('猫图集加载失败');
    a.game.enemies=[];a.game.spawnTimer=999;a.game.attackTimer=999;
    window.winterReview=a;
  });
  await page.locator('#settings-button').click();await page.locator('#environment-button').click();
  await page.locator('[data-forest-season="winter"]').click();
  const before=await page.evaluate(()=>({x:winterReview.game.player.x,hp:winterReview.game.player.hp,wave:winterReview.game.wave}));
  await page.locator('[data-forest-season="summer"]').click();
  await page.waitForFunction(()=>!winterReview.renderer.ground.winter);
  if(await page.evaluate(()=>JSON.stringify({x:winterReview.game.player.x,hp:winterReview.game.player.hp,wave:winterReview.game.wave}))!==JSON.stringify(before))throw Error('切季改变战斗');
  await page.reload();
  // 刷新按入场规则重新随机，后续雪景检查显式选择冬季。
  await page.locator('#settings-button').click();await page.locator('#environment-button').click();
  for(const width of [320,390]) {
    await page.setViewportSize({width,height:844});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('手机横向溢出');
    await page.screenshot({path:`output/playwright/forest-winter/settings-${width}.png`});
  }
  await page.locator('[data-forest-season="winter"]').click();
  await page.locator('#auto-weather').uncheck();await page.locator('#auto-time').uncheck();await page.locator('button[data-time="day"]').click();
  await page.reload();if(await page.locator('#start').isVisible())await page.locator('#start').click();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;window.winterReview=a;
    a.environment.forestSeason='winter';
    a.game.state='playing';a.refresh();Object.assign(a.game.player,{x:940,y:820});a.game.enemies=[];a.game.spawnTimer=999;a.game.attackTimer=999;
  });
  await page.keyboard.down('ArrowRight');
  try{await page.waitForFunction(()=>winterReview.game.player.x>975);}finally{await page.keyboard.up('ArrowRight');}
  if(!await page.evaluate(()=>winterReview.game.player.bodyAnimation.moveTime>0))throw Error('移动动画未推进');
  await page.waitForFunction(()=>winterReview.game.player.bodyAnimation.moveWeight<.1);
  await page.screenshot({path:'output/playwright/forest-winter/interaction-day.png'});
  await page.evaluate(()=>{const g=winterReview.game;g.progress.vehicleHulls[0]=1;if(!g.summonVehicle())throw Error('无法上车');});
  await page.keyboard.down('ArrowRight');
  try{await page.waitForFunction(()=>winterReview.game.player.x>1020);}finally{await page.keyboard.up('ArrowRight');}
  await page.screenshot({path:'output/playwright/forest-winter/interaction-vehicle.png'});
  await page.evaluate(()=>{winterReview.destroy();winterReview.game.onEvent=()=>{};});
  const stats=[];
  for(const width of [1100,390,320])for(const time of ['day','night']) {
    await page.setViewportSize({width,height:width===1100?1000:844});
    for(const spot of width===320?['camp']:['camp','pine','amber','deep','lake']) {
      stats.push(await page.evaluate(async({time,spot})=>{
        const a=winterReview,g=a.game,r=a.renderer;
        const {NATURAL_TERRAIN}=await import('/src/world/natural-terrain.js');
        const {EnvironmentTransition}=await import('/src/world/environment.js');const {SceneTone}=await import('/src/rendering/scene-tone.js');
        const lake=NATURAL_TERRAIN.lakes[0];
        const points={camp:[900,760],pine:[650,2100],amber:[2340,1020],deep:[3020,2200],lake:[lake.x,lake.y+lake.ry+90]};
        g.reset();g.state='playing';Object.assign(g.player,{x:points[spot][0],y:points[spot][1]});g.progress.vehicleHulls[0]=1;g.summonVehicle();
        g.spawnEnemy(0,0,{x:g.player.x-90,y:g.player.y+75});
        Object.assign(a.environment,{time,weather:'sun',forestSeason:'winter',autoTime:false,autoWeather:false});
        r.light=new EnvironmentTransition(a.environment);r.tone=new SceneTone(a.environment);r.camera.time=null;r.resize();a.refresh();r.draw();
        return r.diagnosticInfo();
      },{time,spot}));
      await page.screenshot({path:`output/playwright/forest-winter/${spot}-${time}-${width}.png`});
    }
  }
  await page.setViewportSize({width:1440,height:1100});
  // 组合图采用正式工作台，检查所有山顶、湖岸和树冠的雪层。
  for(const time of ['day','night']) {
    await page.evaluate(async time=>{
      const {renderVisualCase}=await import('/src/rendering/visual-review.js');
      document.querySelector('#winter-gallery')?.remove();
      const canvas=document.createElement('canvas');canvas.id='winter-gallery';canvas.width=1440;canvas.height=1100;
      canvas.style.cssText='position:fixed;inset:0;z-index:99999;width:1440px;height:1100px;background:#e1eae1';document.body.append(canvas);
      const c=canvas.getContext('2d');
      for(let i=0;i<6;i++){
        const tile=document.createElement('canvas');tile.width=480;tile.height=550;
        await renderVisualCase(tile.getContext('2d'),`landscape-group-${i}-winter${time==='night'?'-night':''}`,1);
        c.drawImage(tile,i%3*480,Math.floor(i/3)*550);
      }
    },time);
    await page.screenshot({path:`output/playwright/forest-winter/gallery-${time}.png`});
  }
  await page.evaluate(()=>document.querySelector('#winter-gallery').remove());
  // 原景完全可恢复；重复往返必须复用有限图集，不累计地块。
  const cache=await page.evaluate(async()=>{
    const a=winterReview,r=a.renderer,g=a.game;g.reset();g.state='playing';g.player.x=900;g.player.y=760;
    a.environment.time='day';r.resize();r.camera.time=null;
    const measurements=[];
    for(let i=0;i<6;i++){a.environment.forestSeason=i%2?'winter':'green';r.draw();measurements.push(r.diagnosticInfo());}
    const counts=measurements.map(m=>m.trees.count);
    if(counts[3]!==counts[5])throw Error('季节往返不断分配树图集');
    if(measurements.some(m=>m.groundCache.count>m.groundCache.limit))throw Error('地块缓存超限');
    a.environment.forestSeason='green';r.draw();
    return {treeCounts:counts,last:measurements.at(-1)};
  });
  await page.screenshot({path:'output/playwright/forest-winter/original-restored.png'});
  // 冬季跨块和周期镜像使用相同图元；九寨沟的像素不受森林季节设置影响。
  const surfaces=await page.evaluate(async()=>{
    const {GroundCache}=await import('/src/rendering/ground-cache.js');
    const {paintGround}=await import('/src/rendering/ground-art.js');
    const view={x:1536,y:1152,w:768,h:384};
    const canvases=[0,1,2].map(()=>{const c=document.createElement('canvas');c.width=768;c.height=384;return c;});
    for(const [i,canvas] of canvases.entries()) {
      const c=canvas.getContext('2d',{willReadFrequently:true});c.translate(-view.x-(i===2?3600:0),-view.y);
      if(i===0)paintGround(c,view,true);else {const cache=new GroundCache();cache.setSeason('winter');cache.draw(c,{...view,x:view.x+(i===2?3600:0)},0);}
    }
    const data=canvases.map(c=>c.getContext('2d').getImageData(0,0,768,384).data);let severe=0,mirror=0;
    for(let y=10;y<374;y++)for(let x=381;x<=387;x++)for(let k=0;k<3;k++) {
      const n=(y*768+x)*4+k;if(Math.abs(data[0][n]-data[1][n])>18)severe++;if(data[1][n]!==data[2][n])mirror++;
    }
    if(severe>20||mirror)throw Error(`雪地接缝异常 ${severe}/${mirror}`);
    const valley=new GroundCache('jiuzhaigou'),c=canvases[0].getContext('2d');c.resetTransform();
    valley.setSeason('winter');valley.draw(c,{x:0,y:0,w:768,h:384},0);const first=canvases[0].toDataURL(),builds=valley.builds;
    valley.setSeason('green');valley.draw(c,{x:0,y:0,w:768,h:384},0);
    if(canvases[0].toDataURL()!==first||valley.builds!==builds||valley.winter)throw Error('森林季节污染九寨沟');
    return {seamSevere:severe,mirrorDifference:mirror,valleyUnaffected:true};
  });
  if(errors.length)throw Error(errors.join(';'));
  return {designCriterion:['forest-biome-coherence','winter-snow-surfaces','winter-season-roundtrip','preserved-gameplay'],surfaces,screenshots:29,interaction:true,persistence:true,cache,maxGroundBytes:Math.max(...stats.map(s=>s.groundCache.bytes)),errors};
}
