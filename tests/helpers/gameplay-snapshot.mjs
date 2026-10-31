// 配置迁移基线采样：读取正式公式和弹道入口，固定输入后只记录确定性的玩法结果。
export async function gameplaySnapshot(root=new URL('../../',import.meta.url)) {
  const load=path=>import(new URL(path,root));
  const [{waveDifficulty,waveRewardTotal},{realmStageSpec,realmReward,realmWeapon},{enemyIdentity},economy,{freshProgress},{fireBallistics},{WEAPONS},{effectiveWeapon,weaponDamage}]=await Promise.all([
    load('src/config/waves.js'),load('src/config/realms.js'),load('src/world/biomes.js'),load('src/config/economy.js'),load('src/progression/progress.js'),load('src/combat/ballistics.js'),load('src/config/weapons.js'),load('src/config/weapon-mods.js'),
  ]);
  const waves=[1,2,3,5,10,16,30,100].flatMap(wave=>[false,true].map(recovery=>({wave,recovery,difficulty:waveDifficulty(wave,recovery),reward:waveRewardTotal(wave)})));
  const realms=['rogue','tower','guardian'].flatMap(mode=>[1,3,5,10,50].flatMap(stage=>['swarm','hunters','elite'].map(encounter=>({mode,stage,encounter,spec:realmStageSpec(mode,stage,encounter),reward:realmReward(mode,stage,stage-1,freshProgress())}))));
  const enemies=[[900,700],[650,2100],[2340,1020],[3020,2200]].flatMap(([x,y])=>[0,.8,.99].map(roll=>enemyIdentity(x,y,roll)));
  const growth=[1,4,5,10,20,100].map(level=>({level,weapon:economy.weaponGrowth(level),hero:economy.heroGrowth(level),health:economy.heroHealth(120,level),armor:economy.armorHealth(240,40,level),cost:economy.economyUpgradeCost(freshProgress(),'weapons',0,level)}));
  const projectiles=[];
  for(const id of ['pistol','shotgun','water','flame','frost','ricochet','funnel','drone','pulse'])for(const aimAssist of [false,true]) {
    const game={trees:[],enemies:[],boss:null,player:{x:0,y:0},random:()=>.5,shots:[],projectiles:[],fx:{}};
    const base=WEAPONS.find(w=>w.id===id);
    fireBallistics(game,{...base,aimAssist,pellets:1}, {x:30,y:0},{x:1,y:0},50,false);
    const bullet=game.projectiles[0];
    projectiles.push({id,aimAssist,drag:bullet.drag,z:bullet.z,vz:bullet.vz,gravity:bullet.gravity,groundBounces:bullet.groundBounces,amount:bullet.amount});
  }
  const weapons=[1,5,20].flatMap(level=>WEAPONS.map((_,index)=>{
    const p=freshProgress();p.weapons.fill(level);p.heroes.fill(level);p.weapon=index;
    const w=effectiveWeapon(p,index),buffed=realmWeapon(w,{power:2,haste:3,reach:1});
    return {index,level,damage:weaponDamage(p,index,2),interval:buffed.interval,range:buffed.range,magazine:w.magazineSize,reload:buffed.reloadTime};
  }));
  return JSON.parse(JSON.stringify({waves,realms,enemies,growth,projectiles,weapons}));
}
