// 正式导演逐阶段推进，桌面和手机昼夜检查同一剧情与停车位置。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://localhost:4288/');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;a.menu.enter();a.game.resetProgress();a.game.start();window.scenicTick=Object.getPrototypeOf(a.game).update.bind(a.game);a.game.update=()=>{};window.scenicSamples=[];});
 for(const phase of ['ride','cottage','weapons','vehicle','dismount','parking','handover','leave','watch','gather']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application,g=a.game;let n=0;while(g.progress.arrival.phase!==phase&&n++<2000)window.scenicTick(.05);if(n>=2000)throw Error('Missing phase '+phase);const advance=['ride','leave'].includes(phase)?1:phase==='parking'?4.8:phase==='dismount'?2:phase==='weapons'||phase==='vehicle'?5.5:1;for(let i=0;i<advance*20;i++)window.scenicTick(.05);a.refresh();},phase);
  for(const [width,height,label]of [[1280,900,'desktop'],[390,844,'390'],[320,740,'320']])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{const a=(await import('/src/main.js')).application;
    Object.assign(a.environment,{weather:'sun',autoSeason:false,autoTime:false,autoWeather:false});while(a.environment.forestSeason!=='summer')document.getElementById('season-picture').click();while(a.environment.time!==time)document.getElementById('time-picture').click();
    const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.resize();a.renderer.draw();a.refresh();
   },time);await page.waitForTimeout(80);
   const sample=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,s=(await import('/src/rendering/visual-review.js')).inspectScenicArrival(a.game,document);window.scenicSamples.push(s);return s;});
   if(sample.overflow||sample.enemies)throw Error('Scene failed '+JSON.stringify(sample));
   if(sample.bubble.visible&&(sample.bubble.y<0||sample.bubble.y+sample.bubble.height>height||sample.bubble.x<0||sample.bubble.x+sample.bubble.width>width))throw Error('Bubble out of screen');
   await page.screenshot({path:`output/playwright/scenic-${phase}-${label}-${time}.png`});
  }
 }
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.save();});
 if(errors.length)throw Error(errors.join('\n'));
}
