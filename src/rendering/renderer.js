import {campFestivalObjects,drawCampPlaza,drawFestivalLion,drawFestivalCouplets,drawFestivalFireworks} from './camp-festivals.js';
import {campDecorationObjects,drawCampDecoration,drawCampDecorShop} from './camp-decor.js';
import {setCampBuildingFinish} from './camp-building-finish.js';
import {clearArtStyleCache as clearCampSceneryFinish} from './scenery.js';
import {buildingWindowLights,drawCampWindowLights} from './camp-window-lights.js';
import {drawSurfaceFog} from './surface-fog.js';
import {regionalCampObjects,drawRegionalCamp,drawRegionalCampGround} from './regional-camps.js';
import {activateCampLayout} from '../world/camp-layout-bindings.js';
import {drawCampLayoutRoads,campLayoutObjectVisible} from './camp-layout.js';
import {sampleSceneLight,buildingShadowShape} from '../world/scene-depth.js';
import {drawActorCastShadow,drawBuildingCastShadow,sceneDepthStats} from './scene-depth.js';
import {groundDepthStats} from './ground-depth.js';
import {campLandObjects,campObjectVisible,drawCampLandGround,drawCampLandObject} from './camp-land.js';
import {industryObjects,drawIndustry} from './industry.js';
import {tradeObjects,drawTradeObject} from './camp-trade.js';
import {clipEraSeat} from './vehicle-eras.js';
import {drawAmbientFish} from './ambient-fish.js';
import {drawHomeArcade} from './home-arcade.js';
import {drawHomeBalcony,balconyProject,balconyWorldTransform,balconyUpright,balconyObjectVisible} from './home-balcony.js';
import {drawMining,drawMineShaft} from './mining.js';
import {advanceMineLandscapeGround} from './mine-landscape-ground.js';
import {mineShaftObjects} from '../core/mining/mining.js';
import {constructionObjects,drawConstructionCompany} from './construction-company.js';
import {campBuildingCache,campSnowBlendBytes} from './camp-building-cache.js';
import {outdoorFishingView,drawOutdoorGround,outdoorObjects,drawOutdoorObject,drawOutdoorFishing} from './outdoors.js';
import {outdoorBusy} from '../core/activities/outdoors.js';
import {waystationObjects,drawWaystation} from './waystations.js';
import {createSceneNpcContinuity,sceneNpcObjects} from './scene-npc-continuity.js';
import {outdoorShopObjects,drawOutdoorShop} from './outdoor-shop.js';
import {ammoShopObjects,drawAmmoShop} from './ammo-shop.js';
import {warehouseObjects,drawWarehouse} from './warehouse.js';
import {catHomeObjects,drawCatHome} from './cat-home.js';
import {drawPlayerTow} from './player-towing.js';
import {furnitureShopObjects,drawFurnitureShop} from './furniture-shop.js';
import {vehicleServiceObjects,drawVehicleServiceObject} from './vehicle-repair.js';
import {storyCampScene} from './story-camp.js';
import {drawProductionDevice} from './farm-production.js';
import {wildPastureObjects} from '../core/farming/wild-pasture.js';
import {drawPasture} from './pasture.js';
import {oxHandler} from '../config/pasture.js';
import {drawOxPlow} from './ox-plow.js';
import {drawFarmGround,farmObjects,drawFarmCrop,drawFarmTool,drawFarmDelivery,drawCampFarmSign,farmArtBudget} from './farm.js';
import {drawSeedShop} from './seed-shop.js';
import {cropGrowthBoosts} from './farm-growth.js';
import {farmWorking} from '../core/farming/farm.js';
import { CanvasCommandSampler } from '../platform/canvas-command-sampler.js';
import {drawResourcePickups} from './resource-pickup.js';
import {restorationForObject,restorationBuildingVisible,restorationObjects,drawRestorationObject,drawRestorationScaffold,drawRestorationTransfer,drawRestorationBuildCountdown} from './town-restoration.js';
import {facilityOpen} from '../config/town-restoration.js';
import {drawEnergyShield} from './energy-shield.js';
import {drawGravityFields} from './gravity-gun.js';
import {drawWorkshopInterior} from './workshop-interior.js';
import {workshopBuildView} from '../core/camp/ranger-arrival.js';
import {drawCottage} from './cottage.js';
import {drawWaterBagIndicator} from './water-bag-indicator.js';
import {drawPlayerActionCountdown} from './player-action-countdown.js';
import {parkedVehicleObjects,drawParkedVehicle} from './parked-vehicles.js';
import {campDefenseObjects,drawCampDefense,drawCampDefenseGround} from './camp-defense.js';
import {drawGiantSpoils} from './horde-giant.js';
import { riderPosition,frontRider } from '../config/vehicle-rider.js';
import { canvasFont } from './text-style.js';
import {arrivalObjects,drawArrivalObject,drawArrivalGuidance,drawWorkshopBuildCountdown} from './ranger-arrival.js';
import {clearingPostObjects,drawClearingPost} from './clearing-post.js';
import {storyPostObjects,drawStoryPostGround,drawStoryPost} from './story-posts.js';
import {campRenderObjects,drawMonsterCampGround,drawMonsterCampObject} from './monster-camps.js';
import { livingObjects,drawLivingObject,drawLivingGround } from './living-world.js';
import {settlementObjects,drawSettlement} from './settlements.js';
import { storyObjects, drawStoryProp, storyResidentIds } from './story-props.js';
import {mainlineActors} from '../core/story/mainline-manager.js';
import { drawStoryGuidance, drawStoryDestination, storySpeechInfo } from './story-guidance.js';
import { drawEnemyBolts } from './ranged-enemies.js';
import { drawArmedSpider } from './spider-armed.js';
import { drawArmedMechanicalCat as drawMechanicalCat } from './mechanical-armed.js';
import { mechanicalSources as collectMechanicalSources } from '../combat/companion-targets.js';
import { vehicleCompanionContext } from '../combat/vehicle-companions.js';
import { seasonRasterStats } from './season-raster.js';
import { FallingLeavesRenderer } from './falling-leaves.js';
import { guardianPads } from '../config/guardian.js';
import { drawGuardianDefense, guardianScenery } from './guardian.js';
import { catSprites } from './cat-animation.js';
import {FIRE_GARAGE} from '../world/fire-navigation.js';
import {drawFireStation,drawRescueStream} from './fire-rescue.js';
import {drawBurningTree,drawWaterPump,drawFireRoute} from './fire-world.js';
import {drawFireHelmet} from './fire-truck.js';
import {drawRaceBale,drawRaceTrackEffects} from './forest-race-track.js';
import {drawRaceRunner} from './forest-race.js';
import { drawRealmGround, drawGoddess } from './realms.js';
import {visibleEarthLandforms} from '../world/earth-landforms.js';
import {drawEarthLandform} from './earth-landforms.js';
import { NATURAL_TERRAIN,visibleMountains } from '../world/natural-terrain.js';
import { drawMountain, naturalAtlasStats } from './natural-terrain.js';
// 场景合成器：地形、实体、弹道和天气按层绘制。
import { drawResourceIcon } from './resource-icons.js';
import { drawBossHazard } from './bosses.js';
import { WORLD } from '../world/coordinates.js';
import { clamp } from '../core/math.js';
import { EnvironmentTransition } from '../world/environment.js';
import { RiverRenderer } from './river.js';
import {riverCrossingObjects,drawRiverCrossingGround,drawRiverCrossing} from './river-crossing.js';
import { SeasonGroundCache } from './season-ground-cache.js';
import {drawParkingGround,drawParkingCountdown,parkingGaragePose} from './parking.js';
import {clipGarageOpening} from './garage.js';
import { drawJiuzhaigouWater } from './jiuzhaigou.js';
import { SceneTone } from './scene-tone.js';
import { PLAYER_SCALE } from '../combat/recoil.js';
import { drawBallistics, drawArcLink } from './projectiles.js';
import { GustCycle, gustStrength } from '../world/gust.js';
import { drawLakeGusts } from './natural-terrain.js';
import { drawHomeGlider } from './home-glider.js';
import { drawForestTree, drawForestShadow } from './forest-art.js';
import { SCENERY } from '../world/scenery.js';
import { forestUnderstory } from '../world/forest-understory.js';
import { REALM_ENTRANCES, towerRealmLandmark } from '../world/realm-entrances.js';
import { drawRealmEntrance, drawRealmEntranceGround } from './realm-entrances.js';
import { drawScenery, sceneryAtlasStats } from './scenery.js';
import { viewBody, visibleBodies } from '../world/coordinates.js';
import { SpatialGrid, treesInBounds } from '../world/spatial-grid.js';
import { sniperGuide } from '../combat/aim.js';
import { drawFunnelArray } from './funnel.js';
import { drawReloadIndicator } from './reload-indicator.js';
import { CombatCamera } from './camera.js';
import { StoryCamera } from './story-camera.js';
import { drawSniperGuide } from './aim-guide.js';
import { drawPulseCharge, drawPulseBeam, pulseChargePose, chargeMuzzle } from './pulse.js';
import { oval } from './primitives.js';
import { drawCat, drawRiderWeapon } from './characters.js';
import { gatlingHeat } from '../combat/weapon-heat.js';
import {legendaryObjects,drawLegendaryWorkshop} from './legendary-workshop.js';
import { drawVehicleTracks, drawVehicleArmor } from './vehicle.js';
import { drawSlime, drawEnemyHealthBar, drawEnemyWarning, drawBoss } from './enemies.js';
import { drawCombatFX } from './particles.js';
import { drawStorm, drawStormGround, prepareStormStrike } from './storm.js';
import { SnowRenderer } from './snow.js';
import { RainRenderer } from './rain.js';
import { FireflyRenderer } from './fireflies.js';
import { visibleLights, localIllumination } from '../world/lighting.js';
import { drawLampGround, drawLightFixture } from './lighting.js';
import { REGION_SIGNPOSTS } from '../world/signposts.js';
import { JIUZHAIGOU_SIGNPOSTS } from '../world/jiuzhaigou.js';
import { drawRegionSignpost } from './signposts.js';
import { monsterAtlasStats } from './monster-atlas.js';
import { treeAtlasStats } from './tree-art.js';
import { artSampleWeight } from './art-sample.js';
import { releaseArtCache } from '../art-styles/cache.js';
import {watchRenderCanvas,canvasRecoveryRevision,canvasRecoveryStats} from './canvas-recovery.js';
import {recoverSharedRenderCaches} from './render-cache-recovery.js';
// 仅统计本轮接入缓存的七类建筑，避免把角色或施工动作归到静态立面。
const CACHED_CAMP_BUILDINGS=new Set(['warehouse-depot','warehouse','cat-home','furniture-shop','seed-shop','legendary-workshop','ammo-shop','construction-company']);
// 山湖摆件和建筑锚点固定，每帧只为镜头附近的景物计算周期镜像。
let sceneryGrid=new SpatialGrid(SCENERY,{cellSize:480});
export class Renderer {
  // 初始化轻量缓存；地形位图在首次进入可见区域时才生成。
  constructor(canvas, game, environment = { time: 'day', weather: 'sun' }, profiler = null) {
    catSprites.load();
    this.profiler = profiler;
    this.canvas = watchRenderCanvas(canvas);
    this.canvasRevision=canvasRecoveryRevision();this.contextRecoveries=0;
    this.c = canvas.getContext('2d');
    this.commands = new CanvasCommandSampler();
    this.game = game;
    this.width = 800;
    this.height = 600;
    this.environment = environment;
    this.light = new EnvironmentTransition(environment, performance.now());
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.gusts = new GustCycle();
    this.river = new RiverRenderer();
    this.rain = new RainRenderer();
    this.snow = new SnowRenderer();
    this.snowCover = 0;
    this.fallingLeaves = new FallingLeavesRenderer();
    this.fireflies = new FireflyRenderer();
    this.camera = new CombatCamera();
    this.storyCamera = new StoryCamera();
    this.ground = new SeasonGroundCache('forest', environment.forestSeason);
    this.seasons = this.ground.seasons;
    this.tone = new SceneTone(environment);
  }
  // 风格切换只重建派生画布；镜头、季节/天气过渡和游戏对象保持原实例。
  refreshArtStyle() {
    campBuildingCache.clear();
    this.ground.refreshArtStyle();
    releaseArtCache(this.river.tiles);this.river=new RiverRenderer();
    if(this.interiorArt)releaseArtCache(this.interiorArt.images);
    this.interiorArt=null;
  }
  // 主画布及任意离屏缓存丢失后，下一次绘制集中重建；主画布仍丢失时不生成空白图集。
  recoverContext(){
    if(this.c.isContextLost?.())return false;
    const revision=canvasRecoveryRevision();
    recoverSharedRenderCaches();
    if(this.canvasRevision!==revision){
      this.refreshArtStyle();
      this.rain=new RainRenderer();
      this.canvasRevision=revision;this.contextRecoveries++;
      this.profiler?.event('canvas-cache-rebuilt',{revision,recoveries:this.contextRecoveries});
    }
    return true;
  }
  // 内存值是已知画布的 RGBA 理论下界，不伪装成 GPU 实测；不读回屏幕像素。
  diagnosticInfo() {
    return { canvas: [this.canvas.width, this.canvas.height], css: [this.width, this.height],
      dpr: this.dpr, contextLost: this.c.isContextLost?.() ?? null,
      contextRecovery:{...canvasRecoveryStats(),rebuilds:this.contextRecoveries},
      view: this.view, frameTiming: this.frameTiming,
      seasonTransition: this.seasonVisual, seasonScratch: seasonRasterStats(),
      groundCache: this.ground.stats(), navigationCache: this.navigationWarmup?.stats(), riverCache: this.river.stats(), campBuildings: {...campBuildingCache.stats(),blendBytes:campSnowBlendBytes()},
      backgroundBytes: this.ground.stats().bytes + this.ground.stats().pendingBytes + this.river.stats().bytes
        + this.ground.mapPreview.stats().bytes + this.ground.mapPreview.stats().pendingBytes,
      canvasCommands: this.commands.report(),
      monsters: monsterAtlasStats(), trees: treeAtlasStats(), scenery: sceneryAtlasStats(),
      naturalTerrain: naturalAtlasStats(), catAnimation: catSprites.stats(), farmArt: farmArtBudget(),
      snow: this.snow.stats(), fallingLeaves: this.fallingLeaves.stats(), rainCache: this.rain.surfaces.terrain.size, visible: this.visibleStats };
  }
  // 帧尾最多生成一张已入镜建筑，不让新区域一次触发全部静态立面生成。
  advanceCampBuildings(){return campBuildingCache.advance();}
  // 地下只预取当前矿道近邻，每帧最多编译一个连续地形块。
  advanceMineGround(){return advanceMineLandscapeGround(this);}
  // 按设备像素比调整画布，限制倍率以兼顾移动设备性能。
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.dpr = dpr;
  }
    // 预热和正式帧共用营地版本，首次显示不会误将刚准备好的地面判成旧布局。
    syncCampLayout(progress){
      const revision=activateCampLayout(progress);
      if(this.campLayoutRevision===revision)return;
      this.campLayoutRevision=revision;sceneryGrid=new SpatialGrid(SCENERY,{cellSize:480});this.ground.invalidateCampLayout();
    }
    // 首次准备使用镜头副本，只计算将要显示的完整地块，不推进正式镜头与战斗时钟。
  prepareGround(padding=0) {
    if(!this.recoverContext())return null;
    const g = this.game, now = performance.now();
      this.syncCampLayout(g.progress);
    this.ground.setMap(g.mapId);this.ground.setSceneryMask(null);
    const camera = Object.assign(new CombatCamera(), this.camera);
    const speech=storySpeechInfo(g);
    const guide = speech?null:['funnel', 'drone'].includes(g.weapon().controller) ? { kind: g.weapon().controller } : sniperGuide(g);
    const normal = camera.update(g.player, this.width, this.height, guide, g.time, this.reduced.matches,
      { arena: g.realm?.arena, mode: g.realm?.mode, session: g.realm, horde: g.campDefense, giant:g.boss?.campDefense&&g.boss.kind==='dumpling'?g.boss:null });
    const visible=outdoorFishingView(g,Object.assign(new StoryCamera(),this.storyCamera).update(normal,speech,now/1000,this.reduced.matches,g.story||null),this.width,this.height);
    // 入场车可能在首次绘制前前进一个模拟步；边缘也计入就绪门禁，实际镜头保持原尺寸。
    const view=padding?{...visible,x:visible.x-padding,y:visible.y-padding,w:visible.w+padding*2,h:visible.h+padding*2}:visible;
    this.ground.update(this.environment,view,now); return view;
  }
  // 合成场景继续同步消费已完成的纹理，缺块时仍走完整原精度绘制。
  draw(renderGame = this.game) {
    if(!this.recoverContext())return;
      this.syncCampLayout(renderGame.progress);
    this.renderGame = renderGame;
    this.waystationReview=[];
    const profiler = this.profiler;
    profiler?.start('render.prepare');
    const c = this.c,
      flight = renderGame.cottage?.glide,
      // 滑翔从室外视角读取停驻车辆和建筑，房间事务仍保留安全存档落点。
      source = flight ? Object.assign(Object.create(renderGame), {cottage:null}) : renderGame,
      camp = this.campScene = storyCampScene(source),
      w = this.width,
      h = this.height,
      time = source.previewTime;
    if(source.cottage?.arcade){drawHomeArcade(this,source);profiler?.end('render.prepare');return;}
    if(source.cottage?.kind==='mine'){drawMining(this,source);profiler?.end('render.prepare');return;}
    if(source.cottage?.balcony){drawHomeBalcony(this,source);drawPlayerActionCountdown(this);profiler?.end('render.prepare');return;}
    if(source.cottage){this.sceneNpcContinuity?.actors.clear();this.stormStrike=null;if(source.cottage.kind&&source.cottage.kind!=='cottage')drawWorkshopInterior(this,source);else drawCottage(this,source);drawPlayerActionCountdown(this);profiler?.end('render.prepare');return;}
    const valley = source.mapId === 'jiuzhaigou';
    this.ground.setMap(source.mapId);this.ground.setSceneryMask(null);
    const seasonNow = performance.now();
    if (this.rain.surfaces.mapId !== source.mapId) {
      this.rain.surfaces.terrain.clear();
      this.rain.surfaces.mapId = source.mapId;
      // 清除旧取景偏移，同时保留玩家选择的缩放档位。
      this.camera.time = null;
      this.storyCamera.reset();
    }
    // 相邻镜像共用同一对象和存档，画面跨边界时不瞬移、不复制伤害。
    // 秘境休整沿用连续表现时钟；暂停不增加偏移，战斗逻辑仍使用 source.time。
    const g = { ...this.game, ...renderGame, cottage: source.cottage, time: source.time + (source.realm?.idleTime || 0), progress: source.loadout || source.progress };
    // 暂停冻结作物视觉时间；恢复后按存档真实时间显示当前成长，不补播离线特效。
    if(source.state==='playing'||!Number.isFinite(this.farmVisualNow))this.farmVisualNow=Date.now();
    const cropBoosts=cropGrowthBoosts(this.farmGrowthEffects??={},source,g.time);
    // 借用装备只决定战斗配置；身体和独立持枪小手始终沿用玩家选中的猫。
    const playerHero = source.progress.hero;
    for (const key of [
      'enemyBolts',
      'hazards',
      'projectiles',
      'shots',
      'particles',
      'numbers',
      'drops',
    ])
      g[key] = (source[key] || []).map((item) => viewBody(item, source.player));
    if (source.boss) g.boss = viewBody(source.boss, source.player);
    this.light.set(this.environment, performance.now());
    const light = this.light.sample(performance.now(), this.reduced.matches);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const speech=storySpeechInfo(source);
    const guide = speech||source.balconyScene||flight?null:sniperGuide(source);
    const funnel = !flight&&!source.balconyScene&&!speech&&['funnel', 'drone'].includes(source.weapon().controller);
    const normal = this.camera.update(
      g.player,
      w,
      h,
      funnel ? { kind: source.weapon().controller } : guide,
      g.time,
      this.reduced.matches,
      { arena: source.realm?.arena, mode: source.realm?.mode, session: source.realm, horde: source.campDefense, giant:g.boss?.campDefense&&g.boss.kind==='dumpling'?g.boss:null },
    );
    if(source.realm)this.storyCamera.reset();
    const view=source.balconyScene?.view||outdoorFishingView(source,this.storyCamera.update(normal,speech,performance.now()/1000,this.reduced.matches,source.story||null),w,h);
    // 建筑提示只调整DOM布局，不再叠加镜头平移或缩放。
    // 地块准备好后才推进统一外观时钟，树木与地面使用同一组季节权重。
    const seasonVisual=this.seasonVisual=this.ground.update(this.environment,view,seasonNow,light.night);
    const wind = this.gusts.sample(g.time, g.player.x, !this.reduced.matches && (this.environment.randomGusts !== false || this.environment.weather === 'gust'), this.environment.weather === 'gust');
    const winter=this.snowCover;
    if((!seasonVisual.active||valley)&&!(winter>0&&winter<1))seasonRasterStats(true);
    const zoom = view.zoom;
    this.game.parkingView=view;
    // 仅传递视口几何供逻辑选出生点，渲染不生成敌人或推进波次。
    this.game.arrivalView = { left: view.x - this.game.player.x, right: view.x + view.w - this.game.player.x,
      top: view.y - this.game.player.y, bottom: view.y + view.h - this.game.player.y,
      width: w, height: h };
    // 战斗力量感来自枪身、弹道和实体反冲，中点镜头不参与震屏或动态变焦。
    const cameraX = view.x,
      cameraY = view.y;
    const chargePose = pulseChargePose(
      guide?.kind === 'pulse' ? guide.charge : 0,
      g.time,
      this.reduced.matches,
    );
    const visualGuide =
      guide?.kind === 'pulse'
        ? { ...guide, muzzle: chargeMuzzle(g.player, guide, g.progress.weapon, chargePose) }
        : guide;
    this.view = view;
    // 一次放电的各绘制层共享世界锚点，镜头运动只改变投影位置。
    this.stormStrike = prepareStormStrike(this.stormStrike, view, this.storm,
      source.mapId, light.storm, this.reduced.matches);
    // 所有武器先裁剪再创建代理、光影和深度排序，远距视野仍保留所需周期镜像。
    const treePadding = 140;
    g.trees = visibleBodies(treesInBounds(source.trees, view.x, view.y,
      view.x + view.w, view.y + view.h, treePadding), view, treePadding);
    for (const key of ['enemies', 'remnants', 'stumps'])
      g[key] = visibleBodies(source[key], view);
    if (guide || funnel) g.hazards = visibleBodies(source.hazards, view);
    this.visibleStats = { trees: g.trees.length, enemies: g.enemies.length,
      fx: source.fx.items.length, crops: 0, campBuildings: 0, zoom };
    profiler?.end('render.prepare');
    profiler?.start('render.rainPrepare');
    this.rain.prepare(time, view, g.trees, light.rain, light.storm, this.reduced.matches);
    profiler?.end('render.rainPrepare');
    profiler?.start('render.ground');
    c.save();
    if(source.balconyScene)balconyWorldTransform(c,view);
    else {c.scale(zoom, zoom);c.translate(-cameraX, -cameraY);}
    this.ground.draw(c, view, light.night);
    profiler?.end('render.ground');
    profiler?.start('render.river');
    if (!valley) for (
      let tx = Math.floor(cameraX / WORLD.width);
      tx <= Math.floor((cameraX + view.w) / WORLD.width);
      tx++
    )
      for (
        let ty = Math.floor(cameraY / WORLD.height);
        ty <= Math.floor((cameraY + view.h) / WORLD.height);
        ty++
      ) {
        const x = tx * WORLD.width,
          y = ty * WORLD.height;
        c.save();
        c.translate(x, y);
        this.river.draw(c, time, light.night, light.rain, this.reduced.matches, {
          x: cameraX - x,
          y: cameraY - y,
          w: view.w,
          h: view.h,
        }, wind, g.time);
        if (wind) drawLakeGusts(c, {x:cameraX-x,y:cameraY-y,w:view.w,h:view.h}, g.time, wind);
        c.restore();
      }
    drawLivingGround(c,camp,light.night,view);
    drawCampLayoutRoads(c,camp,view,light.night,this.ground.season);
    drawMonsterCampGround(c,source,light.night,view);
    drawRegionalCampGround(c,source,light.night,view);
    drawFarmGround(c,camp,view);
    drawParkingGround(c,camp,view,light.night);
    drawOutdoorGround(c,source,view,light.night);
    drawCampDefenseGround(c,camp);
    if (source.realm) drawRealmGround(c, view, source.realm, g.time, this.reduced.matches);
    if(source.realm?.mode==='race')drawRaceTrackEffects(c,source.realm,g.player,this.reduced.matches);
    if (valley) drawJiuzhaigouWater(c, view, time, light.night, this.reduced.matches, wind, g.time);
    this.ambientFishReview=drawAmbientFish(c,source,view,this.reduced.matches,light.night);
    profiler?.end('render.river');
    profiler?.start('render.lighting');
    this.rain.drawGround(c, light.rain, this.reduced.matches ? 0 : this.storm?.flash || 0);
    // 树影统一留在地面层；树干与树冠随后排序，避免后方树影涂到前景单位身上。
    const riverCrossings=visibleBodies(riverCrossingObjects(source),view,120);
    for(const item of riverCrossings)drawRiverCrossingGround(c,item,light.night);
    drawPlayerTow(c,source,g.player);
    const entrances = visibleBodies(valley ? [] : source.realm ? source.realm.mode === 'tower' ? [towerRealmLandmark(source.realm.arena)] : [] : REALM_ENTRANCES, view, 190);
    for (const entry of entrances) drawRealmEntranceGround(c, entry, light.night);
    const storyPosts=visibleBodies([...storyPostObjects(camp),...clearingPostObjects(camp)],view,150);
    for(const post of storyPosts)drawStoryPostGround(c,post);
    const lamps = valley ? [] : visibleLights(view, time, light, this.reduced.matches,source).filter(l=>!['football','race'].includes(source.realm?.mode)||Math.hypot(l.x-source.realm.arena.x,l.y-source.realm.arena.y)>source.realm.arena.radius+220);
    // 赛跑不显示自动攻击范围。
    if(!flight&&!source.balconyScene&&source.realm?.mode!=='race'&&!farmWorking(source)){
    // 淡淡的射程圈帮助理解自动攻击距离。
    c.beginPath();
    c.ellipse(
      g.player.x,
      g.player.y,
      guide ? guide.range : 145,
      guide ? guide.range : 145,
      0,
      0,
      Math.PI * 2,
    );
    c.fillStyle = '#f7ffe90b';
    c.fill();
    c.strokeStyle = '#f5ffdb48';
    c.lineWidth = 1;
    c.setLineDash([4, 8]);
    c.stroke();
    c.setLineDash([]);
    }
    drawCampLandGround(c,camp,view,light.night,this.ground.season);
    drawCampPlaza(c,camp,view,light.night);
    // 土地覆盖只清除旧院落；真实树木投影和灯池随后绘制，不被地契底色擦掉。
    for(const tree of g.trees){
      if(source.balconyScene&&!balconyObjectVisible(view,tree))continue;
      if(source.balconyScene){c.save();balconyUpright(c,view,tree);}
      drawForestShadow(c,tree,light.night,winter,this.ground.season);if(source.balconyScene)c.restore();
    }
    drawLampGround(c,lamps,[...g.trees,...g.enemies,...(g.boss?[g.boss]:[])]);
    for (const stump of g.stumps) {
      oval(c, stump.x, stump.y, 15, 7, '#9c8254', '#67744c');
      oval(c, stump.x, stump.y - 2, 11, 5, '#d1b381', '#9c8254', 1);
    }
    // 边界和目标在实体及攻击预警之前绘制，保证脚下提示不盖住冲锋区域。
    drawStoryGuidance(c,source,view,this.reduced.matches);
    drawFireRoute(c,source,view,this.reduced.matches);
    // 机械猫按脚底加入实体深度排序，树前树后与玩家遵守同一遮挡关系。
    const mechanicalSources=collectMechanicalSources(source);
    const mechanicalCats=mechanicalSources.filter(g=>g.weapon().controller==='mechanical')
      .flatMap(g=>visibleBodies(g.mechanical.nodes.filter(n=>n.active&&n.ready),view).map(n=>({...n,type:'mechanical-cat',weapon:g.weapon()})));
    const spiders=collectMechanicalSources(source,'spider').flatMap(g=>visibleBodies([g.spider.mother,...g.spider.nodes].filter(n=>n.active&&n.ready),view).map(n=>({...n,type:'mechanical-spider',weapon:g.weapon(),hatch:n.mother?g.spider.hatch:0,hatchSide:g.spider.hatchSide})));
    const scenePeople=sceneNpcObjects(this.sceneNpcContinuity??=createSceneNpcContinuity(),source,[...storyObjects(source),...mainlineActors(source).map(actor=>g.campActors?.get(actor.id)||actor)],view);
    const activeStoryResidents=new Set([...storyResidentIds(source),...scenePeople.map(a=>a.residentId).filter(Boolean)]);
    // 存档外观变化才释放旧房屋像素，切镜头或远方营地不反复重建缓存。
    const finishKey=JSON.stringify(source.progress.campManagement?.styles.building);if(this.campFinishKey!==finishKey){this.campFinishKey=finishKey;campBuildingCache.clear();clearCampSceneryFinish();}
    const objects = [
      ...visibleBodies(campDecorationObjects(camp),view,150),
      ...visibleBodies(campFestivalObjects(camp),view,150),
      ...visibleBodies(campLandObjects(camp),view,110),
      ...visibleBodies(mineShaftObjects(source),view,100),
      ...visibleBodies(constructionObjects(camp),view,160),
      ...visibleBodies(vehicleServiceObjects(camp),view,180),
      ...visibleBodies(industryObjects(camp),view,200),...visibleBodies(warehouseObjects(camp),view,150),...visibleBodies(ammoShopObjects(camp),view,150),...visibleBodies(outdoorShopObjects(camp),view,200),...visibleBodies(catHomeObjects(camp),view,150),...visibleBodies(furnitureShopObjects(camp),view,150),
      ...visibleBodies(farmObjects(camp),view,190),...visibleBodies(wildPastureObjects(source),view,150),
      ...visibleBodies(outdoorObjects(source),view,200),
      ...visibleBodies(waystationObjects(source),view,110),
      ...visibleBodies(regionalCampObjects(source),view,190),
      ...visibleBodies(restorationObjects(camp),view,150),
      ...visibleBodies(campDefenseObjects(camp),view,160),
      ...riverCrossings,
      ...visibleBodies(arrivalObjects(camp),view,120),
      ...(!valley&&!source.realm&&!source.story?visibleBodies(source.fireWaters||[],view,150).map(s=>({...s,type:'fire-water'})):[]),
      ...visibleBodies(parkedVehicleObjects(camp),view,150),
      ...visibleBodies(tradeObjects(source),view,150),
      ...visibleBodies(scenePeople,view,100),...storyPosts,
      ...visibleBodies(livingObjects(camp).filter(o=>o.type!=='living-resident'||!activeStoryResidents.has(o.id)),view,150),
      ...visibleBodies(campRenderObjects(source,view),view,150),
      ...visibleBodies(settlementObjects(source),view,240),
      ...mechanicalCats,...spiders,
      ...(source.realm?.mode==='race'?visibleBodies(source.realm.features.filter(f=>f.kind==='bale').map(f=>({...f,type:'race-bale'})),view):[]),
      ...(source.realm?.mode==='race'?visibleBodies(source.realm.rivals.map(n=>({...n,type:'race-runner'})),view):[]),
      ...lamps,
      // 车库背景先画，门框屋顶后画；未驾驶的车后层/前装甲与猫猫按同一脚底排序。
      ...entrances.flatMap(entry=>entry.mode==='fire'?[{...entry,type:'fire-station-back',depthOffset:-150},{...entry,worldLayers:true}]:[entry]),
      ...(!valley&&!source.realm&&!source.story&&source.fireStationTruck?visibleBodies([{...FIRE_GARAGE,type:'fire-truck-rear',depthOffset:-1},{...FIRE_GARAGE,type:'fire-truck-front',depthOffset:1}],view,120):[]),
      ...(source.realm ? [] : visibleBodies(valley ? JIUZHAIGOU_SIGNPOSTS : REGION_SIGNPOSTS, view, valley ? 250 : 140)),
      ...(valley ? [] : guardianScenery(visibleBodies(sceneryGrid.query(view.x,view.y,view.x+view.w,view.y+view.h,340), view, 340), source.realm)),
      ...(!valley&&!source.realm?forestUnderstory(view):[]),
      ...(valley ? [] : visibleMountains(view)),
      ...(valley ? [] : visibleEarthLandforms(NATURAL_TERRAIN,view)),
      ...(source.realm?.mode === 'guardian' ? [source.realm.goddess, ...source.realm.defenses.map(t => ({ ...guardianPads(source.realm.arena)[t.slot], type: 'defense', tower: t, flying: t.kind === 'vehicle' && t.index === 2 }))] : []),
      ...visibleBodies(legendaryObjects(source),view,220),
      ...g.trees,
      ...g.enemies,
      ...g.remnants,
      ...(g.boss ? [g.boss] : []),
      { type: 'player', x: g.player.x, y: g.player.y, flying: g.player.flying||!!flight,
        depthOffset:parkingGaragePose(g.player,g.vehicle)?parkingGaragePose(g.player,g.vehicle).y+3-g.player.y:0 },
    ].filter(item=>campObjectVisible(camp,item)&&campLayoutObjectVisible(camp,item)).filter(item=>!source.balconyScene||balconyObjectVisible(view,item)).sort((a, b) =>
      // 空中单位及其预警在树冠上方，避免飞行近战从完全遮挡的位置突然命中。
      Number(!!a.flying) - Number(!!b.flying) || (source.balconyScene?(balconyProject(view,a).y-balconyProject(view,b).y)/zoom: a.y-b.y)+(a.depthOffset||0)-(b.depthOffset||0),
    );
    if(source.balconyScene)this.balconyObjects=objects.map(item=>({type:item.type,kind:item.kind,workshop:item.workshop,x:item.x,y:item.y}));
    const windowGroups=new Map(objects.map(item=>[item,buildingWindowLights(item,camp)]));
    const windowLights=[...windowGroups.values()].flat();
    this.campLightingReview={windows:windowLights,lamps:lamps.filter(l=>l.campLight),night:light.night};
    const buildingShadows=source.balconyScene?[]:objects.filter(item=>{const f=restorationForObject(item);return !f||facilityOpen(camp.progress,f.id);}).map(buildingShadowShape).filter(Boolean);
    for(const b of buildingShadows)drawBuildingCastShadow(c,b,light.night);
    const playerLighting=sampleSceneLight(g.player,light,g.trees,lamps,buildingShadows);
    if(!g.vehicle.active&&!g.player.flying&&!flight&&!farmWorking(source))drawActorCastShadow(c,g.player,playerLighting);
    this.sceneDepthReview={designCriterion:'scene-light-depth',light:playerLighting,trees:g.trees.length,lamps:lamps.length,buildings:buildingShadows.length,...sceneDepthStats(),...groundDepthStats()};
    // 攻击预警始终在地面投影上方，不能被新增阴影压暗。
    for(const hazard of g.hazards)if(hazard.kind!=='feather'||hazard.age<hazard.warmup)drawBossHazard(c,hazard,this.reduced.matches);
    for(const enemy of g.enemies)if(!enemy.flying)drawEnemyWarning(c,enemy);
    drawStormGround(c, view, objects, light.storm, this.storm, this.reduced.matches, this.stormStrike);
    profiler?.end('render.lighting');
    profiler?.start('render.gravity');
    drawGravityFields(c,source,this.reduced.matches);
    profiler?.end('render.gravity');
    profiler?.start('render.entities');
    for (const item of objects) {
      if(source.balconyScene&&item.type==='player')continue;
      // 独立运动草坪覆盖原地表，平台内部不能残留森林摆件或山体遮挡。
      if(item.kind==='district-sign'&&source.progress.campManagement?.items.some(d=>d.type==='default-sign-'+item.id)&&!source.realm&&!source.story&&!source.campDefense)continue;
      if(['football','race'].includes(source.realm?.mode)&&['scenery','landform','fixture','signpost'].includes(item.type)&&Math.hypot(item.x-source.realm.arena.x,item.y-source.realm.arena.y)<source.realm.arena.radius+220)continue;
      // 宽麦田按真实冠幅裁剪，镜头经过行中心外侧时仍保留伸入画面的麦穗。
      const margin = item.type==='settlement-gate'?item.length/2+55:item.burst ? 180 : ['realm-entrance','fire-station-back'].includes(item.type) ? Math.max(90,item.width/2+10) : item.type === 'landform' ? item.rx + 45 : item.scenic ? 190 : item.type === 'scenery' ? Math.max(100, (item.width || 160) / 2 + 16) : 90;
      if (!['landform','earth-landform'].includes(item.type) && (
        item.x < cameraX - margin ||
        item.x > cameraX + view.w + margin ||
        item.y < cameraY - (item.type==='settlement-gate'?margin:item.burst?180:70) ||
        item.y > cameraY + view.h + (item.type==='settlement-gate'?margin:item.kind==='cottage'&&!item.workshop?380:item.burst?180:item.type === 'landform' ? item.height + item.ry + 40 : item.scenic ? 250 : item.type === 'realm-entrance' ? item.height + 10 : 140)
      ))
        continue;
      // 屋体前后层同步显露；库内车辆仍只在消防设施已开放时出现。
      if(item.type==='fire-station-back'&&!restorationBuildingVisible(camp,'fire'))continue;
      if(['fire-truck-rear','fire-truck-front'].includes(item.type)&&!facilityOpen(source.progress,'fire'))continue;
      if(source.balconyScene){c.save();balconyUpright(c,view,item);}
      if(drawRestorationObject(c,item,camp,light.night,g.player)){drawRestorationScaffold(c,item,camp,light.night);if(source.balconyScene)c.restore();continue;}
      // 作用域严格限定主营地屋体，结束后还原；门洞、机械和人物独立绘制。
      const themed=!source.story&&!source.realm&&!source.campDefense&&source.mapId==='forest'&&( ['camp-decor-shop','construction-company','repair-center','repair-center-back','outdoor-shop','ammo-shop','industry','warehouse','warehouse-depot','cat-home','furniture-shop','seed-shop'].includes(item.type)||item.type==='scenery'&&['cottage','garage'].includes(item.kind));
      setCampBuildingFinish(themed?source.progress.campManagement?.styles.building:null);
      const cachedBuilding=CACHED_CAMP_BUILDINGS.has(item.type);
      if(cachedBuilding){this.visibleStats.campBuildings++;profiler?.start('render.campBuildings');}
      if(item.type==='festival-lion')drawFestivalLion(c,item,source.time,this.reduced.matches);
      else if(item.type==='camp-decoration')drawCampDecoration(c,item,light.night,source.time,this.reduced.matches);
      else if(item.type==='camp-decor-shop')drawCampDecorShop(c,item,light.night);
      else if(item.type==='camp-land-sign'||item.type==='camp-land-stake')drawCampLandObject(c,item,light.night);
      else if(item.type==='mine-shaft')drawMineShaft(c,item,light.night);
      else if(item.type==='construction-company')drawConstructionCompany(c,item,light.night);
      else if(item.type==='outdoor-camp')drawOutdoorObject(c,item,source,light.night);
      else if(item.type.startsWith('regional-'))drawRegionalCamp(c,item,source,light.night,winter);
      else if(item.type==='waystation')this.waystationReview.push(drawWaystation(c,item,light.night));
      else if(item.type.startsWith('repair-'))drawVehicleServiceObject(c,item,camp,light.night,this.reduced.matches,g.player);
      else if(item.type==='legendary-workshop')drawLegendaryWorkshop(c,item,light.night);
      else if(item.type==='river-dock'||item.type==='river-barrier')drawRiverCrossing(c,item,light.night,g.player);
      else if(item.type==='fire-water')drawWaterPump(c,item,g.time,source.fireActive&&source.fireRescue.filling&&Math.hypot(item.x-g.player.x,item.y-g.player.y)<48,this.reduced.matches);
      else if(item.type==='fire-station-back')drawFireStation(c,item,g.player,time,'back');
      else if(item.type==='fire-truck-rear')drawVehicleTracks(c,item,source.fireStationTruck);
      else if(item.type==='fire-truck-front')drawVehicleArmor(c,item,source.fireStationTruck,source.loadout,0,true);
      else if(item.type==='trade-post'||item.type==='trade-cart')drawTradeObject(c,item,source,light.night,this.reduced.matches);
      else if(item.type==='parked-vehicle')drawParkedVehicle(c,item,camp);
      else if(item.type.startsWith('arrival-'))drawArrivalObject(c,item,camp,this.reduced.matches,winter);
      else if(item.type==='story-post')(item.clearing?drawClearingPost:drawStoryPost)(c,item,light.night,g.player);
      else if(item.type.startsWith('monster-camp-'))drawMonsterCampObject(c,item,source,light.night,this.reduced.matches,true);
      else if(item.type==='camp-resident'||item.type==='living-resident'||item.type==='living-facility')drawLivingObject(c,item,camp,light.night,this.reduced.matches);
      else if(item.type==='settlement-fence'||item.type==='settlement-gate')drawSettlement(c,source.balconyScene&&view.forward.x?{...item,horizontal:!item.horizontal}:item,source,light.night);
      else if(item.type==='story-prop')drawStoryProp(c,item,source.time,light.night,this.reduced.matches,g.player);
      else if (item.type === 'mechanical-cat') drawMechanicalCat(c,item,item.weapon,this.reduced.matches);
      else if(item.type==='mechanical-spider')drawArmedSpider(c,item,item.weapon,this.reduced.matches);
      else if (item.type === 'defense') drawGuardianDefense(c, item.tower, g.time, this.reduced.matches);
      else if (item.type === 'goddess') drawGoddess(c, item, g.time, this.reduced.matches);
      else if (item.type === 'realm-entrance') drawRealmEntrance(c, item, light.night, g.player, time, this.reduced.matches);
      else if(item.type==='earth-landform')drawEarthLandform(c,item,light.night,g.player);
      else if (item.type === 'landform') drawMountain(c, item, light.night, g.player, winter,view);
      // 洞内车已在门洞之后裁切绘制，车库保持实墙，不再把整栋建筑淡成透明。
      else if (item.type === 'scenery') {
        // 工坊造型由已保存的入职阶段投影，不叠画旧小屋或额外封门图层。
        const build=item.workshop===true?workshopBuildView(source):null;
        const home=item.kind==='cottage'&&!item.workshop&&facilityOpen(source.progress,'cottage')?{...item,homeFloors:source.progress.homeDecor?.floors}:item;
        drawScenery(c,build?{...item,workshopState:build.state,rebuildProgress:build.progress,reducedMotion:this.reduced.matches}:home,light.night,item.kind==='garage'&&parkingGaragePose(g.player,g.vehicle)?null:g.player,winter);
      }
      else if (item.type === 'fixture') drawLightFixture(c, item, time, light, this.reduced.matches);
      else if (item.type === 'signpost') drawRegionSignpost(c, item, light.night, g.player, zoom);
      else if (item.type === 'tree'){
        drawForestTree(
          c,
          item,
          this.reduced.matches ? 0 : time,
          light.night,
          this.reduced.matches,
          localIllumination(item, lamps).power,
          g.player,
          winter,
          valley ? 'original' : this.ground.season,
          valley ? null : seasonVisual,
          gustStrength(g.time - .18, item.x, wind),
        );
        drawBurningTree(c,item,g.time,this.reduced.matches);
      }
      else if(item.type==='camp-defense')drawCampDefense(c,item,source,this.reduced.matches);
      else if (item.type === 'enemy') {
        profiler?.start('render.monsters');
        if (item.flying) drawEnemyWarning(c, item);
        drawSlime(c, item, g.time, this.reduced.matches, profiler);
        profiler?.end('render.monsters');
      }
      else if(item.type==='farm-delivery')drawFarmDelivery(c,item);
      else if(item.type==='outdoor-shop')drawOutdoorShop(c,item,light.night,winter);
      else if(item.type==='ammo-shop')drawAmmoShop(c,item,light.night,winter);
      else if(item.type==='industry')drawIndustry(c,item,g,light.night);
      else if(item.type==='warehouse'||item.type==='warehouse-depot')drawWarehouse(c,item,light.night,winter);
      else if(item.type==='cat-home')drawCatHome(c,item,light.night,winter);
      else if(item.type==='furniture-shop')drawFurnitureShop(c,item,light.night,winter);
      else if(item.type==='seed-shop')drawSeedShop(c,item);
      else if(item.type==='farm-sign')drawCampFarmSign(c,item);
      else if(item.type==='farm-production')drawProductionDevice(c,item,g.time,this.reduced.matches,camp.productionSpray);
      else if(item.type==='wild-ox'||item.type==='sweet-grass'||item.type==='pasture-front'||item.type==='pasture-back'||item.type==='pasture-sheep')drawPasture(c,item,g.time);
      else if(item.type==='parked-ox')drawOxPlow(c,item,item,g.time);
      else if(item.type==='farm-crop'){
        this.visibleStats.crops++;
        profiler?.start('render.crops');
        drawFarmCrop(c,item,g.time,this.reduced.matches,this.farmVisualNow,cropBoosts,zoom);
        profiler?.end('render.crops');
      }
      else if(item.type==='race-bale')drawRaceBale(c,item);
      else if (item.type === 'race-runner')drawRaceRunner(c,item,this.reduced.matches);
      else if (item.type === 'boss') drawBoss(c, item, time, this.reduced.matches);
      else {
        if(flight){drawHomeGlider(c,g.player,playerHero,flight,g.time,this.reduced.matches);continue;}
        if((source.arrivalScene?.riding||source.arrivalScene?.playerOnBus)&&source.arrivalPending){if(source.balconyScene)c.restore();continue;}
        c.save();
        const garage=parkingGaragePose(g.player,g.vehicle);if(garage)clipGarageOpening(c,garage);
        if (g.player.invincible > 0) c.globalAlpha = 0.55 + Math.sin(time * 40) * 0.3;
        drawEnergyShield(c,source,g.player,this.reduced.matches,'back');
        if (g.vehicle.active)
          drawVehicleTracks(c, g.player, g.vehicle, this.reduced.matches, g.time,g.progress);
        const ox=farmWorking(source)&&source.farmWork.ox;
        c.save();clipEraSeat(c,item,g.vehicle);
        const handler=ox&&!ox.approach?oxHandler(item,ox.yaw):riderPosition(item,g.vehicle);
        drawCat(
          c,
          handler.x,
          handler.y,
          playerHero,
          g.player.angle,
          PLAYER_SCALE,
          g.player.walkPhase,
          g.progress.weapon,
          g.player.recoil,
          this.reduced.matches ? 0.35 : 1,
          chargePose,
          gatlingHeat(source.weapon(), source.magazines[(source.loadout || source.progress).weapon]),
          artSampleWeight(source.player.x, source.player.y) > 0.2,
          false,
          g.player.bodyAnimation,
          source.weapon().modChoice,
          source.weapon().parts,
          this.reduced.matches?0:source.magazines[(source.loadout||source.progress).weapon]?.rotor||0,
          outdoorBusy(source)||farmWorking(source)||source.realm?.mode==='race'||source.arrivalCinematic||frontRider(g.vehicle),
          gustStrength(g.time, item.x, wind),
          !!ox&&!ox.approach,
          playerLighting,
        );
        c.restore();
        // 与骑车一样先画座位上的猫，再由牛头、挽具遮住腿部。
        if(ox&&!ox.approach)drawOxPlow(c,item,ox,g.time);
        drawFarmTool(c,source,g.player);
        drawOutdoorFishing(c,source,g.player,light.night);
        if(source.fireActive||g.vehicle.active&&g.vehicle.index===4)drawFireHelmet(c,g.player);
        if (g.vehicle.active)
          drawVehicleArmor(c, g.player, g.vehicle, g.progress, g.time, this.reduced.matches);
        if (frontRider(g.vehicle) && !source.arrivalCinematic)
          drawRiderWeapon(c, riderPosition(g.player, g.vehicle), playerHero, g.progress.weapon, {
            scale: PLAYER_SCALE, motionScale: this.reduced.matches ? 0.35 : 1, chargePose,
            heat: gatlingHeat(source.weapon(), source.magazines[(source.loadout || source.progress).weapon]),
            sample: artSampleWeight(source.player.x, source.player.y) > 0.2,
            modChoice: source.weapon().modChoice, parts: source.weapon().parts,
            rotor: this.reduced.matches ? 0 : source.magazines[(source.loadout || source.progress).weapon]?.rotor || 0,
          });
        drawEnergyShield(c,source,g.player,this.reduced.matches);
        c.restore();
      }
      setCampBuildingFinish(null);
      drawFestivalCouplets(c,item,camp);
      drawCampWindowLights(c,windowGroups.get(item),light.night);
      if(cachedBuilding)profiler?.end('render.campBuildings');
      drawRestorationScaffold(c,item,camp,light.night);if(source.balconyScene)c.restore();
    }
    // 营地居民血条在实体之后绘制，避免被相邻盾卫或棚子盖住，只绘制一次。
    for(const item of objects)if(item.type==='monster-camp-resident')drawEnemyHealthBar(c,item);
    drawFestivalFireworks(c,camp,view,light.night,this.reduced.matches);
    drawRestorationTransfer(c,camp,this.reduced.matches,zoom);
    drawArrivalGuidance(c,source,g.player);
    drawParkingCountdown(c,source,g.player,zoom);
    drawWorkshopBuildCountdown(c,source,zoom);
    drawRestorationBuildCountdown(c,camp,zoom);
    drawStoryDestination(c,source,view,this.reduced.matches);
    if(source.fireActive&&g.vehicle.active)drawRescueStream(c,source.fireRescue,g.time,this.reduced.matches);
    this.fallingLeaves.draw(c,time,g.trees,!valley && !source.realm ? 'autumn' : 'original',light.night,this.reduced.matches,g.player,this.environment.weather,seasonVisual.weights.autumn);
    profiler?.end('render.entities');
    profiler?.start('render.combatFX');
    // 在途能量束保留发射原点，新瞄准线立即跟随下一目标，不等待余辉消失。
    if (funnel)
      drawFunnelArray(c, source.player, source[source.weapon().controller], this.reduced.matches);
    const mountedCompanions=vehicleCompanionContext(source);
    if(mountedCompanions && ['funnel','drone'].includes(mountedCompanions.weapon().controller))
      drawFunnelArray(c,source.player,mountedCompanions[mountedCompanions.weapon().controller],this.reduced.matches);
    drawSniperGuide(c, visualGuide, zoom, g.player.recoil.flash > 0);
    drawPulseCharge(c, visualGuide, zoom, g.time, this.reduced.matches);
    drawBallistics(c, g.projectiles, this.reduced.matches);
    drawEnemyBolts(c, g.enemyBolts, this.reduced.matches);
    // 飞行羽刃与枪械弹丸处于同一表现层，避免被树冠完全遮住后仍造成伤害。
    for (const hazard of g.hazards)
      if (hazard.kind === 'feather' && hazard.age >= hazard.warmup)
        drawBossHazard(c, hazard, this.reduced.matches);
    for (const shot of g.shots) {
      if (shot.kind === 'arc-link') {
        drawArcLink(c, shot, this.reduced.matches);
        continue;
      }
      if (shot.kind === 'pulse-beam') {
        drawPulseBeam(c, shot, this.reduced.matches);
        continue;
      }
      // 激光束随脉冲寿命衰减，外层辉光与细亮芯共同保持穿透方向清晰。
      const power = clamp(shot.life / shot.lifetime, 0, 1);
      c.save();
      c.globalAlpha = power * (this.reduced.matches ? 0.6 : 1);
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(shot.x, shot.y);
      c.lineTo(shot.ex, shot.ey);
      c.strokeStyle = '#bafa9630';
      c.lineWidth = 14 * power;
      c.stroke();
      c.strokeStyle = '#bafa9690';
      c.lineWidth = 6 * power;
      c.stroke();
      c.strokeStyle = '#f0ffdb';
      c.lineWidth = 2;
      c.stroke();
      c.restore();
    }
    drawCombatFX(c, g.fx.items, this.reduced.matches, g.player);
    for (const p of g.particles) {
      c.globalAlpha = clamp(p.life * 2, 0, 1);
      c.fillStyle = p.color;
      c.fillRect(p.x, p.y, p.size, p.size);
    }
    c.globalAlpha = 1;
    drawResourcePickups(c,g.drops,riderPosition(g.player,g.vehicle),this.reduced.matches);
    if(source.campDefense?.phase==='spoils')drawGiantSpoils(c,viewBody(source.campDefense.spoils,source.player),this.reduced.matches);
    c.globalAlpha = 1;
    for (const n of g.numbers) {
      c.globalAlpha = Math.min(1, n.life * 2);
      c.font = canvasFont(n.big ? 22 : 17, 900);
      c.textAlign = 'center';
      c.strokeStyle = '#41503a';
      c.lineWidth = 3;
      c.lineJoin = 'round';
      // 材料飘字使用与工坊相同的图标，只显示数量，不再用字符冒充图案。
      if (n.resources) {
        const entries = Object.entries(n.resources).filter(([, value]) => value > 0);
        entries.forEach(([key, value], index) => {
          const x = n.x + (index - (entries.length - 1) / 2) * 49;
          drawResourceIcon(c, key, x - 12, n.y - 7, 24);
          c.textAlign = 'left';
          c.strokeText(`+${value}`, x + 1, n.y);
          c.fillStyle = n.color;
          c.fillText(`+${value}`, x + 1, n.y);
        });
        continue;
      }
      c.strokeText(n.text, n.x, n.y);
      c.fillStyle = n.color;
      c.fillText(n.text, n.x, n.y);
    }
    c.globalAlpha = 1;
    profiler?.end('render.combatFX');
    profiler?.start('render.atmosphere');
    if (!valley) this.fireflies.draw(
      c,
      time,
      light,
      { x: cameraX, y: cameraY, w: view.w, h: view.h },
      this.reduced.matches,
    );
    c.restore();
    // 光照交给场景色调与实体落影，取消额外绿灰边缘罩色，保留边缘物体的原材质对比。
    this.rain.drawAir(
      c,
      time,
      w,
      h,
      view,
      light.rain,
      light.storm,
      this.storm?.flash || 0,
      this.reduced.matches,
      source.balconyScene?balconyProject(view,g.player):{x:(g.player.x-cameraX)*zoom,y:(g.player.y-cameraY)*zoom},
    );
    this.snow.draw(c,time,w,h,view,light.snow,light.night,this.reduced.matches,source.balconyScene?balconyProject(view,g.player):{x:(g.player.x-cameraX)*zoom,y:(g.player.y-cameraY)*zoom});
    drawStorm(c, w, h, light.storm, this.storm, this.reduced.matches, view, this.stormStrike);
    profiler?.end('render.atmosphere');
    profiler?.start('render.tone');
    this.tone.draw(c, w, h, this.environment, performance.now(), this.reduced.matches);
    profiler?.end('render.tone');
    drawSurfaceFog(this,renderGame,g.player,view,lamps,light.night,windowLights);
    profiler?.start('render.indicators');
    drawPlayerActionCountdown(this);
    drawWaterBagIndicator(this);
    // 用屏幕坐标贴在角色头顶，装填环不参与世界光照、后坐震动或树冠排序。
    if (
      !flight && !source.balconyScene && !this.actionCountdownView && !source.weapon().independentSupply &&
      (source.state === 'playing' || source.state === 'paused')
    )
      drawReloadIndicator(
        c,
        source.player,
        view,
        source.magazines[(source.loadout || source.progress).weapon],
        source.weapon().reloadTime,
        source.weapon().resourceType,
      );
    profiler?.end('render.indicators');
  }
}
