// 真实RAF新档自动游玩观察，使用正式键盘输入与交易；不替代真人体验结论。
async page => {
  if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
  if(!await page.evaluate(()=>!!window.economyPlaytest)){await page.reload();await page.locator('#start').click();}
  console.log(await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game;
    const prior=window.economyPlaytest;if(prior)clearInterval(prior.timer);
    const start=prior?.start||performance.now(),events=prior?.events||[];let ticks=0,deaths=prior?.deaths||0;
    const key=(code,type)=>window.dispatchEvent(new KeyboardEvent(type,{code,key:code,bubbles:true}));
    const directions=['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'];
    window.economyPlaytest={start,events,kind:'automated-real-RAF',deaths:0};
    window.economyPlaytest.timer=setInterval(()=>{
      if(document.hidden)return;
      directions.forEach(k=>key(k,'keyup'));
      const elapsed=(performance.now()-start)/1000;
      if(elapsed>=1800){clearInterval(window.economyPlaytest.timer);window.economyPlaytest.end=elapsed;window.economyPlaytest.progress=JSON.parse(JSON.stringify(g.progress));g.pause();return;}
      if(g.state==='dead'){deaths++;g.reset();g.start();window.economyPlaytest.deaths=deaths;}
      if(g.state==='playing'){
        // 围绕营地往返并远离最近怪物，真实碰撞和怪物AI仍然生效。
        const enemy=g.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y))[0];
        let direction=directions[Math.floor(ticks/5)%4];
        const target=g.boss||enemy||{x:900,y:700};let dx=target.x-g.player.x,dy=target.y-g.player.y;
        if(Math.hypot(dx,dy)<90){dx=-dx;dy=-dy;}
        direction=Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp';
        if(g.player.x<180)direction='ArrowRight';if(g.player.y<180)direction='ArrowDown';
        if(ticks%9===0)direction=directions[Math.floor(ticks/9)%4];
        key(direction,'keydown');
        if(ticks%15===0){
          g.transact('weapons',g.progress.weapon,'upgrade');g.transact('heroes',g.progress.hero,'upgrade');
          if(!g.progress.weapons[3])g.transact('weapons',3,'buy');
          if(g.player.hp>g.maxHp()*.8)g.summonBoss();
          a.refresh();events.push({seconds:elapsed,coins:g.progress.coins,wood:g.progress.wood,weapon:g.progress.weapons[g.progress.weapon],hero:g.progress.heroes[g.progress.hero],wave:g.wave,bosses:g.progress.bosses,kills:g.kills});
        }
      }
      ticks++;
    },1000);
    return {started:true,kind:window.economyPlaytest.kind};
  }));
}
