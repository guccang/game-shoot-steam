// 小屋装扮数值合同：金币报价、底座、墙面分区及盆栽周期由此统一提供。
export const HOME_LIMIT=40;
export const HOME_GRID=12;
export const HOME_CATALOG=[
 {id:'pot',name:'陶土花盆',price:80,width:28,height:24,layer:'floor',description:'种下薄荷、草莓或雏菊，把窗边养成小花园。'},
 {id:'painting',name:'林间壁画',price:120,width:44,height:36,layer:'wall',description:'把远山和小径挂在两扇窗之间。'},
 {id:'television',name:'复古电视',price:360,width:56,height:30,layer:'floor',description:'自带矮脚支架，播放一幅安静的森林画面。'},
 {id:'radio',name:'木壳收音机',price:160,width:32,height:22,layer:'floor',description:'带提手的小收音机，为阅读角添一点旧时光。'},
 {id:'plush',name:'小熊玩偶',price:100,width:28,height:24,layer:'floor',description:'圆耳朵、奶油肚皮，陪你守着小屋。'},
 {id:'curtain',name:'叶纹窗帘',price:140,width:80,height:58,layer:'curtain',description:'卡在左右窗位，为窗景添一对柔软绿帘。'},
 {id:'sofa',name:'草绿双人沙发',price:300,width:72,height:40,layer:'floor',description:'宽扶手和两只软垫，留一个放松的角落。'},
 {id:'table',name:'橡木圆茶几',price:150,width:42,height:32,layer:'floor',description:'圆桌面与短桌脚，适合陪伴沙发。'},
 {id:'bookcase',name:'小书架',price:240,width:46,height:26,layer:'floor',description:'三层木格，收藏巡林手记和小故事。'},
 {id:'lamp',name:'蘑菇落地灯',price:180,width:26,height:22,layer:'floor',description:'伞形灯罩，夜晚留一盏柔和暖光。'},
 {id:'rug',name:'叶芽地毯',price:110,width:88,height:64,layer:'rug',description:'铺在地面，可放在家具下面，不阻挡走动。'},
 {id:'clock',name:'布谷鸟挂钟',price:170,width:30,height:42,layer:'wall',description:'小屋顶和圆钟面，挂在两扇窗之间。'},
 {id:'basket',name:'藤编收纳篮',price:90,width:32,height:24,layer:'floor',description:'交错编纹和弯提手，装点门边空处。'},
 {id:'stool',name:'蘑菇小凳',price:70,width:28,height:24,layer:'floor',description:'矮矮的圆凳面，可以随时挪个位置。'},
 {id:'vase',name:'奶油花瓶',price:130,width:24,height:22,layer:'floor',description:'细颈圆肚，插着一束不凋谢的小野花。'},
];
// 原有四件家具免费迁移为可收纳、可移动实例；床保留休息锚点。
export const HOME_STARTERS=[
 {id:'desk',name:'巡林书桌',width:100,height:46,layer:'floor',x:273,y:112},
 {id:'chair',name:'木靠背椅',width:30,height:28,layer:'floor',x:272,y:156},
 {id:'cabinet',name:'木抽屉柜',width:66,height:38,layer:'floor',x:292,y:265},
 {id:'plant',name:'常青盆景',width:26,height:24,layer:'floor',x:46,y:288},
];
export const HOME_PLANTS=[
 {id:'mint',name:'薄荷',cost:10,reward:18,days:1,color:'#82b879'},
 {id:'daisy',name:'雏菊',cost:15,reward:28,days:2,color:'#f4e3a4'},
 {id:'berry',name:'草莓',cost:20,reward:38,days:3,color:'#ce8571'},
];
// 稳定标识查询不依赖中文显示名称。
export function decorDefinition(id){return HOME_CATALOG.find(d=>d.id===id)||HOME_STARTERS.find(d=>d.id===id);}
