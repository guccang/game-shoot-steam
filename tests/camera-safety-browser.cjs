// 实际画布验证角色、长枪和换弹环完整可见，真实反冲后依然留在竖屏内。
async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.reload();const results=[];
  for(const size of [{width:320,height:568},{width:390,height:844},{width:580,height:928}]) {
    await page.setViewportSize(size);
    results.push(await page.evaluate(async()=>{
      const {application:a}=await import('/src/main.js');a.destroy();const g=a.game,r=a.renderer;
      const {CombatCamera}=await import('/src/rendering/camera.js');
      const {drawCat}=await import('/src/rendering/characters.js');
      const {PLAYER_SCALE,createRecoil,triggerRecoil}=await import('/src/combat/recoil.js');
      const {sniperGuide}=await import('/src/combat/aim.js');
      const {updateAimLock}=await import('/src/combat/targeting.js');
      const {pulseChargePose}=await import('/src/rendering/pulse.js');
      r.resize();let frames=0,minEdge=Infinity;
      const sprite=document.createElement('canvas');sprite.width=sprite.height=400;const sc=sprite.getContext('2d');
      // 像素包围盒来自真实角色绘制，覆盖两名角色、八向枪械、满后坐和蓄能震动。
      for(const weapon of [8,9])for(const hero of [0,1])for(let dir=0;dir<8;dir++) {
        const angle=dir*Math.PI/4,recoil=createRecoil();triggerRecoil(recoil,weapon);
        sc.clearRect(0,0,400,400);
        const zoom=r.width<500?.85:1.05;
        drawCat(sc,200,200,hero,angle,PLAYER_SCALE*zoom,.7,weapon,recoil,1,pulseChargePose(1,.9));
        const pixels=sc.getImageData(0,0,400,400).data;
        for(let y=0;y<400;y++)for(let x=0;x<400;x++)if(pixels[(y*400+x)*4+3]>0){
          if(Math.abs(x-200)>110*zoom+1||Math.abs(y-200)>110*zoom+1)throw Error('角色实际轮廓超过预留区域');
        }
      }
      for(const weapon of [8,9])for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
        g.progress.weapon=weapon;g.progress.weapons[weapon]=1;g.reset();g.state='playing';g.trees=[];g.aimLock=null;g.spawnTimer=999;g.attackTimer=999;
        g.enemies=[{id:990,type:'enemy',x:g.player.x+Math.cos(angle)*650,y:g.player.y+Math.sin(angle)*650,hp:100000,maxHp:100000,radius:17,mass:1,speed:0,phase:0,rank:0,biome:'pine'}];
        updateAimLock(g);r.camera=new CombatCamera();g.magazines[weapon].ammo=1;if(weapon===9)g.pulse.charge=1.2;g.attack();
        for(let i=0;i<60;i++){
          g.update(1/120,{x:-Math.sin(angle),y:Math.cos(angle)});r.draw();
          const v=r.view,x=(g.player.x-v.x)*v.zoom,y=(g.player.y-v.y)*v.zoom,body=110*v.zoom;
          const edge=Math.min(x-body,v.width-x-body,y-body,v.height-y-body,y-111);
          minEdge=Math.min(minEdge,edge);if(edge<11.99)throw Error('真实攻击、移动或反冲导致出屏');frames++;
        }
      }
      // 最后留下横向脉冲装填场景，方便目视审查截图。
      g.progress.weapon=9;g.reset();g.state='playing';g.trees=[];g.aimLock=null;
      g.enemies=[{id:991,type:'enemy',x:1550,y:700,hp:2000,maxHp:2000,radius:17,speed:0,mass:1,phase:0,rank:0,biome:'pine'}];
      updateAimLock(g);g.magazines[9].ammo=0;g.magazines[9].remaining=1.6;r.camera=new CombatCamera();r.draw();a.refresh();
      window.cameraTest={a,g,r,CombatCamera,updateAimLock};
      return {width:r.width,height:r.height,frames,minEdge};
    }));
    await page.screenshot({path:`output/playwright/camera-safe-${size.width}.png`});
  }
  const tree=await page.evaluate(()=>{
    const {a,g,r,CombatCamera,updateAimLock}=cameraTest;g.enemies=[];g.trees=[];g.addTree(1650,700);g.aimLock=null;updateAimLock(g);r.camera=new CombatCamera();r.draw();a.refresh();
    const x=(g.player.x-r.view.x)*r.view.zoom;
    if(Math.abs(x-r.width/2)>.01)throw Error('瞄准远树仍拉偏镜头');return {treeDistance:750,playerScreenX:x};
  });
  await page.screenshot({path:'output/playwright/camera-tree-follow.png'});
  if(errors.length)throw Error(errors.join(';'));
  return {results,tree,errors};
}
