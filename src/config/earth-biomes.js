// 地球景观与树种目录只存稳定身份、形态尺度和生态搭配，不依赖绘制器。
export const EXTRA_TREE_SPECIES = [
 {id:'cedar',name:'雪松',evergreen:true},{id:'ginkgo',name:'银杏'},
 {id:'acacia',name:'金合欢',evergreen:true},{id:'baobab',name:'猴面包树'},
 {id:'banyan',name:'榕树',evergreen:true},{id:'palm',name:'椰树',evergreen:true},
 {id:'kapok',name:'木棉'},{id:'magnolia',name:'玉兰'},
 {id:'beech',name:'山毛榉'},{id:'araucaria',name:'南洋杉',evergreen:true},
];
export const EARTH_LANDFORMS = [
 {id:'rift',name:'深裂谷',rx:340,ry:125,height:0,trees:['acacia','baobab'],color:'#665c52'},
 {id:'volcano',name:'火山',rx:190,ry:95,height:190,trees:['araucaria','acacia'],color:'#9a8270'},
 {id:'snowpeak',name:'雪山',rx:210,ry:90,height:230,trees:['cedar','beech'],color:'#d9e5df'},
 {id:'rainforest',name:'雨林',rx:310,ry:220,height:0,trees:['banyan','palm','kapok','magnolia'],color:'#668e6e'},
 {id:'strata',name:'沉积岩台地',rx:220,ry:80,height:140,trees:['ginkgo','beech'],color:'#ccb18c'},
];
