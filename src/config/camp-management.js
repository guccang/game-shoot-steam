// 营地外观与装饰目录：数值、材质及造型使用稳定标识，不依赖中文分支。
export const CAMP_DECOR_LIMIT=60;
export const CAMP_DECOR_GRID=10;
export const CAMP_DECOR_SHOP={id:'camp-decor',x:20,y:75,width:110,height:94};
export const CAMP_APPEARANCE={
 fence:{name:'栅栏',materials:[['wood','木头',0],['stone','石头',1600],['metal','金属',2600]],shapes:[['rail','横栏',0],['picket','尖顶',500],['lattice','格栅',700]]},
 road:{name:'路面',materials:[['earth','土路',0],['wood','木制',1400],['stone','石头',2000]],shapes:[['plain','自然铺设',0],['border','整齐包边',400],['mosaic','拼花',700]]},
 building:{name:'建筑',materials:[['wood','木头风格',0],['stone','石头风格',4000]],shapes:[['round','圆脊屋',0],['gable','山墙屋',1800],['terrace','阶檐屋',2200]]},
 gate:{name:'大门',materials:[['wood','木头',0],['stone','石头',1800],['metal','金属',3000]],shapes:[['fold','折叠门',0],['crest','徽章门',800],['lantern','灯笼门',1200]]},
};
export const CAMP_DECOR_CATALOG=[
 {id:'spring-lantern',name:'迎春灯笼',theme:'春节',price:380,width:38,depth:22,height:106},
 {id:'fortune-screen',name:'福字屏风',theme:'春节',price:520,width:70,depth:24,height:80},
 {id:'peach-tree',name:'桃花树',theme:'春节',price:780,width:68,depth:36,height:104},
 {id:'lion-statue',name:'醒狮摆件',theme:'春节',price:980,width:56,depth:36,height:70},
 {id:'christmas-tree',name:'圣诞树',theme:'圣诞',price:880,width:72,depth:40,height:116},
 {id:'snowman',name:'围巾雪人',theme:'圣诞',price:460,width:48,depth:34,height:86},
 {id:'gift-pile',name:'缤纷礼物堆',theme:'圣诞',price:320,width:64,depth:34,height:54},
 {id:'flower-sleigh',name:'雪橇花车',theme:'圣诞',price:860,width:84,depth:36,height:64},
 {id:'flowerbed',name:'四季花坛',theme:'庭园',price:260,width:76,depth:40,height:43},
 {id:'fountain',name:'涟漪喷泉',theme:'庭园',price:1500,width:80,depth:48,height:84},
];
// 非法组合不产生报价，也不能写入拥有表。
export function campStyle(category,material,shape){const d=Object.hasOwn(CAMP_APPEARANCE,category)?CAMP_APPEARANCE[category]:null,m=d?.materials.find(x=>x[0]===material),s=d?.shapes.find(x=>x[0]===shape);return m&&s?{category,material,shape,key:`${category}:${material}:${shape}`,name:m[1]+' · '+s[1],price:m[2]+s[2]}:null;}
// 默认外观完整保留旧档现有造型。
export function defaultCampStyle(category){const d=CAMP_APPEARANCE[category];return campStyle(category,d.materials[0][0],d.shapes[0][0]);}
// 装饰目录查询保持稳定标识，不用名称判定类型。
export function campDecorDefinition(id){return CAMP_DECOR_CATALOG.find(d=>d.id===id);}
