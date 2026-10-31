// 浏览器分阶段验证怪物前摇、扑击、走位躲避和回位，并保留可审阅截图。
async (page) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:1000});await page.reload();
  const results=await page.evaluate(async()=>{
    const {Game,freshProgress}=await import('/src/game.js');
    const {Renderer}=await import('/src/render.js');
    const host=document.createElement('div');host.id='lunge-review';host.style.cssText='position:absolute;z-index:100;top:0;left:0;width:1160px;padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f2f1e1';document.body.append(host);
    const scenarios=[['前摇 · 锁定红色路线',.3,false,false],['扑击 · 站立不动会受伤',.6,false,false],['走位 · 横向移开成功躲避',.6,true,false],['回位 · 扑空退回起点',.82,true,false],['收招 · 原地短暂停顿',1.08,true,false],['精英 · 更长的蓄力前摇',.45,false,true]];
    const results=[];
    for(const [title,duration,dodge,tough] of scenarios){
      const cell=document.createElement('div'),label=document.createElement('p'),canvas=document.createElement('canvas');label.textContent=title;label.style.cssText='font:600 16px Microsoft YaHei;color:#49603b;margin:6px';canvas.style.cssText='display:block;width:560px;height:260px;border-radius:12px';cell.append(label,canvas);host.append(cell);
      const g=new Game(freshProgress(),()=>tough?.8:.5);g.start();g.trees=[];g.enemies=[];g.attackTimer=g.spawnTimer=99;g.spawnEnemy(0,80);const e=g.enemies[0];e.hp=e.maxHp=1000;g.update(.01);
      // 只横移前 0.3 秒，随后停下观察回位，让整个攻击过程留在镜头内。
      let remaining=duration;while(remaining>1e-8){const dt=Math.min(1/120,remaining);g.update(dt,{x:0,y:dodge&&duration-remaining<.3?1:0});remaining-=dt;}
      const r=new Renderer(canvas,g,{time:'day',weather:'sun'});r.resize();r.draw();
      if(dodge&&g.player.hp!==g.maxHp())throw Error('横向走位没有避开伤害');
      if(title.startsWith('扑击')&&g.player.hp!==g.maxHp()-8)throw Error('站立目标未受到一次伤害');
      results.push({title,phase:e.assault.phase,hp:g.player.hp,x:e.x,origin:e.assault.originX});
      if(title.startsWith('收招')){if(e.x!==e.assault.originX)throw Error('未精确回位');}
      // 浏览器测试临时持有场景，仅用于随后核验窄屏与低动态绘制。
      if(title.startsWith('前摇'))window.__lungeReview={g,r,canvas};
    }
    return results;
  });
  await page.locator('#lunge-review').screenshot({path:'output/playwright/enemy-lunge-stages.png'});
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{
    const {r,canvas}=window.__lungeReview,host=document.getElementById('lunge-review');
    host.replaceChildren(canvas);host.style.cssText='position:absolute;z-index:100;top:0;left:0;width:390px;background:#f2f1e1';canvas.style.cssText='display:block;width:390px;height:600px';r.resize();r.draw();
  });
  await page.locator('#lunge-review').screenshot({path:'output/playwright/enemy-lunge-mobile-reduced.png'});
  await page.evaluate(()=>{document.getElementById('lunge-review').remove();delete window.__lungeReview;});
  if(errors.length)throw Error(errors.join('; '));return {results,mobile:true,reducedMotion:true,errors};
}
