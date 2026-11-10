// 生物图鉴只补充中文介绍，价格、力量、怪物名称与攻击提示引用正式配置。
import {FISH_SPECIES} from './outdoors.js';
import {RANGED_ENEMIES} from './ranged-enemies.js';
import {ARMORED} from './armored-enemies.js';
import {BOSSES} from './bosses.js';
import {MINE_ANIMALS} from './mine-ecology.js';
const rangedText={
 'spore-spitter':['背着孢子囊的远程团子，会向前方喷出孢子。','保持横向走动，避开喷射方向。'],
 'acorn-slinger':['把橡果当作投掷物的林间团子，出手前会短暂准备。','观察出手动作，在弹道之间寻找空隙。'],
 'reed-archer':['使用苇叶弩的灵巧射手，善于在远处连续施压。','避免长时间站在同一直线上。'],
 'bramble-buggy':['驾驶小型装甲车的团子，车体结实并携带远程武器。','留出移动空间，绕开正面火力。'],
 'stump-bombard':['拖着重炮的慢速团子，炮弹会威胁落点周围。','看到炮击准备时离开原地，避免聚在落点。']
};
const mineText={crystalguard:['晶体两侧护住软体的地下团子，会散射三枚晶片。','前摇时侧移，寻找晶片之间的空隙。'],coalspark:['顶着温热煤炉的团子，会在锁定位置落下火团。','看到落点圆圈后离开原地。'],drill:['戴着锥形钻冠的团子，锁定方向后直线冲刺。','横向躲开钻头，在收招时反击。'],coreking:['每层都有矿心团王，晶冠与双矿锤守护本层专属晶核。击败后用晶核和施工资源开通下一层。','在地下建设页唤醒，躲开扇射、震地和环射；半血后收招更快。'],beetle:['地下金属灰团子，有小、中、大体型与盾卫外观，常在根木和遗迹间活动。','近身时会扑击，蓄力时拉开距离。'],bat:['长着金属灰叶翼的圆团子，与地表叶翼飞团同族，常在地下水岸和石厅附近活动。','移动较快，注意它靠近时的攻击预兆。'],spore:['金属灰的喷团、投团、弩团、装甲车团和重炮团，沿用地表同族的装备造型，喜欢地下苔藓与荧菇林。','会从远处发射孢子，利用岩壁遮挡弹道。']};
export const CREATURE_FISH=FISH_SPECIES.map(f=>({...f,key:'fish:'+f.id,category:'fish',group:'鱼类',portrait:'fish',tip:f.tip}));
export const CREATURE_MONSTERS=[
 {id:'slime',key:'monster:slime',name:'森林团子',category:'monster',group:'地表怪物',portrait:'monster',habitat:'森林与湖谷的各片林区',description:'柔软圆润的林间生物，有小、中、大三种体型；不同地区会呈现不同草木颜色。',tip:'留意蓄力后的近身扑击，侧移避开后再反击。'},
 {id:'leaf-bat',key:'monster:leaf-bat',name:'叶翼蝠',category:'monster',group:'地表怪物',portrait:'monster',habitat:'森林与湖谷上空',description:'像叶片一样的翅膀使它能够低空飞行，速度快但身形较脆弱。',tip:'保持走动，注意它靠近时的俯冲。'},
 ...Object.entries(RANGED_ENEMIES).map(([id,p])=>({id,key:'monster:'+id,name:p.name,category:'monster',group:'地表怪物',portrait:'monster',habitat:'森林与湖谷的危险区域',description:rangedText[id][0],tip:rangedText[id][1]})),
 {id:ARMORED.id,key:'monster:'+ARMORED.id,name:ARMORED.name,category:'monster',group:'地表怪物',portrait:'monster',habitat:'森林与湖谷的危险区域',description:'厚重装甲保护着团子身体，行动较慢，却能够承受更多攻击。',tip:'留出绕行空间，躲过近身蓄力后再攻击。'},
 ...Object.entries(MINE_ANIMALS).map(([id,p])=>({id,key:'mine:'+id,name:p.name,category:'monster',group:'地下怪物',portrait:'mine',habitat:'地下洞厅、林地与湖岸',description:mineText[id][0],tip:mineText[id][1]})),
 ...BOSSES.map(p=>({id:p.id,key:'boss:'+p.id,name:p.name,category:'monster',group:'领主',portrait:'boss',habitat:'森林领主战与挑战区域',description:p.title+'。体型和威胁都高于普通怪物，战斗中有独立的蓄力、释放与恢复阶段。',tip:p.hint}))
];
export const CREATURE_ENTRIES=[...CREATURE_FISH,...CREATURE_MONSTERS];
// 使用稳定键检索，中文显示名称不参与分支判断。
export function creatureEntry(key){return CREATURE_ENTRIES.find(e=>e.key===key)||null;}
