// 浏览器使用真实移动、蓄能和绘制路径验证锁定跟踪，余辉期间也必须绘制新目标。
async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.reload();await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const results=[];
  for(const weapon of [8,9]) {
    results.push(await page.evaluate(async(weapon)=>{
      const {application:a}=await import('/src/main.js');a.destroy();const g=a.game,r=a.renderer;
      const {updateAimLock}=await import('/src/combat/targeting.js');
      const {sniperGuide}=await import('/src/combat/aim.js');
      g.progress.weapon=weapon;g.progress.weapons[weapon]=1;g.reset();g.state='playing';
      g.trees=[];g.enemies=[];g.aimLock=null;g.spawnTimer=999;g.random=()=>.5;
      Object.assign(g.player,{x:900,y:850});
      // 目标分组固定，后续横移不得被侧面目标抢锁。
      const enemy=(id,x,y)=>({id,type:'enemy',x,y,hp:5000,maxHp:5000,radius:17,mass:1,speed:0,phase:0,rank:0,biome:'pine'});
      g.enemies=[enemy(1,900,500),enemy(2,900,450),enemy(3,900,350),enemy(4,500,850)];
      updateAimLock(g);const ids=[...g.aimLock.memberIds];
      for(let i=0;i<146;i++){
        g.update(1/120,{x:1,y:0});r.draw();
        if(!g.findAttackTarget()||!g.aimLock.memberIds.every(id=>ids.includes(id)))throw Error('移动打断或抢走瞄准');
        if(weapon===9&&i===107&&g.pulse.charge<.89)throw Error('走位重置脉冲蓄能');
      }
      const beam=g.shots.find(s=>s.kind==='pulse-beam'),origin=beam?{x:beam.x,y:beam.y}:null;
      if(weapon===9&&!beam)throw Error('脉冲未能在移动中发射');
      for(const t of g.enemies.filter(t=>ids.includes(t.id)))g.hit(t,10000,false);
      g.update(1/120,{x:1,y:0});a.refresh();
      const guide=sniperGuide(g);if(guide.target?.id!==4)throw Error('击杀后未立即选取侧面目标');
      // 捕获真实画布文字，确认能量束尚在时新准星距离标记已进入渲染。
      const c=r.canvas.getContext('2d'),original=c.fillText,texts=[];
      c.fillText=function(text,...args){texts.push(String(text));return original.call(this,text,...args);};
      try{r.draw();}finally{c.fillText=original;}
      if(!texts.includes(`${Math.round(guide.distance)} 距离`))throw Error('余辉阻挡了新瞄准线');
      if(beam&&(beam.x!==origin.x||beam.y!==origin.y))throw Error('重选目标修改了已发射能量束');
      return {weapon,moved:g.player.x-900,retarget:guide.target.id,guideVisible:true,beamStillVisible:!!beam};
    },weapon));
    await page.screenshot({path:`output/playwright/aim-tracking-${weapon}.png`});
  }
  if(errors.length)throw Error(errors.join(';'));
  return {results,errors};
}
