// 野外装备、鱼种与操作时长集中配置，界面和正式玩法共用相同价格与重量。
export const OUTDOOR_GEAR={
 tent:{name:'林间露营套装',coins:180,mass:6,description:'双层帐篷、天幕、睡袋、折叠桌椅、炉具、营灯和保冷箱。'},
 rod:{name:'湖岸鱼竿套装',coins:80,mass:1.2,description:'弹性鱼竿、卷线轮、鱼线、浮漂与鱼护，可反复使用。'},
 bait:{name:'谷物鱼饵',coins:10,mass:.01,pack:20,description:'每次真正抛竿消耗一份；试探时别急，浮漂下沉再扬竿。'},
};
export const FISH_SPECIES=[
 {id:'crucian',name:'银鳞鲫鱼',color:'#c0cbb3',mass:.35,coins:12,strength:.8,habitat:'森林、湖谷与地下湖岸',description:'银灰色的鳞片闪着柔和光泽，喜欢在安静的浅水附近成群活动。',tip:'力量较小，留意浮漂下沉，再平稳收线。'},
 {id:'perch',name:'青背鲈鱼',color:'#749c81',mass:.65,coins:22,strength:1,habitat:'森林、湖谷与地下湖岸',description:'青绿色背部便于藏身水下，游动灵活，常沿岸边寻找食物。',tip:'中鱼后注意逃窜方向，向相反方向控竿。'},
 {id:'carp',name:'金鳍鲤鱼',color:'#d9a653',mass:1.1,coins:36,strength:1.2,habitat:'森林、湖谷与地下湖岸',description:'金色鱼鳍与饱满身形很容易辨认，受到惊扰时会有力地摆尾。',tip:'力量较强，张力升高时松手放线，避免硬拉。'},
];
export const OUTDOOR_RULES=Object.freeze({campReach:125,safeRadius:260,castReach:85,chargeSeconds:1.2,flightSeconds:.7,biteSeconds:1.3,sleepSeconds:2.4,maxFish:60});
