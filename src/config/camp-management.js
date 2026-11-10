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
// 扩展摆件使用独立造型标识；尺寸同时驱动摆放、预览及碰撞。
CAMP_DECOR_CATALOG.push(...[
 {"id":"bamboo-pot","name":"青竹盆景","theme":"庭园","price":420,"width":48,"depth":28,"height":90,"form":"bamboo"},
 {"id":"pine-pot","name":"迎客松盆景","theme":"庭园","price":620,"width":70,"depth":32,"height":76,"form":"bonsai"},
 {"id":"lotus-bowl","name":"荷花水缸","theme":"庭园","price":480,"width":60,"depth":36,"height":48,"form":"lotus"},
 {"id":"sunflower-box","name":"向日葵花箱","theme":"庭园","price":320,"width":70,"depth":32,"height":70,"form":"sunflower"},
 {"id":"mushroom-ring","name":"蘑菇花丛","theme":"庭园","price":280,"width":65,"depth":30,"height":40,"form":"mushroom"},
 {"id":"rose-arch","name":"蔷薇拱架","theme":"庭园","price":960,"width":90,"depth":30,"height":120,"form":"arch"},
 {"id":"garden-bench","name":"林间长椅","theme":"庭园","price":460,"width":80,"depth":32,"height":50,"form":"bench"},
 {"id":"picnic-table","name":"野餐桌","theme":"庭园","price":660,"width":90,"depth":44,"height":50,"form":"table"},
 {"id":"bird-house","name":"小鸟木屋","theme":"庭园","price":480,"width":36,"depth":24,"height":105,"form":"birdhouse"},
 {"id":"wind-chime","name":"贝壳风铃","theme":"庭园","price":380,"width":42,"depth":24,"height":102,"form":"chime"},
 {"id":"stone-cat","name":"招财猫石像","theme":"庭园","price":780,"width":48,"depth":32,"height":68,"form":"cat"},
 {"id":"stone-pagoda","name":"庭园石塔","theme":"庭园","price":820,"width":50,"depth":32,"height":100,"form":"pagoda"},
 {"id":"water-wheel","name":"溪水转轮","theme":"庭园","price":980,"width":82,"depth":40,"height":90,"form":"wheel"},
 {"id":"wishing-well","name":"许愿井","theme":"庭园","price":1000,"width":80,"depth":44,"height":100,"form":"well"},
 {"id":"mailbox-garden","name":"花园信箱","theme":"庭园","price":340,"width":40,"depth":24,"height":75,"form":"mailbox"},
 {"id":"wood-sign","name":"林间指路牌","theme":"庭园","price":220,"width":60,"depth":24,"height":85,"form":"sign"},
 {"id":"spring-drum","name":"迎春大鼓","theme":"春节","price":680,"width":64,"depth":36,"height":60,"form":"drum"},
 {"id":"spring-knot","name":"如意中国结","theme":"春节","price":420,"width":40,"depth":22,"height":100,"form":"knot"},
 {"id":"orange-tree","name":"吉祥金桔","theme":"春节","price":680,"width":60,"depth":32,"height":90,"form":"orange"},
 {"id":"firecracker-rack","name":"爆竹陈列架","theme":"春节","price":580,"width":56,"depth":24,"height":100,"form":"crackers"},
 {"id":"dragon-boat","name":"端午龙舟","theme":"端午","price":880,"width":100,"depth":38,"height":56,"form":"boat"},
 {"id":"herb-sachet","name":"艾草香囊架","theme":"端午","price":380,"width":50,"depth":24,"height":76,"form":"sachet"},
 {"id":"moon-rabbit","name":"月兔灯","theme":"中秋","price":680,"width":48,"depth":30,"height":76,"form":"rabbit"},
 {"id":"mooncake-table","name":"团圆月饼桌","theme":"中秋","price":580,"width":76,"depth":38,"height":48,"form":"mooncake"},
 {"id":"star-bridge","name":"七夕鹊桥摆件","theme":"七夕","price":880,"width":92,"depth":40,"height":66,"form":"bridge"},
 {"id":"pumpkin-cart","name":"南瓜小推车","theme":"万圣","price":660,"width":78,"depth":38,"height":62,"form":"pumpkin"},
 {"id":"candy-cauldron","name":"糖果坩埚","theme":"万圣","price":480,"width":58,"depth":34,"height":52,"form":"cauldron"},
 {"id":"easter-basket","name":"复活彩蛋篮","theme":"复活","price":420,"width":54,"depth":32,"height":60,"form":"eggs"},
 {"id":"harvest-cornucopia","name":"丰收羊角篮","theme":"感恩","price":580,"width":76,"depth":36,"height":50,"form":"harvest"},
 {"id":"winter-stove","name":"冬至暖炉","theme":"冬至","price":720,"width":54,"depth":34,"height":70,"form":"stove"},
 {"id":"christmas-wreath","name":"圣诞花环架","theme":"圣诞","price":580,"width":58,"depth":26,"height":100,"form":"wreath"},
 {"id":"firework-box","name":"庆典烟花箱","theme":"庆典","price":780,"width":60,"depth":30,"height":48,"form":"firework"},
 {"id":"lamp-lantern","name":"红灯笼路灯","theme":"路灯","price":620,"width":42,"depth":22,"height":122,"form":"lamp"},
 {"id":"lamp-globe","name":"月球路灯","theme":"路灯","price":560,"width":44,"depth":22,"height":118,"form":"lamp"},
 {"id":"lamp-twin","name":"双枝路灯","theme":"路灯","price":820,"width":70,"depth":24,"height":122,"form":"lamp"},
 {"id":"lamp-lotus","name":"莲花路灯","theme":"路灯","price":720,"width":52,"depth":24,"height":118,"form":"lamp"},
 {"id":"lamp-mushroom","name":"蘑菇路灯","theme":"路灯","price":580,"width":60,"depth":24,"height":108,"form":"lamp"},
 {"id":"lamp-star","name":"星光路灯","theme":"路灯","price":680,"width":48,"depth":24,"height":124,"form":"lamp"},
 {"id":"lamp-bamboo","name":"竹节路灯","theme":"路灯","price":580,"width":42,"depth":24,"height":122,"form":"lamp"},
 {"id":"lamp-pagoda","name":"石亭路灯","theme":"路灯","price":760,"width":52,"depth":28,"height":120,"form":"lamp"}
]);
// 非法组合不产生报价，也不能写入拥有表。
export function campStyle(category,material,shape){const d=Object.hasOwn(CAMP_APPEARANCE,category)?CAMP_APPEARANCE[category]:null,m=d?.materials.find(x=>x[0]===material),s=d?.shapes.find(x=>x[0]===shape);return m&&s?{category,material,shape,key:`${category}:${material}:${shape}`,name:m[1]+' · '+s[1],price:m[2]+s[2]}:null;}
// 默认外观完整保留旧档现有造型。
export function defaultCampStyle(category){const d=CAMP_APPEARANCE[category];return campStyle(category,d.materials[0][0],d.shapes[0][0]);}
// 装饰目录查询保持稳定标识，不用名称判定类型。
export function campDecorDefinition(id){return CAMP_DECOR_CATALOG.find(d=>d.id===id);}
