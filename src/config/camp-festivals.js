// 节庆使用游戏历法，每季一场、三年轮换；不读取现实日期，也不模拟农历。
export const CAMP_FESTIVALS=[
 {id:'spring',name:'春节',season:0,round:0,price:1800,description:'春联迎新，广场醒狮贺岁。'},
 {id:'dragon',name:'端午节',season:1,round:0,price:1200,description:'艾草香囊与龙舟陈列。'},
 {id:'moon',name:'中秋节',season:2,round:0,price:1400,description:'月兔灯与团圆月饼。'},
 {id:'christmas',name:'圣诞节',season:3,round:0,price:1800,description:'圣诞树、花环与礼物。'},
 {id:'lantern',name:'元宵节',season:0,round:1,price:1200,description:'花灯照亮团圆夜。'},
 {id:'qixi',name:'七夕节',season:1,round:1,price:1200,description:'星灯与鹊桥寄心愿。'},
 {id:'halloween',name:'万圣节',season:2,round:1,price:1400,description:'南瓜与糖果迎接邻居。'},
 {id:'newyear',name:'元旦',season:3,round:1,price:1500,description:'广场烟花迎新。'},
 {id:'easter',name:'复活节',season:0,round:2,price:1200,description:'彩蛋与春日花篮。'},
 {id:'summer',name:'仲夏节',season:1,round:2,price:1200,description:'花冠、彩旗与夏夜庆祝。'},
 {id:'thanks',name:'感恩节',season:2,round:2,price:1200,description:'丰收餐桌与谷物花环。'},
 {id:'solstice',name:'冬至',season:3,round:2,price:1200,description:'暖炉与团圆饺子。'},
];
// 稳定标识查表，外部存档不能注入显示文案。
export function campFestival(id){return CAMP_FESTIVALS.find(f=>f.id===id);}
