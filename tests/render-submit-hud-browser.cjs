// 接续 render-submit-browser 的正式实例，检查交互、布局和重复 DOM 写入。
async page => {
  const baselineResponse=await page.request.get(new URL('/output/playwright/render-submit/nearby-baseline.js',page.url()).href);
  const hasBaseline=baselineResponse.ok();
  await page.evaluate(async()=>{
    const g=a.game;g.update=()=>{};g.vehicle.active=false;g.enemies=[];g.cottage=null;
    g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
    window.rooms=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS;
    Object.assign(g.player,{x:rooms.weapons.door.x,y:rooms.weapons.door.y+55});a.renderer.camera.time=null;a.refresh();
  });
  await page.waitForFunction(()=>document.getElementById('nearby-interaction').dataset.target==='workshop-weapons');
  const benchmark=await page.evaluate(async hasBaseline=>{
    const current=(await import('/src/ui/nearby-interaction.js')).createNearbyInteraction;
    const old=hasBaseline?(await import('/output/playwright/render-submit/nearby-baseline.js')).createNearbyInteraction:null;
    const options={game:a.game,renderer:a.renderer,root:document,input:{reset(){}},activate(){}};
    const optimized=current(options),before=old?.(options),buttons=[...document.querySelectorAll('#nearby-interaction')];
    const target=buttons[buttons.length-(before?2:1)],observer=new MutationObserver(()=>{});
    optimized.render();before?.render();observer.observe(target,{attributes:true,childList:true,subtree:true,characterData:true});
    // 相同状态连续提交，目标内容必须稳定；移动、资源或类型变化仍立即重算。
    for(let i=0;i<100;i++)optimized.render();const stableMutations=observer.takeRecords().length;
    const direct=[],cached=[];
    // 顺序交替，统计正式 DOM 方法耗时，不使用 FPS 或 GPU 时间名义。
    function batch(control){const start=performance.now();for(let i=0;i<50;i++)control.render();return (performance.now()-start)/50;}
    if(before)for(let i=0;i<8;i++){if(i%2){cached.push(batch(optimized));direct.push(batch(before));}else{direct.push(batch(before));cached.push(batch(optimized));}}
    const label=target.textContent,saved={repaired:a.game.progress.restoration.repaired,wood:a.game.progress.wood,state:a.game.state,x:a.game.player.x,y:a.game.player.y};
    let changedResource=false,hiddenWhenPaused=false;
    try{
      Object.assign(a.game.player,{x:rooms.vehicle.door.x,y:rooms.vehicle.door.y+55});a.game.progress.restoration.repaired=[];a.game.progress.wood=0;optimized.render();const low=target.getAttribute('aria-label');
      a.game.progress.wood=1;optimized.render();changedResource=low!==target.getAttribute('aria-label');
      a.game.state='paused';optimized.render();hiddenWhenPaused=target.hidden;
    }finally{a.game.progress.restoration.repaired=saved.repaired;a.game.progress.wood=saved.wood;a.game.state=saved.state;Object.assign(a.game.player,{x:saved.x,y:saved.y});}
    observer.disconnect();before?.dispose();optimized.dispose();
    if(!changedResource||!hiddenWhenPaused)throw Error('交互状态或资源文案没有立即更新');
    if(stableMutations)throw Error('稳定按钮仍重复写 DOM：'+stableMutations);
    return {baseline:!!before,direct,cached,stableMutations,label,changedResource,hiddenWhenPaused};
  },hasBaseline);
  const samples=[];
  for(const [width,height] of [[320,568],[390,844],[844,390],[1080,921]])for(const time of ['day','night'])for(const kind of ['weapons','vehicle']){
    await page.setViewportSize({width,height});
    await page.evaluate(async({time,kind})=>{
      const g=a.game,door=rooms[kind].door;g.cottage=null;Object.assign(g.player,{x:door.x+30,y:door.y+55});
      g.enemies=[];g.spawnEnemy(0,1,{x:door.x+125,y:door.y+80});
      Object.assign(a.environment,{time});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
      a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
    },{time,kind});
    await page.waitForFunction(kind=>document.getElementById('nearby-interaction').dataset.target==='workshop-'+kind,kind);
    await page.waitForTimeout(150);
    const info=await page.evaluate(async()=>{
      const {inspectNearbyInteraction}=await import('/src/rendering/visual-review.js');
      return inspectNearbyInteraction(a.game,document);
    });
    if(!info.visible||!info.touchTarget||info.overflow||info.target!=='workshop-'+kind)throw Error('工坊按钮回归 '+JSON.stringify({width,time,kind,info}));
    samples.push({width,height,time,kind,...info});
    if(kind==='weapons')await page.screenshot({path:`output/playwright/render-submit/hud-${width}-${time}.png`});
  }
  await page.locator('#nearby-interaction').click();await page.locator('#workshop-dialog').waitFor({state:'visible'});
  if(await page.evaluate(()=>!!a.game.cottage))throw Error('升级按钮误进房间');await page.locator('#ws-close').click();
  // 正式卡片的长文案、隐藏状态、秘境和普通模式，检查实际排版间隔和重复调用。
  const layouts=await page.evaluate(async()=>{
    const {layoutTaskCombatHud,taskCombatHudTop}=await import('/src/ui/task-combat-layout.js');
    const frame=document.getElementById('game-frame'),card=document.getElementById('mainline-hud'),quest=document.getElementById('quest'),boss=document.getElementById('boss-hud'),goal=document.getElementById('equipment-goal');
    const nodes=[card,quest,boss,goal],saved=nodes.map(n=>({hidden:n.hidden,style:n.getAttribute('style')})),originalClass=frame.className,results=[];
    try {
      for(const realm of [false,true,false])for(const cardHidden of [false,true]){
        frame.classList.toggle('realm-active',realm);nodes.forEach(n=>{n.hidden=false;n.style.display='block';});card.hidden=cardHidden;
        layoutTaskCombatHud(document);
        const top=taskCombatHudTop(document),heights=nodes.map(n=>n.offsetHeight),first=nodes.map(n=>n.style.top);
        if(!(realm&&cardHidden)){
          let y=top+(cardHidden?0:heights[0]+8);
          for(let i=1;i<nodes.length;i++){if(Math.abs(parseFloat(nodes[i].style.top)-y)>.01)throw Error('HUD 排列间隔错误');y+=heights[i]+8;}
        }else if(Math.abs(parseFloat(boss.style.top)-(quest.offsetTop+quest.offsetHeight+8))>.01)throw Error('秘境继承了旧位置');
        layoutTaskCombatHud(document);if(nodes.some((n,i)=>n.style.top!==first[i]))throw Error('重复布局位置漂移');
        results.push({realm,cardHidden,top: first,heights});
      }
    } finally {frame.className=originalClass;nodes.forEach((n,i)=>{n.hidden=saved[i].hidden;if(saved[i].style===null)n.removeAttribute('style');else n.setAttribute('style',saved[i].style);});a.refresh();}
    return results;
  });
  return {benchmark,samples,layouts,clicked:'载具升级入口打开原工坊且可关闭'};
}
