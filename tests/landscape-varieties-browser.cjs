// 六组实际景观验收：所有山湖的手机昼夜同屏，以及正式绘制器生成的整组图鉴。
async (page) => {
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.evaluate(async()=>{
    (await import('/src/main.js')).application.destroy();
    const {freshProgress}=await import('/src/progression/progress.js');
    localStorage.setItem('forest-patrol-v1',JSON.stringify(freshProgress()));
  });
  await page.reload();await page.locator('#start').click();
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;
    a.destroy();a.game.onEvent=()=>{};
    const {catSprites}=await import('/src/rendering/cat-animation.js');
    if(!await catSprites.load())throw Error('猫猫图集缺失');
  });
  for(const mobile of [false,true]) {
    await page.setViewportSize(mobile?{width:390,height:844}:{width:1100,height:1150});
    for(const id of Array.from({length:6},(_,i)=>`lake-${i}`))for(const time of ['day','night']) {
      const stats=await page.evaluate(async({id,time,mobile})=>{
        const a=(await import('/src/main.js')).application,g=a.game;
        const {NATURAL_TERRAIN}=await import('/src/world/natural-terrain.js');
        const {EnvironmentTransition}=await import('/src/world/environment.js');
        const {SceneTone}=await import('/src/rendering/scene-tone.js');
        const {WEAPONS}=await import('/src/config/weapons.js');
        const item=NATURAL_TERRAIN.obstacles.find(i=>i.id===id);
        g.reset();g.state='playing';g.progress.weapon=mobile?0:WEAPONS.findIndex(w=>w.id==='sniper');
        g.player.x=item.x;g.player.y=item.y+(item.kind==='lake'?item.ry+95:95);
        g.summonVehicle();g.spawnEnemy(0,0,{x:g.player.x-110,y:g.player.y+45});
        Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
        a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);
        a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();
        return {view:a.renderer.view,cache:a.renderer.ground.stats(),scenery:a.renderer.diagnosticInfo().scenery};
      },{id,time,mobile});
      if(stats.cache.count>32||stats.scenery.bytes>8*1024*1024)throw Error('场景缓存超出预算');
      await page.screenshot({path:`output/playwright/varieties/${id}-${time}-${mobile?'mobile':'wide'}.png`});
    }
  }
  // 图鉴直接绘制世界组团，展示实际树种、山峰、沙岸；不制作独立美术示意图。
  await page.setViewportSize({width:1440,height:1100});
  const gallery=await page.evaluate(async()=>{
    const {renderVisualCase}=await import('/src/rendering/visual-review.js');
    const {NATURAL_TERRAIN}=await import('/src/world/natural-terrain.js');
    const {MOUNTAIN_VARIANTS,LAKE_VARIANTS,BEACH_VARIANTS,FOREST_VARIANTS}=await import('/src/world/landscape-variants.js');
    const canvas=document.createElement('canvas');canvas.id='landscape-gallery';canvas.width=1440;canvas.height=1100;
    canvas.style.cssText='position:fixed;inset:0;z-index:99999;width:1440px;height:1100px;background:#eee9d6';document.body.append(canvas);
    const c=canvas.getContext('2d'),hashes=[];
    for(let i=0;i<6;i++) {
      const tile=document.createElement('canvas');tile.width=480;tile.height=500;
      await renderVisualCase(tile.getContext('2d'),`landscape-group-${i}`,1);
      c.drawImage(tile,(i%3)*480,Math.floor(i/3)*550);
      hashes.push(tile.toDataURL());
      c.fillStyle='#f4efdb';c.fillRect((i%3)*480,Math.floor(i/3)*550+500,480,50);
      c.fillStyle='#365840';c.font='16px sans-serif';
      const r=NATURAL_TERRAIN.recipes[i];
      const names=[MOUNTAIN_VARIANTS,LAKE_VARIANTS,BEACH_VARIANTS].map((catalog,j)=>catalog.find(v=>v.id===r[['mountain','lake','beach','forest'][j]]).name);
      c.fillText(`${i+1}  ${names.join(' · ')}`,(i%3)*480+10,Math.floor(i/3)*550+530);
    }
    if(new Set(hashes).size!==6)throw Error('六组景观输出重复');
    return {groups:hashes.length};
  });
  await page.screenshot({path:'output/playwright/varieties/gallery-day.png'});
  await page.evaluate(async()=>{
    const {renderVisualCase}=await import('/src/rendering/visual-review.js');
    const c=document.querySelector('#landscape-gallery').getContext('2d');
    for(let i=0;i<6;i++) {
      const tile=document.createElement('canvas');tile.width=480;tile.height=500;
      await renderVisualCase(tile.getContext('2d'),`landscape-group-${i}-night`,1);
      c.drawImage(tile,(i%3)*480,Math.floor(i/3)*550);
    }
  });
  await page.screenshot({path:'output/playwright/varieties/gallery-night.png'});
  await page.evaluate(()=>document.querySelector('#landscape-gallery').remove());
  // 高低动态都沿正式萤火虫模拟器采样，不通过静图伪造夜景。
  const motion=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;
    const field=a.renderer.fireflies.field,shore=field.points.filter(p=>p.habitat),before=shore.map(p=>[p.x,p.y]);
    field.advance(0);for(let i=1;i<=120;i++)field.advance(i/60);
    const changed=shore.filter((p,i)=>Math.hypot(p.x-before[i][0],p.y-before[i][1])>1).length;
    const frozen=JSON.stringify(field.points);field.advance(3,true);
    if(JSON.stringify(field.points)!==frozen||changed<16)throw Error('萤火虫独立漂浮或低动态冻结失败');
    return {shore:shore.length,total:field.points.length,changed};
  });
  const review=await page.evaluate(async()=>{
    const {renderVisualCase}=await import('/src/rendering/visual-review.js');
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=520;
    const c=canvas.getContext('2d'),frames=new Set();
    for(const id of ['landscape-mountain','landscape-lake','landscape-lake-night'])for(let i=0;i<4;i++) {
      c.clearRect(0,0,640,520);await renderVisualCase(c,id,i*.5);
      if(id==='landscape-lake-night')frames.add(canvas.toDataURL());
    }
    if(frames.size!==4)throw Error('夜间景观工作台没有连续漂浮帧');
    return {nightFrames:frames.size};
  });
  const seams=await page.evaluate(async()=>{
    const {paintGround}=await import('/src/rendering/ground-art.js');
    const {GroundCache}=await import('/src/rendering/ground-cache.js');
    const view={x:1536,y:1152,w:768,h:384};
    const surfaces=[0,1,2].map(()=>{const c=document.createElement('canvas');c.width=768;c.height=384;return c;});
    for(const [i,canvas] of surfaces.entries()) {
      const c=canvas.getContext('2d',{willReadFrequently:true});
      c.translate(-view.x-(i===2?3600:0),-view.y);
      if(i===0)paintGround(c,view);else new GroundCache().draw(c,{...view,x:view.x+(i===2?3600:0)},0);
    }
    const data=surfaces.map(s=>s.getContext('2d').getImageData(0,0,768,384).data);
    let severe=0,mirror=0;
    for(let y=10;y<374;y++)for(let x=381;x<=387;x++)for(let k=0;k<3;k++) {
      const n=(y*768+x)*4+k;
      if(Math.abs(data[0][n]-data[1][n])>18)severe++;
      if(data[1][n]!==data[2][n])mirror++;
    }
    if(severe>20||mirror>0)throw Error('景观地块接缝或周期镜像不一致 '+JSON.stringify({severe,mirror}));
    return {severe,mirror};
  });
  if(errors.length)throw Error(errors.join('\n'));
  return {gallery,motion,review,seams,errors};
}
