// 装备邻里对白补写：保留原有任务提示和跳转，只加入与本次工作有关的人物细节。
const DETAILS={
 'equipment-gravity':{
  intro:['owl','昨晚有封信被挤落在岔路旁，收信的人一直亮着门灯。我不想让那盏灯再白等一夜。'],
  safe:['mint','你看，交接表还留着昨夜的雨痕。今夜接班的伙伴翻到这一页，就知道我们替他们守过这里。'],
 },
 'equipment-water':{
  soil:['bat','我把盆转了好几遍，总觉得另一面更需要水。你陪我蹲下来摸摸土，心里反倒没那么急了。'],
  wash:['cook','这只篮子明早要装新摘的菜。洗净晾干，等第一次收成时，我们就用它把好消息带回来。'],
  record:['bat','等新叶长出来，我想在这一行旁边补一小片叶子的画。'],
 },
 'equipment-frost':{
  box:['cook','值夜的伙伴总说随便吃一点就好，可我知道，他们只是怕我们再跑一趟。'],
  delivered:['owl','上一班还留了一张小纸条，叮嘱替班的人记得吃饭。现在终于能认真回他们一句：放心，饭好好送到了。'],
 },
 'equipment-spider':{
  inspect:['mint','工具袋里少了一颗螺丝，小蜘蛛倒先找到了。我还没开口叫它，它已经守在袋口等我接过去。'],
  second:['mint','刚才亮灯时，我看见最小的那只停了一下，像也在抬头确认。'],
  recall:['mint','运输盒里的格子都坐满了，我才放心合上盖子。它们也是要一起回家的伙伴。'],
 },
 'equipment-red-wolf':{
  route:['boar','车里放着旧车长留下的点名本，苔轮还夹了一张新的运输单。人和木料，都要平平安安回来。'],
  delivered:['boar','这批木料要补屋檐，雨再来时，邻居们就能睡个安稳觉。今晚听见的该是雨落屋顶，不是接水盆的声音。'],
 },
 'equipment-jinbei':{
  snow:['snow','我特意留了两页空白，想画大家一路聊天的样子。车窗很小，也足够装下今天的好天气。'],
  pots:['boar','最小的那个盆是送给第一次种花的孩子的，可不能让它磕了角。'],
  unload:['snow','回程还是这些座位，谁买的东西多了，大家就再挪一挪。合乘表旁边，我还画了一个一直开着的车门。'],
 },

};

// 插入在交付末句之前，原动作、旗标、目标和保存时机完全沿用章节合同。
export function extendEquipmentDialogue(chapter){
 for(const [id,line] of Object.entries(DETAILS[chapter.id]||{})){
  const dialogue=chapter.dialogues[id];
  if(!dialogue)throw Error('装备故事缺少对白节点：'+chapter.id+'/'+id);
  dialogue.lines.splice(id==='ending'?Math.max(0,dialogue.lines.length-1):dialogue.lines.length,0,[...line]);
 }
}
