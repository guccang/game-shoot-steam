import {TOWN_LAYOUT} from './town-layout.js';
import { i18nText } from "../i18n/index.js";
// 怪物邻里生活故事：纯配置驱动对白、任务、出场、奖励和离场清理。
import {STORY_CHAPTER as BASE,STORY_LOADOUTS} from './story.js';
// 生成阶段动作，运行时不识别怪物故事编号。
const next=id=>[{type:'stage',id,phase:'active'}];
// 对话结束动作与台词共同进入可序列化内容表。
const talk=(lines,after)=>({lines,after});
// 邻里委托采用中途、短途和回营长途组合，循环边界下各段仍落在1000–2000米。
const SITES={CAMP:{...TOWN_LAYOUT.neighborsPost},FIRST:{x:1700,y:1600},SECOND:{x:2700,y:1600},THIRD:{x:3100,y:500}};
// 怪物与领主仅提供外观，不向战斗系统登记友善人物。
const ACTORS={
  cook:{name:i18nText("config.monster-stories.5ad9f39286"),source:'actor',kind:'neighbor-cook',head:48,aside:80,appearance:{type:'monster',species:'slime',biome:'meadow'}},
  bat:{name:i18nText("config.monster-stories.fb5a1e1ad7"),source:'actor',kind:'neighbor-bat',head:52,aside:80,appearance:{type:'monster',species:'leaf-bat',biome:'pine',flying:true}},
  boar:{name:i18nText("config.bosses.17654194c6"),source:'actor',kind:'neighbor-boar',head:115,halfWidth:72,aside:120,appearance:{type:'boss',kind:'boar'}},
  owl:{name:i18nText("config.bosses.c8baf0b06b"),source:'actor',kind:'neighbor-owl',head:145,halfWidth:88,aside:120,appearance:{type:'boss',kind:'owl'}},
};
// 人物站在交互点侧面，避免遮住角色、货箱与目标光圈。
const cast=(id,site)=>[{actor:id,site,dx:100,dy:15}];
// 每个故事均能独立接取，完成单篇后回到接取前的森林现场。
function chapter(id,title,lead,loadout,reward,host){
 const c=structuredClone(BASE);
 Object.assign(c,{id,title,catalogType:'commission',subtitle:i18nText("config.monster-stories.f90e95778e", { p0: (title) }),requires:[],reward,flags:[],routes:{},choices:{},targets:{},restoreTargets:[],props:[],
  completionFlags:{[id+'Completed']:true},loadouts:[structuredClone(loadout)],actors:{player:c.actors.player,...structuredClone(ACTORS)},
  nodes:{},dialogues:{},world:{sites:structuredClone(SITES),defaultClearance:365,clearances:{},approaches:[],
   paths:[{sites:['CAMP','FIRST','SECOND','THIRD','CAMP'],clearance:70,walkHalf:42,dash:[],color:'#b57d3e'}],
   validation:{navigation:true,step:12,playerRadius:12,crosses:[]},mapText:i18nText("config.monster-stories.f797985c43"),legend:i18nText("config.monster-stories.a33e161962")}});
 c.entry={...c.entry,stage:'BEGIN',dialogue:'intro',label:title,completedLabel:i18nText("config.monster-stories.c69f9280ae")};
 c.encounters.bosses={};c.cleanup.bossDeath.flags=[];c.cleanup.combat.run.waypoint=0;
 c.journey.experiences={};
 c.ui={...c.ui,lead,completedLead:i18nText("config.monster-stories.a090182491"),role:i18nText("config.monster-stories.31a983fcd9"),
  start:i18nText("config.monster-stories.85c41e66d8"),wave:title,quote:i18nText("config.monster-stories.c91ecb2b78"),author:i18nText("config.monster-stories.a69263b626")};
 c.nodes.BEGIN={title:i18nText("config.monster-stories.955b62117b"),requiresLoadout:false,prepareWhen:true,loadout:true,objective:{site:'CAMP',label:i18nText("config.monster-stories.5470a1e75f")},
  task:{type:'idle'},panel:{type:'loadout',title:i18nText("config.monster-stories.59d8cbce44"),button:i18nText("config.monster-stories.7809b157b5")},start:next('VISIT'),actors:cast(host,'CAMP')};
 // 旧版邻居故事返程及待交付恢复常驻营地，兼容仍在故事中的旧存档。
 c.nodes.END={campReturn:true,title:i18nText("config.monster-stories.2aa29fd649"),requiresLoadout:true,objective:{site:'CAMP',label:i18nText("config.monster-stories.235d9eee51"),action:'ending'},task:{type:'idle'},
  prepareWhen:{read:'ending'},claimWhen:{read:'ending'},actors:cast(host,'CAMP'),
  panel:{type:'claim',title:i18nText("config.monster-stories.b2634a7d30"),text:i18nText("config.monster-stories.80adec47fa"),reward:i18nText("config.monster-stories.61e4a3b497"),button:i18nText("config.monster-stories.ed558a93fa")}};
 return c;
}
// 调查点和交谈点都走正式近距离交互流程。
const visit=(site,label,action,who)=>({title:label,requiresLoadout:true,objective:{site,label,action},task:{type:'idle'},actors:cast(who,site)});
// 货物抵达依赖顺序路点，不能仅靠触发一句对白完成运送。
const travel=(points,destination,label)=>({title:label,requiresLoadout:true,objective:{site:points[0],label},
 task:{type:'travel',points,radius:45,after:next(destination)}});
// 清场采用现有战斗圈与数值，友善委托人不出现在敌人列表。
const wave=(site,label,key,total)=>({title:label,requiresLoadout:true,objective:{site,label,action:key,actionWhen:{path:'combat.cleared',equals:true}},
 task:{type:'wave',site,reach:160,wave:{total,cap:4,heavy:0}},props:[{kind:'crate',site}]});
const lunch=chapter('neighbors-lunch',i18nText("config.monster-stories.7c94e06032"),i18nText("config.monster-stories.68e07c458f"),STORY_LOADOUTS[0],{coins:300,wood:100,parts:2},'cook');
lunch.nodes.VISIT=visit('FIRST',i18nText("config.monster-stories.11c47aece5"),'recipe','cook');
lunch.nodes.CLEAR=wave('SECOND',i18nText("config.monster-stories.2ceb159b32"),'basket',6);
lunch.nodes.SERVE=visit('THIRD',i18nText("config.monster-stories.3747f56a65"),'serve','boar');
lunch.dialogues={
 intro:talk([["cook",i18nText("config.monster-stories.bcc2275957")],["player",i18nText("config.monster-stories.7cee75ef42")],["cook",i18nText("config.monster-stories.0acff6f1da")]],[{type:'phase',value:'prepare'}]),
 recipe:talk([["cook",i18nText("config.monster-stories.c9a0b4d883")],["player",i18nText("config.monster-stories.41fdd097f5")]],next('CLEAR')),
 basket:talk([["player",i18nText("config.monster-stories.f96a501ea4")],["player",i18nText("config.monster-stories.efcf36738b")]],next('SERVE')),
 serve:talk([["boar",i18nText("config.monster-stories.0c6d672ec9")],["player",i18nText("config.monster-stories.8c3c7893d0")],["boar",i18nText("config.monster-stories.b734e6d74b")]],next('END')),
 ending:talk([["cook",i18nText("config.monster-stories.24c1a70146")],["player",i18nText("config.monster-stories.0820eb438f")],["cook",i18nText("config.monster-stories.7dd186c119")]],[{type:'phase',value:'prepare'}]),
};
const night=chapter('neighbors-night',i18nText("config.monster-stories.fb1785dbd4"),i18nText("config.monster-stories.7de5c71994"),STORY_LOADOUTS[0],{coins:350,wood:80,crystal:2},'bat');
night.nodes.VISIT=visit('FIRST',i18nText("config.monster-stories.48e1cd4fdc"),'letter','bat');
night.nodes.DELIVER=travel(['SECOND','THIRD'],'ASK',i18nText("config.monster-stories.129d4fa4f1"));
night.nodes.ASK=visit('THIRD',i18nText("config.monster-stories.119798c233"),'ask','owl');
night.nodes.CLEAR=wave('SECOND',i18nText("config.monster-stories.4cbe2bcbc0"),'safe',5);
night.dialogues={
 intro:talk([["bat",i18nText("config.monster-stories.1a94d927d1")],["player",i18nText("config.monster-stories.2dc8a079d4")]],[{type:'phase',value:'prepare'}]),
 letter:talk([["bat",i18nText("config.monster-stories.46bf0c63b5")],["player",i18nText("config.monster-stories.f5df7d8e31")]],next('DELIVER')),
 ask:talk([["owl",i18nText("config.monster-stories.20589fca24")],["player",i18nText("config.monster-stories.7cbfeea6f2")],["owl",i18nText("config.monster-stories.3fc8b892a7")]],next('CLEAR')),
 safe:talk([["player",i18nText("config.monster-stories.2bfbf5c4c3")]],next('END')),
 ending:talk([["bat",i18nText("config.monster-stories.b2386584b5")],["player",i18nText("config.monster-stories.bf25882474")],["bat",i18nText("config.monster-stories.ad71797f14")]],[{type:'phase',value:'prepare'}]),
};
const market=chapter('neighbors-market',i18nText("config.monster-stories.d73481db58"),i18nText("config.monster-stories.0408002792"),STORY_LOADOUTS[1],{coins:450,wood:120,parts:3},'cook');
market.nodes.VISIT=visit('FIRST',i18nText("config.monster-stories.d666d3fd2a"),'cargo','cook');
market.nodes.HAUL=travel(['SECOND','THIRD'],'CLEAR',i18nText("config.monster-stories.9c53e79133"));
market.nodes.CLEAR=wave('THIRD',i18nText("config.monster-stories.15c9f4e8c4"),'market',8);
market.nodes.MEET=visit('THIRD',i18nText("config.monster-stories.e16dac0038"),'bowls','boar');
market.dialogues={
 intro:talk([["cook",i18nText("config.monster-stories.a4141ca861")],["player",i18nText("config.monster-stories.e1bbc23dbc")],["cook",i18nText("config.monster-stories.3943330ad1")]],[{type:'phase',value:'prepare'}]),
 cargo:talk([["cook",i18nText("config.monster-stories.eb45e5b6d4")],["player",i18nText("config.monster-stories.7f5714f71b")]],next('HAUL')),
 market:talk([["player",i18nText("config.monster-stories.72411be946")],["player",i18nText("config.monster-stories.65425bd854")]],next('MEET')),
 bowls:talk([["boar",i18nText("config.monster-stories.3a2c4ef93c")],["player",i18nText("config.monster-stories.feaaa7d1f2")],["boar",i18nText("config.monster-stories.04c0394b16")]],next('END')),
 ending:talk([["cook",i18nText("config.monster-stories.4983223c30")],["player",i18nText("config.monster-stories.165fe73a3f")],["cook",i18nText("config.monster-stories.f6b3925ffa")]],[{type:'phase',value:'prepare'}]),
};
export const MONSTER_STORIES=[lunch,night,market];
