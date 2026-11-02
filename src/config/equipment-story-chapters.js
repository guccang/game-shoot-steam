// 七条装备邻里故事复用正式章节状态机、真实借装和交付账本；不扩充旧谢礼清单。
import {STORY_CHAPTER as BASE} from './story.js';
import {EQUIPMENT_QUESTS} from './equipment-quests.js';
import {LIVING_PLACES,RESIDENTS} from './living-world.js';
import {TOWN_LAYOUT} from './town-layout.js';
import {extendEquipmentDialogue} from './equipment-story-details.js';

// 阶段、对白和出场均为可序列化数据，沿用既有近距离交互。
const next=id=>[{type:'stage',id,phase:'active'}];
// 交谈结束才提交下一阶段，跳过对白不会跳过实际任务。
const talk=(who,text,after)=>({lines:[[who,text]],after});
// 人物在目标侧面站立，保留交互与车身的通行空间。
const cast=(actor,site)=>[{actor,site,dx:90,dy:25}];
// 调查与照料持续两秒，离开范围或受伤沿用正式取消规则。
const visit=(site,title,action,actor,extra={})=>({title,requiresLoadout:true,objective:{site,label:title,action},task:{type:'idle'},actors:cast(actor,site),...extra});
// 实际驾驶依赖当前借用车辆处于驾驶状态，步行抵达不能跳过体验。
const drive=(site,title,destination)=>({title,requiresLoadout:true,objective:{site,label:title},task:{type:'travel',points:[site],radius:55,driving:true,after:next(destination)}});
// 短遭遇不产出永久战利品，清场后仍要在现场交接。
const battle=(site,title,action,actor,total=5)=>({...visit(site,title,action,actor),
  objective:{site,label:title,action,actionWhen:{path:'combat.cleared',equals:true}},
  task:{type:'wave',site,reach:160,wave:{total,cap:4,heavy:0}},
  encounter:{enemyHp:{normal:36}},props:[{kind:'crate',site}]});

// 装备任务在设施前方交接；底座中心属于实体墙或桌台，不能作为导航与作业终点。
const workplace=id=>({...LIVING_PLACES[id],y:LIVING_PLACES[id].y+32});

// 章节独立复制基础合同，借用武器步行出发，载具故事使用原装专属炮。
function chapter(equipment,weapon,vehicle=null,turret=null){
 const q=EQUIPMENT_QUESTS.find(q=>q.equipment===equipment),c=structuredClone(BASE);
 const actors=Object.fromEntries(RESIDENTS.map(r=>[r.id,{name:r.name,residentId:r.id,source:'actor',kind:'equipment-'+r.id,head:r.appearance?.type==='boss'?115:52,aside:100,
  ...(Number.isInteger(r.hero)?{hero:r.hero}:{appearance:structuredClone(r.appearance)})}]));
 const loadout={id:q.chapter+'-loan',name:'借用'+({water:'潮汐水枪',frost:'霜枝冰晶枪','gravity-gun':'引力聚束枪','mechanical-spider':'机械蜘蛛','energy-shield':'能量盾与巡林车','red-wolf':'红狼坦克','jinbei-van':'金杯面包车'}[equipment]),
  choice:'使用任务借装',weapon,vehicle:vehicle??5,turret,onFoot:vehicle===null,damage:1,turretDamage:1,hull:360,
  text:'任务期间免费借用，退出后归还并恢复原装备。',hint:'完成现场工作并交付后，工坊开放购买；金币与材料另付。'};
 const sites={CAMP:{...TOWN_LAYOUT.neighborsPost},FLOWERS:workplace('flowers'),KITCHEN:workplace('kitchen'),
  RELAY:workplace('relay'),POTTERY:workplace('pottery'),MARKET:workplace('market'),LETTERS:workplace('camp'),
  FIRST:{x:2600,y:1500},SECOND:{x:2800,y:2350}};
 Object.assign(c,{id:q.chapter,version:1,title:q.title,subtitle:'邻里装备故事',catalogType:'commission',requires:q.requires,reward:{},
  flags:['care','delivered','summonsStored','roadCleared'],routes:{},choices:{},targets:{},restoreTargets:[],props:[],nodes:{},dialogues:{},
  completionFlags:{[q.chapter+'Completed']:true},loadouts:[loadout],actors:{player:c.actors.player,...actors},
  world:{sites,defaultClearance:110,clearances:{FIRST:365,SECOND:365},approaches:[],
   paths:[{sites:['CAMP','FIRST','SECOND','CAMP'],clearance:75,walkHalf:42,dash:[],color:'#b57d3e'},
    {sites:['CAMP','FLOWERS','KITCHEN','POTTERY','LETTERS','MARKET','RELAY'],clearance:55,walkHalf:32,dash:[],color:'#b57d3e'}],
   validation:{navigation:true,step:12,playerRadius:12,crosses:[]},mapText:'帮助邻居，沿任务光点前往现场。',legend:'邻里委托板 · 生活设施 · 林间支路'}});
 c.entry={...c.entry,site:'CAMP',stage:'BEGIN',dialogue:'intro',label:q.title,completedLabel:'重温这次邻里故事'};
 c.encounters.bosses={};c.cleanup.bossDeath.flags=[];c.cleanup.combat.run.waypoint=0;c.journey.experiences={};c.trial.site='CAMP';
 c.ui={...c.ui,lead:'',role:'免费借装完成邻里请求，交付后开放工坊购买。',quote:q.reply,author:actors[q.host].name,completedLead:'已开放对应装备购买，重玩不会重复发放资格。',wave:q.title};
 c.nodes.BEGIN={...visit('CAMP','听听邻居的请求','intro',q.host),requiresLoadout:false,prepareWhen:true,loadout:true,
  panel:{type:'loadout',title:'领取任务借装',button:'借好装备，出发'},start:next('VISIT')};
 c.nodes.END={...visit('CAMP','返回交付，开放购买','ending',q.host),campReturn:true,prepareWhen:{read:'ending'},claimWhen:{read:'ending'},
  panel:{type:'claim',title:'邻里请求办妥了',text:'交付后开放工坊购买，仍需支付原配方。',button:'完成交付，开放购买'}};
 c.dialogues.ending=talk(q.host,q.reply+' 以后想用自己的装备，就去工坊看看吧。',[{type:'phase',value:'prepare'}]);
 return c;
}

const gravity=chapter('gravity-gun',17);
gravity.ui.lead='夜班岔路又挤满野团。枭爵请你借引力枪，把危险留在邮路之外。';
gravity.nodes.VISIT=visit('RELAY','核对夜班岔路','route','owl');
gravity.nodes.CLEAR=battle('FIRST','用引力场清出邮路','safe','mint',6);
gravity.dialogues.intro=talk('owl','夜班邮路的岔路堵住了，得给送信的人留条安全通道。薄荷借来了引力枪，先到哨站看路线。',[{type:'phase',value:'prepare'}]);
gravity.dialogues.route=talk('owl','沿光点去林间空地，边移动边用引力场聚拢远处的野团。别站着让它们贴身，也别把它们引向邻居。',next('CLEAR'));
gravity.dialogues.safe=talk('mint','邮路通了。我把绕行说明写进交接表，回去向枭爵报个平安。',next('END'));

const water=chapter('water',5);
water.ui.lead='小夜怕水流冲坏嫩芽，阿团也有空篮要洗。借一把水枪，学着把水送到需要的地方。';
water.nodes.VISIT=visit('FLOWERS','查看新芽与土壤','soil','bat');
water.nodes.WATER=visit('FLOWERS','轻轻浇灌新芽','water','bat',{care:'water',interactionTarget:{prop:'seedling'},props:[{kind:'seedling',site:'FLOWERS'}]});
water.nodes.WASH=visit('KITCHEN','冲洗备餐空篮','wash','cook',{care:'water',interactionTarget:{prop:'crate'},props:[{kind:'crate',site:'KITCHEN'}]});
water.nodes.REVISIT=visit('FLOWERS','请小夜记下浇水时间','record','bat');
water.dialogues.intro=talk('bat','我想照顾好这些新芽，可总怕浇多。先看看土，再借水枪轻轻试试，阿团也托我们洗一只空篮。',[{type:'phase',value:'prepare'}]);
water.dialogues.soil=talk('bat','表层土干了。站在花盆旁，点一下照料，保持位置，给新芽一场小雨。',next('WATER'));
water.dialogues.water=talk('bat','水慢慢渗下去了！不用一直浇，去厨房帮阿团洗篮子吧。',[{type:'flag',key:'care'},...next('WASH')]);
water.dialogues.wash=talk('cook','空篮洗净啦。回去跟小夜说，照顾花草和做饭一样，细心比着急有用。',next('REVISIT'));
water.dialogues.record=talk('bat','今天的浇水时间写好了，下次先摸摸土。我们回委托板把这件事记下来。',next('END'));

const frost=chapter('frost',11);
frost.ui.lead='远处夜岗的饭总要走很久。阿团想试试用冰晶冷源保护补给，不让饭在路上坏掉。';
frost.nodes.VISIT=visit('KITCHEN','领取保温箱','box','cook',{props:[{kind:'crate',site:'KITCHEN'}]});
frost.nodes.COOL=visit('RELAY','为保温箱制作冷源','cool','mint',{care:'frost',interactionTarget:{prop:'crate'},props:[{kind:'crate',site:'RELAY'}]});
frost.nodes.CLEAR=battle('FIRST','护送补给，冰冻拦路野团','delivered','owl');
frost.dialogues.intro=talk('cook','夜岗路远，饭要保存妥当。带保温箱去找薄荷，她知道怎么借冰晶枪做冷源。',[{type:'phase',value:'prepare'}]);
frost.dialogues.box=talk('cook','饭和空冷源盒分开放好了。去旧哨站处理冷源，再沿支路送往夜岗。',next('COOL'));
frost.dialogues.cool=talk('mint','冷源装好，不会冻到饭。路上遇见野团，先用冰晶减缓它们，再安全通过。',[{type:'flag',key:'care'},...next('CLEAR')]);
frost.dialogues.delivered=talk('owl','补给收到了。保温箱留在夜岗，替大家谢谢阿团。',next('END'));

const spider=chapter('mechanical-spider',16);
spider.ui.lead='旧哨站外围两段灯线坏了。薄荷维修时需要伙伴照应，机械蜘蛛小队可以帮忙。';
spider.nodes.VISIT=visit('RELAY','检查两段灯线','inspect','mint');
spider.nodes.FIRST=battle('FIRST','部署蜘蛛小队，守住第一处维修点','first','mint');
spider.nodes.SECOND=battle('SECOND','守住第二处维修点','second','mint',6);
spider.nodes.RECALL=visit('RELAY','集合小队，交回巡检记录','recall','mint',{recall:true});
spider.dialogues.intro=talk('mint','林间两段灯线坏了，维修时需要伙伴照应。这次借机械蜘蛛来帮忙，先到哨站检查工具。',[{type:'phase',value:'prepare'}]);
spider.dialogues.inspect=talk('mint','带着控制器靠近维修点，母体和子体会按能源节奏出动。守住我身旁这片空地。',next('FIRST'));
spider.dialogues.first=talk('mint','第一段灯稳了。别忘记看能源，下一处还有野团。',next('SECOND'));
spider.dialogues.second=talk('mint','两段都接通了。回旧哨站集合伙伴，再把巡检记录交回去。',next('RECALL'));
spider.dialogues.recall=talk('mint','伙伴们都收回控制器了。巡检本上会记着它们的功劳。',next('END'));

const wolf=chapter('red-wolf',0,6,21);
wolf.ui.lead='一车木料困在堵塞的支路上。铁牙请你向苔轮借红狼，用履带开路、主炮护送，把木料接回来。';
wolf.nodes.VISIT=visit('POTTERY','听铁牙说明运输支路','route','boar');
wolf.nodes.DRIVE=drive('FIRST','驾驶红狼前往运输支路','TIMBER');
// 开路仅生成任务空地内的三棵临时障碍树，退出后恢复森林原状。
wolf.nodes.TIMBER={title:'驾驶红狼碾开支路上的三棵障碍树',requiresLoadout:true,objective:{site:'FIRST',label:'驾驶红狼碾开支路上的三棵障碍树'},task:{type:'timber',site:'FIRST',after:[{type:'flag',key:'roadCleared'},...next('CLEAR')]}};
wolf.nodes.CLEAR=battle('FIRST','用红狼主炮接应运输队','clear','boar',7);
wolf.nodes.HAUL=drive('SECOND','驾驶红狼护送最后一车木料','DELIVER');
wolf.nodes.DELIVER=visit('SECOND','确认木料交齐','delivered','boar',{props:[{kind:'crate',site:'SECOND'}]});
wolf.dialogues.intro=talk('boar','运输队最后一车木料困在旧支路，倒下的树挡住了车。苔轮准备了红狼，先来听听路况。',[{type:'phase',value:'prepare'}]);
wolf.dialogues.route=talk('boar','红狼很稳，转弯要慢。去林间运输支路接应，别碰营地的花草。',next('DRIVE'));
wolf.dialogues.clear=talk('boar','狼牙主炮把路口守住了，继续沿光点护送到卸货点。',next('HAUL'));
wolf.dialogues.delivered=talk('boar','最后一车齐了。回委托板交付，我把验收结果带给苔轮。',next('END'));

const van=chapter('jinbei-van',0,7,22);
van.ui.lead='雪团带画册，阿团送餐，铁牙运陶盆。这回借一辆金杯，大家一起去集市。';
van.nodes.VISIT=visit('LETTERS','接上雪团和画册','snow','snow');
van.nodes.FOOD=visit('KITCHEN','接上阿团和餐箱','food','cook',{props:[{kind:'crate',site:'KITCHEN'}]});
van.nodes.POTS=visit('POTTERY','接上铁牙和陶盆','pots','boar',{props:[{kind:'crate',site:'POTTERY'}]});
van.nodes.DRIVE=drive('FIRST','驾驶金杯，通过集市支路','CLEAR');
van.nodes.CLEAR=battle('FIRST','和邻里猫小队一起护路','safe','snow',6);
van.nodes.MARKET=drive('MARKET','驾驶金杯抵达集市','UNLOAD');
van.nodes.UNLOAD=visit('MARKET','卸下货物，约好下一次合乘','unload','snow',{props:[{kind:'crate',site:'MARKET'}]});
van.dialogues.intro=talk('snow','画册和货物都收好了，谁也不必独自跑一趟。借金杯，按顺序来接大家吧。',[{type:'phase',value:'prepare'}]);
van.dialogues.snow=talk('snow','画册放好了。下一站去厨房，阿团的餐箱别忘了。',next('FOOD'));
van.dialogues.food=talk('cook','餐箱绑稳啦。去陶作台接铁牙，他给盆沿都包了软布。',next('POTS'));
van.dialogues.pots=talk('boar','陶盆上车！走林间支路，遇见野团就让猫小队互相照应。',next('DRIVE'));
van.dialogues.safe=talk('snow','大家配合得真好。继续开到集市卸货，今天不用等集市日，也能把准备做好。',next('MARKET'));
van.dialogues.unload=talk('snow','东西都到了，我把下一趟合乘安排记下来。回委托板交付吧。',next('END'));

// 盾是防具，护送借车保留主炮；先做安全校准，再体验真实遭遇，避免要求盾消灭敌人。
const shield=chapter('energy-shield',18,0,17);
shield.ui.lead='小夜想把新育的菜苗送到林间苗圃，却总怕遇见野团。借用能量盾与巡林车，先检测盾面，再稳稳护送这一箱新绿。';
shield.nodes.VISIT=visit('RELAY','向薄荷学习查看护盾余量','inspect','mint');
shield.nodes.CHECK=visit('RELAY','启动检测器，观察盾面格挡','checked','mint',{care:'shield',interactionTarget:{prop:'relay'},props:[{kind:'relay',site:'RELAY'}]});
shield.nodes.DRIVE=drive('FIRST','驾驶巡林车，把菜苗送到林间苗圃','GUARD');
shield.nodes.GUARD={...battle('FIRST','撑盾护住巡林车，用车载机枪清出苗圃','safe','bat',5),props:[{kind:'seedling',site:'FIRST'}]};
shield.nodes.RECORD=visit('FLOWERS','请小夜记下菜苗与护盾情况','record','bat',{props:[{kind:'seedling',site:'FLOWERS'}]});
shield.dialogues.intro=talk('bat','这些菜苗刚长出第二片叶子，我想送去林间苗圃，又怕半路遇见野团。薄荷借来了能量盾和巡林车，愿意先教我们看余量。苗可以慢慢长，我们也可以慢慢学。',[{type:'phase',value:'prepare'}]);
shield.dialogues.inspect=talk('mint','盾会自动替你和车体挡住伤害，车载机枪照常开火。先点击检测器，看看每次接触后余量怎样变化；余量不够时，停下来等它充能，不必硬撑。',next('CHECK'));
shield.dialogues.checked=talk('mint','检测通过，盾面的涟漪就是刚才的格挡。停止受击三秒后会恢复，破盾则要等六秒。跟着光点把菜苗送到苗圃，路上保持移动，也记得看看余量。',[{type:'flag',key:'care'},...next('DRIVE')]);
shield.dialogues.safe=talk('bat','拦路的野团散开了，菜苗的叶片也没有压坏。原来守护不一定要追出去，站稳、留心余量，也能把重要的东西照看好。回花圃记下今天这一趟吧。',next('RECORD'));
shield.dialogues.record=talk('bat','我在记录本上画了一面小盾，旁边是一株挺直的新苗。下次去田里干活，我知道该怎样照顾自己的安全了。回委托板交付，再去工坊买自己的盾吧。',next('END'));

export const EQUIPMENT_STORY_CHAPTERS=[gravity,water,frost,spider,wolf,van,shield];
// 旧六篇补充邻里交流，新增盾篇已经包含完整对白，不重复追加。
for(const story of EQUIPMENT_STORY_CHAPTERS)extendEquipmentDialogue(story);
