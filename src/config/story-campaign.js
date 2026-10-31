import {EQUIPMENT_STORY_CHAPTERS} from './equipment-story-chapters.js';
import {extendEquipmentDialogue} from './equipment-story-details.js';
import {TOWN_LAYOUT} from './town-layout.js';
import { i18nText } from "../i18n/index.js";
// 森林回信章节内容：组合辅助函数只生成纯数据，任务执行器不识别具体章节编号。
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
const ferry=chapter('sunleaf-02',i18nText("config.story-campaign.f7431c73e4"),i18nText("config.story-campaign.7cf54ebe54"),['sunleaf-01'],[STORY_LOADOUTS[1]],ferryWorld,
  i18nText("config.story-campaign.f12557fd0f"));
ferry.ui.lead='木桥维修，东岸的药箱还没送到。小夜惦记着生病的巡护员；借气垫船送药，让下一次看花的约定有回音。';
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
ferry.dialogues={intro:talk([['snow','木桥正在维修，东岸巡护员的药还没送到。药箱在营地南边的西岸补给点。'],['mint','先把药取上，再去西岸渡口。借来的气垫船能从陆地直接开上水面。']], [{type:'phase',value:'prepare'}]),
  pickup:talk([['mint','药箱装好了。去河边的木渡口，苔轮在那里等我们。']],[{type:'flag',key:'supply'},...next('DOCK')]),
  dock:talk([['boatman','桥头已经围上维修栏了。把船头朝向河面，像在陆地上一样开过去。'],['mint','沿河往南，看到东岸的木平台就靠岸。药箱可别打湿啦。']],next('SAIL')),
  delivery:talk([['riverRanger','药收到啦，谢谢！这下夜班的伙伴不用等到桥修好了。'],['player','原来没有桥，气垫船也能把两岸连起来。'],['mint','回营报个平安。等这趟委托交付，桥上的维修也该结束了。']],home)};
ferry.props=[{kind:'medicine',site:'SUPPLY',when:{not:{flag:'supply'}}},{kind:'medicine',site:'FAR',when:{read:'delivery'}}];
ending(ferry,[["snow",i18nText("config.story-campaign.9eb7e80a47")],["mint",i18nText("config.story-campaign.c48c33ab5a")],["player",i18nText("config.story-campaign.6e3011eeaa")]]);
ferry.nodes.HOME.task.points=['LANDING','CHANNEL','WATER','DOCK','CAMP'];
ferry.nodes.HOME.title=ferry.nodes.HOME.objective.label='沿渡口水路返回营地';
ferry.dialogues.ending.lines=[['snow','药送到了，桥也修好了。小夜说要等巡护员好些，再约他来看花。'],['mint','他还托我问，你那本花草画册画到哪儿了？'],['snow','今天只画了一片歪叶子。以前总想画好才给人看，现在想把等人回家的这一天也留下来。']];

// 第三章：搬运队在三个停靠点逐段推进，清场后才出现下一段人员与货箱。
const timber=chapter('sunleaf-03',i18nText("config.story-campaign.27ca9fe0b6"),i18nText("config.story-campaign.d48b124b51"),['sunleaf-02'],[STORY_LOADOUTS[2],STORY_LOADOUTS[0]],land,
  i18nText("config.story-campaign.6c1b5f07c3"));
timber.nodes={BEGIN:prepare('CAMP',i18nText("config.story-campaign.808a837c8f"),'STOP1'),
  STOP1:encounter('FIRST',i18nText("config.story-campaign.3a98f77a86"),'first',6,{props:[{kind:'crate',site:'FIRST'}]}),
  STOP2:encounter('SECOND',i18nText("config.story-campaign.fcce59deca"),'second',9,{props:[{kind:'crate',site:'SECOND'}]}),
  STOP3:encounter('THIRD',i18nText("config.story-campaign.56b02a3263"),'third',12,{props:[{kind:'crate',site:'THIRD'}]})};
timber.dialogues={intro:talk([["mint",i18nText("config.story-campaign.1bb296d01a")],["player",i18nText("config.story-campaign.a9d1c5f779")],["mint",i18nText("config.story-campaign.436a9ad496")]],[{type:'phase',value:'prepare'}]),
  first:talk([["mint",i18nText("config.story-campaign.61c41686ab")],["player",i18nText("config.story-campaign.dda56599a4")]],next('STOP2')),
  second:talk([["mint",i18nText("config.story-campaign.1b4449af01")],["player",i18nText("config.story-campaign.20ff5e6b5c")]],next('STOP3')),
  third:talk([["player",i18nText("config.story-campaign.b81cf78702")],["mint",i18nText("config.story-campaign.9062ee5a1b")],["player",i18nText("config.story-campaign.dfbb247d64")]],home)};
ending(timber,[['snow','木料平安回来了。铁牙想用边角料给小夜的花盆垫个架子，雨天不用一直搁在湿地上。'],['mint','小夜怕自己养不好，不敢收。他说花架那么认真，配他的花可惜了。'],['snow','那我把画歪的雏菊也带上。不是等什么都做好了，才可以请朋友来看。']]);

timber.ui.lead='接应最后一班运木车。回营的木料里，也藏着铁牙想替小夜做花架的心意。';

// 第四章兼作独立机械核心体验，不要求其他章节；命名只写入剧情记录。
const team=chapter('sunleaf-04',i18nText("config.story-campaign.30bb1580ed"),i18nText("config.story-campaign.7dc38b6f3e"),[],[core],land,
  i18nText("config.story-campaign.5c1eef35aa"));
team.journey.experiences['team-strike']={loadout:core.id,event:'impact',match:{weaponIndex:15},speaker:'mint',goal:i18nText("config.story-campaign.0f8ad9f4b8"),success:i18nText("config.story-campaign.98ee12ebae"),feedback:i18nText("config.story-campaign.fd20e2e353"),advice:i18nText("config.story-campaign.f7849076b9")};
team.nodes={BEGIN:prepare('CAMP',i18nText("config.story-campaign.db5a174e6e"),'SHED'),SHED:interaction('FIRST',i18nText("config.story-campaign.54b5fa67cc"),'shed'),
  RECOVER:encounter('SECOND',i18nText("config.story-campaign.1952bc8524"),'recover',9),
  REPAIR:encounter('THIRD',i18nText("config.story-campaign.62f17a7b9c"),'repair',12),
  NAME:{title:i18nText("config.story-campaign.029771cc39"),requiresLoadout:true,prepareWhen:true,objective:{site:'THIRD',label:i18nText("config.story-campaign.b581adfde9")},task:{type:'idle'},
    panel:{type:'choice',title:i18nText("config.story-campaign.a356212c8f"),text:i18nText("config.story-campaign.921e2e73da")},choice:'companion',after:[{type:'dialogue',id:'named'}],actors:actor('THIRD')}};
team.choices.companion=[{id:'acorn',label:i18nText("config.story-campaign.8d5da74d03")},{id:'lamp',label:i18nText("config.story-campaign.667d3800d8")},{id:'echo',label:i18nText("config.story-campaign.72b977ec2e")}];
team.dialogues={intro:talk([["mint",i18nText("config.story-campaign.f9972c75d4")],["player",i18nText("config.story-campaign.95de3c7391")],["mint",i18nText("config.story-campaign.2355d12f28")]],[{type:'phase',value:'prepare'}]),
  shed:talk([["player",i18nText("config.story-campaign.6f8b6f57b9")],["mint",i18nText("config.story-campaign.fb847d77e9")]],next('RECOVER')),
  recover:talk([["mint",i18nText("config.story-campaign.63de829791")],["player",i18nText("config.story-campaign.e4435a25aa")]],next('REPAIR')),
  repair:talk([["mint",i18nText("config.story-campaign.8736c04da4")],["player",i18nText("config.story-campaign.0a3da87909")]],next('NAME','prepare')),
  named:talk([["mint",i18nText("config.story-campaign.20e65e3be2")],["player",i18nText("config.story-campaign.40ea09ab88")]],home)};
team.props=[{kind:'crate',site:'FIRST'},{kind:'relay',site:'THIRD'}];
ending(team,[['snow','小队有名字了，今后交接时，就知道该谢谢谁。'],['mint','小夜也给花盆写了小牌。昨天叶子垂着，他急得想再浇水，后来先蹲下来看看土。'],['snow','我答应替他画每次新叶子的样子。长得慢也没关系，翻回前一页，就知道它有在长。']]);

team.dialogues.ending.lines.push(['mint','机械核心的购买资格已经交给阿栎师傅。回到武器工坊，按原配方就能买下自己的伙伴。']);
team.ui.lead='找回零件，为机械小队起个名字。有人记住每位队员，也有人认真记下花盆里的每片新叶。';

// 第五章兼作独立直升机体验；仍须飞越水面、实际下机并确认航标。
const flight=chapter('sunleaf-05',i18nText("config.story-campaign.6e444b838e"),i18nText("config.story-campaign.41639077c8"),[],[heli],
  world({...copy(coast.sites),WATER:{x:1220,y:2100},FAR:{x:2700,y:400},LIGHT:{x:2600,y:1500}},[{sites:['CAMP','WATER','FAR'],travel:'air',dash:[5,4]},{sites:['FAR','LIGHT']}]),
  i18nText("config.story-campaign.1ba13c9397"));
flight.journey.experiences['rotor-fire']={loadout:heli.id,event:'impact',match:{weaponIndex:19},speaker:'player',goal:i18nText("config.story-campaign.05043ca395"),success:i18nText("config.story-campaign.36d6e89166"),feedback:i18nText("config.story-campaign.0968f13c4b"),advice:i18nText("config.story-campaign.5ea4ee5bf5")};
flight.nodes={BEGIN:prepare('CAMP',i18nText("config.story-campaign.da5916a344"),'FLY'),
  FLY:travel('FAR',i18nText("config.story-campaign.be04167085"),['WATER','FAR'],'LAND',{task:{type:'travel',points:['WATER','FAR'],radius:45,requires:'flying',after:next('LAND')}}),
  LAND:{title:i18nText("config.story-campaign.a3276d034c"),requiresLoadout:true,objective:{site:'FAR',label:i18nText("config.story-campaign.86ebbe4060")},task:{type:'landing',site:'FAR',radius:65,after:next('REPORT')}},
  REPORT:interaction('FAR',i18nText("config.story-campaign.ff81e2f2f0"),'landed'),
  LIGHT:encounter('LIGHT',i18nText("config.story-campaign.6b606180bd"),'light',10)};
flight.dialogues={intro:talk([["mint",i18nText("config.story-campaign.352e85f5d8")],["player",i18nText("config.story-campaign.e2b4239c52")],["mint",i18nText("config.story-campaign.231acd1880")]],[{type:'phase',value:'prepare'}]),
  landed:talk([["mint",i18nText("config.story-campaign.28c76a01ec")],["player",i18nText("config.story-campaign.806a016564")]],next('LIGHT')),
  light:talk([["player",i18nText("config.story-campaign.1b93165063")],["mint",i18nText("config.story-campaign.65f84f002b")],["player",i18nText("config.story-campaign.9adb1b428a")]],home)};
flight.props=[{kind:'relay',site:'LIGHT',bind:{restored:true}},{kind:'sign',site:'FAR'}];
ending(flight,[['snow','我今天带着画册在外面等光，等到草尖都暗了，还舍不得收笔。'],['player','树冠上的灯能认出回家的方向了。天晚了，沿安全的路回来。'],['mint','小夜说花开时想叫上枭爵和铁牙。他一直记着替班的人，也记着那只有洞的花盆。'],['snow','那我留一页画大家。花可以画好几回，大家坐在一起的晚上，我不想错过。']]);

flight.dialogues.ending.lines.push(['mint','起飞、落地和航标都确认过了。交付后苔轮会开放直升机购买，金币与材料仍按工坊配方准备。']);
flight.ui.lead='飞过树冠，确认落点与航标。让送夜信的小夜、在外画花草的雪团，都认得回家的灯。';

// 第六章：三个阶段允许重新整备，借用五种已有搭配，不设永久拥有门槛。
const finale=chapter('sunleaf-06',i18nText("config.story-campaign.1b3c46629e"),i18nText("config.story-campaign.4a7dc56280"),['sunleaf-05'],[...STORY_LOADOUTS,core,heli],
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
finale.dialogues={intro:talk([["snow",i18nText("config.story-campaign.8cc0f887f6")],["mint",i18nText("config.story-campaign.1916a53a55")],["player",i18nText("config.story-campaign.fc327bb5ea")]],[{type:'phase',value:'prepare'}]),
  receipts:talk([["player",i18nText("config.story-campaign.cadbc16d79")],["mint",i18nText("config.story-campaign.2c3e23a786")]],next('TO_STATION')),
  uploaded:talk([["mint",i18nText("config.story-campaign.4075978378")],["player",i18nText("config.story-campaign.65bb3233eb")]],next('CALIBRATION','prepare')),
  now:talk([["mint",i18nText("config.story-campaign.89a88d57fd")],["mint",i18nText("config.story-campaign.f5a1381390")],["player",i18nText("config.story-campaign.d1520b849d")]],home)};
finale.props=[{kind:'relay',site:'STATION',bind:{hp:{path:'relay.hp'}}},{kind:'mail',site:'CALIBRATE'}];
ending(finale,[['snow','今天的回信，先念小夜这一封：花还没有开，但新叶子长出来了，谢谢陪我等的人。'],['mint','再念你的吧。画册封面都被你攥皱了。'],['snow','我总说去外面画花草，其实是不太敢画人，怕画不像。可现在，每片叶子旁边都有想起的人。'],['player','那就画我们一起等花开的样子。忙完巡林，回田里看看，种子小屋旁再见。']]);

finale.ui.lead='送齐回执，守住转发站，录下今天的平安。森林的回信里，也该有新叶、画册和等花开的朋友。';

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
// 两篇兼作装备前置的旧故事保留原关卡，只扩充伙伴与回航的叙事。
for(const story of [team,flight])extendEquipmentDialogue(story);
export const STORY_CAMPAIGN=Object.fromEntries([base,ferry,timber,team,flight,finale,expedition,guardian,...MONSTER_STORIES,...EQUIPMENT_STORY_CHAPTERS].map(c=>[c.id,c]));
