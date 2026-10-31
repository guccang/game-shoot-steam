import {TOWN_LAYOUT} from './town-layout.js';
import {enemyMass} from './enemy-mass.js';
import { i18nText } from "../i18n/index.js";
// 晴叶第一章内容合同：剧情、借用配置、路线和遭遇使用稳定标识，不读取运行时。
import {STORY_JOURNEY} from './story-journey.js';
export const STORY_ID = 'sunleaf-01';
export const STORY_VERSION = 1;
// 回营交付在中心西侧空地进行，避开种子小屋屋顶；人物、点击和对白共用出场坐标。
export const STORY_CAMP_RETURN_ACTORS = [
  {actor:'snow',site:'CAMP',dx:-65,dy:-20},
  {actor:'mint',site:'CAMP',dx:-130,dy:35},
];
// 单篇资源奖励最多三种，与委托板预览和实际首通结算共用此表。
export const STORY_REWARD = { coins: 600, wood: 240, parts: 6 };
export const STORY_LOADOUTS = [
  { id:'line-patrol',name:i18nText("config.story.47eed35c5a"),choice:i18nText("config.story.33640b1830"),weapon:1,vehicle:0,turret:17,damage:1,turretDamage:.45,hull:180,text:i18nText("config.story.aefd01ae94"),hint:i18nText("config.story.e918a04d10") },
  { id:'tide-arc',name:i18nText("config.story.3b929cb079"),choice:i18nText("config.story.e30828f903"),weapon:10,vehicle:3,turret:20,damage:.6,turretDamage:.45,hull:160,text:i18nText("config.story.0e72cf7af3"),hint:i18nText("config.story.eafc26de8b") },
  { id:'frost-guard',name:i18nText("config.story.467e850789"),choice:i18nText("config.story.709c195a09"),weapon:11,vehicle:1,turret:18,damage:.4,turretDamage:.65,hull:220,text:i18nText("config.story.d79d9e8e05"),hint:i18nText("config.story.de52d6e9e7") },
];
export const STORY_ROUTES = {
  road:{name:i18nText("config.story.dc206fd73f"),note:i18nText("config.story.bd4b4edf75"),text:i18nText("config.story.100e34ad75"),sites:['ROAD1','ROAD2'],counts:[8,8],cap:6,heavy:0,supply:{after:2,flag:'supply',hp:50,hull:60,hint:i18nText("config.story.407f4b3755")}},
  short:{name:i18nText("config.story.c5a545c527"),note:i18nText("config.story.404d85ee79"),text:i18nText("config.story.f41cdaad82"),sites:['SHORT1'],counts:[13],cap:8,heavy:1},
};
export const STORY_DEFENSE = [{total:10,heavy:0,cap:6},{total:13,heavy:1,cap:8},{total:16,heavy:2,cap:10}];
export const STORY_TITLES = {Q10:i18nText("config.story.60a4982bd9"),Q20:i18nText("config.story.957f121240"),Q30:i18nText("config.story.e39319b4ad"),Q40:i18nText("config.story.c818457e94"),Q50:i18nText("config.story.61530f3087"),Q60:i18nText("config.story.4f617a30c1"),Q70:i18nText("config.story.889b4b9847"),Q80:i18nText("config.story.855b08da93")};
export const STORY_LINES = {
  // 种子小屋牵起邻里日常，巡护仍从原有回信故障出发。
  intro:[['snow','小夜从种子小屋回来，说想在花盆里种雏菊。我答应花开时去画，可他寄来的信一直没到。'],['player','他在等你的回信？'],['snow','嗯，旧中继站又没声音了。先去查看巡护标记，再找薄荷。我想亲口告诉小夜：画歪的第一朵，我也会留着。']],
  sign:[["player",i18nText("config.story.403f50abd9")],["recording",i18nText("config.story.aa461fc808")],["player",i18nText("config.story.cb6aeb0210")]],
  mint:[["mint",i18nText("config.story.931fc95614")],["player",i18nText("config.story.c4ade3ce5a")],["mint",i18nText("config.story.1ff02d1d39")],["player",i18nText("config.story.b3adb0db05")],["mint",i18nText("config.story.50cc3a9870")]],
  boss:[["mint",i18nText("config.story.c60ddf7621")],["player",i18nText("config.story.9196e2d9b9")],["mint",i18nText("config.story.9ed602d6bb")]],
  silence:[["player",i18nText("config.story.c84e96bca2")],["mint",i18nText("config.story.e34f241aec")],["radioSnow",i18nText("config.story.afea78addd")],["mint",i18nText("config.story.fed389f84f")],["mint",i18nText("config.story.78c13b19cd")],["player",i18nText("config.story.77e6a4e6db")]],
  ending:[['snow','回信终于到了。小夜问，第一回种花没发好芽，是不是自己不适合照顾花草。'],['player','巡路时我也走错过。慢一点，再试一次。'],['snow','我画的第一张叶子也像勺子。我会把那张画带去，陪他到种子小屋看看，再一起学。'],['mint','等你回田里看看自己的收成，也去和他们聊聊。营地里值得照看的，可不只有灯线。']],
};

// 内容表仅含可序列化数据；条件、动作和任务类型由通用执行器解释，不嵌入回调。
export const STORY_SITES = {
  // 按正式绕行路线控制每段1000–1500米，中继站回营与领主往返均保持同岸可达。
  CAMP:{...TOWN_LAYOUT.spawn},SIGN:{x:2000,y:400},ROAD1:{x:3100,y:500},ROAD2:{x:2600,y:1600},
  SHORT1:{x:2600,y:1500},MINT:{x:1600,y:1600},RELAY:{x:2300,y:700},BOSS:{x:2800,y:1700},
};
// 场景布局、清树与地图描线共用路径，逻辑宽度与展示线型分别配置。
export const STORY_WORLD = {
  // 旧检查点跟随已搬迁地点，保留阶段、生命与弹药，不让续玩者从旧空地重新长途赶路。
  routeVersion:1,checkpointSites:{Q50:'RELAY',TO_BOSS:'RELAY',Q60:'BOSS',Q70:'BOSS',Q80:'RELAY'},
  sites:STORY_SITES,defaultClearance:65,clearances:{BOSS:460,RELAY:365,SIGN:365,ROAD1:365,ROAD2:365,SHORT1:365},
  paths:[{sites:['CAMP','SIGN','ROAD1','ROAD2','MINT','RELAY','BOSS'],clearance:88,walkHalf:80,dash:[],color:'#b57d3e'},
    // 回营也是正式旅途，清树、地图与可达性检查共用这段通路。
    {sites:['RELAY','CAMP'],clearance:88,walkHalf:80,dash:[],color:'#b57d3e'},
    {sites:['SIGN','SHORT1','MINT'],clearance:64,walkHalf:56,dash:[4,3],color:'#547c64'}],
  approaches:[{site:'RELAY',offsets:[[0,-350],[-350,0],[350,0]],clearance:58}],
  validation:{navigation:true,step:12,playerRadius:12,crosses:[{site:'BOSS',half:170,radius:48,label:i18nText("config.story.634d233cfe")}]},
  mapText:i18nText("config.story.c59f316d58"),
  legend:i18nText("config.story.53620fc95c"),
};
// 人物身份与气泡锚点独立于台词内容；对白保存稳定人物 ID，日志按语言表解析显示名。
export const STORY_ACTORS = {
  player:{name:i18nText("config.heroes.10cb799373"),source:'player',head:48,vehicleHead:66},
  snow:{name:i18nText("config.heroes.dc520abc23"),source:'actor',kind:'snow',hero:4,head:43,aside:72},
  mint:{name:i18nText("config.heroes.ae506736a6"),source:'actor',kind:'mint',hero:1,head:43,aside:-72},
  radioSnow:{name:i18nText("config.story-campaign.86d57e1264"),source:'site',site:'RELAY',head:64},
  recording:{name:i18nText("config.story.c9368f6d28"),source:'site',site:'SIGN',head:64},
};
// 对白结束动作与台词放在同一表中，跳过和逐句完成使用相同动作。
export const STORY_DIALOGUES = {
  intro:{lines:STORY_LINES.intro,after:[{type:'phase',value:'prepare'}]},
  sign:{lines:STORY_LINES.sign,after:[{type:'flag',key:'sign'},{type:'stage',id:'Q30'}]},
  mint:{lines:STORY_LINES.mint,variants:[{id:'experienced',when:{path:'lastExperienceLoadout'},append:[["mint",i18nText("config.story.a7687f8719")]]},{id:'try',when:true,append:[["mint",i18nText("config.story.95d514d942")]]}],after:[{type:'flag',key:'mint'},{type:'phase',value:'prepare'}]},
  boss:{lines:STORY_LINES.boss,after:[{type:'phase',value:'prepare'}]},
  silence:{lines:STORY_LINES.silence,after:[{type:'flag',key:'silenced'},{type:'stage',id:'Q80'}]},
  ending:{lines:STORY_LINES.ending,variants:[
    {id:'line',when:{path:'lastExperienceLoadout',equals:'line-patrol'},replace:1,line:["player",i18nText("config.story.a271cdda3b")]},
    {id:'tide',when:{path:'lastExperienceLoadout',equals:'tide-arc'},replace:1,line:["player",i18nText("config.story.39f6fbd40e")]},
    {id:'frost',when:{path:'lastExperienceLoadout',equals:'frost-guard'},replace:1,line:["player",i18nText("config.story.cc6223a151")]},
  ],after:[{type:'phase',value:'prepare'}]},
};
// 每个阶段声明目标、准备权限、恢复状态、启动动作、任务处理器和人物出场。
export const STORY_NODES = {
  Q10:{title:STORY_TITLES.Q10,requiresLoadout:false,prepareWhen:true,loadout:true,trial:true,
    objective:{site:'CAMP',label:i18nText("config.story.60a4982bd9")},task:{type:'idle'},
    panel:{type:'loadout',title:i18nText("config.story.4df35e25aa"),button:i18nText("config.story.b56bff7a72")},
    start:[{type:'stage',id:'Q20'}],actors:[{actor:'snow',site:'CAMP',dx:100,dy:60}]},
  Q20:{title:STORY_TITLES.Q20,experience:'loadout',requiresLoadout:true,
    objective:{site:'SIGN',label:i18nText("config.story.375051a3ef"),action:'sign',actionWhen:{path:'combat.cleared',equals:true}},
    task:{type:'wave',site:'SIGN',reach:150,wave:{total:6,cap:6,heavy:0}},encounter:{tutorial:true,batch:3,formations:{'line-patrol':{lanes:[[Math.PI/2]]},'tide-arc':{lanes:[[Math.PI/2]]},'frost-guard':{lanes:[[Math.PI/2]]}}}},
  // 固定巡护目标依次推进，保留沿途战斗，不再要求选择道路。
  Q30:{title:STORY_TITLES.Q30,cues:[{id:'supply-care',event:'supply',speaker:'player',text:i18nText("config.story.4a11306f6e"),safeOnly:true}],requiresLoadout:true,
    objective:{site:'MINT',label:'前往薄荷所在的位置',routeLabel:'前往巡护标记，清理沿途怪物'},
    task:{type:'route',route:'road',reach:170,destination:'MINT',arrivalRadius:96,after:[{type:'stage',id:'Q40'}]}},
  Q40:{title:STORY_TITLES.Q40,requiresLoadout:true,prepareWhen:{flag:'mint'},loadout:true,
    objective:{site:'MINT',label:i18nText("config.story.029028ffbb"),action:'mint',actionWhen:{not:{flag:'mint'}}},task:{type:'idle'},
    panel:{type:'loadout',title:i18nText("config.story.2740386e18"),button:i18nText("config.story.21608c9385")},
    start:[{type:'stage',id:'TO_RELAY'}],
    actors:[{actor:'mint',site:'MINT'}]},
  Q50:{title:STORY_TITLES.Q50,experience:'loadout',cues:[
    {id:'north',event:'wave-start',match:{group:0},speaker:'mint',text:i18nText("config.story.53e1e64434"),priority:2,once:false},
    {id:'sides',event:'wave-start',match:{group:1},speaker:'mint',text:i18nText("config.story.d33fa1c499"),priority:2,once:false},
    {id:'last-wire',event:'wave-start',match:{group:2},speaker:'mint',text:i18nText("config.story.da5587a306"),priority:2,once:false},
    {id:'radio-noise',event:'wave-clear',match:{group:0},speaker:'mint',text:i18nText("config.story.a92b3154a6")},
    {id:'radio-home',event:'wave-clear',match:{group:1},speaker:'mint',text:i18nText("config.story.a2fdb1250e")},
    {id:'loadout-defense',event:'wave-clear',match:{group:0},speaker:'mint',experienceText:'defense',safeOnly:true},
  ],requiresLoadout:true,prepareWhen:true,loadout:true,target:'relay',
    objective:{site:'RELAY',label:i18nText("config.story.120f5fc224")},
    panel:{type:'loadout',title:i18nText("config.story.2740386e18"),button:i18nText("config.story.21608c9385")},
    start:[{type:'move',site:'RELAY',dy:95},{type:'stage',id:'Q50'},{type:'target',id:'relay'},{type:'wave',site:'RELAY',wave:STORY_DEFENSE[0]}],
    task:{type:'defense',site:'RELAY',waves:STORY_DEFENSE,repairSeconds:4,hint:i18nText("config.story.5f2bd69f91"),
      after:[{type:'flag',key:'relay'},{type:'stage',id:'TO_BOSS'}]},
    // 守点以快速清理来敌为主，只降低本阶段血量，保留厚甲差异与其他章节强度。
    encounter:{enemyHp:{normal:48,heavy:56},delay:3,interval:2,batch:3,lanes:[[-Math.PI/2],[Math.PI,0],[-Math.PI/2,0,Math.PI]],target:'relay',playerEvery:5},
    hud:{type:'defense',repair:i18nText("config.story.b8119a89a0"),lanes:[i18nText("config.story.4b9168adeb"),i18nText("config.story.f8cf7ac955"),i18nText("config.story.3433f95fab")],
      countdown:i18nText("config.story.0a33474310"),active:i18nText("config.story.61530f3087"),count:i18nText("config.story.fb213b8ed8")},
    actors:[{actor:'mint',site:'RELAY',dx:-65,dy:-20}]},
  Q60:{title:STORY_TITLES.Q60,experience:'dodge-charge',cues:[{id:'boss-advice',event:'boss-start',speaker:'mint',experienceText:'boss',priority:2}],requiresLoadout:true,prepareWhen:true,loadout:true,
    objective:{site:'BOSS',label:i18nText("config.story.1d24f39047")},
    panel:{type:'loadout',title:i18nText("config.story.5b45b22629"),button:i18nText("config.story.a53492b28f")},
    start:[{type:'move',site:'BOSS',dy:95},{type:'stage',id:'Q60'},{type:'boss',id:'boar'}],
    task:{type:'boss',boss:'boar',warning:{phase:'windup',hint:i18nText("config.story.0126d83565")},after:[{type:'flag',key:'boss'},{type:'stage',id:'Q70'}]},
    hud:{type:'text',detail:i18nText("config.story.98b7aebe2a"),wave:i18nText("config.story.f3738ee2ff")},
    actors:[{actor:'mint',site:'BOSS',dx:-65,dy:-20}]},
  Q70:{title:STORY_TITLES.Q70,requiresLoadout:true,
    objective:{site:'RELAY',label:i18nText("config.story.889b4b9847"),action:'silence'},task:{type:'idle'},
    actors:[{actor:'mint',site:'RELAY',dx:-65,dy:-20}]},
  // 返程和待交付共用营地常驻场景，建筑显示不再等待领取章节奖励。
  Q80:{title:STORY_TITLES.Q80,campReturn:true,requiresLoadout:true,prepareWhen:{read:'ending'},
    interactionTarget:{actor:'snow'},
    objective:{site:'CAMP',label:i18nText("config.story.20d9e92142"),action:'ending'},task:{type:'idle'},
    claimWhen:{all:[{flag:'silenced'},{read:'ending'}]},
    panel:{type:'claim',title:i18nText("config.story.e6e2ae991c"),text:i18nText("config.story.fa97cfa77c"),
      reward:i18nText("config.story.b66f2fc839"),button:i18nText("config.story-campaign.1f83860094")},
    actors:structuredClone(STORY_CAMP_RETURN_ACTORS)},
};
// 远行阶段也是内容表节点；到达后才整备，不能从上一处交谈直接传送进战斗。
STORY_NODES.TO_RELAY={title:'赶往旧中继站',requiresLoadout:true,objective:{site:'RELAY',label:'沿林路前往旧中继站'},task:{type:'travel',points:['RELAY'],radius:95,after:[{type:'stage',id:'Q50',phase:'prepare'}]}};
STORY_NODES.TO_BOSS={title:'追踪野猪王',requiresLoadout:true,objective:{site:'BOSS',label:'前往南林领主空地'},task:{type:'travel',points:['BOSS'],radius:95,after:[{type:'stage',id:'Q60',phase:'prepare'},{type:'dialogue',id:'boss'}]}};
export const STORY_STAGES = Object.keys(STORY_NODES);

// 临时实体字段可绑定会话值；退出时按会话生命周期统一消失，不读取永久通关标记生成实体。
export const STORY_PROPS = [
  {kind:'mail',site:'CAMP',dx:40,dy:25,bind:{restored:{flag:'silenced'}}},
  {kind:'sign',site:'SIGN',bind:{restored:{flag:'sign'}}},
  {kind:'relay',site:'RELAY',bind:{restored:{flag:'silenced'},hp:{path:'relay.hp'},
    parts:{when:{flag:'relay'},then:3,else:{when:{stage:'Q50'},then:{path:'group',fallback:0},else:0}}}},
  {kind:'crate',site:'ROAD2',bind:{restored:{flag:'supply'}}},
];
// 清理表仅列允许清理的当前会话字段；森林对象以原引用恢复，存档不保留战斗实例。
export const STORY_CLEANUP = {
  combat:{arrays:['enemies','projectiles','enemyBolts','hazards','shots','remnants','drops','numbers'],nulls:['boss','aimLock'],
    playerDelete:['arena'],effects:true,run:{combat:null,support:null,interacting:0,repair:0,cueQueue:[],activeCue:null,cueGap:0,warned:false}},
  wave:{arrays:['enemies','projectiles','enemyBolts','hazards']},
  bossDeath:{arrays:['hazards'],nulls:['boss'],flags:['boss']},
  exit:{saveOnLeave:true,restoreForest:true,state:'paused',clear:['story','storyForest']},
  scene:{lifetime:'session',mapId:'forest',hideInRealm:true,actorAsideDistance:65},
};
// 敌人、领主与支援仍复用正式攻击器；这里仅声明原有数值与出生编排。
export const STORY_ENCOUNTERS = {
  // 普通任务遭遇共用可见战斗边界；实际河岸与树干碰撞继续保留。
  arena:{radius:330,terrain:'forest',spawnInset:30,playerDistance:90},
  enemy:{type:'enemy',flying:false,species:'slime',biome:'meadow',color:'#9bae71',accent:'#c8da91'},
  spawn:{attempts:48,bossRadius:220,radius:310,radiusStep:20,playerDistance:220,bossPlayerDistance:180,spacing:45},
  wave:{delay:1.5,interval:1.2,batch:4,retry:.3,blockedLimit:15,blockedText:i18nText("config.story.21350457a0")},
  // 任务配装普遍带伤害折扣，普通与厚甲按短遭遇预算设置，避免逐只磨血。
  enemies:{
    normal:{name:i18nText("config.story.8c77682946"),hp:48,damage:10,speed:52,radius:17,mass:enemyMass()},
    tutorial:{name:i18nText("config.story.8c77682946"),hp:40,damage:8,speed:45,radius:17,mass:enemyMass()},
    heavy:{name:i18nText("config.story.db9441acf7"),hp:56,damage:16,speed:42,radius:21,mass:enemyMass()},
  },
  bosses:{boar:{site:'BOSS',ordinal:7,missing:i18nText("config.story.2304036891"),
    // 第一章野猪生命提高50%，为冲锋教学留出时间；叠加通用15%后为1725，半血援兵仍按比例触发。
    stats:{kind:'boar',hp:1500,maxHp:1500,damage:30,blastDamage:30,speed:42,radius:48,mass:6,attack:2.2},
    arena:{radius:420,terrain:'forest'},support:{threshold:.5,total:4,ordinal:3,batch:2,gap:4,interval:.2,retry:.3}}},
};
// 试射的入口权限在阶段表声明，三种靶场和借用提示也由内容表提供。
export const STORY_TRIAL = {site:'CAMP',duration:60,total:6,hp:2000,radius:17,distance:65,speed:30,
  scenes:{line:{label:i18nText("config.story.bbbf97ca65"),spacing:24,columns:6,y:0},scatter:{label:i18nText("config.story.4c24b82fcd"),spacing:55,columns:3,y:75},
    approach:{label:i18nText("config.story.f8b70c8856"),spacing:55,columns:3,y:75,approach:true}},
  objective:i18nText("config.story.c1cf68768e"),title:i18nText("config.story.1ce944c7b1"),detail:i18nText("config.story.2f1a18e0c7"),
  hints:{'tide-arc':i18nText("config.story.820552f742"),'frost-guard':i18nText("config.story.4e78a91cad")},
  defaultHint:i18nText("config.story.ace5236a7c")};
// 章节入口、存档白名单、恢复初始化和完成提交策略集中配置；保持版本1兼容旧检查点。
export const STORY_CHAPTER = {
  catalogType:'story',
  id:STORY_ID,version:STORY_VERSION,mapId:'forest',title:i18nText("config.story.d7ac2ad573"),subtitle:i18nText("config.story.1d267e2a01"),hero:0,hp:120,
  entry:{site:'CAMP',radius:70,stage:'Q10',dialogue:'intro',label:i18nText("config.story.62eb9d26c0"),completedLabel:i18nText("config.story-campaign.eaba718c83")},
  // 路点到达距离保持原值；点击允许站在人物和设施前方，避免角色贴身重叠。
  interaction:{radius:48,clickRadius:96,seconds:2},flags:['sign','mint','relay','boss','silenced','supply'],
  targets:{relay:{site:'RELAY',type:'story-target',radius:30,attackRadius:30,hp:300,maxHp:300,failure:i18nText("config.story.9ddd71f29c")}},
  restoreTargets:['relay'],completionFlags:{sunleafRestored:true},reward:STORY_REWARD,
  journey:STORY_JOURNEY,nodes:STORY_NODES,dialogues:STORY_DIALOGUES,actors:STORY_ACTORS,props:STORY_PROPS,cleanup:STORY_CLEANUP,
  routes:STORY_ROUTES,loadouts:STORY_LOADOUTS,world:STORY_WORLD,encounters:STORY_ENCOUNTERS,trial:STORY_TRIAL,
  ui:{lead:i18nText("config.story.5570df792e"),
    completedLead:i18nText("config.story.49679ce504"),
    role:i18nText("config.story.bf7f6cd02f"),away:i18nText("config.story.a9020cc734"),
    quote:i18nText("config.story.ad64bd8443"),author:i18nText("config.heroes.ae506736a6"),start:i18nText("config.story.cc5786abba"),interaction:i18nText("config.story.8cf2fc42f0"),wave:i18nText("config.story.65485a6c06"),
    failureHint:i18nText("config.story.a14cad7bb6")},
};
