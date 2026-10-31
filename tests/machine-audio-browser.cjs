// 隔离端口验证真实手势解锁、正式攻击音色、怠速恢复与暂停清理，不接触玩家存档。
async (page) => {
  if(new URL(page.url()).port!=='4216')throw Error('仅允许隔离端口');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.reload();await page.locator('#start').click();
  await page.locator('#settings-button').click();if(await page.locator('#sound').getAttribute('aria-pressed')!=='true') await page.locator('#sound').click();
  await page.locator('#music-volume').fill('0');await page.locator('#close-settings').click();
  await page.waitForFunction(async()=>(await import('/src/main.js')).application.audio.diagnostics.contextState==='running');
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,play=a.audio.play,handle=a.game.onEvent;
    window.acceptedSounds=[];
    a.audio.play=kind=>{const accepted=play(kind);if(accepted)window.acceptedSounds.push(kind);return accepted;};
    a.game.onEvent=(type,data)=>handle(type,data);
  });
  const results=[];
  for(const width of [390,1280]){
    await page.setViewportSize({width,height:844});
    for(const [index,kind] of [[0,'vehicle-machinegun'],[1,'tank-125'],[2,'vehicle-vulcan'],[3,'hover-tide'],[15,'mechanical-core'],[16,'mechanical-spider']]){
      await page.evaluate(async index=>{
        const a=(await import('/src/main.js')).application,g=a.game;
        g.progress.weapons.fill(1);g.progress.vehicleHulls.fill(1);g.progress.vehicleWeapons.fill(1);
        g.progress.weapon=index<4?0:index;g.progress.vehicleIndex=index<4?index:0;
        if(index<4)g.progress.vehicleLoadouts[index]=17+index;
        g.reset();g.start();g.random=()=>.5;g.player.invincible=999;g.spawnTimer=999;
        g.trees=[];g.enemies=[];g.boss=null;g.updateWaves=()=>{};
        Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:1000}});
        window.acceptedSounds=[];
        if(index<4)g.summonVehicle();
        const e=g.spawnEnemy(0,0,{x:1030,y:750});
        Object.assign(e,{hp:1e8,maxHp:1e8,speed:0,damage:0,flying:false,arena:g.player.arena});
        a.refresh();
      },index);
      await page.waitForFunction(kind=>window.acceptedSounds.includes(kind),kind,{timeout:15000});
      const result=await page.evaluate(async({kind,index})=>{
        const a=(await import('/src/main.js')).application;
        const {renderSound}=await import('/src/platform/audio-sounds.js');
        const context=new OfflineAudioContext(1,88200,44100),buffer=renderSound(context,kind),source=context.createBufferSource();
        source.buffer=buffer;source.connect(context.destination);source.start();
        const data=(await context.startRendering()).getChannelData(0);
        const peak=data.reduce((m,v)=>Math.max(m,Math.abs(v)),0);
        if(!(peak>.05&&peak<1))throw Error('音频输出异常 '+kind);
        if(index<4&&!window.acceptedSounds.includes(`vehicle-start-${index}`))throw Error('缺少车型启动声');
        return {kind,peak,sounds:[...new Set(window.acceptedSounds)],diagnostics:a.audio.diagnostics};
      },{kind,index});
      results.push({width,...result});
    }
  }
  // 通过真实键盘移动验证停步后的怠速，不用直接改音频参数模拟。
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;g.enemies=[];g.progress.vehicleIndex=1;g.summonVehicle();a.refresh();
  });
  await page.keyboard.down('d');await page.waitForTimeout(500);
  const moving=await page.evaluate(async()=>(await import('/src/main.js')).application.audio.diagnostics.engineRate);
  await page.keyboard.up('d');await page.waitForTimeout(1200);
  const idle=await page.evaluate(async()=>(await import('/src/main.js')).application.audio.diagnostics.engineRate);
  if(!(moving>idle&&Math.abs(idle-.85)<.02))throw Error(`怠速未恢复 ${moving}/${idle}`);
  await page.locator('#settings-button').click();
  await page.waitForFunction(async()=>(await import('/src/main.js')).application.audio.diagnostics.voices===0);
  await page.locator('#sound').click();await page.locator('#close-settings').click();
  await page.waitForFunction(async()=>(await import('/src/main.js')).application.audio.diagnostics.voices===0);
  if(errors.length)throw Error(errors.join(';'));
  return {results,moving,idle,paused:true,muted:true,errors};
}
