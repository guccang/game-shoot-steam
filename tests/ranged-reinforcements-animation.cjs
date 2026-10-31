// 正式时钟连续录制轮转、追击、重炮预警、后坐和死亡；保留真实地图与角色动作。
async page=>{
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  const {Game}=await import('/src/core/game.js');const g=a.game;g.update=Game.prototype.update;g.state='playing';g.dismountVehicle();
  Object.assign(g.player,{x:1600,y:400,hp:g.maxHp(),invincible:0});g.numbers=[];g.fx.items=[];g.enemyBolts=[];
  g.enemies=g.enemies.filter(e=>['bramble-buggy','stump-bombard','reed-archer'].includes(e.species));
  if(!g.enemies.some(e=>e.species==='bramble-buggy')){const e=g.spawnEnemy(0,0,{x:1500,y:275});Object.assign(e,{species:'bramble-buggy',flying:false,radius:24,arena:{x:1600,y:400,radius:1000}});}
  g.enemies.sort((a,b)=>['bramble-buggy','stump-bombard','reed-archer'].indexOf(a.species)-['bramble-buggy','stump-bombard','reed-archer'].indexOf(b.species));
  g.enemies.forEach((e,i)=>{e.x=1600+[-100,100,80][i];e.y=400+[-125,100,-40][i];e.hp=1000;e.maxHp=1000;e.damage=2;e.assault={phase:'chase',elapsed:0};e.z=e.rollAngle=e.knockTime=e.pushX=e.pushY=0;});
  const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.environment.time='day';a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.refresh();
 });
 await page.waitForTimeout(1400);await page.screenshot({path:'output/playwright/ranged-enemy-reinforcements/active-shell.png'});
 await page.keyboard.down('ArrowDown');await page.waitForTimeout(3500);await page.keyboard.up('ArrowDown');
 await page.waitForTimeout(2200);
 const travel=await page.evaluate(()=>a.game.enemies.map(e=>[e.species,e.rangedWalk||0]));if(!travel.some(([,walk])=>walk>0))throw Error('追击未驱动腿和车轮');
 await page.evaluate(async()=>{const g=a.game,e=g.enemies.find(e=>e.species==='bramble-buggy');g.hit(e,1e9,false,{direction:{x:-1,y:0},impulse:90,power:2});});
 await page.waitForTimeout(120);await page.screenshot({path:'output/playwright/ranged-enemy-reinforcements/active-defeat.png'});await page.waitForTimeout(1000);
 return {travel,...await page.evaluate(()=>({state:a.game.state,hp:a.game.player.hp,phases:a.game.enemies.map(e=>[e.species,e.assault.phase,e.rangedWalk])}))};
}
