import {EQUIPMENT_STORY_CHAPTERS} from './equipment-story-chapters.js';
import {TOWN_LAYOUT} from './town-layout.js';
import { i18nText } from "../i18n/index.js";
// 晴叶林反攻战役：组合辅助函数只生成纯数据，任务执行器不识别具体章节编号。
import {STORY_CHAPTER as base,STORY_LOADOUTS,STORY_CAMP_RETURN_ACTORS} from './story.js';
import {MONSTER_STORIES} from './monster-stories.js';
import {RIVER_DELIVERY_SITES,RIVER_BRIDGE_BARRIERS} from './river-crossing.js';
// 章节之间复制可编辑数据，避免一个故事改表时污染另一个故事。
const copy=value=>structuredClone(value);
// 通用阶段跳转与对白定义，最终目录可完整序列化为JSON。
const next=(id,phase='active')=>[{type:'stage',id,phase}];
// 对白表保存台词与结束动作，不附带可执行回调。
const talk=(lines,after)=>({lines,after});
// 同伴按当前站点出场，沿用原有侧让位置。
const actor=(site)=>[{actor:'mint',site,dx:-65,dy:-20}];
// 沿用已有世界坐标与碰撞；水路和空中线路显式声明通行能力。
function world(sites,paths){return {sites,defaultClearance:85,clearances:{},approaches:[],
  paths:paths.map(p=>({clearance:65,walkHalf:32,dash:[],color:'#b57d3e',...p})),
  validation:{navigation:true,step:12,playerRadius:12,crosses:[]},mapText:i18nText("config.story-campaign.a276e03f8d"),
  legend:Object.keys(sites).map((key,i)=>`${i+1} ${{CAMP:i18nText("config.story-campaign.ce11603d20"),DOCK:i18nText("config.story-campaign.a43bb30320"),WATER:i18nText("config.story-campaign.7151016775"),FAR:i18nText("config.story-campaign.ffb02b2933"),WEST:i18nText("config.story-campaign.77ff1a432d"),EAST:i18nText("config.story-campaign.9b65ee88df"),FIRST:i18nText("config.story-campaign.c619ee0f60"),SECOND:i18nText("config.story-campaign.8f98ea4167"),THIRD:i18nText("config.story-campaign.46a822cf95"),LIGHT:i18nText("config.story-campaign.d120184cd4"),STATION:i18nText("config.story-campaign.fe642ceabc"),CALIBRATE:i18nText("config.story-campaign.5805f6e8e4")}[key]||key}`).join(' · ')};}
// 新章不增加永久货币奖励；完成获得回信、故事记录及后续章节入口。
function chapter(id,title,subtitle,requires,loadouts,terrain,lead){return {...copy(base),id,title,subtitle,requires,
  loadouts:copy(loadouts),world:terrain,flags:['done','supply','boss','excursion'],choices:{},routes:{},targets:{},restoreTargets:[],
  reward:{},completionFlags:{[id+'Completed']:true},nodes:{},dialogues:{},props:[],
  actors:{...copy(base.actors),recording:{...copy(base.actors.recording),site:'CAMP'},radioSnow:{name:i18nText("config.story-campaign.86d57e1264"),source:'site',site:'CAMP',head:64}},
  encounters:{...copy(base.encounters),bosses:{}},
  entry:{...copy(base.entry),stage:'BEGIN',dialogue:'intro',label:subtitle+' · '+title,completedLabel:i18nText("config.story-campaign.eaba718c83")},
  journey:{...copy(base.journey),experiences:Object.fromEntries(Object.entries(base.journey.experiences).filter(([,e])=>!e.loadout||loadouts.some(l=>l.id===e.loadout)))},
  cleanup:{...copy(base.cleanup),combat:{...copy(base.cleanup.combat),run:{...copy(base.cleanup.combat.run),waypoint:0}}},
  ui:{...copy(base.ui),lead,completedLead:i18nText("config.story-campaign.e8e507c2d1"),role:i18nText("config.story-campaign.31b57811d3"),
    start:i18nText("config.story-campaign.922c62abfa"),wave:subtitle,quote:i18nText("config.story-campaign.bd5fb4f98e"),author:i18nText("config.heroes.ae506736a6")},
  trial:{...copy(base.trial),hints:{},defaultHint:i18nText("config.story-campaign.24195835bf")},
};}
// 借用与整备共用一张面板；战斗数据沿用现有配置，不写入永久拥有权。
function prepare(site,title,destination,extra={}){return {title,requiresLoadout:false,prepareWhen:true,loadout:true,
  objective:{site,label:title},task:{type:'idle'},panel:{type:'loadout',title,button:i18nText("config.story-campaign.b07a12461b")},start:next(destination),actors:actor(site),...extra};}
// 交互和战斗后的交谈仍使用头顶自动气泡。
function interaction(site,title,key,extra={}){return {title,requiresLoadout:true,objective:{site,label:title,action:key},task:{type:'idle'},actors:actor(site),...extra};}
// 路点逐个抵达；用于水路、飞行及安全送货，不能直接跳到终点。
function travel(site,title,points,destination,extra={}){return {title,requiresLoadout:true,objective:{site,label:title},
  task:{type:'travel',points,radius:45,after:next(destination)},...extra};}
// 短遭遇数量仅属于新增内容，所有敌人伤害、速度与武器倍率沿用基础表。
function encounter(site,title,key,total=6,extra={}){return interaction(site,title,key,{experience:'loadout',
  objective:{site,label:title,action:key,actionWhen:{path:'combat.cleared',equals:true}},
  task:{type:'wave',site,reach:160,wave:{total,cap:Math.min(total,8),heavy:0}},...extra});}
// 结尾交付原子保存故事记录，章节外不残留人物与道具。
function ending(c,lines){c.nodes.HOME=travel('CAMP','带着回信走回营地',['CAMP'],'END');c.nodes.END=interaction('CAMP',i18nText("config.story-campaign.79012f7f83"),'ending',{prepareWhen:{read:'ending'},claimWhen:{read:'ending'},
  panel:{type:'claim',title:i18nText("config.story-campaign.5470a11e48"),text:i18nText("config.story-campaign.66ed5d4b8e"),reward:i18nText("config.story-campaign.1a5907d5c8"),button:i18nText("config.story-campaign.1f83860094")},
  interactionTarget:{actor:'snow'},actors:copy(STORY_CAMP_RETURN_ACTORS)});
  // 所有章节回程和结尾共用营地视图，不以已交付状态决定建筑是否出现。
  c.nodes.HOME.campReturn=c.nodes.END.campReturn=true;
  c.dialogues.ending=talk(lines,[{type:'phase',value:'prepare'}]);}
// 回营只用于已完成远行的收束；旅行任务本身必须经过实际路点。
const home=next('HOME');
const coast=world({CAMP:{...TOWN_LAYOUT.spawn},DOCK:{x:1650,y:2200},WATER:{x:1220,y:1250},FAR:{x:2600,y:2400},WEST:{x:1100,y:729},EAST:{x:1450,y:729}},
  [{sites:['CAMP','DOCK']},{sites:['DOCK','WATER','FAR'],travel:'water',dash:[5,4],color:'#547c64'},{sites:['DOCK','WEST','EAST','FAR']}]);
// 陆路先短途接应再远行，往返各段保持1000–2000米；坐标稳定以兼容阶段存档。
const land=world({CAMP:{...TOWN_LAYOUT.spawn},FIRST:{x:2000,y:400},SECOND:{x:2600,y:1500},THIRD:{x:2800,y:2500}},[{sites:['CAMP','FIRST','SECOND','THIRD']}]);
const core={id:'little-team',name:i18nText("config.story-campaign.5cba02ecca"),choice:i18nText("config.story-campaign.7ea77f7aae"),weapon:15,vehicle:0,turret:17,damage:1,turretDamage:.45,hull:180,
  text:i18nText("config.story-campaign.c39a830811"),hint:i18nText("config.story-campaign.fbfbc52e4f")};
const heli={id:'canopy-light',name:i18nText("config.story-campaign.b84caa896b"),choice:i18nText("config.story-campaign.b4f74c046b"),weapon:1,vehicle:2,turret:19,damage:1,turretDamage:.45,hull:160,
  text:i18nText("config.story-campaign.e1feba93e5"),hint:i18nText("config.story-campaign.26a55c61ad")};

// 第二章独立水路表：取药在西岸，维修封桥迫使玩家实际驾驶气垫船过河。
const ferryWorld=world(copy(RIVER_DELIVERY_SITES),[{sites:['CAMP','SUPPLY','DOCK']},{sites:['DOCK','WATER','CHANNEL','LANDING'],travel:'water',dash:[5,4],color:'#547c64'},{sites:['LANDING','FAR']}]);
ferryWorld.barriers=copy(RIVER_BRIDGE_BARRIERS);
ferryWorld.legend='营地 → 西岸取药 → 西岸渡口 → 水上航线 → 东岸渡口 → 巡护员';
const ferry=chapter('sunleaf-02',"强渡封锁线",i18nText("config.story-campaign.7cf54ebe54"),['sunleaf-01'],[STORY_LOADOUTS[1]],ferryWorld,
  i18nText("config.story-campaign.f12557fd0f"));
ferry.ui.lead="强渡封锁线，向负伤侦察员送药并夺回部署图。找到号令核心，反攻才有方向。";
ferry.nodes={BEGIN:prepare('CAMP','借用气垫船，去西岸取药','PICKUP'),
  PICKUP:interaction('SUPPLY','在西岸取走药箱','pickup'),
  DOCK:interaction('DOCK','把药箱带到西岸渡口','dock'),
  SAIL:travel('WATER','驶离木渡口，试着浮上河面',['WATER'],'ROUTE'),
  ROUTE:travel('CHANNEL','沿河航行，从东岸渡口上岸',['CHANNEL','LANDING'],'APPROACH'),
  APPROACH:travel('FAR','把药箱送往东岸巡护点',['FAR'],'SHORE'),
  SHORE:encounter('FAR','赶走拦路怪物，把药箱交给巡护员','delivery',8)};
ferry.nodes.SAIL.task.requires=ferry.nodes.ROUTE.task.requires='amphibious';
ferry.actors.boatman={name:i18nText("config.story-campaign.cfe3c65a2a"),source:'actor',kind:'boatman',hero:2,head:43,aside:-72,avoidTerrain:true};
// 西岸交谈时向陆地侧让位，不能为了避开船身把人物移到河里。
ferry.actors.mint.aside=-72;ferry.actors.mint.avoidTerrain=true;
ferry.actors.riverRanger={name:'东岸巡护员',source:'actor',kind:'river-ranger',hero:0,head:43,aside:72};
ferry.nodes.SHORE.actors.push({actor:'riverRanger',site:'FAR',dx:70});
ferry.nodes.DOCK.actors=[{actor:'mint',site:'DOCK',dx:-20,dy:65},{actor:'boatman',site:'DOCK',dx:-30,dy:-60}];
ferry.dialogues={"intro":{"lines":[["snow","东岸侦察员负伤，手里有铁棘军团的部署图。桥头已被封锁，药品只能走水路。"],["mint","先取药，再从渡口强渡。拿到情报，我们才能找到号令核心。"]],"after":[{"type":"phase","value":"prepare"}]},"pickup":{"lines":[["mint","药箱装好了。侦察员还在坚持，我们走渡口。"]],"after":[{"type":"flag","key":"supply"},{"type":"stage","id":"DOCK","phase":"active"}]},"dock":{"lines":[["boatman","桥头过不去了。气垫船能从这里下水，沿河绕过封锁！"],["player","你守住渡口。我们在东岸打出一条通道。"]],"after":[{"type":"stage","id":"SAIL","phase":"active"}]},"delivery":{"lines":[["riverRanger","来得正好……部署图在这里。铁棘的号令核心藏在树冠后的高地，它正在集结第二波主力。"],["mint","要打进去，得先把装甲维修材料运上前线。运输队正在北边遭拦截。"],["player","我去接应。它想把我们一段段切断，我们就一段段打通。"]],"after":[{"type":"stage","id":"HOME","phase":"active"}]}};
ferry.props=[{kind:'medicine',site:'SUPPLY',when:{not:{flag:'supply'}}},{kind:'medicine',site:'FAR',when:{read:'delivery'}}];
ending(ferry,[["snow","药已经送到，侦察员保住了。部署图上被划掉的地方，都是铁棘准备吞掉的哨站。"],["player","先把运木队打通，修好装甲。我们不能一直跟着它的进攻跑。"]]);
ferry.nodes.HOME.task.points=['LANDING','CHANNEL','WATER','DOCK','CAMP'];
ferry.nodes.HOME.title=ferry.nodes.HOME.objective.label='沿渡口水路返回营地';

// 第三章：搬运队在三个停靠点逐段推进，清场后才出现下一段人员与货箱。
const timber=chapter('sunleaf-03',"抢下反攻补给",i18nText("config.story-campaign.d48b124b51"),['sunleaf-02'],[STORY_LOADOUTS[2],STORY_LOADOUTS[0]],land,
  i18nText("config.story-campaign.6c1b5f07c3"));
timber.nodes={BEGIN:prepare('CAMP',i18nText("config.story-campaign.808a837c8f"),'STOP1'),
  STOP1:encounter('FIRST',i18nText("config.story-campaign.3a98f77a86"),'first',6,{props:[{kind:'crate',site:'FIRST'}]}),
  STOP2:encounter('SECOND',i18nText("config.story-campaign.fcce59deca"),'second',9,{props:[{kind:'crate',site:'SECOND'}]}),
  STOP3:encounter('THIRD',i18nText("config.story-campaign.56b02a3263"),'third',12,{props:[{kind:'crate',site:'THIRD'}]})};
timber.dialogues={"intro":{"lines":[["mint","铁棘截住了最后一批维修木料。车队过不来，反攻车辆就只能趴在修理棚。"],["player","从第一处路口打到最后一辆车，补给线不能断。"]],"after":[{"type":"phase","value":"prepare"}]},"first":{"lines":[["mint","第一处路障清掉了，但后方又有怪物绕上来！"],["player","让车队继续走，我们去前面截住它们。"]],"after":[{"type":"stage","id":"STOP2","phase":"active"}]},"second":{"lines":[["mint","这批厚甲兵是专门冲着货车来的。铁棘已经知道我们要反攻。"],["player","知道又怎样？最后一个路口，也得让出来。"]],"after":[{"type":"stage","id":"STOP3","phase":"active"}]},"third":{"lines":[["mint","最后一车通过！修理棚能开工了。可机械小队发来警报，侦察模块被打散了。"],["player","刚抢回来的这批材料，先给它们用。我们需要能找出核心的眼睛。"]],"after":[{"type":"stage","id":"HOME","phase":"active"}]}};
ending(timber,[["mint","维修补给全部入库，反攻车辆开始整备。"],["snow","机械小队还没齐。没有它们，部署图上的核心位置只是一片山地。"],["player","下一次出发，把每个模块找回来。"]]);

timber.ui.lead="抢下三处截击点，把维修补给送上前线。没有这批材料，反攻车辆就无法出发。";

// 第四章承接补给突围，机械小队负责识破假信号并定位核心。
const team=chapter('sunleaf-04',"无人退队",i18nText("config.story-campaign.7dc38b6f3e"),['sunleaf-03'],[core],land,
  i18nText("config.story-campaign.5c1eef35aa"));
team.journey.experiences['team-strike']={loadout:core.id,event:'impact',match:{weaponIndex:15},speaker:'mint',goal:i18nText("config.story-campaign.0f8ad9f4b8"),success:i18nText("config.story-campaign.98ee12ebae"),feedback:i18nText("config.story-campaign.fd20e2e353"),advice:i18nText("config.story-campaign.f7849076b9")};
team.nodes={BEGIN:prepare('CAMP',i18nText("config.story-campaign.db5a174e6e"),'SHED'),SHED:interaction('FIRST',i18nText("config.story-campaign.54b5fa67cc"),'shed'),
  RECOVER:encounter('SECOND',i18nText("config.story-campaign.1952bc8524"),'recover',9),
  REPAIR:encounter('THIRD',i18nText("config.story-campaign.62f17a7b9c"),'repair',12),
  NAME:{title:i18nText("config.story-campaign.029771cc39"),requiresLoadout:true,prepareWhen:true,objective:{site:'THIRD',label:i18nText("config.story-campaign.b581adfde9")},task:{type:'idle'},
    panel:{type:'choice',title:i18nText("config.story-campaign.a356212c8f"),text:i18nText("config.story-campaign.921e2e73da")},choice:'companion',after:[{type:'dialogue',id:'named'}],actors:actor('THIRD')}};
team.choices.companion=[{id:'acorn',label:i18nText("config.story-campaign.8d5da74d03")},{id:'lamp',label:i18nText("config.story-campaign.667d3800d8")},{id:'echo',label:i18nText("config.story-campaign.72b977ec2e")}];
team.dialogues={"intro":{"lines":[["mint","侦察模块收到一个召回指令，整支机械小队差点被引进伏击。铁棘在伪造我们的信号。"],["player","把失散模块找回来，修好识别器。以后只认自己人的呼号。"]],"after":[{"type":"phase","value":"prepare"}]},"shed":{"lines":[["player","运输盒是空的，地上还有拖拽痕迹。"],["mint","模块最后的信号在前面。先清掉追兵，别让它们落进铁棘手里。"]],"after":[{"type":"stage","id":"RECOVER","phase":"active"}]},"recover":{"lines":[["mint","模块都找到了，但识别器还没接好。它们正朝维修点包围过来。"],["player","我挡住追兵。让小队重新站起来！"]],"after":[{"type":"stage","id":"REPAIR","phase":"active"}]},"repair":{"lines":[["mint","识别器接通！现在它们能从假信号中认出号令核心。"],["player","给小队一个呼号。下一战，我们一起出击。"]],"after":[{"type":"stage","id":"NAME","phase":"prepare"}]},"named":{"lines":[["mint","呼号确认，全员响应。捕获到核心方位：树冠后的高地！"],["player","把坐标交给飞行组。地面封锁不了我们所有的路。"]],"after":[{"type":"stage","id":"HOME","phase":"active"}]}};
team.props=[{kind:'crate',site:'FIRST'},{kind:'relay',site:'THIRD'}];
ending(team,[["snow","机械小队识别出了真正的核心信号，假广播骗不了我们了。"],["mint","阿栎也开放了机械核心购买。前线缺的不是新玩具，是能并肩作战的伙伴。"],["player","把坐标交给苔轮，我们从空中撕开封锁。"]]);

team.ui.lead="夺回侦察模块，击退追兵，重建能识破假信号的机械小队。下一战需要它们锁定核心。";

// 第五章承接机械侦察，飞越封锁并实际夺取航标。
const flight=chapter('sunleaf-05',"穿云夺标",i18nText("config.story-campaign.41639077c8"),['sunleaf-04'],[heli],
  world({...copy(coast.sites),WATER:{x:1220,y:2100},FAR:{x:2700,y:400},LIGHT:{x:2600,y:1500}},[{sites:['CAMP','WATER','FAR'],travel:'air',dash:[5,4]},{sites:['FAR','LIGHT']}]),
  i18nText("config.story-campaign.1ba13c9397"));
flight.journey.experiences['rotor-fire']={loadout:heli.id,event:'impact',match:{weaponIndex:19},speaker:'player',goal:i18nText("config.story-campaign.05043ca395"),success:i18nText("config.story-campaign.36d6e89166"),feedback:i18nText("config.story-campaign.0968f13c4b"),advice:i18nText("config.story-campaign.5ea4ee5bf5")};
flight.nodes={BEGIN:prepare('CAMP',i18nText("config.story-campaign.da5916a344"),'FLY'),
  FLY:travel('FAR',i18nText("config.story-campaign.be04167085"),['WATER','FAR'],'LAND',{task:{type:'travel',points:['WATER','FAR'],radius:45,requires:'flying',after:next('LAND')}}),
  LAND:{title:i18nText("config.story-campaign.a3276d034c"),requiresLoadout:true,objective:{site:'FAR',label:i18nText("config.story-campaign.86ebbe4060")},task:{type:'landing',site:'FAR',radius:65,after:next('REPORT')}},
  REPORT:interaction('FAR',i18nText("config.story-campaign.ff81e2f2f0"),'landed'),
  LIGHT:encounter('LIGHT',i18nText("config.story-campaign.6b606180bd"),'light',10)};
flight.dialogues={"intro":{"lines":[["mint","机械小队锁定了信号，可地面道路被铁棘堵死了。只有飞过树冠，才能看清最后的阵地。"],["player","借我直升机。我要把反攻航标点在它眼前。"]],"after":[{"type":"phase","value":"prepare"}]},"landed":{"lines":[["mint","已越过封锁线！下机确认落点，航标就在前方。"],["player","先拿下它。让地面队伍知道，我们已经到了。"]],"after":[{"type":"stage","id":"LIGHT","phase":"active"}]},"light":{"lines":[["mint","航标点亮，核心位置确认！但铁棘的主力开始转向总转发站。"],["player","它想趁我们离开时切断所有联络。"],["mint","还有机会。守住转发站，就能把反攻指令送到各条战线。"]],"after":[{"type":"stage","id":"HOME","phase":"active"}]}};
flight.props=[{kind:'relay',site:'LIGHT',bind:{restored:true}},{kind:'sign',site:'FAR'}];
ending(flight,[["snow","航标传回坐标，铁棘的藏身处终于露出来了。"],["mint","可它的反扑也到了。总转发站正在求援，守军撑不了下一轮。"],["player","叫上所有人。这次守住以后，我们直接反攻。"]]);

flight.ui.lead="飞越地面封锁，击退航标守军，锁定号令核心。铁棘的反扑正扑向总转发站。";

// 第六章：三个阶段允许重新整备，借用五种已有搭配，不设永久拥有门槛。
const finale=chapter('sunleaf-06',"破晓反攻",i18nText("config.story-campaign.4a7dc56280"),['sunleaf-01','sunleaf-02','sunleaf-03','sunleaf-04','sunleaf-05'],[...STORY_LOADOUTS,core,heli],
  world({...copy(coast.sites),STATION:{x:2500,y:1400},CALIBRATE:{x:2700,y:400}},
    [...copy(coast.paths),{sites:['FAR','STATION','CALIBRATE']}]),
  i18nText("config.story-campaign.4393d7c6e7"));
// 旧路线标识保留供存档读取；新流程直接指向对岸目标，不弹出水陆选择。
finale.routes={water:{name:i18nText("config.story-campaign.9058570e0d"),note:i18nText("config.story-campaign.f8b31a1777"),text:i18nText("config.story-campaign.25c836d36d"),sites:['WATER'],counts:[0],cap:4,heavy:0,loadouts:['tide-arc','canopy-light']},
 bank:{name:i18nText("config.story-campaign.e5c1413a21"),note:i18nText("config.story-campaign.e744af408d"),text:i18nText("config.story-campaign.d6b14938a9"),sites:['WEST','EAST'],counts:[0,0],cap:4,heavy:0}};
finale.nodes={BEGIN:prepare('CAMP',i18nText("config.story-campaign.914acd6118"),'ROUTE'),
  // 直接指向下一桥头再到交接点，所有配装均可通行，不要求玩家比较水陆路线。
  ROUTE:{title:'前往对岸交接点',requiresLoadout:true,
    objective:{site:'FAR',label:'前往对岸交接点',routeLabel:'前往桥头，沿河岸道路通行'},
    task:{type:'route',route:'bank',reach:45,destination:'FAR',arrivalRadius:55,after:next('ARRIVE')}},
  ARRIVE:interaction('FAR',i18nText("config.story-campaign.7f45e07267"),'receipts'),
  GUARD:prepare('STATION',i18nText("config.story-campaign.756d8b88ba"),'DEFEND',{requiresLoadout:true,
    start:[{type:'move',site:'STATION',dy:95},...next('DEFEND'),{type:'target',id:'relay'},{type:'wave',site:'STATION',wave:{total:8,cap:5,heavy:0}}]}),
  DEFEND:{title:i18nText("config.story-campaign.c2c6339fb9"),requiresLoadout:true,experience:'loadout',target:'relay',objective:{site:'STATION',label:i18nText("config.story-campaign.989aaad8fb")},
    prepareWhen:true,loadout:true,panel:{type:'loadout',title:i18nText("config.story-campaign.0dced90183"),button:i18nText("config.story-campaign.953386bc81")},
    start:[],task:{type:'defense',site:'STATION',waves:[{total:8,cap:5,heavy:0},{total:10,cap:6,heavy:1},{total:12,cap:7,heavy:1}],repairSeconds:4,hint:i18nText("config.story-campaign.08f7af2f23"),after:[{type:'dialogue',id:'uploaded'}]},
    encounter:{delay:3,interval:2,lanes:[[-Math.PI/2],[0,Math.PI],[-Math.PI/2,0,Math.PI]],target:'relay',playerEvery:5},actors:actor('STATION')},
  CALIBRATION:prepare('STATION',i18nText("config.story-campaign.faa5e606e3"),'LAST',{requiresLoadout:true}),
  LAST:encounter('CALIBRATE',i18nText("config.story-campaign.89fda3e4ee"),'now',14)};
finale.nodes.TO_STATION=travel('STATION','前往南林总转发站',['STATION'],'GUARD');
finale.nodes.TO_STATION.task.after=next('GUARD','prepare');
finale.nodes.BEGIN.start=next('ROUTE');
finale.nodes.DEFEND.start=copy(finale.nodes.GUARD.start);
finale.targets={relay:{site:'STATION',type:'story-target',radius:30,attackRadius:30,hp:300,maxHp:300,failure:i18nText("config.story-campaign.e6997d2a9f")}};finale.restoreTargets=['relay'];
finale.dialogues={"intro":{"lines":[["snow","敌人的主力已向总转发站集结。站一倒，各条战线都会被分割。"],["mint","药和情报、维修补给、识别器、空中坐标，全都齐了。现在只差最后一步。"],["player","守住转发站，打到核心前。今天把晴叶林夺回来。"]],"after":[{"type":"phase","value":"prepare"}]},"receipts":{"lines":[["mint","前线已经收到信号，正在各自的位置牵制敌人。我们负责总转发站。"],["player","别让任何一条战线独自作战。出发！"]],"after":[{"type":"stage","id":"TO_STATION","phase":"active"}]},"uploaded":{"lines":[["mint","三轮进攻全部击退！反攻指令送出去了，各线正在合围。"],["player","现在轮到我们进攻。打穿核心外的最后一道阵地。"]],"after":[{"type":"stage","id":"CALIBRATION","phase":"prepare"}]},"now":{"lines":[["mint","外围清空。铁棘统领亲自守着号令核心，它不会再让先锋替它挡枪了。"],["player","从第一座哨站到这里，每个人争来的机会，我都带来了。"],["mint","避开正面冲锋，优先清援军。打倒它，才能切断核心！"]],"after":[{"type":"stage","id":"COMMAND","phase":"prepare"}]}};
finale.props=[{kind:'relay',site:'STATION',bind:{hp:{path:'relay.hp'}}},{kind:'mail',site:'CALIBRATE'}];
ending(finale,[["mint","号令核心已断，铁棘统领败退！各线报告：有组织的兽潮正在瓦解。"],["snow","东岸、北线、运输队，所有频道都在回应。我们真的把它们重新连起来了。"],["player","把今天记进巡林簿：晴叶林守住了。以后谁想再把我们赶走，就让它来试。"]]);

finale.ui.lead="守住总转发站，攻破外围阵地，击败铁棘统领并切断号令核心。夺回晴叶林！";

// 铁棘军团逐章增加混编与包围压力，普通敌人仍沿用既有生命和技能。
for(const [c,id,total,heavy] of [[ferry,'SHORE',12,2],[timber,'STOP1',8,0],[timber,'STOP2',12,2],[timber,'STOP3',16,3],[team,'RECOVER',12,2],[team,'REPAIR',16,3],[flight,'LIGHT',16,3],[finale,'LAST',18,4]]){
 Object.assign(c.nodes[id].task.wave,{total,heavy,cap:Math.min(total,8)});
}
// 号令核心直接使用已有中继装置表现，战斗、拆除与交付各有独立状态门槛。
// 终章任务图新增决战门槛；旧检查点按现有版本校验重新接取，不添加迁移分支。
finale.version=2;
finale.flags.push('commander','coreBroken');
finale.nodes.COMMAND={title:'击败铁棘统领',requiresLoadout:true,prepareWhen:true,loadout:true,
 objective:{site:'CALIBRATE',label:'击败铁棘统领，清除全部援军'},
 panel:{type:'loadout',title:'铁棘统领就在前方',button:'迎战铁棘统领'},
 start:[{type:'move',site:'CALIBRATE',dy:95},...next('COMMAND'),{type:'boss',id:'commander'}],
 task:{type:'boss',boss:'commander',warning:{phase:'windup',hint:'避开正面冲锋，从侧面还击'},after:[{type:'flag',key:'commander'},...next('CORE')]},
 actors:actor('CALIBRATE'),cues:[{id:'commander-charge',event:'boss-start',speaker:'mint',text:'它亲自下场了！留出横向闪避空间，援军来了先清援军。',priority:2}]};
finale.encounters.bosses.commander={...copy(base.encounters.bosses.boar),site:'CALIBRATE',missing:'铁棘统领没有可用出生位置',
 stats:{...copy(base.encounters.bosses.boar.stats),name:'铁棘统领',hp:2200,maxHp:2200},
 support:{...copy(base.encounters.bosses.boar.support),threshold:.6,total:8,batch:2,gap:3,onDefeat:true}};
finale.world.clearances.CALIBRATE=460;
finale.nodes.CORE=interaction('CALIBRATE','切断兽潮号令核心','core',{interactionTarget:{prop:'relay'},
 objective:{site:'CALIBRATE',label:'切断兽潮号令核心',action:'core',actionWhen:{flag:'commander'}},
 props:[{kind:'relay',site:'CALIBRATE',bind:{restored:{flag:'coreBroken'}}}]});
finale.dialogues.core=talk([['mint','统领和援军都倒了，核心防线已经清空。'],['player','号令到此为止。晴叶林，不归你管。'],['mint','核心已断！把胜利信号发给所有战线。']],[{type:'flag',key:'coreBroken'},...home]);
finale.nodes.END.claimWhen={all:[{flag:'coreBroken'},{read:'ending'}]};
finale.nodes.END.panel={...finale.nodes.END.panel,title:'晴叶林反攻胜利',text:'击败铁棘统领，切断号令核心，各条战线重新连通。',button:'提交胜利战报'};
finale.nodes.LAST.title=finale.nodes.LAST.objective.label='攻破核心外围阵地';
finale.nodes.CALIBRATION.title=finale.nodes.CALIBRATION.panel.title='整备，向核心阵地进攻';
finale.nodes.DEFEND.title=finale.nodes.DEFEND.objective.label='守住总转发站，击退三轮反扑';
finale.nodes.ROUTE.title=finale.nodes.ROUTE.objective.label='前往反攻集结点';
finale.nodes.HOME.title=finale.nodes.HOME.objective.label='带着胜利战报返回营地';

// 战果摘要与主线目标同源，交付页不再把反攻写成送信体验。
for(const c of [ferry,timber,team,flight,finale]){
 c.ui.completedLead=c.dialogues.ending.lines.map(([,line])=>line).join('');
 c.ui.quote='每一条重新打通的路，都是下一战的起点。';
 if(c!==finale){c.nodes.HOME.title=c.nodes.HOME.objective.label='返回营地，提交前线战报';c.nodes.END.panel.title='提交本章战果';c.nodes.END.panel.text=c.dialogues.ending.lines[0][1];}
}

// 两条短故事把章节交谈接到正式秘境；进入即可回营交付，不要求挑战成果。
function side(id,title,mode,lead,intro,outro){const c=chapter(id,title,i18nText("config.story-campaign.71a4b40faa"),['sunleaf-01'],[STORY_LOADOUTS[0]],copy(base.world),lead);
 c.catalogType='commission';
 c.nodes={BEGIN:{title,requiresLoadout:false,prepareWhen:true,objective:{site:'CAMP',label:i18nText("config.story-campaign.476fa8f40d")},task:{type:'idle'},
   panel:{type:'excursion',title,button:mode==='rogue'?i18nText("config.story-campaign.5cc0a390cf"):i18nText("config.story-campaign.26c5c9b3ed"),text:mode==='rogue'?i18nText("config.story-campaign.394a4a2091"):i18nText("config.story-campaign.03d3e38d7c")},
   excursion:{mode,flag:'excursion',completion:'enter',completeText:i18nText("config.story-campaign.9e37fb4ab2")},actors:actor('CAMP')},
   RETURN:interaction('CAMP',i18nText("config.story-campaign.63b59cc655"),'return',{requiresLoadout:false})};
 c.dialogues={intro:talk(intro,[{type:'phase',value:'prepare'}]),return:talk(outro,home)};
 ending(c,[["snow",i18nText("config.story-campaign.5a92ee147f")]]);c.nodes.END.requiresLoadout=false;
 // 秘境体验旗标直接开放交付，不要求回程对白或第二次场景交互。
 c.nodes.END.prepareWhen=c.nodes.END.claimWhen={flag:'excursion'};
 c.nodes.END.panel={...c.nodes.END.panel,title:i18nText("config.story-campaign.6b36b270b1"),text:i18nText("config.story-campaign.d8f365910b"),button:i18nText("config.story-campaign.ea96728e2f")};
 c.nodes.BEGIN.excursion.after=[{type:'move',site:'CAMP'},...next('END','prepare')];
 return c;}
const expedition=side('sunleaf-side-expedition',i18nText("config.story-campaign.160f281019"),'rogue',i18nText("config.story-campaign.7b6913fd9b"),
 [["snow",i18nText("config.story-campaign.c7dafa84e1")],["mint",i18nText("config.story-campaign.f1c28ff623")],["player",i18nText("config.story-campaign.0b7cfb1719")]],
 [["player",i18nText("config.story-campaign.baf48fc39c")],["mint",i18nText("config.story-campaign.211f756812")]]);
const guardian=side('sunleaf-side-guardian',i18nText("config.story-campaign.06ce83ed41"),'guardian',i18nText("config.story-campaign.a94b631e50"),
 [["mint",i18nText("config.story-campaign.23605a6714")],["snow",i18nText("config.story-campaign.29569a8773")],["player",i18nText("config.story-campaign.98acaa4cee")]],
 [["mint",i18nText("config.story-campaign.5a1a73a115")],["player",i18nText("config.story-campaign.d27c98306f")]]);
// 营地交谈者必须实际出场，不能把雪团的对白锚到玩家头上。
for(const c of [ferry,timber,team,flight,finale,expedition,guardian])c.nodes.BEGIN.actors=[{actor:'snow',site:'CAMP',dx:100,dy:60},...actor('CAMP')];
// 战斗场留出完整接敌空间，地点与半径一起接受安全区校验。
for(const c of [ferry,timber,team,flight,finale])for(const node of Object.values(c.nodes))if(['wave','defense'].includes(node.task.type))c.world.clearances[node.task.site]=365;
// 与陪同人物同场的物品和交接对象显式绑定，箭头不会误指向旁边的薄荷。
base.nodes.Q20.interactionTarget={prop:'sign'};
base.nodes.Q70.interactionTarget={prop:'relay'};
ferry.nodes.PICKUP.interactionTarget={prop:'medicine'};
ferry.nodes.DOCK.interactionTarget={actor:'boatman'};
ferry.nodes.SHORE.interactionTarget={actor:'riverRanger'};
timber.nodes.STOP3.interactionTarget={prop:'crate'};
team.nodes.SHED.interactionTarget={prop:'crate'};

export const STORY_CAMPAIGN=Object.fromEntries([base,ferry,timber,team,flight,finale,expedition,guardian,...MONSTER_STORIES,...EQUIPMENT_STORY_CHAPTERS].map(c=>[c.id,c]));
