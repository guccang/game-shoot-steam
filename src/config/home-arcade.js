// 家园小游戏使用独立回合数值；楼层编号沿用零基，面向玩家显示十楼。
export const HOME_ARCADE={
 birds:{name:'阳台打飞鸟',seconds:45,target:120,unlockFloor:9,magazine:6,reload:1.35,shotInterval:.22,maxBirds:5,spawnInterval:.75,maxReward:100,rewardDivisor:4},
 gold:{name:'黄金矿工',seconds:60,target:250,swing:.95,swingSpeed:1.15,extendSpeed:245,retractSpeed:200,maxReward:120,rewardDivisor:5},
};
export const ARCADE_BIRDS=[{id:'sparrow',name:'林雀',radius:15,speed:65,points:10,color:'#c4b389'},{id:'swallow',name:'雨燕',radius:12,speed:105,points:20,color:'#8da5a0'},{id:'oriole',name:'金羽鸟',radius:18,speed:80,points:15,color:'#ddc27f'}];
export const ARCADE_MINERALS={gold:{name:'金块',radius:15,value:45,weight:1.3,color:'#e2c36b'},nugget:{name:'大金块',radius:23,value:100,weight:3,color:'#d7b35e'},gem:{name:'宝石',radius:12,value:150,weight:1,color:'#98c4b0'},rock:{name:'石头',radius:21,value:10,weight:4,color:'#a4ad91'}};
export const ARCADE_CLAW={x:180,y:48,minLength:24,width:360,height:420};
