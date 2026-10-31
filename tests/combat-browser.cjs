// 在真实 Canvas 中分解实弹、命中、死亡和穿透画面，检查生产渲染及低动态模式。
async (page) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.reload();
  const result = await page.evaluate(async () => {
    const { Game, freshProgress } = await import('/src/game.js');
    const { Renderer } = await import('/src/render.js');
    const host = document.createElement('div'); host.id = 'combat-review';
    host.style.cssText = 'position:absolute;z-index:100;top:0;left:0;width:1200px;display:grid;grid-template-columns:1fr 1fr;background:#eff0d8;padding:12px;gap:12px'; document.body.append(host);
    const titles = ['手枪 · 弹体飞行，尚未扣血', '手枪 · 命中与定向碎屑', '手枪 · 击杀扩散', '树林 · 木片与树桩', '激光 · 脉冲穿透', '领主 · 击败爆散'];
    const states = [];
    for (let i = 0; i < 6; i++) {
      const cell = document.createElement('div'), label = document.createElement('p'), canvas = document.createElement('canvas');
      label.textContent = titles[i]; label.style.cssText = 'margin:4px;font:600 16px Microsoft YaHei;color:#405e40';
      canvas.style.cssText = 'width:580px;height:290px;display:block;border-radius:12px'; cell.append(label, canvas); host.append(cell);
      const progress = freshProgress(); progress.weapon = i === 4 ? 1 : 0; progress.weapons = [1,1];
      const g = new Game(progress,()=>.5);g.start();g.trees=[];g.enemies=[];g.spawnTimer=g.attackTimer=99;
      g.player.x=880;g.player.y=700;
      if (i === 3) { g.addTree(1030,700);g.trees[0].hp=1; }
      else if (i === 5) { g.kills=12;g.summonBoss();g.boss.x=1030;g.boss.y=700;g.boss.hp=1; }
      else { g.spawnEnemy(0,150);if(i===2)g.enemies[0].hp=1;if(i===4){g.spawnEnemy(0,230);g.spawnEnemy(Math.PI/2,180);} }
      g.attack();g.updateProjectiles(i===0?.045:.2);
      g.fx.update(i===0?.045:.06);
      // 运行生产帧末清理，避免截图保留已死亡的怪物与树冠。
      g.update(0);
      const r = new Renderer(canvas,g,{time:'day',weather:'sun'});r.resize();r.draw();
      states.push({projectiles:g.projectiles.length,kills:g.kills,chopped:g.chopped,bosses:g.roundBosses,particles:g.fx.items.length,hp:g.enemies[0]?.hp});
      if(i===0 && (g.projectiles.length!==1 || g.enemies[0].hp!==g.enemies[0].maxHp)) throw Error('弹体飞行与伤害时序不符');
      if(i===1 && g.enemies[0].hp!==18) throw Error('命中未结算');
      if(i===2 && g.kills!==1) throw Error('击杀未结算');
      if(i===3 && g.chopped!==1) throw Error('树木破坏未结算');
      if(i===4 && g.enemies[1].hp!==24) throw Error('激光穿透失效');
      if(i===5 && g.roundBosses!==1) throw Error('领主击败未结算');
      // 同一渲染器切换低动态模式，确保全部新增绘制分支均可执行。
      r.reduced={matches:true};r.draw();r.reduced={matches:false};r.draw();
    }
    return states;
  });
  await page.locator('#combat-review').screenshot({ path:'output/playwright/combat-effects.png' });
  await page.locator('#combat-review').evaluate(element=>element.remove());
  if(errors.length)throw Error(errors.join('; '));return {states:result,errors};
}
