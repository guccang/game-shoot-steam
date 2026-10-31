// 护路委托固定短遭遇血量上限，避免沿用林区等级造成逐只磨血。
export const LIVING_BATTLE_ENEMY_HP=48;
import {TOWN_LAYOUT,TOWN_PATHS,townPoint} from './town-layout.js';
import {PATHS} from '../world/paths.js';
import { GAMEPLAY_TABLES } from './gameplay-tables.js';
// 常驻森林的历法、生活地点、居民和委托共用纯数据；稳定标识不依赖显示文案。
export const LIVING_DAY_MS = ['day','dusk','night'].reduce((sum,id)=>sum+GAMEPLAY_TABLES.calendarTimings[id],0);
// 游戏内钟点只用于显示，时段仍按原游玩时长推进；一天从清晨六点开始。
export const LIVING_CLOCK_HOURS={day:6,dusk:18,night:20};
export const LIVING_PHASES = ['day','dusk','night'].map((id,index,ids)=>({id,name:['白昼','黄昏','夜晚'][index],start:ids.slice(0,index).reduce((sum,key)=>sum+GAMEPLAY_TABLES.calendarTimings[key],0),duration:GAMEPLAY_TABLES.calendarTimings[id]}));
export const LIVING_SEASONS = ['spring','summer','autumn','winter'];
export const LIVING_SEASON_NAMES = ['春','夏','秋','冬'];
export const LIVING_PLACES = {
  camp:{...TOWN_LAYOUT.letters,name:'晴叶饭桌',kind:'letters',width:90,height:48},
  relay:{...townPoint({x:790,y:1540}),name:'旧哨站',kind:'relay',width:104,height:100},
  // 厨房向西让出栖架与纵路，完整墙体不占用居民出门和车辆通路。
  kitchen:{...townPoint({x:445,y:1810}),name:'阿团的厨房',kind:'kitchen',width:140,height:92},
  pottery:{...townPoint({x:780,y:1800}),name:'铁牙陶作台',kind:'pottery',width:104,height:46},
  roost:{...townPoint({x:560,y:1660}),name:'小夜的栖架',kind:'roost',width:100,height:112},
  market:{...townPoint({x:880,y:1900}),name:'林间集市',kind:'market',width:120,height:65},
  flowers:{...townPoint({x:470,y:1870}),name:'月光花圃',kind:'flowers',width:75,height:35},
  basket:{x:2590,y:720,name:'散落的食材篮',kind:'basket',width:42,height:25},
  danger:{x:2600,y:2350,name:'夜班巡护线',kind:'warning',width:54,height:50},
};
// 主生活路线从营地接回现有纵路，再连接哨站和邻里；危险支路没有安全保护。
export const LIVING_ROADS = [
  // 建筑支路在纵向主路处收口，不再另铺一条平行长路。
  ...TOWN_PATHS,
  [townPoint({x:560,y:1700}),PATHS[1].find(p=>p.y===1720),townPoint({x:650,y:1730}),townPoint({x:650,y:1850}),townPoint({x:530,y:1850}),townPoint({x:470,y:1905})],
  [townPoint({x:650,y:1850}),townPoint({x:780,y:1850}),townPoint({x:780,y:1990})],
  [PATHS[1].find(p=>p.y===1580),townPoint({x:700,y:1580}),townPoint({x:790,y:1580})],
  [townPoint({x:780,y:1990}),townPoint({x:880,y:1990})],
];
export const RESIDENTS = [
  {id:'snow',name:'雪团',hero:4,home:'camp',job:'整理补给',wish:'忙完补给就去户外画花草，攒一本邻里的四季',relation:'替薄荷留饭，陪小夜记下新芽，也想学着把朋友画进画里',day:['camp','sort'],dusk:['camp','eat'],night:['camp','rest'],line:'今天在外面画草叶，风一吹就全变样了。小夜说，画歪也没关系，他认得那是自家的花。'},
  {id:'mint',name:'薄荷',hero:1,home:'relay',job:'巡线修灯',wish:'教会下一位夜班巡林员',relation:'与雪团交换路况，教小夜修灯',day:['relay','repair'],dusk:['camp','eat'],night:['relay','watch'],line:'旧线路还在用。接头修好，雨天也能听清了。'},
  {id:'cook',name:'阿团',appearance:{type:'monster',species:'slime',biome:'meadow'},home:'kitchen',job:'给邻居做饭',wish:'忙完也能吃上一口热饭',relation:'记得铁牙少盐，也给小夜留夜宵',day:['kitchen','cook'],dusk:['kitchen','eat'],night:['kitchen','rest'],line:'铁牙的那份要软一点。小夜的等天黑再热。'},
  {id:'boar',name:'铁牙',appearance:{type:'boss',kind:'boar'},home:'pottery',job:'搬货与陶作',wish:'做出邻居真正用得上的东西',relation:'想谢谢阿团，替小夜做花盆',day:['pottery','pottery'],dusk:['kitchen','eat'],night:['pottery','rest'],line:'这个碗又漏了……先别扔，也许有别的用处。'},
  {id:'bat',name:'小夜',appearance:{type:'monster',species:'leaf-bat',biome:'pine',flying:true},home:'roost',job:'夜间送信',wish:'学会种花草，邀朋友一起等月光花开',relation:'向薄荷学修灯，谢枭爵替班，用铁牙的陶碗种花，请雪团画新叶',day:['roost','rest'],dusk:['relay','handover'],night:['relay','watch'],line:'种子小屋的雏菊真好看。我总怕养不好，雪团却连第一片歪叶子都想画下来。那就再试一次。'},
  {id:'owl',name:'枭爵',appearance:{type:'boss',kind:'owl'},home:'relay',job:'协调夜岗',wish:'让年轻的夜班也能休息',relation:'替小夜接班，请薄荷把记录写大些',day:['relay','rest'],dusk:['relay','handover'],night:['roost','repair'],line:'新交接表字大多了。我从枝头也看得见。'},
];
export const LIVING_ACTION_NAMES={sort:'分拣回信',repair:'修理夜灯',cook:'备餐',pottery:'练习陶作',wash:'洗木碗',eat:'吃饭',rest:'休息',watch:'值守',handover:'交接夜班',flowers:'看花',market:'摆摊',shelter:'避雨',walk:'在路上'};
// 现场对白用一两句交代人物心意与下一步缘由；短目标只用于导航。
// 护路战斗只在危险支路发生。
export const LIVING_REQUESTS = [
  {id:'neighbors-lunch',title:'野猪王的减盐午餐',host:'cook',requires:[],reward:{coins:300,wood:100,parts:2},
    lead:'铁牙牙疼，还嘴硬说不饿。阿团想给他送顿软饭，过个生日。',
    steps:[{place:'kitchen',text:'领取生日午餐',line:'嫩叶先烫软，盐只放一点。餐盒里添上路边篮子的橡果，给铁牙送去，今天他生日。'},
      {place:'basket',text:'给午餐添上橡果',line:'橡果装好了。餐盒里还夹着贺卡：“生日快乐，谢谢你送来的柴。”'},
      {resident:'boar',text:'把午餐送给铁牙',line:'他还记得我生日啊……替我说，明天我来洗碗，换木碗吧，我怕碰碎。'},
      {resident:'cook',text:'给阿团带个口信',line:'木碗早备好了。明天让他洗，你也来，咱们一起吃顿热饭。'}],
    reply:'铁牙收好了贺卡，答应明天洗碗。阿团终于能坐下来吃顿热饭。'},
  {id:'neighbors-night',title:'叶蝠的夜班假条',host:'bat',requires:[],reward:{coins:350,wood:80,crystal:2},
    lead:'小夜爱种花草，想请假和雪团一起等月光花开，假条却被当成了加班申请。',
    steps:[{resident:'bat',text:'听小夜说说假条',line:'我写的是请假，怎么又排上班了？雪团说今晚带画册陪我等花开。去营地帮我核对一下吧，我不想让她一个人等。'},
      {place:'camp',text:'核对夜班交接表',line:'雪团：字太小，枭爵看错了。改成大字问问他吧。我的画册带好了，今晚不赶着画完，先陪小夜好好看花。'},
      {resident:'owl',text:'请枭爵帮忙换班',line:'原来是请假！这班我来，不过哨站灯线松了，先帮我修好，免得摸黑。'},
      {place:'relay',text:'修好哨站夜灯',line:'灯亮稳了，路口却挤着野团。枭爵要从这儿换班，帮他清条路吧。'},
      {place:'danger',text:'清出夜班小径',battle:true,line:'路通了，枭爵能安心接班了。快告诉小夜，别让他错过花开。'},
      {resident:'bat',text:'告诉小夜可以休息了',line:'那我真去啦！想请雪团给枭爵画一朵，花就留着继续长。下回他想休息，我替他。'}],
    reply:'枭爵接过夜班，小夜终于能安心等花开。他想请雪团把花画下来，送给没能来的朋友。'},
  {id:'neighbors-market',title:'领主们的周末集市',host:'cook',requires:['neighbors-lunch','neighbors-night'],reward:{coins:450,wood:120,parts:3},
    lead:'铁牙想做套碗送给阿团，却总漏水。他怕丢脸，不肯摆上集市。',
    steps:[{place:'kitchen',text:'带上集市货箱',line:'铁牙做的碗漏水，差点全砸了。先带去集市看看，顺路到哨站捎上薄荷的灯芯。'},
      {place:'relay',text:'捎上哨站的灯芯',line:'薄荷：小夜正缺个能排水的花盆！先摆好摊，再问问铁牙愿不愿意送一只。'},
      {place:'market',text:'摆好陶碗摊位',line:'碗边的小牌写着“会漏汤”。拿来种花倒合适，去跟铁牙说说。'},
      {resident:'boar',text:'问铁牙愿不愿送只碗',line:'真能种花？那把这只给小夜，不收钱；不够深就告诉我，我再做。'},
      {resident:'bat',text:'把陶碗送给小夜',line:'这孔正好排水，可别补上！我想去种子小屋看看雏菊，先学着种一盆。雪团说她连小芽都愿意画，花开了，你和铁牙也来。'}],
    reply:'漏水的陶碗成了花盆。小夜不再嫌自己种得慢，铁牙也敢摆出作品了；雪团给还没发芽的盆留了一页画纸。'},
];
export const SEASON_WORK=['春天的路肩要补平，种子还在厨房窗边晾着。','夏夜凉快，大家把修理桌搬到了棚檐下。','秋天的果子分成两篮，一篮过冬，一篮送给夜班。','冬天先查灯芯和屋檐。路远的人要多带一份热饭。'];
// 六章完成结果直接从永久账本投射，刷新与章节快照不能撤销这些生活痕迹。
export const MAIN_LIVING_RESULTS=[
  {id:'equipment-gravity',place:'relay',kind:'tools',line:'枭爵：安全绕行说明写进夜班交接表了。'},
  {id:'equipment-water',place:'flowers',kind:'water-record',line:'小夜：浇水日期记好了，下回先摸摸土。'},
  {id:'equipment-frost',place:'relay',kind:'supply',line:'阿团：夜岗添了保温补给箱。'},
  {id:'equipment-spider',place:'relay',kind:'beacon',line:'薄荷：两段线路都恢复了，巡检本记着小队的功劳。'},
  {id:'equipment-red-wolf',place:'camp',kind:'timber',line:'铁牙：运输支路畅通，最后一车木料也交齐了。'},
  {id:'equipment-jinbei',place:'market',kind:'ride-record',line:'雪团：下一趟合乘安排贴好了。'},
  {id:'sunleaf-01',place:'relay',kind:'repair',line:'薄荷：回信通了。小夜那封请教种花的信，也终于有人回答了。'},
  {id:'sunleaf-02',place:'camp',kind:'supply',line:'雪团：药送到了。等巡护员好些，我们再约他看花，不急着催人回来。'},
  {id:'sunleaf-03',place:'camp',kind:'timber',line:'薄荷：木料收好了。铁牙想挑些边角料做花架，小夜还不好意思收呢。'},
  {id:'sunleaf-04',place:'relay',kind:'tools',line:'薄荷：队员有名字，花盆也有小牌。雪团说，记得谁来过、谁长大了一点，都是要紧事。'},
  {id:'sunleaf-05',place:'relay',kind:'beacon',line:'小夜：树梢的灯认得清了。雪团在外面画花草忘了时间，也能找着回家的方向。'},
  {id:'sunleaf-06',place:'camp',kind:'radio',line:'雪团：今天的广播里有路况，也有小夜的新叶子。画册还没画完，我想把一起等花开的大家也画进去。'},
];
