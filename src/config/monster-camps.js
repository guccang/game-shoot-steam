import {worldDistance} from '../world/coordinates.js';
// 野外营地目录：坐标、种子、性格和线索共用稳定标识，不依赖显示文案。
// 半径按面积增加30%换算；营地外沿另留35单位的驻足预警带。
const CAMP_SCALE=Math.sqrt(1.3);
// 周边650单位共用营地等级；这是出生属性范围，不扩大警戒或攻击范围。
// 返营休息每秒恢复最大生命的3%，保留小数积累，低等级怪同样平滑回血。
export const MONSTER_CAMP_RULES=Object.freeze({scale:CAMP_SCALE,radius:150*CAMP_SCALE,warningRadius:150*CAMP_SCALE+35,territoryRadius:650,unseenDelay:.8,observe:340,respawn:90,count:5,interact:90,healPerSecond:.03,damageGrowthAfterLevel:5,damageGrowthPerLevel:.1});
// 营地及周边野怪从六级起逐步增加攻击，二十级为原曲线的2.5倍；不读取玩家装备。
export function monsterCampDamageScale(level){return 1+Math.max(0,level-MONSTER_CAMP_RULES.damageGrowthAfterLevel)*MONSTER_CAMP_RULES.damageGrowthPerLevel;}
export const MONSTER_CAMPS=Object.freeze([
 {id:'ember-pot',name:'歪锅营地',mapId:'forest',x:10368,y:1430,seeds:[0,1,3],style:'pot',lines:['我负责试吃。锅糊了属于厨师的个人成长。','这地方没有围栏，风景免费，穿堂风也免费。','别动我的胡萝卜！那是枕头，备用的才是晚饭。']},
 {id:'snore-pine',name:'呼噜松营地',mapId:'forest',x:9507,y:834,seeds:[5,10,15],style:'rack',lines:['我不是站岗睡着，我在梦里巡逻。','昨晚谁说自己不打呼？松果都震下来了。','营地招牌写着包住，没说住的是树荫。']},
 {id:'berry-rumor',name:'浆果小报营地',mapId:'forest',x:9190,y:7442,seeds:[2,4,8],style:'pot',lines:['独家消息：隔壁头领的叶帽，是粘上去的。','报纸卖不动？把天气预报改成谁欠谁一碗汤。','咱们营地最安全的财产，是没人愿意偷的锅。']},
 {id:'moon-kettle',name:'月亮茶摊营地',mapId:'forest',x:9537,y:3949,seeds:[7,9,11],style:'rack',lines:['月亮泡进茶里不用付钱，所以我只在晚上营业。','我亲戚说巡林员总找种子。种子又没长腿！','这里安静得很好，就是茶壶比我话多。']},
 {id:'leaky-roof',name:'漏雨棚营地',mapId:'forest',x:7071,y:2296,seeds:[6,12,16],style:'pot',lines:['屋顶漏三处，桶只有两个。我们管这叫流水席。','邻居搬来借伞，临走顺走了整片屋顶。','我想住湖景房，现在枕头里就有湖。']},
 {id:'late-mail',name:'迟到邮局营地',mapId:'forest',x:6254,y:7226,seeds:[13,14],style:'rack',lines:['明天一定送到。这句话我们已经用了三个春天。','表弟来信说又挨打了，邮票倒是贴得很精神。','营地包三餐：早上的等一等，中午的马上好。']},
 {id:'last-supper',name:'边境夜宵营地',mapId:'forest',x:5634,y:4714,seeds:[13,14,16],style:'pot',lines:['地图到头了？夜宵还没到头。','我们是高级营地。高级指账单，不指厨艺。','头领说要有狼性，结果大家只学会半夜喊饿。']},
 {id:'valley-bowl',name:'湖畔空碗营地',mapId:'jiuzhaigou',x:750,y:1450,seeds:[0,1,3],style:'pot',lines:['看湖能管饱吗？不能，但洗碗很方便。','这口锅的倒影比里面的饭还多。','隔壁说湖里有宝，我只捞到自己的拖鞋。']},
 {id:'valley-echo',name:'回声棚营地',mapId:'jiuzhaigou',x:2550,y:1250,seeds:[5,10,15],style:'rack',lines:['我说开饭啦，山谷回了三声，饭却只有一份。','这里的八卦传得快，全靠山替我们喊。','不要在营地说秘密，回声不签保密协议。']},
 {id:'valley-stamp',name:'落叶驿营地',mapId:'jiuzhaigou',x:350,y:350,seeds:[2,4,8],style:'rack',lines:['落叶都是信，扫地属于拆别人邮件。','表哥住森林，说那边的巡林员很勤快。','棚子不大，好处是吵架不用走过去。']},
 {id:'valley-star',name:'观星锅营地',mapId:'jiuzhaigou',x:1750,y:350,seeds:[7,9,11],style:'pot',lines:['锅底这颗不是星星，是昨天没洗掉的米。','头领研究星象，我研究什么时候放盐。','住高处看得远，欠饭钱的也跑得远。']},
]);
export const CAMP_CHARACTERS=Object.freeze([
 {id:'ash',name:'灰耳',camp:'ember-pot',destination:'snore-pine',item:'歪嘴茶哨',seed:0,phase:'night',clue:'我叫灰耳，不叫那只怪。呼噜松的冷灰堆，夜里会打嗝。天黑后去翻翻，别翻还冒火的那堆。',reply:'真找到啦？吹不响就对了，它只叫种子起床。我给你留了一把雏菊，明年这口歪锅旁边，也许能开花。'},
 {id:'editor',name:'苔小报',camp:'berry-rumor',destination:'moon-kettle',item:'倒着走的怀表',seed:2,phase:'day',clue:'我是苔小报。独家线索：月亮茶摊冷灰里埋着一块倒走的表。白天挖才看得清，别去问月亮几点了。',reply:'秒针确实倒着走，可午饭一次也没提前。这次不写报道了。给你留几颗草莓，我们坐着等午饭。'},
 {id:'postman',name:'慢半拍',camp:'late-mail',destination:'leaky-roof',item:'不会湿的信封',seed:13,phase:'night',clue:'我叫慢半拍，绝不误投，只会迟到。夜里去漏雨棚旁的冷灰堆找信封，先清空那里一回，免得他们拿它垫锅。',requiresClear:true,reply:'空信封也送到了！等那棵桃树结果，我想给远方也寄一颗。信封留着，装那些还没想好怎么说的话。'},
]);
// 周边野怪归属最近的同地图营地，重叠范围和循环地图接缝使用相同判定。
export function monsterCampTerritoryAt(x,y,mapId='forest'){
 let nearestCamp=null,distance=MONSTER_CAMP_RULES.territoryRadius;
 for(const camp of MONSTER_CAMPS){if(camp.mapId!==mapId)continue;const d=worldDistance({x,y},camp);if(d<=distance){nearestCamp=camp;distance=d;}}
 return nearestCamp;
}
// 树冠与营地、圈外人物和冷灰堆留白共用范围，地形本身不改写。
export function monsterCampClearing(x,y,mapId='forest'){
 return MONSTER_CAMPS.some(c=>c.mapId===mapId&&worldDistance({x,y},c)<310);
}
// 目录导航保留外围观察点，人物另在营地内，避免远程交谈。
export function campVisitorSite(camp){return {id:camp.id+'-visitor',mapId:camp.mapId,x:camp.x-70,y:camp.y-240};}
// 木牌位于外围观察点旁，牌面与牌脚均在预警带外，点击位置与绘制共用。
export function campSignSite(camp){return {id:camp.id+'-sign',mapId:camp.mapId,x:camp.x+10,y:camp.y-235};}
// 具名居民住在棚旁，独立于战斗名额，不加入敌人目标表。
export function campCharacterSite(camp){return {id:camp.id+'-character',mapId:camp.mapId,x:camp.x-68,y:camp.y-88};}
// 冷灰堆在营地另一侧，与活火保持距离。
export function campCacheSite(camp){return {id:camp.id+'-cache',mapId:camp.mapId,x:camp.x+205,y:camp.y+65};}
