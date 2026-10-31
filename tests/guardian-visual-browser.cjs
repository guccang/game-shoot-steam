// 受控同屏场景只用于隔离端口美术验收，动作仍由正式运行时和绘制器推进。
async page => {
  if(new URL(page.url()).port!=='4187')throw Error('隔离端口错误');
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    if(g.realm)g.leaveRealm();
    g.progress.weapons.fill(1);g.progress.vehicleHulls.fill(1);g.progress.funnelLoadout=[9,6,14];
    // 展示夹具独立于上一项验收的森林死亡或暂停状态。
    g.state='playing';g.player.hp=g.maxHp();
    // 固定选中带房屋、帐篷的森林区域，复核格位清理不会留下造景遮挡。
    g.random=()=>0;
    if(!g.enterRealm('guardian'))throw Error('守护展示夹具进入失败');g.realm.realmCoins=2000;g.random=Math.random;
    for(const [slot,kind,index,weapon]of [[0,'weapon',2,2],[1,'weapon',1,1],[2,'vehicle',0,0],[3,'vehicle',2,0],[4,'vehicle',1,3],[5,'weapon',12,12],[6,'vehicle',3,0],[7,'weapon',13,13]])g.guardianDefense('deploy',slot,kind,index,weapon);
    g.continueRealm();
    // 使用正式敌人和真实动画围绕中央女神布置同屏样本，随机刷怪另由规则测试验证。
    for(let i=0;i<12;i++){
      const angle=i*Math.PI/6, distance=220+(i%3)*15;
      const e=g.spawnEnemy(0,0,{x:g.realm.arena.x+Math.cos(angle)*distance,y:g.realm.arena.y+Math.sin(angle)*distance});
      Object.assign(e,{hp:10000,maxHp:10000,arena:g.player.arena,realm:true,goddessTarget:true,flying:false,speed:25,damage:1});
    }
    for(let n=0;n<50;n++)g.update(.05);
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    a.refresh();a.renderer.draw();
  });
  for(const [width,height,label]of [[1280,900,'desktop'],[390,844,'mobile']]){
    await page.setViewportSize({width,height});
    for(const time of ['day','night']){
      await page.evaluate(async time=>{
        const a=(await import('/src/main.js')).application;
        const {EnvironmentTransition}=await import('/src/world/environment.js');
        const {SceneTone}=await import('/src/rendering/scene-tone.js');
        Object.assign(a.renderer.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
        a.renderer.light=new EnvironmentTransition(a.renderer.environment,0);
        a.renderer.tone=new SceneTone(a.renderer.environment,0);
        a.renderer.resize();a.refresh();a.renderer.draw();
      },time);
      await page.screenshot({path:`output/playwright/guardian/all-${label}-${time}.png`});
    }
  }
  const samples=await page.evaluate(async()=>{
    const {renderVisualCase}=await import('/src/rendering/visual-review.js');
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=420;
    const c=canvas.getContext('2d'),out={};
    for(const id of ['guardian-field-day','guardian-field-night']){
      const frames=[];
      for(let n=0;n<8;n++){c.clearRect(0,0,480,420);await renderVisualCase(c,id,n/12);frames.push(canvas.toDataURL());}
      out[id]=new Set(frames).size;
      if(out[id]<6)throw Error('旋翼动作连续采样失败');
    }
    return out;
  });
  if(errors.length)throw Error(errors.join('\n'));
  return {designCriterion:['guardian-field-layout','guardian-defense-motion','guardian-day-night'],samples,errors};
}
