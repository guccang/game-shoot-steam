// 浏览器验证区域地图、循环渲染、移动端布局与真实图集播放，并输出检查图片。
async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});await page.reload();
  await page.locator('#start').click();await page.locator('#map-button').click();
  if(await page.locator('#auto-label').innerText()!=='巡游已暂停')throw Error('地图未暂停');
  if(await page.locator('#region-legend>div').count()!==4)throw Error('缺少四个分区');
  await page.screenshot({path:'output/playwright/world-map-mobile.png'});await page.locator('#map-done').click();await page.waitForFunction(()=>document.getElementById('auto-label').textContent==='自动攻击中');
  await page.screenshot({path:'output/playwright/world-forest-mobile.png'});
  await page.setViewportSize({width:320,height:568});await page.locator('#map-button').click();
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.getElementById('map-dialog').scrollWidth>document.getElementById('map-dialog').clientWidth))throw Error('窄屏地图溢出');await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.getElementById('auto-label').textContent==='自动攻击中');
  const result=await page.evaluate(async()=>{
    const {Game,freshProgress}=await import('/src/game.js');const {Renderer}=await import('/src/render.js');const {BIOMES,enemyIdentity}=await import('/src/world/biomes.js');const {getMonsterAtlas,drawMonsterSprite,monsterFrame}=await import('/src/rendering/monster-atlas.js');const {applyImpulse,stepBodies}=await import('/src/physics/motion.js');const {WORLD}=await import('/src/world/coordinates.js');
    const g=new Game(freshProgress(),()=>.5);g.enemies=[];const scene=document.createElement('canvas');scene.width=360;scene.height=480;const renderer=new Renderer(scene,g,{time:'day',weather:'sun'});renderer.width=360;renderer.height=480;renderer.dpr=1;
    const c=scene.getContext('2d',{willReadFrequently:true});g.player.x=900;g.player.y=700;renderer.draw();const first=c.getImageData(0,0,360,480).data.slice();g.player.x+=1800;g.player.y-=1400;renderer.draw();const second=c.getImageData(0,0,360,480).data;let difference=0;for(let i=0;i<first.length;i++)difference+=Math.abs(first[i]-second[i]);if(difference/first.length>1)throw Error('循环镜像画面不一致');
    // 地图接缝四角与河流上下游均保持全屏覆盖。
    for(const [x,y] of [[0,0],[1800,1400],[1799,700],[1250,1399],[-1,-1]]){g.player.x=x;g.player.y=y;renderer.draw();const pixels=c.getImageData(0,0,360,480).data;for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==255)throw Error('地图接缝露白');}
    const gallery=document.createElement('canvas');gallery.width=1080;gallery.height=1080;gallery.style='position:fixed;inset:0;z-index:99999;width:1080px;height:1080px';document.body.append(gallery);const out=gallery.getContext('2d');out.fillStyle='#f5f0df';out.fillRect(0,0,1080,1080);
    // 四区共用真实场景绘制，观察林种、道路与怪物等级是否一致。
    for(let i=0;i<4;i++){const zone=BIOMES[i];g.player.x=zone.x;g.player.y=zone.y;g.enemies=[0,1,2].map((rank,n)=>({id:900+n,type:'enemy',x:zone.x-80+n*70,y:zone.y+100,...enemyIdentity(zone.x,zone.y,[.5,.8,.99][rank]),radius:17,maxHp:999,phase:0}));renderer.draw();out.drawImage(scene,0,0,360,480,i%2*540,Math.floor(i/2)*340,540,320);out.fillStyle='#36523e';out.font='bold 17px sans-serif';out.fillText(zone.name+' · Lv.'+zone.range,i%2*540+14,Math.floor(i/2)*340+335);}
    const bodies=[0,1,2].map(i=>({id:i,type:'enemy',x:50+i*48,y:120,hp:1000,mass:1,radius:17,biome:'meadow',rank:0}));applyImpulse(bodies[0],{x:1,y:0},75);let elapsed=0;
    for(let f=0;f<4;f++){const target=[0,.12,.3,.65][f];while(elapsed<target-1e-8){stepBodies(bodies,1/120,WORLD);elapsed+=1/120;}out.save();out.translate(f*270,700);out.fillStyle='#dfe6ba';out.fillRect(5,0,260,190);out.fillStyle='#3d5944';out.font='bold 15px sans-serif';out.fillText(['撞击','腾空传力','连锁滚地','摩擦收势'][f],15,25);for(const b of bodies){out.save();out.translate(b.x,110);out.fillStyle='#40533725';out.beginPath();out.ellipse(0,4,20,6,0,0,7);out.fill();drawMonsterSprite(out,b,elapsed);out.restore();}out.restore();}
    // 图集验证裁切帧不同，24FPS 播放并保留统一脚底锚点。
    out.fillStyle='#3a5541';out.font='bold 16px sans-serif';out.fillText('24 FPS 图集 · 滚地帧序列',20,925);const atlas=getMonsterAtlas('pine',2);for(let i=0;i<8;i++){const frame=monsterFrame('roll',i/24);out.drawImage(atlas,frame.x,frame.y,96,96,20+i*130,940,96,96);}
    return {seamPixelDifference:difference/first.length,regions:4,frames:8,coverage:true};
  });
  await page.setViewportSize({width:1080,height:1080});await page.screenshot({path:'output/playwright/world-impact-contact-sheet.png'});await page.reload();if(errors.length)throw Error(errors.join(';'));return {...result,mapPauseResume:true,mobileOverflow:false,errors};
}
