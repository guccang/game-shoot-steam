// 隔离场景用正式怪物管理器推进桥头群体，检查真实绘制与窄屏昼夜追击。
async(page)=>{
  if(new URL(page.url()).port!=='4219')throw Error('仅允许隔离验收端口');
  const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});
  await page.reload();await page.evaluate(async()=>{await (await import('/src/main.js')).application.ready;});
  await page.locator('#start').click();
  for(const [width,time] of [[1280,'day'],[390,'night'],[320,'day']]){
    await page.setViewportSize({width,height:1000});
    await page.evaluate(async({width,time})=>{
      const a=(await import('/src/main.js')).application,g=a.game;
      const {createEnemyAttack}=await import('/src/combat/enemy-attack.js');
      const {EnvironmentTransition}=await import('/src/world/environment.js');
      const {SceneTone}=await import('/src/rendering/scene-tone.js');
      // 固定玩家与补给，只推进正式追击/碰撞，避免刷怪和自动射击改变样本。
      g.update=()=>{};g.state='playing';g.realm=null;g.story=null;g.vehicle.active=false;
      Object.assign(g.player,{x:width<500?1360:1480,y:470,hp:g.maxHp(),invincible:999,flying:false,amphibious:false});
      g.enemies=[];g.remnants=[];g.enemyBolts=[];g.boss=null;
      for(let i=0;i<12;i++){
        const e=g.spawnEnemy(0,100);
        Object.assign(e,{id:i+1,x:1120-i%3*36,y:684+Math.floor(i/3)*32,
          type:'enemy',species:'slime',flying:false,hp:1000,maxHp:1000,radius:17,speed:50,assault:createEnemyAttack()});
      }
      Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
      a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);
      a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();
    },{width,time});
    await page.screenshot({path:`output/playwright/enemy-bridge-path/before-${width}-${time}.png`});
    // 分段记录沿桥推进，末帧读取所有单位的真实坐标和攻击阶段。
    for(const seconds of [3,9,28]){
      const r=await page.evaluate(async seconds=>{
        const a=(await import('/src/main.js')).application,g=a.game;
        const {updateEnemies}=await import('/src/core/enemy-manager.js');
        const {terrainBlocked}=await import('/src/physics/terrain-navigation.js');
        for(let i=0;i<seconds*60;i++){
          g.time+=1/60;updateEnemies(g,1/60,{...g.player});
          if(g.enemies.some(e=>terrainBlocked(e.x,e.y,12)))throw Error('出现穿水');
        }
        a.refresh();a.renderer.draw();
        return g.enemies.map(e=>({id:e.id,x:e.x,y:e.y,phase:e.assault.phase}));
      },seconds);
      await page.screenshot({path:`output/playwright/enemy-bridge-path/step-${seconds}-${width}-${time}.png`});
      if(seconds===28){
        if(r.some(e=>Math.hypot(e.x-(width<500?1360:1480),e.y-470)>140))
          throw Error('仍有怪物未过桥接近玩家 '+JSON.stringify(r));
        results.push({width,time,enemies:r});
      }
    }
  }
  if(errors.length)throw Error(errors.join('\n'));
  return{results,errors};
}
