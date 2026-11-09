// 四类作物共用价格与生长配置；作物售价在上一版基础上下调30%，按整数金币四舍五入，购种价格不变。
// 前八项索引保持不变，兼容旧田块和种子库存。
import {TOWN_LAYOUT,TOWN_SHIFT_X} from './town-layout.js';
import {FARM_CROP_EXPANSION} from './farm-crop-expansion.js';
// 土壤绘制与教学轮廓共用真实尺寸，触控热区可以独立保留手机最小尺寸。
export const FARM_PLOT_SHAPE=Object.freeze({width:50,height:36,radius:8});
export const FARM_CATEGORIES=Object.freeze([
 {id:'grain',name:'粮食作物',short:'粮食'},
 {id:'vegetable',name:'蔬菜作物',short:'蔬菜'},
 {id:'fruit',name:'果树作物',short:'果树',note:'果树类兼收原有浆果草莓。'},
 {id:'ornamental',name:'观赏作物',short:'观赏'},
]);
export const FARM_CROPS=Object.freeze([
 {id:'daisy',name:'雏菊',category:'ornamental',rounds:0,weight:30,level:1,cost:10,value:21,seconds:60,xp:5},
 {id:'carrot',name:'胡萝卜',category:'vegetable',rounds:0,weight:25,level:2,cost:40,value:77,seconds:120,xp:8},
 {id:'strawberry',name:'草莓',category:'fruit',rounds:6,weight:10,level:3,cost:80,value:168,seconds:240,xp:14},
 {id:'wheat',name:'小麦',category:'grain',rounds:0,weight:25,level:4,cost:60,value:137,seconds:180,xp:12},
 {id:'tomato',name:'番茄',category:'vegetable',rounds:6,weight:10,level:5,cost:120,value:294,seconds:360,xp:20},
 {id:'corn',name:'玉米',category:'grain',rounds:3,weight:15,level:6,cost:180,value:504,seconds:600,xp:32},
 {id:'pumpkin',name:'南瓜',category:'vegetable',rounds:15,weight:5,level:7,cost:300,value:798,seconds:900,xp:48},
 {id:'sunflower',name:'向日葵',category:'ornamental',rounds:10,weight:8,level:8,cost:160,value:420,seconds:480,xp:28},
 {id:'rice',name:'水稻',category:'grain',rounds:6,weight:10,level:8,cost:100,value:231,seconds:300,xp:18},
 {id:'soybean',name:'大豆',category:'grain',rounds:10,weight:8,level:8,cost:150,value:378,seconds:480,xp:28},
 {id:'cabbage',name:'白菜',category:'vegetable',rounds:3,weight:15,level:8,cost:70,value:147,seconds:240,xp:14},
 {id:'apple',name:'苹果',category:'fruit',rounds:10,weight:8,level:8,cost:240,value:630,seconds:720,xp:40},
 {id:'pear',name:'梨',category:'fruit',rounds:15,weight:5,level:8,cost:280,value:756,seconds:900,xp:48},
 {id:'peach',name:'桃',category:'fruit',rounds:20,weight:3,level:8,cost:360,value:1008,seconds:1200,xp:60},
 {id:'orange',name:'橙子',category:'fruit',rounds:20,weight:3,level:8,cost:320,value:882,seconds:1080,xp:54},
 {id:'tulip',name:'郁金香',category:'ornamental',rounds:3,weight:15,level:8,cost:60,value:126,seconds:180,xp:12},
 {id:'lavender',name:'薰衣草',category:'ornamental',rounds:15,weight:5,level:8,cost:220,value:588,seconds:720,xp:40},
 ...FARM_CROP_EXPANSION,
]);
// 园艺等级继续记录经营成长，购种解锁改为首次获得，不再由等级决定。
export const FARM_LEVEL_XP=Object.freeze([0,30,150,330,660,1200,2100,3300]);
export const FARM_MAX_PLOTS=512;
export const FARM_STOCK_CAP=999999;
// 基础水壶照顾一格，改造后增加右侧相邻一格；湿田可重复浇水，每茬只缩短一次原始生长时长的四分之一。
export const OX_PLOW=Object.freeze({spacing:56,columnSpacing:52,speed:.65,turnRadius:26,turnSeconds:.95});
export const FARM_WATER=Object.freeze({maxPlots:2,upgradeOre:4,reduction:.25});
// 固定营地采样点供经济模拟使用，正常开垦不再限制在这里。
export const FARM_GARDEN=Object.freeze({id:'camp-farm',mapId:'forest',x:865+TOWN_SHIFT_X,y:672,radius:240});
// 经济模拟的十二块采样田坐标；正式农田直接保存世界坐标。
export function farmCell(id){return Number.isInteger(id)&&id>=0&&id<12?{id,x:781+TOWN_SHIFT_X+(id%4)*56,y:620+Math.floor(id/4)*52}:null;}
// 园艺经验只来自真实收获，与战斗等级及营地等级独立。
export function farmLevel(farm){return Math.max(1,FARM_LEVEL_XP.findLastIndex(xp=>(farm?.xp||0)>=xp)+1);}
// 选种界面显示当前进度和下一种作物，满级不显示不存在的下一档。
export function farmLevelProgress(farm){const level=farmLevel(farm),nextXp=FARM_LEVEL_XP[level]??null;return {level,xp:farm.xp,nextXp,nextCrop:nextXp===null?null:FARM_CROPS[level]??null};}

// 快递站在小屋北侧偏东，避开北栏与屋顶，领取区留在柜台前方。
export const FARM_DELIVERY=Object.freeze({id:'seed-delivery',mapId:'forest',x:TOWN_LAYOUT.cottage.x+150,y:TOWN_LAYOUT.cottage.y-85,width:110,height:92});
export const FARM_SENDERS=Object.freeze(['青芽','阿栎师傅','林间邻居','旅行商人']);
// 种子小屋位于营地东侧田地与任务广场之间，门前交易点不占建筑底座。
export const FARM_SEED_SHOP={id:'seed-shop',mapId:'forest',x:1000+TOWN_SHIFT_X,y:830,width:120,height:110};
export const FARM_SEED_DOOR={...FARM_SEED_SHOP,y:FARM_SEED_SHOP.y+42};
// 普通怪8%掉一粒，连续19次未掉后保底；领主两粒，保底也必须遵守品种门槛。
export const FARM_SEED_DROP=Object.freeze({chance:.08,pity:20,bossCount:2});
// 新品种按已完成清剿轮次分批进入掉落池，不因杀怪次数或园艺等级提前开放。
export function farmSeedPool(progress){const rounds=Math.max(0,progress?.bosses||0);return FARM_CROPS.map((crop,index)=>({...crop,index})).filter(crop=>crop.rounds<=rounds);}
// 来源说明与实际掉落共用门槛，达到门槛仍需首次获得才可购买。
export function farmSeedRequirement(crop){return crop.rounds?'完成 '+crop.rounds+' 轮清剿后加入掉落池':'初始掉落池';}
// 地块直接使用已校验的世界坐标。
export function farmPosition(plot){return {x:plot.x,y:plot.y,mapId:plot.mapId};}
