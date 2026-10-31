// 真实装填计时驱动角色头顶圆环，检查暂停、移动、切枪和完成后的隐藏。
async (page) => {
  await page.reload();await page.setViewportSize({width:390,height:844});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{
    const {application:a}=await import('/src/main.js');a.destroy();const g=a.game;
    g.progress.weapon=0;g.reset();g.state='playing';g.enemies=[];g.spawnTimer=999;g.attackTimer=999;
    g.trees=[];g.addTree(1040,700,{hp:10000,maxHp:10000});
    g.magazines[0].ammo=1;g.attack();g.trees=[];
    window.ringTest={a,g};
  });
  const stages=[];
  for(const count of [36,36,36]){
    stages.push(await page.evaluate(count=>{
      const {a,g}=ringTest;for(let i=0;i<count;i++)g.update(1/120,{x:0,y:1});
      a.refresh();
      const c=a.renderer.c, original=c.arc, arcs=[];
      c.arc=function(x,y,r,start,end,...rest){if(r===18.5)arcs.push({start,end,transform:[this.getTransform().e,this.getTransform().f]});return original.call(this,x,y,r,start,end,...rest);};
      try{a.renderer.draw();}finally{c.arc=original;}
      if(arcs.length!==2)throw Error('头顶环未绘制');
      const ring=arcs[1], progress=(ring.end-ring.start)/(Math.PI*2),expected=1-g.magazines[0].remaining/1.2;
      if(Math.abs(progress-expected)>1e-8)throw Error('圆环与装填计时不同步');
      const view=a.renderer.view,dpr=a.renderer.dpr;
      if(Math.abs(ring.transform[0]-(g.player.x-view.x)*view.zoom*dpr)>.01||Math.abs(ring.transform[1]-((g.player.y-view.y)*view.zoom-80)*dpr)>.01)throw Error('圆环未跟随角色');
      return {progress,playerY:g.player.y};
    },count));
    await page.screenshot({path:`output/playwright/reload-ring-${stages.length}.png`});
  }
  const result=await page.evaluate(()=>{
    const {a,g}=ringTest;
    g.pause();const before=g.magazines[0].remaining;for(let i=0;i<100;i++)g.update(1/60);
    if(g.magazines[0].remaining!==before)throw Error('暂停圆环继续计时');
    g.pause();g.progress.weapons[3]=1;g.transact('weapons',3,'equip');
    // 计数实际合成中的圆环，满夹武器、完成装填和死亡均不显示。
    const countRings=()=>{const c=a.renderer.c,original=c.arc;let count=0;c.arc=function(x,y,r,...args){if(r===18.5)count++;return original.call(this,x,y,r,...args);};try{a.renderer.draw();}finally{c.arc=original;}return count;};
    if(countRings()!==0)throw Error('切枪仍显示旧弹夹');
    g.transact('weapons',0,'equip');if(countRings()!==2)throw Error('切回未恢复旧装填进度');
    for(let i=0;i<40;i++)g.update(1/120);
    if(g.magazines[0].ammo!==12||countRings()!==0)throw Error('装填完成圆环未隐藏');
    g.magazines[0].ammo=0;g.magazines[0].remaining=.6;g.state='dead';if(countRings()!==0)throw Error('倒下后仍显示装填');
    g.state='playing';a.refresh();return {paused:true,switched:true,completed:true};
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(()=>{ringTest.a.renderer.resize();ringTest.a.renderer.draw();ringTest.a.refresh();});
  await page.screenshot({path:'output/playwright/reload-ring-320.png'});
  if(errors.length)throw Error(errors.join(';'));
  return {stages,...result,errors};
}
