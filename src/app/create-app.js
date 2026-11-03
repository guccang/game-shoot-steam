import {createCreatureCodex} from '../ui/creature-codex.js';
import {createOutdoors} from '../ui/outdoors.js';
import {createTreasure} from '../ui/treasure.js';
import {createLoadCleanup} from '../ui/load-cleanup.js';
import {interiorLayout} from '../config/workshop-interiors.js';
import {requestWorldNavigation} from '../core/world-navigation.js';
import {createVehicleRepairPanel} from '../ui/vehicle-repair.js';
import {facilityOpen} from '../config/town-restoration.js';

import {createNpcConversations} from '../ui/npc-conversations.js';
import {createMonsterCampPanel} from '../ui/monster-camps.js';
import {createWarehouse} from '../ui/warehouse.js';
import {createSeedShop} from '../ui/seed-shop.js';
import { createFixedStep } from '../platform/fixed-step.js';
import { bindMobileFullscreen } from '../platform/mobile-fullscreen.js';
import { createRenderInterpolation } from '../rendering/render-interpolation.js';
import {createRestorationPanel} from '../ui/town-restoration.js';
import {createNearbyInteraction} from '../ui/nearby-interaction.js';
import {requestParking} from '../core/parking.js';
import {requestFireParking} from '../core/fire-rescue.js';
import {campProgress,campDiscountText} from '../progression/camp-level.js';
import {updateWorkshopDisplayEntry} from '../core/workshop-display-entry.js';
import {STORY_POSTS} from '../config/story-posts.js';
import {createTaskReward} from '../ui/task-reward.js';
import {createCampHome} from '../ui/camp-home.js';
import {createCampDefensePanel} from '../ui/camp-defense.js';
import {createWaveTailNavigation} from '../ui/wave-tail-navigation.js';
import {createClearingPanel} from '../ui/clearing.js';
import { createLivingPanel } from '../ui/living-world.js';
import {createFarmProduction} from '../ui/farm-production.js';
import {createFarmPanel} from '../ui/farm.js';
import {SeasonPrewarmScheduler,seasonPrewarmCombat} from '../platform/season-prewarm.js';
import { createLivingSoundscape } from '../platform/audio-living.js';
import { calendarView,advanceLivingCalendar,projectLivingCalendar } from '../world/living-calendar.js';
import {durationFor} from '../world/environment-timing.js';
import {clearLivingRenderCache} from '../rendering/living-world.js';
import {recordCanvasContextEvent} from '../rendering/canvas-recovery.js';
import { chooseSeasonWeather } from '../world/season-weather.js';
import { recordPlayTime } from '../world/play-chronicle.js';
import { freshRangerProgress } from '../progression/progress.js';
import { createRangerArrival } from '../ui/ranger-arrival.js';
import {createMainline} from '../ui/mainline.js';
import {recordMainlineEvent} from '../core/mainline-manager.js';
import { i18nText } from "../i18n/index.js";
import { localizeDocument } from '../i18n/document.js';
// 应用首页与战场共用生命周期，首页不推进或重写玩法状态。
import {createFirePanel} from '../ui/fire-rescue.js';
import { createTitleMenu } from '../ui/title-menu.js';
import { createStartLoading } from '../ui/start-loading.js';
import { createStoryPanel } from '../ui/story.js';
import { advanceLedger } from '../progression/economy-ledger.js';
import { createNaturalClock } from '../world/natural-clock.js';
import { createChroniclePanel } from '../ui/panels/chronicle.js';
import { createMechanicalPanel } from '../ui/panels/mechanical.js';
import { configureMechanical } from '../core/mechanical-loadout.js';
import { createSpiderPanel } from '../ui/panels/spider.js';
import { configureSpider } from '../core/spider-loadout.js';
import {createLegendaryWorkshop} from '../ui/legendary-workshop.js';
import { createWorkshop } from '../ui/workshop.js';
import { createWorldWorkshop } from '../ui/world-workshop.js';
import { commitWorkshop } from '../core/workshop.js';
import { createWorkshopTrial } from '../core/workshop-trial.js';
// 应用装配入口：连接规则、画布与浏览器适配器，内部模块不依赖此入口。
import { Game, NavigationWarmup } from '../core/game.js';
import { Renderer } from '../rendering/renderer.js';
import { beginEnvironmentVisit } from '../world/environment.js';
import { StormCycle } from '../world/storm.js';
import { createSaveStore } from '../platform/storage.js';
import {fireAudioScene} from '../platform/audio-fire.js';
import { createAudio } from '../platform/audio.js';
import { createInput } from '../platform/input.js';
import { createEventScope } from '../platform/events.js';
import { createFrameLoop } from '../platform/frame-loop.js';
import { beginSceneLayout, endSceneLayout } from '../ui/scene-layout.js';
import { createToast } from '../ui/toast.js';
import { createDialogs } from '../ui/dialogs.js';
import { createInventory } from '../ui/inventory.js';
import { createHud } from '../ui/hud.js';
import { createEquipmentGoals } from '../ui/equipment-goals.js';
import { createFunnelPanel } from '../ui/panels/funnel.js';
import { createVehiclePanel } from '../ui/panels/vehicles.js';
import { createRealmPanel } from '../ui/panels/realms.js';
import { createGuardianBuild } from '../ui/guardian-build.js';
import { createCameraControls } from '../ui/camera-controls.js';
import { createWorldRealms } from '../ui/world-realms.js';
import { createVehicleControls } from '../ui/vehicle-controls.js';
import { createMapPanel } from '../ui/panels/map.js';
import {createKeepsakeBackpack} from '../ui/keepsake-backpack.js';
import {createFieldEquipment} from '../ui/field-equipment.js';
import {createLogistics} from '../ui/logistics.js';
import { createEnvironmentPanel } from '../ui/panels/environment.js';
import { createSettingsPanel } from '../ui/panels/settings.js';
import { createAudioControls } from '../ui/audio-controls.js';
import { createGameEventHandler } from './game-events.js';
import { createProgressController } from './progress-controller.js';
import { createDiagnostics } from './diagnostics.js';
const mounted = new WeakMap();

// 注入宿主和存储便于集成与测试；同一画布必须先销毁旧实例再重新挂载。
export function createApplication({
  root = document,
  host = root.defaultView,
  getStorage = () => host.localStorage,
  random = Math.random,
} = {}) {
  localizeDocument(root);
  const $ = (id) => root.getElementById(id),
    canvas = $('game');
  if (mounted.has(canvas)) throw new Error(i18nText("app.create-app.46a69526ab"));
  const scope = createEventScope(),
    store = createSaveStore(getStorage),
    audio = createAudio(() => new (host.AudioContext || host.webkitAudioContext)(), {
      preferences: store.loadAudio(), onChange: store.saveAudio,
    }),
    toast = createToast($('toast'));
  let disposed = false,
    handleEvent = () => {},
    refresh = () => {},
    uiTime = 0;
  const initialSave=store.inspectProgress();
  const shell={page:'title',entered:false,ready:true,worldReady:false,loading:false,failed:false,saveStatus:initialSave.status};
  let titleMenu, suspendedDialogs=[];
  const startLoading=createStartLoading({root,host});
  const diagnostics = createDiagnostics({ root, host, getStorage }), profiler = diagnostics.monitor;
  store.setDiagnostics(data=>diagnostics.gameplay.record('storage',data.operation,data));
  diagnostics.gameplay.record('storage','load',{status:initialSave.status});
  profiler.start('init.world');
  const game = new Game(initialSave.progress ?? freshRangerProgress(), random, (type, data) => handleEvent(type, data), { deferWorld: true });
  profiler.end('init.world');
  game.profiler = profiler;
  profiler.start('init.renderer');
  const gameplayPreferences = store.loadGameplay();
  const chronicle=store.loadChronicle();
  const environment = beginEnvironmentVisit(store.loadEnvironment(),Date.now(),Math.random,chronicle.cycles.season?.phase);
  let naturalClock=createNaturalClock(environment,chronicle);
  if(game.mapId==='forest'&&!game.progress.realms.run)projectLivingCalendar(environment,game.progress.living.calendar);
  let livingWeatherMs=0,livingWeatherAnchor=environment.weatherAt;
  const livingSounds=createLivingSoundscape(audio);
  const renderer = new Renderer(canvas, game, environment, profiler);
  const navigationWarmup = new NavigationWarmup();
  renderer.navigationWarmup = navigationWarmup;
  let warmupFrame = null, recoveryFrame = null, resolveReady, warmupClock = 0;
  // 就绪信号代表点击进入后的地图准备完成；首页不主动兑现或触发建图。
  const ready = new Promise(resolve => { resolveReady = resolve; });
  profiler.end('init.renderer');
  diagnostics.attach({ game, renderer });
  const storm = new StormCycle();
  let campDefensePanel,campHome,npcConversations;
  // 各交互控制器共享主动闲聊入口，初始化完成后才接收场景点击。
  const onTalk=(id,service)=>npcConversations.open(id,service);
  let worldRealms, worldWorkshop, worldVehicleWorkshop, guardianBuild, cameraControls;
  const input = createInput({ game, root, host, enabled:()=>shell.page==='game', onChange: () => refresh(),
    onTap: event => { if(productionPanel?.tapWorld(event)||farmPanel?.tapWorld(event))return; if (!campHome?.tap(event) && !campDefensePanel?.tap(event) && !worldWorkshop?.tap(event) && !worldVehicleWorkshop?.tap(event)) worldRealms?.tap(event); }, onPinch: ratio => cameraControls?.pinch(ratio) });
  const dialogs = createDialogs({ game, root, isGameplayActive:()=>shell.page==='game', resetInput: input.reset, onChange: () => { refresh(); syncAudio(); },onEvent:(type,data)=>diagnostics.gameplay.event(type,data) });
  const inventory = createInventory({ game, root, dialogs, onChange: () => refresh(), onInventoryRender:()=>backpack.render(), onCleanup:()=>loadCleanup.open(null) });
  const updateHud = createHud({ game, root, inventory, dialogs, getView: () => renderer.view });
  let equipmentGoals, realmPanel, storyPanel, settingsPanel, firePanel, rangerArrival, mainline, livingPanel, clearingPanel, farmPanel, productionPanel, seedShop, monsterCampPanel;
  refresh = () => {
    titleMenu?.render();
    if(shell.page==='title')return;
    updateHud();
    rangerArrival?.render();
    equipmentGoals?.render();
    realmPanel?.render();
    settingsPanel?.syncRealm();
    worldRealms?.render();
    campHome?.render();
    worldWorkshop?.render();
    worldVehicleWorkshop?.render();
    guardianBuild?.render();
    cameraControls?.render();
    storyPanel?.render();
    livingPanel?.render();
    farmPanel?.render();
    productionPanel?.render();
    seedShop?.render();
    monsterCampPanel?.render();
    clearingPanel?.render();
    firePanel?.render();
    mainline?.render();
    campDefensePanel?.render();
  };
  // 捕获不冒泡的DOM画布事件；离屏由统一工厂监听，恢复时刷新暂停中的菜单图标。
  scope.on(root,'contextlost',recordCanvasContextEvent,true);
  scope.on(root,'contextrestored',event=>{
    recordCanvasContextEvent(event);
    if(recoveryFrame===null)recoveryFrame=host.requestAnimationFrame(()=>{
      recoveryFrame=null;if(!disposed&&renderer.recoverContext())refresh();
    });
  },true);

  // 同步画布与飞控可见范围，缩屏时不等待下一次战斗更新。
  function resizeScene() {
    const before = [canvas.width, canvas.height];
    renderer.resize();
    game.setViewport(renderer.width, renderer.height);
    diagnostics.resize(before, [canvas.width, canvas.height]);
  }
  const { save, checkpoint, resetProgress, unlockWeapons, debugGrant, renderSaveStatus } =
    createProgressController({
      game,
      store,
      root,
      input,
      dialogs,
      inventory,
      refresh,
      toast,
      profiler,
      canSave:()=>shell.worldReady&&shell.entered&&!['corrupt','unavailable'].includes(shell.saveStatus),
    });
  // 环境独立写入，不覆盖巡游与成长。
  function saveEnvironment() {
    const saved=store.saveEnvironment(environment);
    renderSaveStatus();
    return saved;
  }

  const chroniclePanel=createChroniclePanel({root,dialogs,record:chronicle,game});
  let chronicleAt=null,chronicleActive=false,chronicleSaveMs=0;
  let economyAt=null,economyActive=false;
  // 只统计可见且实际运行的巡游/秘境，切后台立即切断采样，不追补离线。
  function saveChronicle() { if(shell.entered)store.saveChronicle(chronicle);chronicleSaveMs=0; }
  const environmentPanel = createEnvironmentPanel({
    environment,
    root,
    dialogs,
    onSave: saveEnvironment,
    // 手动操作也立即保存对应的新起点，退出不能恢复到跳转前的旧进度。
    onCycleRestart: kind=>{naturalClock.restart(kind);saveChronicle();},
  });
  const mechanicalPanel=createMechanicalPanel({game,root,dialogs,onChange:()=>refresh(),commit:index=>configureMechanical(game,index,store.saveProgress)});
  const spiderPanel=createSpiderPanel({game,root,dialogs,onChange:()=>refresh(),commit:index=>configureSpider(game,index,store.saveProgress)});
  const funnelPanel = createFunnelPanel({ game, root, dialogs, onChange: () => refresh() });
  const vehiclePanel = createVehiclePanel({ game, root, dialogs, onChange: () => refresh() });
  equipmentGoals = createEquipmentGoals({ game, root, dialogs, onChange: () => {
    refresh();
    if ($('vehicle-collection-dialog').open) vehiclePanel.render();
  } });
  game.restorationPersist=store.saveProgress;
  const restorationPanel=createRestorationPanel({game,root,dialogs,onChange:refresh,onUse:id=>{
   if(id==='football')realmPanel.open(id);
   else if(id==='race')realmPanel.enter(id);
   else if(id==='travel')$('phone-button').click();
   else if(id==='clearing')clearingPanel.visit();
   else if(['cottage','garage','fire','tower'].includes(id)){const room=interiorLayout({kind:id==='garage'?'vehicle':id});requestWorldNavigation(game,{...room.door,id:room.id,mapId:'forest'},'前往'+room.name,{direct:true});toast.show('下车后在门口站定 1 秒进入，与屋内售货员交谈。');}
   else if(id==='story')storyPanel.open();
   else if(id==='neighbors')livingPanel.open();
   else if(id==='defense')campDefensePanel.visit('left');
   else realmPanel.enter(id);
  }});
  game.requestFacility=id=>restorationPanel.open(id);
  const loadCleanup=createLoadCleanup({game,root,dialogs,onChange:()=>{if(root.getElementById('workshop-dialog')?.open)workshop.render();refresh();}});
  const creatureCodex=createCreatureCodex({game,root,dialogs});
  const outdoors=createOutdoors({game,root,dialogs,onChange:refresh,onFishCaught:creatureCodex.showCatch});
  const fieldEquipment=createFieldEquipment({game,root,dialogs,onChange:refresh,onOutdoor:()=>outdoors.open(),onCargo:()=>logistics.open('cargo',game.vehicle.index),onCleanup:()=>loadCleanup.open(game.vehicle.index)});
  const warehouse=createWarehouse({game,root,dialogs,onChange:refresh});
  const logistics=createLogistics({game,root,dialogs,onCleanup:index=>loadCleanup.open(index),onChange:()=>{if(root.getElementById('workshop-dialog')?.open)workshop.render();refresh();}});
  const workshop = createWorkshop({ game, root, dialogs, onChange: refresh,onEquipmentStory:id=>storyPanel.openEquipment(id),onVehicleFit:index=>logistics.open('fit',index),onCurrent:kind=>fieldEquipment.open(kind),onCleanup:()=>loadCleanup.open(null),
    commit: plan => { const result = commitWorkshop(game, plan, store.saveProgress); diagnostics.gameplay.event('workshop-commit',{plan:{kind:plan.kind,index:plan.index,action:plan.action,part:plan.part,choice:plan.choice},ok:result.ok,reason:result.reason,cost:result.cost});renderSaveStatus(); return result; },
    createTrial: createWorkshopTrial });
  const legendaryWorkshop=createLegendaryWorkshop({game,root,renderer,dialogs,persist:store.saveProgress,onChange:refresh,onNotice:toast.show,workshop});
  game.openLegendaryWorkshop=()=>legendaryWorkshop.open();
  campHome=createCampHome({game,renderer,root,input,dialogs,onTalk,onDecorChange:refresh,openWorkshop:openRoomService,onCharacter:()=>inventory.openCurrentCat('items'),onChange:()=>{save();refresh();}});
  // 全部营业建筑短按走向门口，未修复建筑继续使用原修复事务。
  worldWorkshop = createWorldWorkshop({game,renderer,root,onLocked:id=>id==='weapons'?rangerArrival.openWorkshop():restorationPanel.open(id)});
  worldVehicleWorkshop=createWorldWorkshop({game,renderer,root,kind:'vehicle',onLocked:id=>restorationPanel.open(id)});
  const vehicleControls = createVehicleControls({ game, root, onChange: () => refresh() });
  const mapPanel = createMapPanel({ game, renderer, root, dialogs, onChange: refresh });
  const vehicleRepair=createVehicleRepairPanel({game,root,dialogs,onChange:refresh,onNotice:message=>toast.show(message)});
  const treasure=createTreasure({game,root,dialogs,onChange:refresh,onNotice:message=>toast.show(message)});
  const backpack=createKeepsakeBackpack({game,root,dialogs,onChange:refresh,onNotice:message=>toast.show(message),onRepair:()=>vehicleRepair.open(true),onTreasure:()=>treasure.open()});
  firePanel=createFirePanel({game,root,dialogs,onChange:refresh});
  realmPanel = createRealmPanel({ game, root, dialogs, audio, onChange: () => refresh(),onFire:()=>firePanel.open() });
  guardianBuild = createGuardianBuild({game,renderer,root,onChange:()=>refresh()});
  cameraControls = createCameraControls({ game, root, renderer, onChange: () => refresh() });
  worldRealms = createWorldRealms({ game, renderer, root, onEnter: mode => realmPanel.enter(mode) });
  settingsPanel = createSettingsPanel({
    root,
    dialogs,
    game,
    onReset: resetFromMenu,
    onUnlock: unlockWeapons,
    onDebugGrant: debugGrant,
    preferences: gameplayPreferences,
    onArtStyleChange:()=>{renderer.refreshArtStyle();inventory.invalidateArt();root.getElementById('vehicle-menu-icon').removeAttribute('data-vehicle');refresh();},
    onPreferencesChange: () => {
      if (!store.saveGameplay(gameplayPreferences)) toast.show(i18nText("app.create-app.8ca28eb2eb"));
    },
  });
  game.arrivalPersist=store.saveProgress;
  rangerArrival=createRangerArrival({game,root,renderer,dialogs,onChange:refresh,onOpenWeaponWorkshop:()=>workshop.open('weapons',0)});
  game.storyPersist = store.saveProgress;
  game.livingPersist=store.saveProgress;
  clearingPanel=createClearingPanel({game,root,renderer,dialogs,onChange:refresh});
  livingPanel=createLivingPanel({game,root,renderer,dialogs,onTalk,onEquipmentStory:id=>storyPanel.openEquipment(id),onClearing:()=>clearingPanel.visit(),onChange:refresh,environment,onRest:()=>{projectLivingCalendar(environment,game.progress.living.calendar);environmentPanel.render();}});
  storyPanel = createStoryPanel({game,root,dialogs,renderer,onLiving:()=>livingPanel.open(),onChange:()=>refresh(),openWorkshop:(kind,index)=>workshop.open(kind,index)});
  monsterCampPanel=createMonsterCampPanel({game,root,renderer,dialogs,onTalk,onChange:refresh});
  seedShop=createSeedShop({game,root,renderer,dialogs,onChange:refresh});
  farmPanel=createFarmPanel({game,root,renderer,input,dialogs,onChange:refresh,onNotice:toast.show,onSeedShop:()=>seedShop.open()});
  productionPanel=createFarmProduction({game,root,renderer,input,dialogs,onChange:refresh,onNotice:toast.show,onPlacementStart:()=>farmPanel.close(false)});
  game.mainlinePersist=store.saveProgress;
  game.campDefensePersist=store.saveProgress;
  campDefensePanel=createCampDefensePanel({game,root,renderer,dialogs,onChange:refresh});
  mainline=createMainline({game,root,renderer,dialogs,onTalk,workshop,onFarm:()=>farmPanel.open(),onChange:refresh,openAction:action=>{
    if(action.type==='warehouse')return warehouse.open()?'warehouse-dialog':null;
    if(action.type==='logistics'){logistics.open('cargo',game.vehicle.index);return 'logistics-dialog';}
    if(action.type==='cleanup-bag'){loadCleanup.open();return 'load-cleanup-dialog';}
    if(action.type==='cleanup-vehicle'){loadCleanup.open(game.vehicle.index);return 'load-cleanup-dialog';}
    if(action.type==='vehicle-repair'){vehicleRepair.open();return 'vehicle-repair-dialog';}
    if(action.type==='seed-shop'){seedShop.open();return 'seed-shop-dialog';}
    if(action.type==='restoration'){restorationPanel.open(action.id);return 'restoration-dialog';}
    if(action.type==='clearing'){if(action.inspect)clearingPanel.inspect();else clearingPanel.visit();return root.getElementById('clearing-dialog').open?'clearing-dialog':null;}
    if(action.type==='camp-defense'){campDefensePanel.visit(action.gate);return root.getElementById('camp-defense-dialog').open?'camp-defense-dialog':null;}
    if(action.type==='workshop'){workshop.open(action.kind,action.index);return 'workshop-dialog';}
    if(action.type==='realm'){realmPanel.enter(action.mode);return 'realm-dialog';}
    if(action.type==='fire'){firePanel.open();return 'fire-dialog';}
    $(action.id)?.click();return root.querySelector('dialog[open]:not(#mainline-dialog)')?.id;
  }});
  npcConversations=createNpcConversations({game,root,renderer,dialogs,onChange:refresh,onCampService:()=>mainline.talk()});
  // 房屋服务集中在室内售货员，关闭页面后继续留在原房间。
  function openRoomService(kind,index){
    if(kind==='construction')return campHome.openService(kind,index);
    if(kind==='warehouse')return warehouse.open();
    if(kind==='ammo')return fieldEquipment.open('ammo');
    if(kind==='seed')return seedShop.open();
    if(kind==='repair')return vehicleRepair.open();
    if(kind==='fire')return firePanel.open();
    if(kind==='tower')return realmPanel.open('tower');
    if(kind==='legendary')return legendaryWorkshop.open();
    if(['relay','kitchen'].includes(kind))return livingPanel.open();
    return workshop.open(kind,index);
  }
  // 所有附近按钮只提交一次明确意图，沿用原页面、入室和载具控制器。
  const nearbyControls=createNearbyInteraction({game,renderer,root,input,activate:entry=>{
    if(entry.type==='warehouse')warehouse.open();
    else if(entry.type==='vehicle-repair')vehicleRepair.open();
    else if(entry.type==='vehicle-wreck')toast.show('载具已损坏，需要维修。请用手机呼叫救援，或到维修中心安排拖车。');
    else if(entry.type==='restoration'){
      // 自选建筑先显示修复页，扣料统一由页面修复按钮确认。
      // 已修好的球场直接查看玩法卡，进入比赛仍由卡片按钮确认。
      if(entry.key==='football'&&facilityOpen(game.progress,entry.key))realmPanel.open('football');
      else restorationPanel.open(entry.key);
    }
    else if(entry.type==='arrival-repair')game.advanceArrival();
    else if(entry.type==='monster-camp')monsterCampPanel.open(entry.key,entry.id);
    else if(entry.type==='seed-shop')seedShop.open();
    else if(entry.type==='display'){if(entry.kind==='cottage')campHome.openHomeDecor();else openRoomService(entry.kind,entry.index);}
    else if(entry.type==='workshop')workshop.open(entry.key);
    else if(entry.type==='parking')requestParking(game);
    else if(entry.type==='fire-parking')requestFireParking(game);
    else if(entry.type==='realm')worldRealms.enter(entry.key);
    else if(entry.type==='post')storyPanel.open(STORY_POSTS.find(p=>p.id===entry.key));
    else if(entry.type==='clearing')clearingPanel.open();
    else if(entry.type==='gate')campDefensePanel.visit(entry.key);
    save();refresh();
  }});
  const waveTailNavigation=createWaveTailNavigation({game,root,renderer});
  const taskReward=createTaskReward({game,root,host,dialogs,input,onChange:refresh,isActive:()=>!disposed&&shell.page==='game',onContinue:message=>toast.show(message)});
  const dispatchGameEvent=createGameEventHandler({ root, audio, toast, input, save });
  let previousCamp=campProgress(game.progress);
  handleEvent=(type,data)=>{
    diagnostics.gameplay.event(type,data);
    const camp=campProgress(game.progress);
    if(camp.tier>previousCamp.tier)toast.show(`营地升至 ${camp.tier} 级 · 购买${campDiscountText(camp.percent)}`);
    previousCamp=camp;
    if(type==='task-reward'){taskReward.enqueue(data);return;}
    // 清缴胜利沿用奖励队列展示等级快照，和主线奖励同时到达也不会互相覆盖。
    if(type==='victory'&&data?.clearingComplete&&data.qualification)taskReward.enqueue({title:'清缴完成',challenge:data.qualification,clearingRound:data.clearingRound});
    // 停车完成只恢复步行；入室须自行走到门口站定，升级页由按钮打开。
    if(type==='scene-warehouse'){warehouse.open();return;}
    if(type==='camp-parking-change'||type==='cottage-change'){input.reset();renderer.camera.time=null;save();return;}
    if(type==='vehicle-parked'){input.reset();save();refresh();return;}
    if(type==='navigation-change'){save();toast.show(game.progress.mainline.navigationEnabled?'寻路已开启':'寻路已关闭，再点右侧箭头即可开启');return;}
    recordMainlineEvent(game,type);if(type.startsWith('mainline-')){input.reset();save();if(type==='mainline-complete')taskReward.enqueue(data);return;}dispatchGameEvent(type,data);
  };
  const audioControls = createAudioControls({ root, audio, toast });

  // 战场音景只读取游戏状态；后台立即停止声音，不等待下一次动画帧。
  function syncAudio() {
    audio.setScene({
      active: shell.page==='game' && game.state === 'playing', visible: !root.hidden,
      // 面板只暂停战斗和发动机，背景音乐沿用同一声源；首页设置仍可试听。
      previewMusic: $('settings-dialog').open || shell.page==='game'&&!!root.querySelector('dialog[open]'),
      vehicle: game.arrivalScene?.riding?5:game.vehicle.active ? game.vehicle.index : -1,
      // 行走相位停步后保留，发动机必须读取真实速度才能回到怠速。
      moving: game.arrivalScene?.riding?(game.arrivalScene.driving?.25:0):Math.min(1,Math.hypot(game.player.vx||0,game.player.vy||0)/160),
      night: environment.time === 'night', boss: !!game.boss,...fireAudioScene(game),
    });
  }

  // 进入才允许存档；恢复死亡档仍停在死亡页，不能通过首页跳过死亡回退。
  function enterFromMenu() {
    if(disposed||shell.page!=='title'||!shell.ready||shell.loading||shell.failed||shell.saveStatus==='corrupt')return;
    shell.loading=true;startLoading.start();titleMenu.render();canvas.setAttribute('aria-busy','true');
    // 已建图也完整播放过场，但继续复用地图与现场，不重复建图或提前恢复模拟。
    if(shell.worldReady){startLoading.complete(finishMenuEntry);return;}
    warmupFrame=host.requestAnimationFrame(()=>{warmupFrame=host.requestAnimationFrame(prepareInitialFrame);});
  }
  // 首次与再次开始共用唯一完成出口，100%结束后才恢复游戏与挂起弹窗。
  function finishMenuEntry() {
    if(disposed||!shell.loading||!shell.worldReady)return;
    shell.loading=false;canvas.removeAttribute('aria-busy');loop.start();
    const first=!shell.entered;shell.entered=true;shell.page='game';
    input.reset();chronicleAt=null;chronicleActive=false;economyAt=null;economyActive=false;
    if(game.state==='ready'||game.state==='paused')game.start();
    titleMenu.changed();refresh();
    const pending=suspendedDialogs;suspendedDialogs=[];
    for(const id of pending)if(!$(id)?.open)dialogs.open(id);
    if(!root.querySelector('dialog[open]'))$('settings-button').focus({preventScroll:true});
    if(first)save();syncAudio();resolveReady(true);
  }
  // 先保存，再冻结页面；失败保留现场和弹窗，不谎报保存成功。
  function returnToMenu() {
    if(shell.page==='title')return true;
    if(!save()){toast.show(i18nText("app.create-app.ba256f617b"));return false;}
    saveChronicle();saveEnvironment();
    suspendedDialogs=[...root.querySelectorAll('dialog[open]')].map(n=>n.id).filter(id=>['realm-dialog','story-dialog','fire-dialog'].includes(id));
    shell.page='title';shell.saveStatus='valid';realmPanel.suspend();taskReward.clear();
    dialogs.cancelResume();input.reset();
    for(const node of root.querySelectorAll('dialog[open]'))node.close();
    chronicleAt=null;chronicleActive=false;economyAt=null;economyActive=false;
    titleMenu.changed();syncAudio();$('start').focus({preventScroll:true});return true;
  }
  // 清档事务先落盘，成功才取消旧场景并返回固定首页，下一次开始创建新巡游。
  function resetFromMenu() {
    if(disposed||!shell.ready||shell.loading||!resetProgress())return false;
    suspendedDialogs=[];realmPanel.suspend();dialogs.cancelResume();taskReward.clear();
    for(const node of root.querySelectorAll('dialog[open]'))node.close();
    shell.saveStatus='valid';shell.entered=false;shell.page='title';shell.worldReady=false;shell.failed=false;input.reset();
    chronicleAt=null;chronicleActive=false;economyAt=null;economyActive=false;
    titleMenu.changed();syncAudio();$('start').focus({preventScroll:true});return true;
  }
  titleMenu=createTitleMenu({root,host,game,shell,dialogs,onEnter:enterFromMenu,onHome:returnToMenu});
  scope.on($('pause'), 'click', () => {
    // 设置自身会临时暂停；明确点暂停则保留暂停状态，点继续则返回战场。
    if ($('settings-dialog').open) {
      const keepPaused = dialogs.willResume('settings-dialog');
      dialogs.cancelResume();
      dialogs.close('settings-dialog');
      if (!keepPaused && game.state === 'paused') game.pause();
    } else game.pause();
    input.reset();
    refresh();
  });
  scope.on($('resume'), 'click', () => {
    if (game.state === 'dead') game.start();
    else game.pause();
    input.reset();
    refresh();
  });
  scope.on($('boss-button'), 'click', () => {
    game.summonBoss();
    refresh();
  });
  $('fullscreen').hidden = !root.fullscreenEnabled;
  $('fullscreen').closest('.settings-control').hidden = !root.fullscreenEnabled;
  bindMobileFullscreen({root,host,scope,button:$('fullscreen')});
  scope.on($('fullscreen'), 'click', async () => {
    try {
      if (root.fullscreenElement) await root.exitFullscreen();
      else await root.documentElement.requestFullscreen();
    } catch {
      if (!disposed) toast.show(i18nText("app.create-app.359397a987"));
    }
  });
  // 启动阶段可能已进入全屏，应用接管时立即同步设置按钮文案。
  function refreshFullscreenLabel() {
    const label = root.fullscreenElement ? i18nText("app.create-app.0f1505b6ad") : i18nText("app.create-app.2ea6efe459");
    $('fullscreen').setAttribute('aria-label', label);
    $('fullscreen').title = label;
    $('fullscreen-caption').textContent = label;
  }
  refreshFullscreenLabel();
  scope.on(root, 'fullscreenchange', () => {
    refreshFullscreenLabel();
    resizeScene();
  });
  scope.on(host, 'blur', () => {
    input.reset();
    // 失焦始终释放移动输入，是否暂停及取消弹窗自动恢复由玩家偏好决定。
    if (shell.page==='game' && gameplayPreferences.pauseOnBlur) {
      dialogs.cancelResume();
      if (game.state === 'playing' || (game.state === 'realm' && game.realm?.phase === 'rest')) {
        game.pause();
        refresh();
      }
    }
    syncAudio();
  });
  const simulation = createFixedStep(), interpolation = createRenderInterpolation(), seasonPrewarm = new SeasonPrewarmScheduler();
  scope.on(root, 'visibilitychange', () => {
    simulation.reset(); interpolation.reset(); loop.resetClock();
    if (root.hidden) {
      chronicleAt=null;chronicleActive=false;saveChronicle();
      economyAt=null;economyActive=false;
      input.reset();
      // 切换标签页与窗口失焦遵守同一开关，避免关闭后仍被第二条事件链暂停。
      if (shell.page==='game' && gameplayPreferences.pauseOnBlur) {
        dialogs.cancelResume();
        if (game.state === 'playing' || (game.state === 'realm' && game.realm?.phase === 'rest')) game.pause();
      }
      save();
      refresh();
    }
    syncAudio();
  });
  scope.on(host, 'pagehide', () => { saveChronicle(); save(); audio.setScene({ active: false, visible: false }); });
  const observer = new host.ResizeObserver(resizeScene);
  observer.observe($('game-frame'));
  const loop = createFrameLoop({
    host,
    onFrame: (dt, now, frameElapsed) => {
      // 首页完全停止模拟、对白计时、经济计时和场景绘制，背景只使用视频。
      if(shell.page==='title'){simulation.reset();interpolation.reset();settingsPanel.recordFrame(null);return;}
      // 丢失期间不生成空白缓存，也不在恢复后补算不可见期间的战斗和日历。
      if(!renderer.recoverContext()){simulation.reset();chronicleAt=now;economyAt=now;return;}
      const frameStart = host.performance.now();
      settingsPanel.recordFrame(frameStart);
      beginSceneLayout(renderer);
      profiler.beginFrame(now, game.state);
      try {
        profiler.start('environment');
        const active=!root.hidden&&(game.state==='playing'||(game.state==='realm'&&game.realm?.phase==='rest'));
        const elapsed=active&&chronicleActive&&chronicleAt!==null?Math.max(0,now-chronicleAt):0;
        chronicleAt=now;chronicleActive=active;
        const environmentNow = Date.now();
        const usesCalendar=game.mapId==='forest'&&!game.realm;
        let environmentChanged=false;
        if(usesCalendar){
          if(!environment.livingPreview&&!game.arrivalPending){advanceLivingCalendar(game.progress.living.calendar,elapsed);recordPlayTime(chronicle,elapsed,environment);}
          environmentChanged=projectLivingCalendar(environment,game.progress.living.calendar,environmentNow);
          // 手动换天气与既有周期设置继续有效，暂停只移动锚点而不累计天气时长。
          if(environment.weatherAt!==livingWeatherAnchor)livingWeatherMs=0;
          livingWeatherMs+=elapsed;
          const weatherDuration=durationFor(environment,'weather');
          if(environment.autoWeather&&livingWeatherMs>=weatherDuration){livingWeatherMs%=weatherDuration;environment.weather=chooseSeasonWeather(environment.forestSeason,environment.weather);environmentChanged=true;}
          environment.weatherAt=environmentNow-livingWeatherMs;livingWeatherAnchor=environment.weatherAt;
          game.livingPhase=calendarView(game.progress.living.calendar).id;
          game.livingPreview=!!environment.livingPreview;
        }else{
          if(environment.calendarActive){environment.calendarActive=false;naturalClock=createNaturalClock(environment,chronicle,environmentNow);}
          environmentChanged=naturalClock.advance(elapsed,environmentNow);
        }
        // 所有室外地图都同步当前天气，避免旅行后沿用森林的旧雨情。
        game.livingWeather=environment.weather;
        if (environmentChanged) {
          environmentPanel.render();
          saveEnvironment();
          saveChronicle();
        }
        // 局内选牌、布防和休整都占用经济时间；暂停与隐藏窗口完全排除。
        const playingEconomy=!root.hidden&&(game.state==='playing'||game.state==='realm'&&!['lost','won'].includes(game.realm?.phase));
        advanceLedger(game.progress,!game.story&&playingEconomy&&economyActive&&economyAt!==null?Math.max(0,now-economyAt)/1000:0,game.realm?.mode||'forest');
        economyAt=now;economyActive=playingEconomy;
        chronicleSaveMs+=elapsed;
        if(chronicleSaveMs>=10000)saveChronicle();
        environmentPanel.renderClock(environmentNow);
        const vector = input.read();
        diagnostics.gameplay.input(vector);
        profiler.end('environment');
        game.reducedMotion = renderer.reduced.matches;
        profiler.start('audio');
        syncAudio();
        profiler.end('audio');
        profiler.start('logic');
        // 逻辑固定40ms；每次更新前保存连续表现状态，渲染帧无需重复寻敌和碰撞。
        renderer.frameTiming = simulation.advance(root.hidden ? 0 : frameElapsed, step => {
          interpolation.beforeStep(game);
          game.update(step, vector);
          const service=updateWorkshopDisplayEntry(game,step,vector,!!root.querySelector('dialog[open]'));
          if(service){input.reset();campHome.openService(service.kind,service.index);}
          diagnostics.gameplay.observe();
        });
        livingSounds.update(game,dt,!root.hidden);
        profiler.end('logic');
        syncAudio();
        checkpoint(dt);
        profiler.start('environment');
        renderer.storm = storm.sample(
          host.performance.now(),
          environment.weather === 'thunder',
          renderer.reduced.matches,
        );
        if (renderer.storm.thunder && !root.hidden) audio.play('thunder');
        profiler.end('environment');
        profiler.start('render');
        profiler.start('render.interpolation');
        const renderGame = interpolation.sample(game, renderer.frameTiming.alpha);
        profiler.end('render.interpolation');
        // Canvas 与每帧 DOM 面板分开计时；采样异常也必须恢复原生绘图方法。
        const sampled = renderer.commands.begin(renderer.c, profiler.totalFrames, game.state, profiler.enabled);
        if (profiler.current) profiler.current.canvasCommandSample = sampled;
        profiler.start('render.canvas');
        renderer.ground.setPrewarmPolicy(seasonPrewarm.begin({now:host.performance.now(),elapsed:frameElapsed,
          combat:seasonPrewarmCombat(game),hidden:root.hidden}),seasonPrewarm.reason);
        try { renderer.draw(renderGame); } finally { renderer.commands.end(); profiler.end('render.canvas'); }
        profiler.start('render.panels');
        updateHud.renderFrame();
        profiler.start('render.panels.fire'); firePanel.renderFrame(); profiler.end('render.panels.fire');
        profiler.start('render.panels.story'); storyPanel.renderFrame(dt); profiler.end('render.panels.story');
        profiler.start('render.panels.clearing'); clearingPanel.renderFrame(); profiler.end('render.panels.clearing');
        profiler.start('render.panels.farm'); farmPanel.renderFrame(); productionPanel.render(); profiler.end('render.panels.farm');
        legendaryWorkshop.renderFrame();
        seedShop.renderFrame();
        outdoors.renderFrame();
        monsterCampPanel.renderFrame();
        profiler.start('render.panels.living'); livingPanel.renderFrame(); profiler.end('render.panels.living');
        profiler.start('render.panels.arrival'); rangerArrival.renderFrame(); profiler.end('render.panels.arrival');
        profiler.start('render.panels.mainline'); mainline.renderFrame(dt); profiler.end('render.panels.mainline');
        npcConversations.renderFrame();
        profiler.start('render.panels.campDefense'); campDefensePanel.renderFrame(); profiler.end('render.panels.campDefense');
        profiler.start('render.panels.waveTail'); waveTailNavigation.renderFrame(); profiler.end('render.panels.waveTail');
        profiler.start('render.panels.realms'); worldRealms.render(); profiler.end('render.panels.realms');
        profiler.start('render.panels.home'); campHome.render(); profiler.end('render.panels.home');
        profiler.start('render.panels.nearby'); nearbyControls.render();treasure.update(); profiler.end('render.panels.nearby');
        profiler.start('render.panels.workshop'); worldWorkshop.render(); profiler.end('render.panels.workshop');
        profiler.start('render.panels.vehicleWorkshop'); worldVehicleWorkshop.render(); profiler.end('render.panels.vehicleWorkshop');
        profiler.start('render.panels.guardian'); guardianBuild.render(); profiler.end('render.panels.guardian');
        profiler.end('render.panels');
        profiler.end('render');
        uiTime += dt;
        if (uiTime > 0.12) {
          profiler.start('ui');
          refresh();
          profiler.end('ui');
          uiTime = 0;
        }
        // 必需地面保留极小时间片，防止忙帧持续饿死预热、跨块时一次补建全部纹理。
        profiler.start('cache.warmup');
        warmupClock += dt;
        if (warmupClock >= .2) { navigationWarmup.prepare({ ...game.player, mapId: game.mapId }); warmupClock = 0; }
        const remaining = Math.max(0, 12 - (host.performance.now() - frameStart));
        const seasonBudget=seasonPrewarm.budget(host.performance.now()-frameStart,host.performance.now());
        renderer.ground.setPrewarmPolicy(seasonPrewarm.allowed,seasonPrewarm.reason);
        renderer.ground.advance(Math.max(renderer.ground.needsWarmup() ? .75 : 0, Math.min(2, remaining)),()=>host.performance.now(),seasonBudget);
        seasonPrewarm.record(renderer.ground.backgroundMs,host.performance.now());
        navigationWarmup.advance(Math.min(1, Math.max(0, 12 - (host.performance.now() - frameStart))));
        mapPanel.advance();
        profiler.end('cache.warmup');
      } catch (error) {
        profiler.event('frame-error', { phase: [...profiler.active.keys()],
          message: String(error.stack || error).slice(0, 2000) });
        throw error;
      } finally {
        endSceneLayout(renderer);
        profiler.finishFrame({ enemies: game.enemies.length, projectiles: game.projectiles.length,
          fx: game.fx.items.length, wave: game.wave, weapon: game.weapon().id,
          visible: renderer.visibleStats, logicSteps: renderer.frameTiming?.steps || 0,
          logicHz: simulation.hz, renderTargetHz: 60,
          interpolationAlpha: renderer.frameTiming?.alpha || 0,
          droppedLogicSeconds: renderer.frameTiming?.droppedSeconds || 0 });
      }
    },
  });

  // 保存后释放循环、输入、弹窗、监听、观察器、音频和提示计时器。
  function destroy() {
    if (disposed) return;
    clearLivingRenderCache();
    disposed = true;
    save();
    loop.dispose();
    if (warmupFrame !== null) host.cancelAnimationFrame(warmupFrame);
    if (recoveryFrame !== null) host.cancelAnimationFrame(recoveryFrame);
    navigationWarmup.dispose(); renderer.ground.dispose(); resolveReady(false);
    startLoading.dispose();titleMenu.dispose(); canvas.removeAttribute('aria-busy');
    updateHud.dispose();
    scope.dispose();
    observer.disconnect();
    input.dispose();
    inventory.dispose();
    equipmentGoals.dispose();
    saveChronicle();
    chroniclePanel.dispose();
    environmentPanel.dispose();
    mapPanel.dispose();
    warehouse.dispose();treasure.dispose();backpack.dispose();vehicleRepair.dispose();logistics.dispose();fieldEquipment.dispose();outdoors.dispose();creatureCodex.dispose();loadCleanup.dispose();
    funnelPanel.dispose();
    mechanicalPanel.dispose();
    spiderPanel.dispose();
    vehicleControls.dispose();
    vehiclePanel.dispose();
    storyPanel.dispose();
    livingPanel.dispose();
    productionPanel.dispose();
    farmPanel.dispose();
    clearingPanel.dispose();
    rangerArrival.dispose();
    mainline.dispose();npcConversations.dispose();
    campDefensePanel.dispose();
    waveTailNavigation.dispose();
    realmPanel.dispose();firePanel.dispose();
    worldRealms.dispose();
    nearbyControls.dispose();
    restorationPanel.dispose();
    seedShop.dispose();
    monsterCampPanel.dispose();
    campHome.dispose();
    worldWorkshop.dispose();
    worldVehicleWorkshop.dispose();
    legendaryWorkshop.dispose();delete game.openLegendaryWorkshop;
    workshop.dispose();
    guardianBuild.dispose();
    cameraControls.dispose();
    settingsPanel.dispose();
    audioControls.dispose();
    taskReward.dispose();
    dialogs.dispose();
    toast.dispose();
    audio.dispose();
    diagnostics.dispose();
    game.onEvent = () => {};
    mounted.delete(canvas);
  }
  const application = { game, renderer, environment, chronicle, refresh, save, destroy, diagnostics, audio, workshop,
    ready, navigationWarmup, living:livingPanel, farm:farmPanel, production:productionPanel, menu:{enter:enterFromMenu,home:returnToMenu,reset:resetFromMenu,
      get page(){return shell.page;},get saveStatus(){return shell.saveStatus;}} };
  mounted.set(canvas, application);
  resizeScene();
  saveEnvironment();
  environmentPanel.render();
  inventory.switchTab('heroes');
  refresh();
  // 入场每帧仅推进小预算，完整可见缓存就绪后才启动正式循环。
  function prepareInitialFrame() {
    if (disposed) return;
    try {
      game.initializeWorld();
      const view = renderer.prepareGround();
      // 首屏也可能丢失上下文，等待恢复后继续原加载流程，不能把空视野传给地块调度。
      if(!view){warmupFrame=host.requestAnimationFrame(prepareInitialFrame);return;}
      navigationWarmup.prepare({ ...game.player, mapId: game.mapId });
      // 过场期间没有战斗模拟，给首屏纹理8毫秒、导航2毫秒，逐帧让出主线程。
      renderer.ground.advance(8); navigationWarmup.advance(2);
      if (!renderer.ground.ready(view) || navigationWarmup.steps) {
        warmupFrame = host.requestAnimationFrame(prepareInitialFrame); return;
      }
      warmupFrame = null;shell.worldReady=true;
      // 地图真正准备好后，等待车驶出并展示100%，才启动模拟与首次保存。
      startLoading.complete(finishMenuEntry);
    } catch (error) {
      profiler.event('frame-error', { phase: ['cache.initial'], message: String(error.stack || error) });
      startLoading.stop();warmupFrame=null;shell.loading=false;shell.failed=true;canvas.removeAttribute('aria-busy');titleMenu.render();toast.show(i18nText("app.create-app.613e6b34ce")); resolveReady(false);
    }
  }
  return application;
}
