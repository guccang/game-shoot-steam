// 独立端口验证新能量表现、低动态降级、暂停冻结和真实像素安全范围。
async (page) => {
  if(new URL(page.url()).port!=='4174') throw Error('请使用隔离端口 4174');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.reload();await page.emulateMedia({reducedMotion:'no-preference'});
  const checks=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;a.destroy();
    const {drawFunnelArray}=await import('/src/rendering/funnel.js');
    const {drawFunnelBurst}=await import('/src/rendering/funnel-effects.js');
    const {createFunnelState,FUNNEL_OPEN,FUNNEL_CHARGING}=await import('/src/combat/funnel.js');
    const canvas=document.createElement('canvas');canvas.width=canvas.height=400;
    const c=canvas.getContext('2d',{willReadFrequently:true});
    let radius=0, samples=0;
    // 覆盖聚能、最高后坐、发射余辉和充能弧，不把攻击连线计入角色包围盒。
    for(const charging of [false,true])for(let direction=0;direction<16;direction++)for(const kick of [0,8]) {
      const s=createFunnelState();s.deploy=0;s.primed=true;s.time=1.37;s.charging=charging;
      s.nodes.forEach((n,i)=>{
        [n.x,n.y]=(charging?FUNNEL_CHARGING:FUNNEL_OPEN)[i];
        const length=Math.hypot(n.x,n.y);n.x*=80/length;n.y*=80/length;
        n.angle=direction*Math.PI/8;n.cooldown=.06;n.targetPoint={x:100,y:100};n.recoil.kick=kick;n.recoil.flash=.14;
      });
      const before=JSON.stringify(s);c.clearRect(0,0,400,400);drawFunnelArray(c,{x:200,y:200},s,false);
      if(JSON.stringify(s)!==before)throw Error('渲染改变了战斗数据');
      const pixels=c.getImageData(0,0,400,400).data;
      for(let y=0;y<400;y++)for(let x=0;x<400;x++)if(pixels[(y*400+x)*4+3]>3)radius=Math.max(radius,Math.hypot(x-200,y-200));
      samples++;
    }
    if(radius>110)throw Error('特效超出 110 单位安全圈: '+radius);
    const s=createFunnelState();s.charging=true;s.time=.3;s.nodes.forEach((n,i)=>{[n.x,n.y]=FUNNEL_CHARGING[i];});
    c.clearRect(0,0,400,400);drawFunnelArray(c,{x:200,y:200},s,false);const frame1=canvas.toDataURL();
    s.time=.6;c.clearRect(0,0,400,400);drawFunnelArray(c,{x:200,y:200},s,false);
    if(frame1===canvas.toDataURL())throw Error('回流没有运动');
    c.clearRect(0,0,400,400);drawFunnelArray(c,{x:200,y:200},s,true);const reduced=canvas.toDataURL();
    s.time=3;c.clearRect(0,0,400,400);drawFunnelArray(c,{x:200,y:200},s,true);
    if(reduced!==canvas.toDataURL())throw Error('低动态回流仍在闪动');
    c.clearRect(0,0,400,400);c.save();c.translate(200,200);drawFunnelBurst(c,{size:32},.1,false);c.restore();const burst1=canvas.toDataURL();
    c.clearRect(0,0,400,400);c.save();c.translate(200,200);drawFunnelBurst(c,{size:32},.7,false);c.restore();
    if(burst1===canvas.toDataURL())throw Error('命中爆裂没有扩散');
    return {samples,maxRadius:radius,returnFlow:true,reduced:true,burst:true};
  });
  for(const size of [{width:320,height:568},{width:390,height:844},{width:580,height:928}]) {
    await page.setViewportSize(size);
    for(const phase of ['gather','fire','charge','night-charge']) {
      await page.evaluate(async({phase})=>{
        const a=(await import('/src/main.js')).application,g=a.game,r=a.renderer;
        const {EnvironmentTransition}=await import('/src/world/environment.js');
        g.progress.weapon=12;g.progress.weapons[12]=1;g.progress.mods[12]=0;g.progress.mastery[12]=0;
        g.reset();g.start();g.random=()=>.5;g.enemies=[];g.spawnTimer=999;g.reducedMotion=false;
        g.trees=g.trees.filter(t=>Math.hypot(t.x-g.player.x,t.y-g.player.y)>430);
        for(const angle of [-2.8,-1.1,.15]) {g.spawnEnemy(angle,160);const e=g.enemies.at(-1);e.speed=0;e.hp=e.maxHp=10000;}
        const end=phase==='gather'?1.35:1.55;
        for(let t=0;t<end-1e-8;t+=1/120)g.update(1/120);
        if(phase.includes('charge')) {
          g.magazines[12].modules.forEach(m=>Object.assign(m,{ammo:0,remaining:2.2}));
          for(let i=0;i<60;i++)g.update(1/120);
        }
        Object.assign(a.environment,{time:phase==='night-charge'?'night':'day',weather:phase==='night-charge'?'rain':'sun',autoTime:false,autoWeather:false});
        r.light=new EnvironmentTransition(a.environment,performance.now());
        document.getElementById('environment-button').textContent=phase==='night-charge'?'☾ 夜晚 · 小雨':'☀ 白昼 · 晴朗';
        r.resize();r.draw();a.refresh();document.getElementById('toast').hidden=true;
        const before=JSON.stringify([g.funnel,g.fx.items,g.magazines[12]]);
        g.pause();g.update(.05);r.draw();
        if(JSON.stringify([g.funnel,g.fx.items,g.magazines[12]])!==before)throw Error('暂停仍推进聚能或回流');
        g.pause();
      },{phase});
      await page.screenshot({path:`output/playwright/funnel-fx-${size.width}-${phase}.png`});
    }
  }
  // 同屏预览直接复用实战绘制函数，让聚能、错峰后坐、回流和爆裂便于对照。
  await page.evaluate(async()=>{
    const {drawFunnelArray}=await import('/src/rendering/funnel.js');
    const {drawFunnelBurst}=await import('/src/rendering/funnel-effects.js');
    const {drawCat}=await import('/src/rendering/characters.js');
    const {createFunnelState,FUNNEL_OPEN,FUNNEL_CHARGING}=await import('/src/combat/funnel.js');
    const sheet=document.createElement('canvas');sheet.id='funnel-fx-sheet';sheet.width=1120;sheet.height=340;
    sheet.style='position:fixed;inset:0;z-index:9999;width:1120px;height:340px';document.body.append(sheet);
    const c=sheet.getContext('2d');c.fillStyle='#f4f1e1';c.fillRect(0,0,1120,340);
    const labels=['炮口聚能','错峰后坐 · 炮口冲击','共享充能 · 能量回流','命中 · 能量爆裂'];
    for(let i=0;i<4;i++) {
      c.save();c.translate(i*280,0);c.fillStyle=i===2?'#315560':'#afc58c';c.fillRect(10,48,260,278);
      c.fillStyle='#315347';c.font='bold 16px Microsoft YaHei';c.fillText(labels[i],17,30);
      if(i===3) {
        c.save();c.translate(140,170);c.scale(2.3,2.3);drawFunnelBurst(c,{size:32},.14);c.restore();
      } else {
        c.translate(140,235);c.scale(1.65,1.65);
        const s=createFunnelState();s.primed=true;s.deploy=0;s.charging=i===2;s.time=1.35;
        s.nodes.forEach((n,k)=>{
          [n.x,n.y]=(s.charging?FUNNEL_CHARGING:FUNNEL_OPEN)[k];n.angle=[-2.5,-1.2,-.3][k];n.targetPoint={x:0,y:-150};
          n.cooldown=i===0?.03+k*.06:.03;
          if(i===1&&k<2){n.recoil.flash=.12-k*.05;n.recoil.kick=7-k*3;n.cooldown=.8;}
        });
        drawCat(c,0,0,0,-.3,1.05,0,12);drawFunnelArray(c,{x:0,y:0},s,false);
      }
      c.restore();
    }
  });
  await page.setViewportSize({width:1120,height:340});
  await page.screenshot({path:'output/playwright/funnel-fx-overview.png'});
  await page.evaluate(()=>document.getElementById('funnel-fx-sheet').remove());
  if(errors.length)throw Error(errors.join(';'));
  return {checks,phoneSizes:[320,390,580],pause:true,errors};
}
