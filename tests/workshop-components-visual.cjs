// 正式绘制逐级采样与同倍率图鉴，像素检查仅补充人工结构审查。
async page => {
  if(new URL(page.url()).port!=='4186')throw Error('隔离端口错误');
  await page.reload();await page.setViewportSize({width:1100,height:1350});
  const result=await page.evaluate(async()=>{
    const {renderVisualCase}=await import('/src/rendering/visual-review.js');
    const {equipmentParts}=await import('/src/config/equipment-parts.js');
    const tile=document.createElement('canvas');tile.width=400;tile.height=250;
    let samples=0;
    for(const kind of ['weapons','turret','vehicle'])for(let i=0;i<(kind==='vehicle'?4:15);i++){
      if(kind==='turret'&&[12,13].includes(i))continue;
      for(const part of equipmentParts(kind,i)){
        let previous='';
        for(let level=1;level<=part.max;level++){
          await renderVisualCase(tile.getContext('2d'),`workshop-components-${kind}-${i}-${part.key}`,level-1);
          const image=tile.toDataURL();if(image===previous)throw Error(`${kind}/${i}/${part.key}/${level} 没有结构变化`);previous=image;samples++;
          const m=tile.getContext('2d').getTransform();if(m.a!==1||m.d!==1||m.e!==0||m.f!==0)throw Error('部件绘制矩阵泄漏');
        }
      }
    }
    const tools=[];for(const tool of ['wrench','welder']){const images=[];for(const t of [0,.3,.6,.9,1.2,1.5]){await renderVisualCase(tile.getContext('2d'),'workshop-construction-'+tool,t);images.push(tile.toDataURL());}if(new Set(images).size!==6)throw Error('工具没有连续变化');tools.push(tool);}
    return {samples,tools};
  });
  // 原始、全部初次升级、全部满级并排；15型武器全部使用正式装备绘制器。
  for(let group=0;group<3;group++){
    await page.evaluate(async group=>{
      const {freshProgress}=await import('/src/progression/progress.js');const {drawWorkshopEquipment}=await import('/src/rendering/workshop.js');const {WEAPONS}=await import('/src/config/weapons.js');
      let gallery=document.getElementById('components-gallery');if(!gallery){gallery=document.createElement('canvas');gallery.id='components-gallery';document.body.append(gallery);}
      gallery.width=1100;gallery.height=1350;gallery.style.cssText='position:fixed;inset:0;width:1100px;height:1350px;z-index:99999;background:#ede8c9';
      const c=gallery.getContext('2d');c.fillStyle='#ede8c9';c.fillRect(0,0,1100,1350);c.fillStyle='#315c43';c.font='18px sans-serif';
      ['当前 · 原厂','部件 · 初次升级','部件 · 最高等级'].forEach((s,i)=>c.fillText(s,40+i*360,30));
      for(let row=0;row<5;row++)for(let col=0;col<3;col++){
        const index=group*5+row,p=freshProgress();p.weapons.fill(1);p.weapons[index]=[1,2,20][col];p.mastery.fill(40);
        for(const key of Object.keys(p.weaponParts[index]))p.weaponParts[index][key]=[1,2,5][col];
        const tile=document.createElement('canvas');tile.width=350;tile.height=220;drawWorkshopEquipment(tile.getContext('2d'),p,'weapons',index);
        c.drawImage(tile,10+col*360,50+row*255);c.fillText(WEAPONS[index].name,25+col*360,285+row*255);
      }
    },group);
    await page.screenshot({path:`output/playwright/workshop-components/components-gallery-${group}.png`});
  }
  await page.evaluate(()=>document.getElementById('components-gallery').remove());
  return result;
}
