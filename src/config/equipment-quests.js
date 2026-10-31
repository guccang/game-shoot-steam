// 装备体验任务均可独立接取，不依赖其他故事；购买资格只引用本任务，旧整组谢礼清单不从本表推导。
export const EQUIPMENT_QUESTS = [
  {kind:'weapons',equipment:'gravity-gun',chapter:'equipment-gravity',title:'别让他们挤上邮路',host:'owl',requires:[],reply:'枭爵：岔路清出来了，夜班交接表也补上了安全绕行说明。'},
  {kind:'weapons',equipment:'water',chapter:'equipment-water',title:'给新芽一场小雨',host:'bat',requires:[],reply:'小夜：花圃有了浇水记录，阿团的空篮也洗净了。原来照顾新芽，要先学会轻一点。'},
  {kind:'weapons',equipment:'frost',chapter:'equipment-frost',title:'把清凉送到夜班',host:'cook',requires:[],reply:'阿团：夜岗添了保温补给箱，远路上的饭也能保存妥当了。'},
  {kind:'weapons',equipment:'mechanical-core',chapter:'sunleaf-04',title:'没有名字的小队员',host:'mint',requires:[],reply:'薄荷：小队有名字，也有愿意照顾它们的人。机械核心的购买资格已经交给阿栎师傅。'},
  {kind:'weapons',equipment:'mechanical-spider',chapter:'equipment-spider',title:'够不到的那盏灯',host:'mint',requires:[],reply:'薄荷：两段夜灯线路恢复了，巡检本记上了机械蜘蛛小队的协作。'},
  {kind:'weapons',equipment:'energy-shield',chapter:'equipment-shield',title:'给菜苗留一片安稳',host:'bat',requires:[],reply:'小夜：菜苗安稳送到了，盾面检测也记进了借用本。阿栎师傅已经开放能量防护盾购买。'},
  {kind:'vehicle',equipment:'red-wolf',chapter:'equipment-red-wolf',title:'把最后一车木料接回来',host:'boar',requires:[],reply:'铁牙：运输支路打通了，最后一车木料也交齐了。苔轮把红狼的验收记好了。'},
  {kind:'vehicle',equipment:'jinbei-van',chapter:'equipment-jinbei',title:'这回，大家一起去',host:'snow',requires:[],reply:'雪团：合乘表贴好了，画册里终于有大家一起到集市的那一页。'},
  {kind:'vehicle',equipment:'helicopter',chapter:'sunleaf-05',title:'树冠上方的灯',host:'mint',requires:[],reply:'薄荷：航标亮了，起飞与落地也都确认过了。苔轮已经开放直升机购买。'},
];

// 一处完成口径兼容旧邻里章节账本与常驻委托账本，不把进行中计为资格。
export function equipmentStoryCompleted(progress,id){
  return progress.story?.chapters?.[id]?.completed===true||progress.living?.requests?.[id]?.completed===true;
}
